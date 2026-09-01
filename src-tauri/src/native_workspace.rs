use atomic_write_file::AtomicWriteFile;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    sync::Mutex,
    time::UNIX_EPOCH,
};
use tauri::{ipc::Response, AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

const REGISTRY_VERSION: u8 = 1;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeWorkspaceRegistration {
    pub workspace_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initial_path: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct StoredRegistry {
    version: u8,
    workspaces: Vec<StoredWorkspace>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredWorkspace {
    workspace_id: String,
    path: String,
}

#[derive(Debug)]
pub struct NativeWorkspaceRegistry {
    registry_path: PathBuf,
    roots: Mutex<HashMap<String, PathBuf>>,
    pending_open: Mutex<Option<NativeWorkspaceRegistration>>,
}

impl NativeWorkspaceRegistry {
    pub fn load(app: &AppHandle) -> Result<Self, String> {
        let config_dir = app.path().app_config_dir().map_err(error_string)?;
        fs::create_dir_all(&config_dir).map_err(error_string)?;
        let registry_path = config_dir.join("native-workspaces.json");
        let mut roots = HashMap::new();
        if let Ok(source) = fs::read_to_string(&registry_path) {
            if let Ok(stored) = serde_json::from_str::<StoredRegistry>(&source) {
                if stored.version == REGISTRY_VERSION {
                    for workspace in stored.workspaces {
                        let root = PathBuf::from(&workspace.path);
                        if let Ok(canonical) = root.canonicalize() {
                            if canonical.is_dir() {
                                roots.insert(workspace.workspace_id, canonical);
                            }
                        }
                    }
                }
            }
        }
        Ok(Self {
            registry_path,
            roots: Mutex::new(roots),
            pending_open: Mutex::new(None),
        })
    }

    #[cfg(test)]
    fn for_test(registry_path: PathBuf) -> Self {
        Self {
            registry_path,
            roots: Mutex::new(HashMap::new()),
            pending_open: Mutex::new(None),
        }
    }

    fn register(&self, root: PathBuf) -> Result<NativeWorkspaceRegistration, String> {
        let canonical = root.canonicalize().map_err(error_string)?;
        if !canonical.is_dir() {
            return Err("所选路径不是目录".into());
        }
        let workspace_id = workspace_id(&canonical);
        let mut roots = self
            .roots
            .lock()
            .map_err(|_| "Native Workspace registry is unavailable")?;
        if let Some(existing) = roots.get(&workspace_id) {
            if existing != &canonical {
                return Err("Native Workspace ID collision".into());
            }
        }
        roots.insert(workspace_id.clone(), canonical);
        self.persist(&roots)?;
        registration(
            &workspace_id,
            roots.get(&workspace_id).expect("inserted root"),
            None,
        )
    }

    pub(crate) fn register_open_path(
        &self,
        path: &Path,
    ) -> Result<NativeWorkspaceRegistration, String> {
        let canonical = path.canonicalize().map_err(error_string)?;
        let (root, initial_path) = if canonical.is_dir() {
            (canonical, None)
        } else if canonical.is_file()
            && canonical
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| {
                    matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown")
                })
        {
            let parent = canonical.parent().ok_or("Markdown 文件缺少父目录")?;
            let root = parent
                .ancestors()
                .find(|candidate| {
                    candidate.join("tensornote.yaml").is_file() || candidate.join(".git").is_dir()
                })
                .unwrap_or(parent)
                .to_path_buf();
            let relative = canonical
                .strip_prefix(&root)
                .map_err(error_string)?
                .components()
                .map(|component| component.as_os_str().to_string_lossy())
                .collect::<Vec<_>>()
                .join("/");
            (root, Some(relative))
        } else {
            return Err("只能打开 Workspace 目录或 Markdown 文件".into());
        };
        let mut selected = self.register(root)?;
        selected.initial_path = initial_path;
        Ok(selected)
    }

    pub(crate) fn queue_open_path(
        &self,
        path: &Path,
    ) -> Result<NativeWorkspaceRegistration, String> {
        let selected = self.register_open_path(path)?;
        *self
            .pending_open
            .lock()
            .map_err(|_| "Native Workspace pending queue is unavailable")? = Some(selected.clone());
        Ok(selected)
    }

    fn take_pending_open(&self) -> Result<Option<NativeWorkspaceRegistration>, String> {
        Ok(self
            .pending_open
            .lock()
            .map_err(|_| "Native Workspace pending queue is unavailable")?
            .take())
    }

    pub(crate) fn registration(
        &self,
        workspace_id: &str,
    ) -> Result<NativeWorkspaceRegistration, String> {
        let roots = self
            .roots
            .lock()
            .map_err(|_| "Native Workspace registry is unavailable")?;
        let root = roots
            .get(workspace_id)
            .ok_or("Native Workspace 授权不存在，请重新选择目录")?;
        if !root.is_dir() {
            return Err("Native Workspace 目录已移动或不存在，请重新选择".into());
        }
        registration(workspace_id, root, None)
    }

    pub(crate) fn root(&self, workspace_id: &str) -> Result<PathBuf, String> {
        let roots = self
            .roots
            .lock()
            .map_err(|_| "Native Workspace registry is unavailable")?;
        roots
            .get(workspace_id)
            .cloned()
            .filter(|path| path.is_dir())
            .ok_or_else(|| "Native Workspace 授权不存在或目录已移动，请重新选择".into())
    }

    fn persist(&self, roots: &HashMap<String, PathBuf>) -> Result<(), String> {
        let mut workspaces = roots
            .iter()
            .map(|(workspace_id, root)| StoredWorkspace {
                workspace_id: workspace_id.clone(),
                path: root.to_string_lossy().into_owned(),
            })
            .collect::<Vec<_>>();
        workspaces.sort_by(|a, b| a.workspace_id.cmp(&b.workspace_id));
        let source = serde_json::to_vec_pretty(&StoredRegistry {
            version: REGISTRY_VERSION,
            workspaces,
        })
        .map_err(error_string)?;
        atomic_write(&self.registry_path, &source)
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeWorkspaceEntry {
    path: String,
    name: String,
    kind: &'static str,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeWorkspaceStat {
    path: String,
    kind: &'static str,
    size: Option<u64>,
    modified_at: Option<u64>,
}

#[tauri::command]
pub async fn select_native_workspace(
    app: AppHandle,
    registry: State<'_, NativeWorkspaceRegistry>,
) -> Result<Option<NativeWorkspaceRegistration>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Open TensorNote Workspace")
        .blocking_pick_folder();
    match selected {
        Some(path) => registry
            .register(path.into_path().map_err(error_string)?)
            .map(Some),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn reopen_native_workspace(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
) -> Result<NativeWorkspaceRegistration, String> {
    registry.registration(&workspace_id)
}

#[tauri::command]
pub fn take_pending_native_workspace(
    registry: State<'_, NativeWorkspaceRegistry>,
) -> Result<Option<NativeWorkspaceRegistration>, String> {
    registry.take_pending_open()
}

#[tauri::command]
pub fn reveal_native_workspace(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: Option<String>,
) -> Result<(), String> {
    let root = registry.root(&workspace_id)?;
    let target = match path {
        Some(path) if !path.is_empty() => resolve_existing(&root, &path)?,
        _ => root,
    };
    tauri_plugin_opener::reveal_item_in_dir(target).map_err(error_string)
}

#[tauri::command]
pub fn native_workspace_list(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<Vec<NativeWorkspaceEntry>, String> {
    list_entries(&registry.root(&workspace_id)?, &path)
}

#[tauri::command]
pub fn native_workspace_read_text(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<String, String> {
    let root = registry.root(&workspace_id)?;
    fs::read_to_string(resolve_existing(&root, &path)?).map_err(error_string)
}

#[tauri::command]
pub fn native_workspace_read_binary(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<Response, String> {
    let root = registry.root(&workspace_id)?;
    fs::read(resolve_existing(&root, &path)?)
        .map(Response::new)
        .map_err(error_string)
}

#[tauri::command]
pub fn native_workspace_stat(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<NativeWorkspaceStat, String> {
    stat_entry(&registry.root(&workspace_id)?, &path)
}

#[tauri::command]
pub fn native_workspace_write_text(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
    content: String,
    expected_modified_at: Option<u64>,
    expected_size: Option<u64>,
) -> Result<NativeWorkspaceStat, String> {
    let root = registry.root(&workspace_id)?;
    write_entry(
        &root,
        &path,
        content.as_bytes(),
        expected_modified_at,
        expected_size,
    )
}

#[tauri::command]
pub fn native_workspace_write_binary(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
    content: Vec<u8>,
) -> Result<NativeWorkspaceStat, String> {
    let root = registry.root(&workspace_id)?;
    write_entry(&root, &path, &content, None, None)
}

#[tauri::command]
pub fn native_workspace_create_directory(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<(), String> {
    create_directory(&registry.root(&workspace_id)?, &path)
}

#[tauri::command]
pub fn native_workspace_remove_entry(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
) -> Result<(), String> {
    remove_entry(&registry.root(&workspace_id)?, &path)
}

#[tauri::command]
pub fn native_workspace_copy_entry(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    source: String,
    destination: String,
) -> Result<(), String> {
    copy_entry(&registry.root(&workspace_id)?, &source, &destination)
}

#[tauri::command]
pub fn native_workspace_move_entry(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    source: String,
    destination: String,
) -> Result<(), String> {
    move_entry(&registry.root(&workspace_id)?, &source, &destination)
}

fn registration(
    workspace_id: &str,
    root: &Path,
    initial_path: Option<String>,
) -> Result<NativeWorkspaceRegistration, String> {
    let name = root
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or("Workspace")
        .to_string();
    Ok(NativeWorkspaceRegistration {
        workspace_id: workspace_id.to_string(),
        name,
        initial_path,
    })
}

fn workspace_id(path: &Path) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in path.to_string_lossy().as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("native:{hash:016x}")
}

fn error_string(error: impl std::fmt::Display) -> String {
    error.to_string()
}

pub(crate) fn sanitize_relative(path: &str) -> Result<PathBuf, String> {
    if path.contains('\0') {
        return Err("Workspace 路径包含无效字符".into());
    }
    let mut safe = PathBuf::new();
    for component in Path::new(path).components() {
        match component {
            Component::Normal(segment) => {
                let value = segment.to_string_lossy();
                if value.starts_with('.') || value == "node_modules" || value == "dist" {
                    return Err("Workspace 路径位于受保护或忽略的目录".into());
                }
                safe.push(segment);
            }
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Workspace 路径必须是根目录内的相对路径".into())
            }
        }
    }
    Ok(safe)
}

fn reject_symlink_components(root: &Path, relative: &Path) -> Result<(), String> {
    let mut current = root.to_path_buf();
    for component in relative.components() {
        current.push(component.as_os_str());
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => {
                return Err("Native Workspace 不访问符号链接".into())
            }
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => break,
            Err(error) => return Err(error_string(error)),
        }
    }
    Ok(())
}

fn resolve_existing(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let safe = sanitize_relative(relative)?;
    reject_symlink_components(root, &safe)?;
    let canonical = root.join(safe).canonicalize().map_err(error_string)?;
    if canonical == root || canonical.starts_with(root) {
        Ok(canonical)
    } else {
        Err("Workspace 路径越过已授权目录".into())
    }
}

fn resolve_for_write(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let safe = sanitize_relative(relative)?;
    if safe.as_os_str().is_empty() {
        return Err("不能写入 Workspace 根目录".into());
    }
    reject_symlink_components(root, &safe)?;
    let candidate = root.join(safe);
    let mut existing = candidate.parent().ok_or("Workspace 路径缺少父目录")?;
    while !existing.exists() {
        existing = existing.parent().ok_or("Workspace 路径缺少有效父目录")?;
    }
    let canonical_parent = existing.canonicalize().map_err(error_string)?;
    if canonical_parent != root && !canonical_parent.starts_with(root) {
        return Err("Workspace 路径越过已授权目录".into());
    }
    if candidate.exists() {
        let canonical = candidate.canonicalize().map_err(error_string)?;
        if canonical != root && !canonical.starts_with(root) {
            return Err("Workspace 路径越过已授权目录".into());
        }
    }
    Ok(candidate)
}

fn relative_join(parent: &str, name: &str) -> String {
    if parent.is_empty() {
        name.to_string()
    } else {
        format!("{}/{}", parent.trim_end_matches('/'), name)
    }
}

fn list_entries(root: &Path, relative: &str) -> Result<Vec<NativeWorkspaceEntry>, String> {
    let directory = resolve_existing(root, relative)?;
    if !directory.is_dir() {
        return Err("Workspace 路径不是目录".into());
    }
    let parent = sanitize_relative(relative)?
        .components()
        .map(|part| part.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/");
    let mut entries = Vec::new();
    for item in fs::read_dir(directory).map_err(error_string)? {
        let item = item.map_err(error_string)?;
        let name = item.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || name == "node_modules" || name == "dist" {
            continue;
        }
        let file_type = item.file_type().map_err(error_string)?;
        if file_type.is_symlink() {
            continue;
        }
        let kind = if file_type.is_dir() {
            "directory"
        } else if file_type.is_file() {
            "file"
        } else {
            continue;
        };
        entries.push(NativeWorkspaceEntry {
            path: relative_join(&parent, &name),
            name,
            kind,
        });
    }
    entries.sort_by(|a, b| a.kind.cmp(b.kind).then_with(|| a.name.cmp(&b.name)));
    Ok(entries)
}

fn modified_at(metadata: &fs::Metadata) -> Option<u64> {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
}

fn stat_entry(root: &Path, relative: &str) -> Result<NativeWorkspaceStat, String> {
    let path = resolve_existing(root, relative)?;
    let metadata = fs::metadata(path).map_err(error_string)?;
    let normalized = sanitize_relative(relative)?
        .components()
        .map(|part| part.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/");
    if metadata.is_dir() {
        Ok(NativeWorkspaceStat {
            path: normalized,
            kind: "directory",
            size: None,
            modified_at: modified_at(&metadata),
        })
    } else if metadata.is_file() {
        Ok(NativeWorkspaceStat {
            path: normalized,
            kind: "file",
            size: Some(metadata.len()),
            modified_at: modified_at(&metadata),
        })
    } else {
        Err("Workspace 路径不是普通文件或目录".into())
    }
}

fn atomic_write(path: &Path, content: &[u8]) -> Result<(), String> {
    let mut file = AtomicWriteFile::open(path).map_err(error_string)?;
    file.write_all(content).map_err(error_string)?;
    file.commit().map_err(error_string)
}

fn write_entry(
    root: &Path,
    relative: &str,
    content: &[u8],
    expected_modified_at: Option<u64>,
    expected_size: Option<u64>,
) -> Result<NativeWorkspaceStat, String> {
    let path = resolve_for_write(root, relative)?;
    let existing = fs::metadata(&path).ok();
    if (expected_modified_at.is_some() || expected_size.is_some()) && existing.is_none() {
        return Err(format!("WORKSPACE_CONFLICT:{relative}"));
    }
    if let Some(metadata) = &existing {
        if metadata.is_dir()
            || expected_size.is_some_and(|size| size != metadata.len())
            || expected_modified_at.is_some_and(|time| Some(time) != modified_at(metadata))
        {
            return Err(format!("WORKSPACE_CONFLICT:{relative}"));
        }
    }
    let parent = path.parent().ok_or("Workspace 路径缺少父目录")?;
    fs::create_dir_all(parent).map_err(error_string)?;
    atomic_write(&path, content)?;
    stat_entry(root, relative)
}

fn create_directory(root: &Path, relative: &str) -> Result<(), String> {
    let path = resolve_for_write(root, relative)?;
    fs::create_dir_all(path).map_err(error_string)
}

fn remove_entry(root: &Path, relative: &str) -> Result<(), String> {
    if sanitize_relative(relative)?.as_os_str().is_empty() {
        return Err("不能删除 Workspace 根目录".into());
    }
    let path = resolve_existing(root, relative)?;
    if path.is_dir() {
        fs::remove_dir_all(path).map_err(error_string)
    } else {
        fs::remove_file(path).map_err(error_string)
    }
}

fn copy_recursive(source: &Path, destination: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source).map_err(error_string)?;
    if metadata.file_type().is_symlink() {
        return Err("Native Workspace 不复制符号链接".into());
    }
    if metadata.is_file() {
        fs::copy(source, destination).map_err(error_string)?;
        return Ok(());
    }
    fs::create_dir(destination).map_err(error_string)?;
    for entry in fs::read_dir(source).map_err(error_string)? {
        let entry = entry.map_err(error_string)?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') || name == "node_modules" || name == "dist" {
            continue;
        }
        copy_recursive(&entry.path(), &destination.join(entry.file_name()))?;
    }
    Ok(())
}

fn copy_entry(root: &Path, source: &str, destination: &str) -> Result<(), String> {
    let source_relative = sanitize_relative(source)?;
    let destination_relative = sanitize_relative(destination)?;
    if source_relative.as_os_str().is_empty()
        || destination_relative.as_os_str().is_empty()
        || source_relative == destination_relative
        || destination_relative.starts_with(&source_relative)
    {
        return Err("目标路径不能与来源相同，也不能位于来源目录内部".into());
    }
    let from = resolve_existing(root, source)?;
    let to = resolve_for_write(root, destination)?;
    if to.exists() {
        return Err(format!("目标路径已存在：{destination}"));
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(error_string)?;
    }
    copy_recursive(&from, &to)
}

fn move_entry(root: &Path, source: &str, destination: &str) -> Result<(), String> {
    let source_relative = sanitize_relative(source)?;
    let destination_relative = sanitize_relative(destination)?;
    if source_relative.as_os_str().is_empty()
        || destination_relative.as_os_str().is_empty()
        || source_relative == destination_relative
        || destination_relative.starts_with(&source_relative)
    {
        return Err("目标路径不能与来源相同，也不能位于来源目录内部".into());
    }
    let from = resolve_existing(root, source)?;
    let to = resolve_for_write(root, destination)?;
    if to.exists() {
        return Err(format!("目标路径已存在：{destination}"));
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(error_string)?;
    }
    fs::rename(from, to).map_err(error_string)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn registered_workspace() -> (
        tempfile::TempDir,
        NativeWorkspaceRegistry,
        NativeWorkspaceRegistration,
    ) {
        let temp = tempdir().expect("tempdir");
        let root = temp.path().join("workspace");
        fs::create_dir(&root).expect("workspace root");
        let registry = NativeWorkspaceRegistry::for_test(temp.path().join("registry.json"));
        let registration = registry.register(root).expect("registration");
        (temp, registry, registration)
    }

    #[test]
    fn rejects_traversal_hidden_paths_and_symlink_escape() {
        let (_temp, registry, registration) = registered_workspace();
        let root = registry.root(&registration.workspace_id).expect("root");
        assert!(resolve_for_write(&root, "../outside.md").is_err());
        assert!(resolve_for_write(&root, ".git/config").is_err());

        #[cfg(unix)]
        {
            use std::os::unix::fs::symlink;
            let outside = _temp.path().join("outside");
            fs::create_dir(&outside).expect("outside");
            symlink(&outside, root.join("escape")).expect("symlink");
            assert!(resolve_for_write(&root, "escape/file.md").is_err());

            let internal = root.join("internal");
            fs::create_dir(&internal).expect("internal");
            symlink(&internal, root.join("alias")).expect("internal symlink");
            assert!(resolve_existing(&root, "alias").is_err());
            assert!(resolve_for_write(&root, "alias/file.md").is_err());
        }
    }

    #[test]
    fn writes_atomically_and_detects_stale_edits() {
        let (_temp, registry, registration) = registered_workspace();
        let root = registry.root(&registration.workspace_id).expect("root");
        create_directory(&root, "notes").expect("notes");
        let first =
            write_entry(&root, "notes/hello.md", b"# Hello", None, None).expect("first write");
        assert_eq!(
            fs::read_to_string(root.join("notes/hello.md")).unwrap(),
            "# Hello"
        );
        write_entry(
            &root,
            "notes/hello.md",
            b"# Updated",
            first.modified_at,
            first.size,
        )
        .expect("matched write");
        assert!(write_entry(
            &root,
            "notes/hello.md",
            b"# Stale",
            first.modified_at,
            first.size,
        )
        .unwrap_err()
        .starts_with("WORKSPACE_CONFLICT:"));
    }

    #[test]
    fn lists_copies_moves_and_removes_only_workspace_entries() {
        let (_temp, registry, registration) = registered_workspace();
        let root = registry.root(&registration.workspace_id).expect("root");
        create_directory(&root, "notes/drafts").expect("drafts");
        write_entry(&root, "notes/drafts/new.md", b"# New", None, None).expect("note");
        copy_entry(&root, "notes/drafts/new.md", "notes/copy.md").expect("copy");
        move_entry(&root, "notes/copy.md", "notes/moved.md").expect("move");
        let entries = list_entries(&root, "notes").expect("list");
        assert!(entries.iter().any(|entry| entry.path == "notes/moved.md"));
        remove_entry(&root, "notes/drafts").expect("remove");
        assert!(!root.join("notes/drafts").exists());
    }

    #[test]
    fn turns_a_markdown_open_request_into_opaque_pending_authority() {
        let temp = tempdir().expect("tempdir");
        let root = temp.path().join("workspace");
        fs::create_dir(&root).expect("workspace root");
        fs::write(root.join("tensornote.yaml"), "schemaVersion: 1").expect("manifest");
        fs::create_dir(root.join("notes")).expect("notes directory");
        let note = root.join("notes/hello.md");
        fs::write(&note, "# Hello").expect("note");
        let registry = NativeWorkspaceRegistry::for_test(temp.path().join("registry.json"));

        let selected = registry.queue_open_path(&note).expect("queued note");
        assert_eq!(selected.name, "workspace");
        assert_eq!(selected.initial_path.as_deref(), Some("notes/hello.md"));
        assert!(!selected
            .workspace_id
            .contains(root.to_string_lossy().as_ref()));
        assert_eq!(
            registry
                .take_pending_open()
                .expect("pending queue")
                .expect("selection")
                .workspace_id,
            selected.workspace_id
        );
        assert!(registry.take_pending_open().expect("empty queue").is_none());
    }
}
