// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
use commands::AppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            auth_token: Mutex::new(None),
            chatroom_id: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_channel_info,
            commands::set_auth_token,
            commands::get_auth_token,
            commands::delete_message,
            commands::ban_user,
            commands::timeout_user,
            commands::toggle_slow_mode,
            commands::toggle_subscribers_mode,
            commands::get_user_info,
            commands::send_chat_message,
            commands::fetch_global_history,
            commands::fetch_turkey_trends,
            commands::call_ollama,
            commands::call_ollama_generate,
            commands::call_custom_ai,
            commands::download_ollama,
            commands::install_ollama,
            commands::check_ollama_status,
            commands::pull_ollama_model,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
