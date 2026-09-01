use serde::Serialize;
use tauri::{Emitter, Manager};

mod local_runtime;
mod native_git;
mod native_workspace;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HostPlatformInfo {
    os: &'static str,
    arch: &'static str,
    family: &'static str,
}

#[tauri::command]
fn platform_info() -> HostPlatformInfo {
    HostPlatformInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        family: std::env::consts::FAMILY,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let registry = native_workspace::NativeWorkspaceRegistry::load(app.handle())?;
            if let Some(path) = std::env::args_os()
                .skip(1)
                .map(std::path::PathBuf::from)
                .find(|path| path.exists())
            {
                let _ = registry.queue_open_path(&path);
            }
            app.manage(registry);
            app.manage(local_runtime::LocalRuntimeManager::new(app.handle())?);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                if let Some(path) = paths.first() {
                    let registry = window.state::<native_workspace::NativeWorkspaceRegistry>();
                    if let Ok(selection) = registry.register_open_path(path) {
                        let _ = window.emit("native-workspace-open", selection);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            platform_info,
            native_workspace::select_native_workspace,
            native_workspace::reopen_native_workspace,
            native_workspace::take_pending_native_workspace,
            native_workspace::reveal_native_workspace,
            native_workspace::native_workspace_list,
            native_workspace::native_workspace_read_text,
            native_workspace::native_workspace_read_binary,
            native_workspace::native_workspace_stat,
            native_workspace::native_workspace_write_text,
            native_workspace::native_workspace_write_binary,
            native_workspace::native_workspace_create_directory,
            native_workspace::native_workspace_remove_entry,
            native_workspace::native_workspace_copy_entry,
            native_workspace::native_workspace_move_entry,
            native_git::native_git_health,
            native_git::native_git_status,
            native_git::native_git_history,
            native_git::native_git_diff,
            native_git::native_git_stage,
            native_git::native_git_commit,
            local_runtime::local_runtime_discover,
            local_runtime::local_runtime_plan_environment,
            local_runtime::local_runtime_apply_environment,
            local_runtime::local_runtime_operation,
            local_runtime::local_runtime_cancel_operation,
            local_runtime::local_runtime_start_jupyter,
            local_runtime::local_runtime_owned_servers,
            local_runtime::local_runtime_server_logs,
            local_runtime::local_runtime_stop_jupyter,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            app.state::<local_runtime::LocalRuntimeManager>().stop_all();
        }

        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = event {
            if let Some(path) = urls
                .iter()
                .filter_map(|url| url.to_file_path().ok())
                .find(|path| path.exists())
            {
                let registry = app.state::<native_workspace::NativeWorkspaceRegistry>();
                if let Ok(selection) = registry.queue_open_path(&path) {
                    let _ = app.emit("native-workspace-open", selection);
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        let _ = (app, event);
    });
}

#[cfg(test)]
mod tests {
    use super::platform_info;

    #[test]
    fn platform_info_only_contains_non_sensitive_constants() {
        let info = platform_info();
        assert_eq!(info.os, std::env::consts::OS);
        assert_eq!(info.arch, std::env::consts::ARCH);
        assert_eq!(info.family, std::env::consts::FAMILY);
    }
}
