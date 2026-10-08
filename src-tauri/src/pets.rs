use crate::{
    dialogues::{materialize_dialogues, read_dialogue_file},
    models::{AppState, DialogueGroups, PlayerPreferences, StoredDialogueValue, StoredState},
    state::{emit_changed, pets_dir, read_state, write_state},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeSet,
    fs,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

const BUNDLED_PETS_RESOURCE_DIR: &str = "_up_/pets";
const DEFAULT_BUILT_IN_PET_ID: &str = "songyu";
const BUILT_IN_MARKER: &str = ".lingban-built-in";

#[derive(Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct ResourceFileStamp {
    len: u64,
    modified_nanos: u64,
}

#[derive(Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct BuiltInPackageStamp {
    manifest: ResourceFileStamp,
    spritesheet: ResourceFileStamp,
    dialogues: Option<ResourceFileStamp>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PetManifest {
    id: String,
    display_name: String,
    description: String,
    sprite_version_number: u8,
    spritesheet_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PetRecord {
    id: String,
    display_name: String,
    description: String,
    sprite_version_number: u8,
    spritesheet_url: String,
    dialogues: DialogueGroups,
    built_in: bool,
}

fn valid_pet_id(id: &str) -> bool {
    !id.is_empty()
        && !id.starts_with('-')
        && !id.ends_with('-')
        && id.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
        })
}

fn remove_deprecated_extras(destination: &Path) -> Result<(), String> {
    let destination_extras = destination.join("extras");
    if destination_extras.exists() {
        fs::remove_dir_all(&destination_extras).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn resource_file_stamp(path: &Path) -> Result<ResourceFileStamp, String> {
    let metadata = fs::metadata(path).map_err(|error| error.to_string())?;
    let modified_nanos = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_nanos().min(u64::MAX as u128) as u64)
        .unwrap_or_default();
    Ok(ResourceFileStamp {
        len: metadata.len(),
        modified_nanos,
    })
}

fn package_stamp(source: &Path, manifest: &PetManifest) -> Result<BuiltInPackageStamp, String> {
    let dialogues = source.join("dialogues.json");
    Ok(BuiltInPackageStamp {
        manifest: resource_file_stamp(&source.join("pet.json"))?,
        spritesheet: resource_file_stamp(&source.join(&manifest.spritesheet_path))?,
        dialogues: dialogues
            .is_file()
            .then(|| resource_file_stamp(&dialogues))
            .transpose()?,
    })
}

fn built_in_is_current(
    destination: &Path,
    manifest: &PetManifest,
    expected: &BuiltInPackageStamp,
) -> bool {
    if !destination.join("pet.json").is_file()
        || !destination.join(&manifest.spritesheet_path).is_file()
        || destination.join("dialogues.json").is_file() != expected.dialogues.is_some()
    {
        return false;
    }
    fs::read(destination.join(BUILT_IN_MARKER))
        .ok()
        .and_then(|bytes| serde_json::from_slice::<BuiltInPackageStamp>(&bytes).ok())
        .is_some_and(|stored| stored == *expected)
}

fn sync_built_in_package(
    manifest: &PetManifest,
    source: &Path,
    destination: &Path,
) -> Result<bool, String> {
    read_dialogue_file(source)?;
    let stamp = package_stamp(source, manifest)?;
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    if built_in_is_current(destination, manifest, &stamp) {
        remove_deprecated_extras(destination)?;
        return Ok(false);
    }

    fs::copy(source.join("pet.json"), destination.join("pet.json"))
        .map_err(|error| format!("无法初始化宠物 {} manifest: {error}", manifest.id))?;
    let destination_sheet = destination.join(&manifest.spritesheet_path);
    if let Some(parent) = destination_sheet.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::copy(source.join(&manifest.spritesheet_path), &destination_sheet)
        .map_err(|error| format!("无法初始化宠物 {} 图集: {error}", manifest.id))?;
    let packaged_dialogues = source.join("dialogues.json");
    let destination_dialogues = destination.join("dialogues.json");
    if packaged_dialogues.is_file() {
        fs::copy(&packaged_dialogues, &destination_dialogues)
            .map_err(|error| format!("无法初始化宠物 {} 对话: {error}", manifest.id))?;
    } else if destination_dialogues.is_file() {
        fs::remove_file(&destination_dialogues).map_err(|error| error.to_string())?;
    }
    remove_deprecated_extras(destination)?;
    let marker = serde_json::to_vec(&stamp).map_err(|error| error.to_string())?;
    fs::write(destination.join(BUILT_IN_MARKER), marker).map_err(|error| error.to_string())?;
    Ok(true)
}

pub(crate) fn installed_pet_dir(data_dir: &Path, id: &str) -> Result<PathBuf, String> {
    if !valid_pet_id(id) {
        return Err("pet id 必须是小写 kebab-case".into());
    }
    Ok(pets_dir(data_dir).join(id))
}

#[tauri::command]
pub(crate) fn open_pet_directory(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let directory = pets_dir(&state.data_dir);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    app.opener()
        .open_path(directory.to_string_lossy().to_string(), None::<&str>)
        .map_err(|error| error.to_string())
}

fn parse_manifest(directory: &Path) -> Result<PetManifest, String> {
    let bytes =
        fs::read(directory.join("pet.json")).map_err(|_| "所选目录中缺少 pet.json".to_string())?;
    let manifest: PetManifest =
        serde_json::from_slice(&bytes).map_err(|error| format!("pet.json 无法解析: {error}"))?;
    if manifest.sprite_version_number != 2 {
        return Err("仅支持 Codex Pet v2".into());
    }
    if !valid_pet_id(&manifest.id) {
        return Err("pet id 必须是小写 kebab-case".into());
    }
    if Path::new(&manifest.spritesheet_path).is_absolute()
        || manifest.spritesheet_path.contains("..")
    {
        return Err("spritesheetPath 必须是宠物目录内的相对路径".into());
    }
    if !directory.join(&manifest.spritesheet_path).is_file() {
        return Err("找不到 spritesheetPath 指向的精灵图".into());
    }
    Ok(manifest)
}

fn discover_pet_packages(root: &Path) -> Result<Vec<(PetManifest, PathBuf)>, String> {
    let mut packages = Vec::new();
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let directory = entry.map_err(|error| error.to_string())?.path();
        if !directory.is_dir() {
            continue;
        }
        let manifest = parse_manifest(&directory)?;
        let directory_id = directory
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "宠物目录名称不是有效 UTF-8".to_string())?;
        if directory_id != manifest.id {
            return Err(format!(
                "宠物目录 {directory_id} 与 pet.json ID {} 不一致",
                manifest.id
            ));
        }
        packages.push((manifest, directory));
    }
    packages.sort_by(|left, right| left.0.id.cmp(&right.0.id));
    Ok(packages)
}

