#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
};
use walkdir::WalkDir;

const SUPPORTED_EXTENSIONS: [&str; 5] = ["mp4", "mkv", "webm", "mov", "avi"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScannedVideoFile {
    id: String,
    file_name: String,
    title: String,
    file_path: String,
    extension: String,
    category: String,
    duration: Option<String>,
    modified_at: Option<String>,
    size_bytes: u64,
}

fn is_video_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|supported| supported.eq_ignore_ascii_case(extension))
        })
        .unwrap_or(false)
}

fn format_video_title(file_name: &str) -> String {
    file_name
        .rsplit_once('.')
        .map(|(name, _)| name)
        .unwrap_or(file_name)
        .to_string()
}

#[tauri::command]
fn scan_video_folder(folder_path: String) -> Result<Vec<ScannedVideoFile>, String> {
    let root = Path::new(&folder_path);

    if !root.exists() {
        return Err("Selected folder does not exist.".into());
    }

    if !root.is_dir() {
        return Err("Selected path is not a folder.".into());
    }

    let mut videos: Vec<ScannedVideoFile> = WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.file_type().is_file() && is_video_file(entry.path()))
        .filter_map(|entry| {
            let path = entry.path();
            let file_name = path.file_name()?.to_str()?.to_string();
            let extension = path.extension()?.to_str()?.to_ascii_lowercase();
            let metadata = fs::metadata(path).ok()?;
            let modified_at = metadata
                .modified()
                .ok()
                .map(|time| chrono_like_iso_string(time));

            Some(ScannedVideoFile {
                id: path.to_string_lossy().to_string(),
                file_name: file_name.clone(),
                title: format_video_title(&file_name),
                file_path: path.to_string_lossy().to_string(),
                extension,
                category: "Local Videos".into(),
                duration: None,
                modified_at,
                size_bytes: metadata.len(),
            })
        })
        .collect();

    videos.sort_by(|left, right| right.file_name.cmp(&left.file_name));
    Ok(videos)
}

#[tauri::command]
fn scan_default_movies_folder() -> Result<Vec<ScannedVideoFile>, String> {
    let movies_folder = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .ok_or_else(|| "Unable to locate the project root folder.".to_string())?
        .join("movies");

    scan_video_folder(movies_folder.to_string_lossy().to_string())
}

fn chrono_like_iso_string(time: std::time::SystemTime) -> String {
    let datetime: chrono::DateTime<chrono::Utc> = time.into();
    datetime.to_rfc3339()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_video_folder,
            scan_default_movies_folder
        ])
        .run(tauri::generate_context!())
        .expect("failed to run UdotFlix")
}
