use serde::Serialize;

const MOBILE_FALLBACK_MESSAGE: &str = "Android 系统密钥库桥接暂不可用，请使用应用内加密存储";

#[tauri::command]
pub fn save_secret(_provider: String, _api_key: String) -> Result<(), String> {
    Err(MOBILE_FALLBACK_MESSAGE.to_string())
}

#[tauri::command]
pub fn get_secret(_provider: String) -> Result<Option<String>, String> {
    Err(MOBILE_FALLBACK_MESSAGE.to_string())
}

#[tauri::command]
pub fn delete_secret(_provider: String) -> Result<(), String> {
    Err(MOBILE_FALLBACK_MESSAGE.to_string())
}

#[derive(Serialize)]
pub struct HasSecretResult {
    pub has_secret: bool,
    pub backend: &'static str,
}

#[tauri::command]
pub fn has_secret(_provider: String) -> Result<HasSecretResult, String> {
    Ok(HasSecretResult {
        has_secret: false,
        backend: "android-fallback",
    })
}