pub(crate) fn seed_built_ins(app: &AppHandle, data_dir: &Path) -> Result<BTreeSet<String>, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?;
    let resource_pets = resource_dir.join(BUNDLED_PETS_RESOURCE_DIR);
    let packages = discover_pet_packages(&resource_pets)?;
    let mut built_in_pet_ids = BTreeSet::new();
    for (manifest, source) in packages {
        let id = manifest.id.clone();
        let destination = pets_dir(data_dir).join(&id);
        sync_built_in_package(&manifest, &source, &destination)?;
        built_in_pet_ids.insert(id);
    }
    for entry in fs::read_dir(pets_dir(data_dir)).map_err(|error| error.to_string())? {
        let directory = entry.map_err(|error| error.to_string())?.path();
        if !directory.is_dir() || !directory.join(BUILT_IN_MARKER).is_file() {
            continue;
        }
        let Some(id) = directory.file_name().and_then(|name| name.to_str()) else {
            continue;
        };
        if !built_in_pet_ids.contains(id) {
            fs::remove_dir_all(&directory)
                .map_err(|error| format!("无法移除已删除的内置宠物 {id}: {error}"))?;
        }
    }
    Ok(built_in_pet_ids)
}

pub(crate) fn ensure_active_pet(
    stored: &mut StoredState,
    data_dir: &Path,
    built_in_pet_ids: &BTreeSet<String>,
) -> bool {
    let previous_dialogue_count = stored.dialogues.len();
    stored
        .dialogues
        .retain(|id, _| installed_pet_dir(data_dir, id).is_ok_and(|path| path.is_dir()));
    let removed_stale_dialogues = stored.dialogues.len() != previous_dialogue_count;
    let active_is_installed = stored
        .preferences
        .active_pet_id
        .as_deref()
        .is_some_and(|id| installed_pet_dir(data_dir, id).is_ok_and(|path| path.is_dir()));
    if active_is_installed {
        return removed_stale_dialogues;
    }
    stored.preferences.active_pet_id = default_built_in_pet_id(built_in_pet_ids);
    true
}

fn default_built_in_pet_id(built_in_pet_ids: &BTreeSet<String>) -> Option<String> {
    built_in_pet_ids
        .get(DEFAULT_BUILT_IN_PET_ID)
        .or_else(|| built_in_pet_ids.iter().next())
        .cloned()
}

