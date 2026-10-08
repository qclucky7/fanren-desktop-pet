use crate::{
    models::{AppState, DialogueGroups, DialogueKind, StoredDialogueValue},
    pets::installed_pet_dir,
    state::{emit_changed, read_state, write_state},
};
use serde::Deserialize;
use std::{fs, path::Path};
use tauri::{AppHandle, State};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DialogueFile {
    version: u8,
    #[serde(flatten)]
    groups: DialogueGroups,
}

fn sanitize_lines(lines: Vec<String>) -> Vec<String> {
    lines
        .into_iter()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect()
}

fn sanitize_dialogues(groups: DialogueGroups) -> DialogueGroups {
    DialogueGroups {
        idle: sanitize_lines(groups.idle),
        drag: sanitize_lines(groups.drag),
        touch: sanitize_lines(groups.touch),
    }
}

pub(crate) fn read_dialogue_file(directory: &Path) -> Result<Option<DialogueGroups>, String> {
    let path = directory.join("dialogues.json");
    if !path.is_file() {
        return Ok(None);
    }
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let file: DialogueFile = serde_json::from_slice(&bytes)
        .map_err(|error| format!("dialogues.json 无法解析: {error}"))?;
    if file.version != 1 {
        return Err("dialogues.json 仅支持 version 1".into());
    }
    Ok(Some(sanitize_dialogues(file.groups)))
}

fn resolve_stored_dialogues(
    value: &StoredDialogueValue,
    packaged: &DialogueGroups,
) -> DialogueGroups {
    match value {
        StoredDialogueValue::Legacy(lines) => DialogueGroups {
            idle: sanitize_lines(lines.clone()),
            drag: packaged.drag.clone(),
            touch: packaged.touch.clone(),
        },
        StoredDialogueValue::Grouped(groups) => sanitize_dialogues(groups.clone()),
    }
}

pub(crate) fn materialize_dialogues(
    stored: Option<&StoredDialogueValue>,
    packaged: Option<DialogueGroups>,
) -> (DialogueGroups, Option<StoredDialogueValue>) {
    let initial = packaged.unwrap_or_default();
    match stored {
        Some(value @ StoredDialogueValue::Legacy(_)) => {
            let migrated = resolve_stored_dialogues(value, &initial);
            (
                migrated.clone(),
                Some(StoredDialogueValue::Grouped(migrated)),
            )
        }
        Some(value @ StoredDialogueValue::Grouped(_)) => {
            (resolve_stored_dialogues(value, &initial), None)
        }
        None => (initial.clone(), Some(StoredDialogueValue::Grouped(initial))),
    }
}

fn restore_dialogue_group(
    mut current: DialogueGroups,
    packaged: &DialogueGroups,
    kind: DialogueKind,
) -> DialogueGroups {
    match kind {
        DialogueKind::Idle => current.idle = packaged.idle.clone(),
        DialogueKind::Drag => current.drag = packaged.drag.clone(),
        DialogueKind::Touch => current.touch = packaged.touch.clone(),
    }
    current
}

#[tauri::command]
pub(crate) fn save_dialogues(
    app: AppHandle,
    state: State<AppState>,
    id: String,
    dialogues: DialogueGroups,
) -> Result<(), String> {
    let directory = installed_pet_dir(&state.data_dir, &id)?;
    if !directory.is_dir() {
        return Err("宠物尚未安装".into());
    }
    let mut stored = read_state(&state.data_dir)?;
    let sanitized = sanitize_dialogues(dialogues);
    stored
        .dialogues
        .insert(id, StoredDialogueValue::Grouped(sanitized));
    write_state(&state.data_dir, &stored)?;
    emit_changed(&app);
    Ok(())
}

