use crate::{
    models::AppState,
    pets::{installed_pet_names, set_active_pet},
    state::read_state,
};
use tauri::{
    menu::{CheckMenuItem, MenuItem, Submenu},
    AppHandle, Manager, Wry,
};

const PET_MENU_PREFIX: &str = "pet:";

#[derive(Debug, PartialEq, Eq)]
struct PetMenuEntry {
    menu_id: String,
    label: String,
    checked: bool,
}

pub(crate) fn pet_id_from_menu_id(id: &str) -> Option<&str> {
    id.strip_prefix(PET_MENU_PREFIX)
        .filter(|pet_id| !pet_id.is_empty())
}

fn pet_menu_entries(names: &[(String, String)], active_id: Option<&str>) -> Vec<PetMenuEntry> {
    names
        .iter()
        .map(|(id, label)| PetMenuEntry {
            menu_id: format!("{PET_MENU_PREFIX}{id}"),
            label: label.clone(),
            checked: active_id == Some(id.as_str()),
        })
        .collect()
}

pub(crate) fn refresh_pet_submenu(app: &AppHandle, submenu: &Submenu<Wry>) -> Result<(), String> {
    let state = app.state::<AppState>();
    let names = installed_pet_names(&state.data_dir)?;
    let stored = read_state(&state.data_dir)?;
    let entries = pet_menu_entries(&names, stored.preferences.active_pet_id.as_deref());
    let items = entries
        .iter()
        .map(|entry| {
            CheckMenuItem::with_id(
                app,
                entry.menu_id.as_str(),
                entry.label.as_str(),
                true,
                entry.checked,
                None::<&str>,
            )
            .map_err(|error| error.to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;
    let empty_item = if items.is_empty() {
        Some(
            MenuItem::with_id(app, "pet-list-empty", "暂无宠物", false, None::<&str>)
                .map_err(|error| error.to_string())?,
        )
    } else {
        None
    };

    while submenu
        .remove_at(0)
        .map_err(|error| error.to_string())?
        .is_some()
    {}
    if let Some(empty_item) = empty_item {
        submenu
            .append(&empty_item)
            .map_err(|error| error.to_string())?;
    } else {
        for item in &items {
            submenu.append(item).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

pub(crate) fn activate_pet_from_tray(app: &AppHandle, id: &str) -> Result<(), String> {
    let state = app.state::<AppState>();
    set_active_pet(app.clone(), state, id.to_string()).map(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pet_menu_id_only_accepts_nonempty_pet_ids() {
        assert_eq!(pet_id_from_menu_id("pet:songyu"), Some("songyu"));
        assert_eq!(pet_id_from_menu_id("pet:"), None);
        assert_eq!(pet_id_from_menu_id("settings"), None);
    }

    #[test]
    fn pet_menu_entries_check_only_the_active_pet() {
        let names = vec![
            ("first-pet".to_string(), "第一只".to_string()),
            ("second-pet".to_string(), "第二只".to_string()),
        ];
        let entries = pet_menu_entries(&names, Some("second-pet"));

        assert_eq!(entries[0].menu_id, "pet:first-pet");
        assert!(!entries[0].checked);
        assert_eq!(entries[1].label, "第二只");
        assert!(entries[1].checked);
    }
}
