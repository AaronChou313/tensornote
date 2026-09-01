use crate::native_workspace::{sanitize_relative, NativeWorkspaceRegistry};
use serde::Serialize;
use std::{ffi::OsString, path::Path, process::Command};
use tauri::State;

const MAX_OUTPUT: usize = 2 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeGitHealth {
    version: &'static str,
    workspace_name: String,
    repository_root: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeGitChange {
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    original_path: Option<String>,
    index_status: String,
    worktree_status: String,
    staged: bool,
    unstaged: bool,
    kind: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeGitStatus {
    branch: String,
    head: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    upstream: Option<String>,
    ahead: u32,
    behind: u32,
    detached: bool,
    clean: bool,
    changes: Vec<NativeGitChange>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeGitHistoryEntry {
    hash: String,
    short_hash: String,
    author: String,
    authored_at: String,
    subject: String,
}

#[derive(Debug, Serialize)]
pub struct NativeGitDiff {
    path: String,
    staged: bool,
    patch: String,
}

fn run_git(root: &Path, args: &[OsString]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|error| format!("无法启动系统 Git：{error}"))?;
    if output.stdout.len() + output.stderr.len() > MAX_OUTPUT {
        return Err("Git 输出超过 2 MB 安全限制".into());
    }
    if !output.status.success() {
        let details = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if details.is_empty() {
            "Git 命令执行失败".into()
        } else {
            details
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

fn git(root: &Path, args: &[&str]) -> Result<String, String> {
    run_git(root, &args.iter().map(OsString::from).collect::<Vec<_>>())
}

fn assert_repository(root: &Path) -> Result<(), String> {
    let top_level = git(root, &["rev-parse", "--show-toplevel"])?;
    let repository = Path::new(top_level.trim())
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if repository != root {
        return Err("所选 Workspace 必须是 Git Repository 根目录".into());
    }
    Ok(())
}

fn change_kind(index: char, worktree: char) -> &'static str {
    if matches!(index, 'U') || matches!(worktree, 'U') {
        "conflicted"
    } else if matches!(index, 'R') || matches!(worktree, 'R') {
        "renamed"
    } else if matches!(index, 'C') || matches!(worktree, 'C') {
        "copied"
    } else if matches!(index, 'D') || matches!(worktree, 'D') {
        "deleted"
    } else if matches!(index, 'A') || matches!(worktree, 'A') {
        "added"
    } else {
        "modified"
    }
}

fn change(path: String, original_path: Option<String>, xy: &str) -> NativeGitChange {
    let mut status = xy.chars();
    let index = status.next().unwrap_or('.');
    let worktree = status.next().unwrap_or('.');
    let conflicted = matches!((index, worktree), ('A', 'A') | ('D', 'D'));
    NativeGitChange {
        path,
        original_path,
        index_status: index.to_string(),
        worktree_status: worktree.to_string(),
        staged: index != '.',
        unstaged: worktree != '.',
        kind: if conflicted {
            "conflicted"
        } else {
            change_kind(index, worktree)
        },
    }
}

fn parse_status(source: &str) -> NativeGitStatus {
    let records = source.split('\0').collect::<Vec<_>>();
    let mut branch = String::new();
    let mut head = String::new();
    let mut upstream = None;
    let mut ahead = 0;
    let mut behind = 0;
    let mut changes = Vec::new();
    let mut index = 0;

    while index < records.len() {
        let record = records[index];
        if let Some(value) = record.strip_prefix("# branch.oid ") {
            head = value.to_string();
        } else if let Some(value) = record.strip_prefix("# branch.head ") {
            branch = value.to_string();
        } else if let Some(value) = record.strip_prefix("# branch.upstream ") {
            upstream = Some(value.to_string());
        } else if let Some(value) = record.strip_prefix("# branch.ab +") {
            if let Some((ahead_value, behind_value)) = value.split_once(" -") {
                ahead = ahead_value.parse().unwrap_or(0);
                behind = behind_value.parse().unwrap_or(0);
            }
        } else if let Some(path) = record.strip_prefix("? ") {
            changes.push(NativeGitChange {
                path: path.to_string(),
                original_path: None,
                index_status: "?".into(),
                worktree_status: "?".into(),
                staged: false,
                unstaged: true,
                kind: "untracked",
            });
        } else if record.starts_with("1 ") {
            let fields = record.splitn(9, ' ').collect::<Vec<_>>();
            if fields.len() == 9 {
                changes.push(change(fields[8].to_string(), None, fields[1]));
            }
        } else if record.starts_with("2 ") {
            let fields = record.splitn(10, ' ').collect::<Vec<_>>();
            if fields.len() == 10 {
                let original = records.get(index + 1).filter(|value| !value.is_empty());
                changes.push(change(
                    fields[9].to_string(),
                    original.map(|value| (*value).to_string()),
                    fields[1],
                ));
                index += 1;
            }
        } else if record.starts_with("u ") {
            let fields = record.splitn(11, ' ').collect::<Vec<_>>();
            if fields.len() == 11 {
                let mut item = change(fields[10].to_string(), None, fields[1]);
                item.kind = "conflicted";
                changes.push(item);
            }
        }
        index += 1;
    }

    let detached = branch == "(detached)";
    if detached {
        branch = head.chars().take(12).collect();
    }
    NativeGitStatus {
        branch,
        head,
        upstream,
        ahead,
        behind,
        detached,
        clean: changes.is_empty(),
        changes,
    }
}

fn status(root: &Path) -> Result<NativeGitStatus, String> {
    assert_repository(root)?;
    git(
        root,
        &[
            "status",
            "--porcelain=v2",
            "--branch",
            "--untracked-files=all",
            "-z",
        ],
    )
    .map(|source| parse_status(&source))
}

fn safe_git_path(path: &str) -> Result<String, String> {
    let safe = sanitize_relative(path)?;
    if safe.as_os_str().is_empty() {
        return Err("Git 路径不能为空".into());
    }
    Ok(safe
        .components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>()
        .join("/"))
}

#[tauri::command]
pub fn native_git_health(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
) -> Result<NativeGitHealth, String> {
    let root = registry.root(&workspace_id)?;
    assert_repository(&root)?;
    let registration = registry.registration(&workspace_id)?;
    Ok(NativeGitHealth {
        version: "native-v1",
        workspace_name: registration.name.clone(),
        repository_root: registration.name,
    })
}

#[tauri::command]
pub fn native_git_status(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
) -> Result<NativeGitStatus, String> {
    status(&registry.root(&workspace_id)?)
}

#[tauri::command]
pub fn native_git_history(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    limit: Option<u32>,
) -> Result<Vec<NativeGitHistoryEntry>, String> {
    let root = registry.root(&workspace_id)?;
    assert_repository(&root)?;
    if git(&root, &["rev-parse", "--verify", "HEAD"]).is_err() {
        return Ok(Vec::new());
    }
    let safe_limit = limit.unwrap_or(40).clamp(1, 100);
    let format = "%H%x1f%h%x1f%an%x1f%aI%x1f%s%x1e";
    let output = git(
        &root,
        &[
            "log",
            &format!("--max-count={safe_limit}"),
            "--date=iso-strict",
            &format!("--pretty=format:{format}"),
        ],
    )?;
    Ok(output
        .split('\x1e')
        .filter_map(|record| {
            let mut fields = record.trim_start_matches('\n').split('\x1f');
            Some(NativeGitHistoryEntry {
                hash: fields.next()?.to_string(),
                short_hash: fields.next()?.to_string(),
                author: fields.next()?.to_string(),
                authored_at: fields.next()?.to_string(),
                subject: fields.next()?.to_string(),
            })
        })
        .collect())
}

#[tauri::command]
pub fn native_git_diff(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    path: String,
    staged: bool,
) -> Result<NativeGitDiff, String> {
    let root = registry.root(&workspace_id)?;
    assert_repository(&root)?;
    let safe_path = safe_git_path(&path)?;
    let mut args = vec![
        OsString::from("diff"),
        OsString::from("--no-ext-diff"),
        OsString::from("--no-textconv"),
        OsString::from("--no-color"),
        OsString::from("--unified=3"),
    ];
    if staged {
        args.push(OsString::from("--cached"));
    }
    args.push(OsString::from("--"));
    args.push(OsString::from(&safe_path));
    Ok(NativeGitDiff {
        path: safe_path,
        staged,
        patch: run_git(&root, &args)?,
    })
}

#[tauri::command]
pub fn native_git_stage(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    paths: Vec<String>,
    staged: bool,
) -> Result<NativeGitStatus, String> {
    stage_paths(&registry.root(&workspace_id)?, &paths, staged)
}

fn stage_paths(root: &Path, paths: &[String], staged: bool) -> Result<NativeGitStatus, String> {
    if paths.is_empty() || paths.len() > 200 {
        return Err("至少选择一个有效文件，且单次不超过 200 个".into());
    }
    assert_repository(root)?;
    let safe_paths = paths
        .iter()
        .map(|path| safe_git_path(path))
        .collect::<Result<Vec<_>, _>>()?;
    let mut args = if staged {
        vec![OsString::from("add"), OsString::from("--all")]
    } else {
        vec![OsString::from("restore"), OsString::from("--staged")]
    };
    args.push(OsString::from("--"));
    args.extend(safe_paths.iter().map(OsString::from));
    if let Err(reason) = run_git(root, &args) {
        if staged || git(root, &["rev-parse", "--verify", "HEAD"]).is_ok() {
            return Err(reason);
        }
        let mut fallback = vec![
            OsString::from("rm"),
            OsString::from("--cached"),
            OsString::from("-r"),
            OsString::from("--ignore-unmatch"),
            OsString::from("--"),
        ];
        fallback.extend(safe_paths.iter().map(OsString::from));
        run_git(root, &fallback)?;
    }
    status(root)
}

#[tauri::command]
pub fn native_git_commit(
    registry: State<'_, NativeWorkspaceRegistry>,
    workspace_id: String,
    message: String,
) -> Result<NativeGitStatus, String> {
    commit_changes(&registry.root(&workspace_id)?, &message)
}

fn commit_changes(root: &Path, message: &str) -> Result<NativeGitStatus, String> {
    let normalized = message.trim();
    if normalized.is_empty()
        || normalized.chars().count() > 200
        || normalized.contains('\0')
        || normalized.contains(['\n', '\r'])
    {
        return Err("提交说明必须为 1–200 个字符的单行文本".into());
    }
    let current = status(root)?;
    if !current.changes.iter().any(|change| change.staged) {
        return Err("没有已暂存的改动".into());
    }
    let hooks_path = if cfg!(windows) { "NUL" } else { "/dev/null" };
    run_git(
        root,
        &[
            OsString::from("-c"),
            OsString::from(format!("core.hooksPath={hooks_path}")),
            OsString::from("-c"),
            OsString::from("commit.gpgSign=false"),
            OsString::from("commit"),
            OsString::from("-m"),
            OsString::from(normalized),
        ],
    )?;
    status(root)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn parses_porcelain_v2_without_losing_paths_with_spaces() {
        let source = concat!(
            "# branch.oid abcdef\0# branch.head main\0# branch.upstream origin/main\0",
            "# branch.ab +2 -1\0? notes/new note.md\0",
            "1 M. N... 100644 100644 100644 abc def notes/edited note.md\0"
        );
        let parsed = parse_status(source);
        assert_eq!(parsed.branch, "main");
        assert_eq!(parsed.ahead, 2);
        assert_eq!(parsed.behind, 1);
        assert_eq!(parsed.changes.len(), 2);
        assert_eq!(parsed.changes[0].path, "notes/new note.md");
        assert_eq!(parsed.changes[1].path, "notes/edited note.md");
        assert!(parsed.changes[1].staged);
    }

    #[test]
    fn validates_git_paths_and_commit_messages() {
        assert!(safe_git_path("notes/hello.md").is_ok());
        assert!(safe_git_path("../outside.md").is_err());
        assert!(safe_git_path(".git/config").is_err());
    }

    #[test]
    fn stages_and_commits_in_a_real_repository() {
        let temp = tempdir().expect("temporary repository");
        let root = temp.path().canonicalize().expect("canonical repository");
        git(&root, &["init"]).expect("git init");
        git(&root, &["config", "user.name", "TensorNote Test"]).expect("git user name");
        git(&root, &["config", "user.email", "test@tensornote.local"]).expect("git user email");
        fs::write(root.join("note.md"), "# Native Git\n").expect("write note");

        let before = status(&root).expect("untracked status");
        assert_eq!(before.changes[0].kind, "untracked");
        let staged = stage_paths(&root, &["note.md".into()], true).expect("stage note");
        assert!(staged.changes[0].staged);
        let committed = commit_changes(&root, "Add native note").expect("commit note");
        assert!(committed.clean);
        assert_eq!(
            git(&root, &["log", "-1", "--pretty=%s"])
                .expect("commit subject")
                .trim(),
            "Add native note"
        );
    }
}