#[tauri::command]
pub(crate) fn list_pets(state: State<AppState>) -> Result<Vec<PetRecord>, String> {
    let mut stored = read_state(&state.data_dir)?;
    let mut state_changed = false;
    let mut records = Vec::new();
    let root = pets_dir(&state.data_dir);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let directory = entry.map_err(|error| error.to_string())?.path();
        if !directory.is_dir() {
            continue;
        }
        let manifest = match parse_manifest(&directory) {
            Ok(value) => value,
            Err(_) => continue,
        };
        let built_in = state.built_in_pet_ids.contains(&manifest.id);
        let packaged_dialogues = read_dialogue_file(&directory)?;
        let (dialogues, materialized) =
            materialize_dialogues(stored.dialogues.get(&manifest.id), packaged_dialogues);
        if let Some(value) = materialized {
            stored.dialogues.insert(manifest.id.clone(), value);
            state_changed = true;
        }
        records.push(PetRecord {
            spritesheet_url: directory
                .join(&manifest.spritesheet_path)
                .to_string_lossy()
                .to_string(),
            dialogues,
            built_in,
            id: manifest.id,
            display_name: manifest.display_name,
            description: manifest.description,
            sprite_version_number: manifest.sprite_version_number,
        });
    }
    if state_changed {
        write_state(&state.data_dir, &stored)?;
    }
    records.sort_by_key(|pet| (!pet.built_in, pet.display_name.clone()));
    Ok(records)
}

