// OS Keychain 桥接 - 通过 keyring crate 写入系统密钥库
//
// Windows: DPAPI（Credential Manager）
// macOS:   Keychain
// Linux:   Secret Service (libsecret)
//
// key 格式：tech-demand-matching:<provider>
// value:  provider 对应的 API Key（明文，由 OS 加密落盘）

use keyring::Entry;
use serde::Serialize;

const SERVICE: &str = "tech-demand-matching";

fn make_entry(provider: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, provider).map_err(|e| format!("Keychain 不可用: {e}"))
}

#[tauri::command]
pub fn save_secret(provider: String, api_key: String) -> Result<(), String> {
    if api_key.is_empty() {
        return delete_secret(provider);
    }
    let entry = make_entry(&provider)?;
    entry
        .set_password(&api_key)
        .map_err(|e| format!("保存密钥失败: {e}"))
}

#[tauri::command]
pub fn get_secret(provider: String) -> Result<Option<String>, String> {
    let entry = make_entry(&provider)?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("读取密钥失败: {e}")),
    }
}

#[tauri::command]
pub fn delete_secret(provider: String) -> Result<(), String> {
    let entry = make_entry(&provider)?;
    match entry.delete_password() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("删除密钥失败: {e}")),
    }
}

#[derive(Serialize)]
pub struct HasSecretResult {
    pub has_secret: bool,
    pub backend: &'static str,
}

#[tauri::command]
pub fn has_secret(provider: String) -> Result<HasSecretResult, String> {
    let entry = make_entry(&provider)?;
    let has_secret = match entry.get_password() {
        Ok(_) => true,
        Err(keyring::Error::NoEntry) => false,
        Err(e) => return Err(format!("探测密钥失败: {e}")),
    };
    Ok(HasSecretResult {
        has_secret,
        backend: std::env::consts::OS,
    })
}
