use bcrypt::{hash, verify, DEFAULT_COST};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct CommandResult<T> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

impl<T> CommandResult<T> {
    fn ok(data: T) -> Self {
        CommandResult {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    fn err(msg: impl Into<String>) -> Self {
        CommandResult {
            success: false,
            data: None,
            error: Some(msg.into()),
        }
    }
}

// Ensure the receipts directory exists
fn get_receipt_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let receipt_dir = app_data_dir.join("receipts");
    if !receipt_dir.exists() {
        fs::create_dir_all(&receipt_dir).map_err(|e| e.to_string())?;
    }
    Ok(receipt_dir)
}

#[tauri::command]
pub async fn auth_hash(text: String) -> CommandResult<String> {
    match hash(text, DEFAULT_COST) {
        Ok(h) => CommandResult::ok(h),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

#[tauri::command]
pub async fn auth_compare(text: String, hash: String) -> CommandResult<bool> {
    match verify(text, &hash) {
        Ok(match_) => CommandResult::ok(match_),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

#[tauri::command]
pub async fn receipt_save(
    app: AppHandle,
    invoice_number: String,
    html_content: String,
) -> CommandResult<String> {
    let dir = match get_receipt_dir(&app) {
        Ok(d) => d,
        Err(e) => return CommandResult::err(e),
    };
    let file_name = format!("{}.html", invoice_number.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_"));
    let file_path = dir.join(file_name);
    match fs::write(&file_path, html_content) {
        Ok(_) => CommandResult::ok(file_path.to_string_lossy().to_string()),
        Err(e) => CommandResult::err(e.to_string()),
    }
}

#[derive(Serialize)]
pub struct ReceiptInfo {
    filename: String,
    invoiceNumber: String,
    createdAt: String,
    filePath: String,
    size: u64,
}

#[tauri::command]
pub async fn receipt_list(app: AppHandle) -> CommandResult<Vec<ReceiptInfo>> {
    let dir = match get_receipt_dir(&app) {
        Ok(d) => d,
        Err(e) => return CommandResult::err(e),
    };
    
    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("html") {
                if let Ok(metadata) = entry.metadata() {
                    let filename = entry.file_name().to_string_lossy().to_string();
                    let invoice_number = filename.replace(".html", "").replace("_", "-");
                    // Using modified or created time (fallback)
                    let created_at = metadata.created().unwrap_or_else(|_| metadata.modified().unwrap());
                    let datetime: chrono::DateTime<chrono::Utc> = created_at.into();
                    
                    files.push(ReceiptInfo {
                        filename,
                        invoiceNumber: invoice_number,
                        createdAt: datetime.to_rfc3339(),
                        filePath: path.to_string_lossy().to_string(),
                        size: metadata.len(),
                    });
                }
            }
        }
    }
    
    // Sort by createdAt descending
    files.sort_by(|a, b| b.createdAt.cmp(&a.createdAt));
    CommandResult::ok(files)
}

#[tauri::command]
pub async fn receipt_open_folder(app: AppHandle) -> CommandResult<()> {
    let dir = match get_receipt_dir(&app) {
        Ok(d) => d,
        Err(e) => return CommandResult::err(e),
    };
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer").arg(dir).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(dir).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(dir).spawn();
    
    CommandResult::ok(())
}

#[tauri::command]
pub async fn receipt_open_file(file_path: String) -> CommandResult<()> {
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/c", "start", "", &file_path]).spawn();
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&file_path).spawn();
    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open").arg(&file_path).spawn();
    
    CommandResult::ok(())
}

#[tauri::command]
pub async fn receipt_delete(file_path: String) -> CommandResult<()> {
    let path = Path::new(&file_path);
    if path.exists() {
        if let Err(e) = fs::remove_file(path) {
            return CommandResult::err(e.to_string());
        }
    }
    CommandResult::ok(())
}

#[tauri::command]
pub async fn receipt_print_file(file_path: String) -> CommandResult<()> {
    // Basic fallback to OS print. In a real scenario, this might depend on a thermal printer or
    // printing via the frontend's iframe. The easiest approach on Tauri is printing from window.print() in JS.
    // For now we just open it since direct silent printing of HTML requires webview controls.
    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd").args(["/c", "start", "", &file_path]).spawn();
    
    CommandResult::ok(())
}
