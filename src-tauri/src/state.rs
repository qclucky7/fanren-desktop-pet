use crate::{
    models::{
        AppState, PlayerPreferences, StoredState, MAX_DIALOGUE_SECONDS, MIN_DIALOGUE_SECONDS,
    },
    pets::installed_pet_dir,
    windows::apply_pet_visibility,
};
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, State};

pub(crate) fn state_file(data_dir: &Path) -> PathBuf {
    data_dir.join("player-state.json")
}

pub(crate) fn pets_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("pets")
}

pub(crate) fn read_state(data_dir: &Path) -> Result<StoredState, String> {
    let path = state_file(data_dir);
    if !path.exists() {
        return Ok(StoredState::default());
    }
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
}

fn unique_file_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

pub(crate) fn read_state_with_recovery(data_dir: &Path) -> Result<StoredState, String> {
    match read_state(data_dir) {
        Ok(stored) => Ok(stored),
        Err(error) => {
            let source = state_file(data_dir);
            let backup =
                data_dir.join(format!("player-state.broken-{}.json", unique_file_suffix()));
            fs::rename(&source, &backup).map_err(|backup_error| {
                format!(
                    "player-state.json 已损坏（{error}），且无法备份到 {}：{backup_error}",
                    backup.display()
                )
            })?;
            log::error!(
                "player-state.json was corrupt and has been preserved at {}: {}",
                backup.display(),
                error
            );
            Ok(StoredState::default())
        }
    }
}

#[cfg(target_os = "windows")]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };

    let source_wide = source
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let target_wide = target
        .as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect::<Vec<_>>();
    let succeeded = unsafe {
        MoveFileExW(
            source_wide.as_ptr(),
            target_wide.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    };
    if succeeded == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
fn replace_file(source: &Path, target: &Path) -> std::io::Result<()> {
    fs::rename(source, target)
}

pub(crate) fn write_state(data_dir: &Path, value: &StoredState) -> Result<(), String> {
    fs::create_dir_all(data_dir).map_err(|error| error.to_string())?;
    let json = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
    let temporary = data_dir.join(format!(
        ".player-state-{}-{}.tmp",
        std::process::id(),
        unique_file_suffix()
    ));
    let result = (|| {
        let mut file = File::create(&temporary).map_err(|error| error.to_string())?;
        file.write_all(&json).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())?;
        replace_file(&temporary, &state_file(data_dir)).map_err(|error| error.to_string())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

pub(crate) fn emit_changed(app: &AppHandle) {
    let _ = app.emit("player-state-changed", ());
}

fn normalize_preferences(preferences: &mut PlayerPreferences) {
    preferences.max_dialogue_seconds = preferences
        .max_dialogue_seconds
        .clamp(MIN_DIALOGUE_SECONDS, MAX_DIALOGUE_SECONDS);
    preferences.min_dialogue_seconds =
        if preferences.min_dialogue_seconds > preferences.max_dialogue_seconds {
            MIN_DIALOGUE_SECONDS
        } else {
            preferences
                .min_dialogue_seconds
                .clamp(MIN_DIALOGUE_SECONDS, preferences.max_dialogue_seconds)
        };
    preferences.bubble_seconds = preferences.bubble_seconds.clamp(2, 30);
    preferences.scale_percent = preferences.scale_percent.clamp(40, 200);
}

#[tauri::command]
pub(crate) fn get_preferences(state: State<AppState>) -> Result<PlayerPreferences, String> {
    Ok(read_state(&state.data_dir)?.preferences)
}

#[tauri::command]
pub(crate) fn update_preferences(
    app: AppHandle,
    state: State<AppState>,
    mut preferences: PlayerPreferences,
) -> Result<PlayerPreferences, String> {
    if let Some(id) = preferences.active_pet_id.as_deref() {
        let directory = installed_pet_dir(&state.data_dir, id)?;
        if !directory.is_dir() {
            return Err("当前宠物尚未安装".into());
        }
    }
    normalize_preferences(&mut preferences);
    let mut stored = read_state(&state.data_dir)?;
    stored.preferences = preferences.clone();
    write_state(&state.data_dir, &stored)?;
    apply_pet_visibility(&app, preferences.pet_visible);
    emit_changed(&app);
    Ok(preferences)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::StoredWindowPosition;

    #[test]
    fn corrupt_state_is_preserved_before_recovery() {
        let data_dir = std::env::temp_dir().join(format!(
            "lingban-corrupt-state-{}-{}",
            std::process::id(),
            unique_file_suffix()
        ));
        fs::create_dir_all(&data_dir).unwrap();
        fs::write(state_file(&data_dir), b"{not valid json").unwrap();

        let recovered = read_state_with_recovery(&data_dir).unwrap();
        let backups = fs::read_dir(&data_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("player-state.broken-")
            })
            .count();

        assert!(recovered.preferences.active_pet_id.is_none());
        assert_eq!(backups, 1);
        assert!(!state_file(&data_dir).exists());
        fs::remove_dir_all(data_dir).unwrap();
    }

    #[test]
    fn state_replacement_leaves_a_complete_readable_file() {
        let data_dir = std::env::temp_dir().join(format!(
            "lingban-atomic-state-{}-{}",
            std::process::id(),
            unique_file_suffix()
        ));
        let mut first = StoredState::default();
        first.preferences.scale_percent = 80;
        write_state(&data_dir, &first).unwrap();
        let mut second = StoredState::default();
        second.preferences.scale_percent = 135;
        write_state(&data_dir, &second).unwrap();

        let stored = read_state(&data_dir).unwrap();
        let temporary_files = fs::read_dir(&data_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().ends_with(".tmp"))
            .count();

        assert_eq!(stored.preferences.scale_percent, 135);
        assert_eq!(temporary_files, 0);
        fs::remove_dir_all(data_dir).unwrap();
    }

    #[test]
    fn dialogue_intervals_are_limited_to_the_supported_range_on_save() {
        let mut preferences = PlayerPreferences {
            min_dialogue_seconds: 5,
            max_dialogue_seconds: 240,
            ..PlayerPreferences::default()
        };

        normalize_preferences(&mut preferences);

        assert_eq!(preferences.min_dialogue_seconds, 10);
        assert_eq!(preferences.max_dialogue_seconds, 60);
    }

    #[test]
    fn first_run_dialogue_interval_defaults_to_ten_to_twenty_seconds() {
        let preferences = PlayerPreferences::default();

        assert_eq!(preferences.min_dialogue_seconds, 10);
        assert_eq!(preferences.max_dialogue_seconds, 20);
    }

    #[test]
    fn legacy_state_without_pet_position_remains_compatible() {
        let stored: StoredState = serde_json::from_str(
            r#"{
                "preferences": {
                    "activePetId": "yinyue",
                    "petVisible": true,
                    "dialogueEnabled": true,
                    "minDialogueSeconds": 90,
                    "maxDialogueSeconds": 240,
                    "bubbleSeconds": 6,
                    "scalePercent": 100
                },
                "dialogues": {}
            }"#,
        )
        .unwrap();

        assert_eq!(stored.pet_position, None::<StoredWindowPosition>);
    }
}