#[tauri::command]
pub(crate) fn reset_dialogue_group(
    app: AppHandle,
    state: State<AppState>,
    id: String,
    kind: DialogueKind,
) -> Result<DialogueGroups, String> {
    let directory = installed_pet_dir(&state.data_dir, &id)?;
    if !directory.is_dir() {
        return Err("宠物尚未安装".into());
    }
    let packaged = read_dialogue_file(&directory)?.unwrap_or_default();
    let mut stored = read_state(&state.data_dir)?;
    let current = stored
        .dialogues
        .get(&id)
        .map(|value| resolve_stored_dialogues(value, &packaged))
        .unwrap_or_else(|| packaged.clone());
    let restored = restore_dialogue_group(current, &packaged, kind);
    stored
        .dialogues
        .insert(id, StoredDialogueValue::Grouped(restored.clone()));
    write_state(&state.data_dir, &stored)?;
    emit_changed(&app);
    Ok(restored)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn packaged_dialogues() -> DialogueGroups {
        DialogueGroups {
            idle: vec!["包内待机".into()],
            drag: vec!["包内拖拽".into()],
            touch: vec!["包内触摸".into()],
        }
    }

    #[test]
    fn legacy_dialogues_migrate_to_idle_and_keep_event_fallbacks() {
        let migrated = resolve_stored_dialogues(
            &StoredDialogueValue::Legacy(vec![" 旧对话 ".into()]),
            &packaged_dialogues(),
        );

        assert_eq!(migrated.idle, vec!["旧对话"]);
        assert_eq!(migrated.drag, vec!["包内拖拽"]);
        assert_eq!(migrated.touch, vec!["包内触摸"]);
    }

    #[test]
    fn legacy_dialogues_are_materialized_as_grouped_state() {
        let legacy = StoredDialogueValue::Legacy(vec!["旧对话".into()]);
        let (resolved, materialized) =
            materialize_dialogues(Some(&legacy), Some(packaged_dialogues()));

        assert_eq!(resolved.idle, vec!["旧对话"]);
        assert_eq!(resolved.drag, vec!["包内拖拽"]);
        assert_eq!(resolved.touch, vec!["包内触摸"]);
        assert!(matches!(
            materialized,
            Some(StoredDialogueValue::Grouped(_))
        ));
    }

    #[test]
    fn grouped_dialogues_keep_independent_empty_event_pools() {
        let grouped = DialogueGroups {
            idle: vec![" 待机 ".into()],
            drag: Vec::new(),
            touch: vec![" 触摸 ".into()],
        };
        let resolved = resolve_stored_dialogues(
            &StoredDialogueValue::Grouped(grouped),
            &packaged_dialogues(),
        );

        assert_eq!(resolved.idle, vec!["待机"]);
        assert!(resolved.drag.is_empty());
        assert_eq!(resolved.touch, vec!["触摸"]);
    }

    #[test]
    fn missing_state_imports_packaged_dialogues_once() {
        let (resolved, stored) = materialize_dialogues(None, Some(packaged_dialogues()));

        assert_eq!(resolved.idle, vec!["包内待机"]);
        assert_eq!(resolved.drag, vec!["包内拖拽"]);
        assert_eq!(resolved.touch, vec!["包内触摸"]);
        assert!(stored.is_some());
    }

    #[test]
    fn missing_package_dialogues_materialize_empty_groups() {
        let (resolved, stored) = materialize_dialogues(None, None);

        assert!(resolved.idle.is_empty());
        assert!(resolved.drag.is_empty());
        assert!(resolved.touch.is_empty());
        assert!(stored.is_some());
    }

    #[test]
    fn existing_state_wins_over_changed_package_dialogues() {
        let stored = StoredDialogueValue::Grouped(DialogueGroups {
            idle: vec!["用户待机".into()],
            drag: Vec::new(),
            touch: vec!["用户触摸".into()],
        });
        let changed_package = DialogueGroups {
            idle: vec!["新版包内待机".into()],
            drag: vec!["新版包内拖拽".into()],
            touch: vec!["新版包内触摸".into()],
        };

        let (resolved, materialized) = materialize_dialogues(Some(&stored), Some(changed_package));

        assert_eq!(resolved.idle, vec!["用户待机"]);
        assert!(resolved.drag.is_empty());
        assert_eq!(resolved.touch, vec!["用户触摸"]);
        assert!(materialized.is_none());
    }

    #[test]
    fn restoring_one_dialogue_group_preserves_the_other_custom_groups() {
        let current = DialogueGroups {
            idle: vec!["用户待机".into()],
            drag: vec!["用户拖拽".into()],
            touch: vec!["用户触摸".into()],
        };

        let restored = restore_dialogue_group(current, &packaged_dialogues(), DialogueKind::Drag);

        assert_eq!(restored.idle, vec!["用户待机"]);
        assert_eq!(restored.drag, vec!["包内拖拽"]);
        assert_eq!(restored.touch, vec!["用户触摸"]);
    }

    #[test]
    fn restoring_from_a_missing_package_clears_only_the_selected_group() {
        let current = DialogueGroups {
            idle: vec!["用户待机".into()],
            drag: vec!["用户拖拽".into()],
            touch: vec!["用户触摸".into()],
        };

        let restored =
            restore_dialogue_group(current, &DialogueGroups::default(), DialogueKind::Touch);

        assert_eq!(restored.idle, vec!["用户待机"]);
        assert_eq!(restored.drag, vec!["用户拖拽"]);
        assert!(restored.touch.is_empty());
    }
}
