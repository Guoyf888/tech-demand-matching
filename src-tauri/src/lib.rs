// 极简 lib.rs - 添加 secret_store 模块的 OS Keychain 桥接命令

#[cfg(not(target_os = "android"))]
mod secret_store;

#[cfg(target_os = "android")]
#[path = "secret_store_mobile.rs"]
mod secret_store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            secret_store::save_secret,
            secret_store::get_secret,
            secret_store::delete_secret,
            secret_store::has_secret,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