#[tauri::command]
pub(crate) fn set_active_pet(
    app: AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<PlayerPreferences, String> {
    let directory = installed_pet_dir(&state.data_dir, &id)?;
    if !directory.is_dir() {
        return Err("宠物尚未安装".into());
    }
    let mut stored = read_state(&state.data_dir)?;
    stored.preferences.active_pet_id = Some(id);
    write_state(&state.data_dir, &stored)?;
    emit_changed(&app);
    Ok(stored.preferences)
}

#[tauri::command(rename_all = "camelCase")]
pub(crate) fn install_pet(
    app: AppHandle,
    state: State<AppState>,
    source_directory: String,
) -> Result<PetRecord, String> {
    let source = PathBuf::from(source_directory);
    let manifest = parse_manifest(&source)?;
    let source_dialogues = read_dialogue_file(&source)?;
    let initial_dialogues = source_dialogues.unwrap_or_default();
    let target = pets_dir(&state.data_dir).join(&manifest.id);
    if target.exists() {
        return Err("同名宠物已经安装".into());
    }
    fs::create_dir_all(&target).map_err(|error| error.to_string())?;
    let result = (|| {
        fs::copy(source.join("pet.json"), target.join("pet.json"))
            .map_err(|error| error.to_string())?;
        fs::copy(
            source.join(&manifest.spritesheet_path),
            target.join("spritesheet.webp"),
        )
        .map_err(|error| error.to_string())?;
        if source.join("dialogues.json").is_file() {
            fs::copy(source.join("dialogues.json"), target.join("dialogues.json"))
                .map_err(|error| error.to_string())?;
        }
        if manifest.spritesheet_path != "spritesheet.webp" {
            let mut value = serde_json::to_value(&manifest).map_err(|error| error.to_string())?;
            value["spritesheetPath"] = serde_json::Value::String("spritesheet.webp".into());
            fs::write(
                target.join("pet.json"),
                serde_json::to_vec_pretty(&value).unwrap(),
            )
            .map_err(|error| error.to_string())?;
        }
        let mut stored = read_state(&state.data_dir)?;
        stored.dialogues.insert(
            manifest.id.clone(),
            StoredDialogueValue::Grouped(initial_dialogues.clone()),
        );
        write_state(&state.data_dir, &stored)?;
        Ok::<(), String>(())
    })();
    if let Err(error) = result {
        let _ = fs::remove_dir_all(&target);
        return Err(error);
    }
    emit_changed(&app);
    Ok(PetRecord {
        id: manifest.id,
        display_name: manifest.display_name,
        description: manifest.description,
        sprite_version_number: 2,
        spritesheet_url: target
            .join("spritesheet.webp")
            .to_string_lossy()
            .to_string(),
        dialogues: initial_dialogues,
        built_in: false,
    })
}

#[tauri::command]
pub(crate) fn uninstall_pet(
    app: AppHandle,
    state: State<AppState>,
    id: String,
) -> Result<(), String> {
    let target = installed_pet_dir(&state.data_dir, &id)?;
    if state.built_in_pet_ids.contains(&id) {
        return Err("内置宠物不可卸载".into());
    }
    if !target.is_dir() {
        return Err("宠物尚未安装".into());
    }
    fs::remove_dir_all(target).map_err(|error| error.to_string())?;
    let mut stored = read_state(&state.data_dir)?;
    stored.dialogues.remove(&id);
    if stored.preferences.active_pet_id.as_deref() == Some(&id) {
        stored.preferences.active_pet_id = default_built_in_pet_id(&state.built_in_pet_ids);
    }
    write_state(&state.data_dir, &stored)?;
    emit_changed(&app);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_directory(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "fanren-pets-{label}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }

    #[test]
    fn repository_pets_are_discovered_without_a_hardcoded_id_list() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../pets");
        let packages = discover_pet_packages(&root).unwrap();
        let discovered_ids = packages
            .into_iter()
            .map(|(manifest, _)| manifest.id)
            .collect::<Vec<_>>();
        let mut directory_ids = fs::read_dir(&root)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.path().join("pet.json").is_file())
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .collect::<Vec<_>>();
        directory_ids.sort();

        assert_eq!(discovered_ids, directory_ids);
    }

    #[test]
    fn installed_pet_paths_reject_traversal_and_absolute_inputs() {
        let data_dir = Path::new("C:/safe/app-data");

        assert!(installed_pet_dir(data_dir, "..").is_err());
        assert!(installed_pet_dir(data_dir, "../yinyue").is_err());
        assert!(installed_pet_dir(data_dir, "C:\\Windows").is_err());
        assert!(installed_pet_dir(data_dir, "yinyue")
            .unwrap()
            .ends_with("pets/yinyue"));
    }

    #[test]
    fn pet_library_directory_stays_inside_the_application_data_directory() {
        let data_dir = Path::new("C:/safe/app-data");

        assert_eq!(pets_dir(data_dir), data_dir.join("pets"));
    }

    #[test]
    fn default_pet_prefers_songyu_over_directory_order() {
        let ids = ["mupeiling", "songyu", "yinyue"]
            .into_iter()
            .map(str::to_string)
            .collect();

        assert_eq!(default_built_in_pet_id(&ids).as_deref(), Some("songyu"));
    }

    #[test]
    fn default_pet_falls_back_when_songyu_is_not_bundled() {
        let ids = ["yinyue", "mupeiling"]
            .into_iter()
            .map(str::to_string)
            .collect();

        assert_eq!(default_built_in_pet_id(&ids).as_deref(), Some("mupeiling"));
    }

    #[test]
    fn unchanged_built_in_package_is_not_copied_again() {
        let root = temporary_directory("stamp");
        let source = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(&source).unwrap();
        fs::write(
            source.join("pet.json"),
            r#"{"id":"test-pet","displayName":"测试","description":"测试","spriteVersionNumber":2,"spritesheetPath":"spritesheet.webp"}"#.as_bytes(),
        )
        .unwrap();
        fs::write(source.join("spritesheet.webp"), b"atlas-v1").unwrap();
        let manifest = PetManifest {
            id: "test-pet".into(),
            display_name: "测试".into(),
            description: "测试".into(),
            sprite_version_number: 2,
            spritesheet_path: "spritesheet.webp".into(),
        };

        assert!(sync_built_in_package(&manifest, &source, &destination).unwrap());
        assert!(!sync_built_in_package(&manifest, &source, &destination).unwrap());

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn changed_built_in_atlas_invalidates_the_package_stamp() {
        let root = temporary_directory("changed-stamp");
        let source = root.join("source");
        let destination = root.join("destination");
        fs::create_dir_all(&source).unwrap();
        fs::write(
            source.join("pet.json"),
            r#"{"id":"test-pet","displayName":"测试","description":"测试","spriteVersionNumber":2,"spritesheetPath":"spritesheet.webp"}"#.as_bytes(),
        )
        .unwrap();
        fs::write(source.join("spritesheet.webp"), b"atlas-v1").unwrap();
        let manifest = PetManifest {
            id: "test-pet".into(),
            display_name: "测试".into(),
            description: "测试".into(),
            sprite_version_number: 2,
            spritesheet_path: "spritesheet.webp".into(),
        };
        assert!(sync_built_in_package(&manifest, &source, &destination).unwrap());

        fs::write(source.join("spritesheet.webp"), b"atlas-version-two").unwrap();
        assert!(sync_built_in_package(&manifest, &source, &destination).unwrap());
        assert_eq!(
            fs::read(destination.join("spritesheet.webp")).unwrap(),
            b"atlas-version-two"
        );

        fs::remove_dir_all(root).unwrap();
    }
}
