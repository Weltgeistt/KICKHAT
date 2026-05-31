// lib.rs — Mobile entry point (unused in desktop-only mode)
// Desktop entry point is main.rs

mod commands;
use commands::AppState;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
