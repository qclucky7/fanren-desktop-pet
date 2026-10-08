use crate::{
    models::AppState,
    state::{emit_changed, read_state, write_state},
    tray_pets::{activate_pet_from_tray, pet_id_from_menu_id, refresh_pet_submenu},
    windows::apply_pet_visibility,
};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, Submenu},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    utils::config::Color,
    App, AppHandle, Listener, Manager, State, Theme,
};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;

#[cfg(all(debug_assertions, target_os = "windows"))]
use winreg::{enums::HKEY_CURRENT_USER, RegKey};

pub(crate) const AUTOSTART_ARG: &str = "--autostart";
static SETTINGS_BACKGROUND_INITIALIZED: AtomicBool = AtomicBool::new(false);

pub(crate) struct TrayControls {
    autostart: CheckMenuItem<tauri::Wry>,
}

fn pet_visibility_action_text(visible: bool) -> &'static str {
    if visible {
        "隐藏宠物"
    } else {
        "显示宠物"
    }
}

fn next_pet_visibility(visible: bool) -> bool {
    !visible
}

fn set_visible_from_tray(app: &AppHandle, visible: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    let mut stored = read_state(&state.data_dir)?;
    stored.preferences.pet_visible = visible;
    write_state(&state.data_dir, &stored)?;
    apply_pet_visibility(app, visible);
    emit_changed(app);
    Ok(())
}

fn toggle_pet_visibility_from_tray(app: &AppHandle, menu_item: &MenuItem<tauri::Wry>) {
    let state = app.state::<AppState>();
    let current = app
        .get_webview_window("pet")
        .and_then(|window| window.is_visible().ok())
        .or_else(|| {
            read_state(&state.data_dir)
                .ok()
                .map(|stored| stored.preferences.pet_visible)
        })
        .unwrap_or(true);
    let next = next_pet_visibility(current);
    if set_visible_from_tray(app, next).is_ok() {
        let _ = menu_item.set_text(pet_visibility_action_text(next));
    }
}

pub(crate) fn show_settings_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("settings") else {
        log::warn!("settings window is not available");
        return;
    };
    if !SETTINGS_BACKGROUND_INITIALIZED.swap(true, Ordering::Relaxed) {
        let background = match window.theme() {
            Ok(Theme::Light) => Color(245, 246, 242, 255),
            _ => Color(18, 27, 24, 255),
        };
        if let Err(error) = window.set_background_color(Some(background)) {
            log::warn!("failed to set settings window background: {error}");
        }
    }
    if let Err(error) = window.show() {
        log::warn!("failed to show settings window: {error}");
    }
    if let Err(error) = window.unminimize() {
        log::warn!("failed to restore settings window: {error}");
    }
    if let Err(error) = window.set_focus() {
        log::warn!("failed to focus settings window: {error}");
    }
}

fn should_open_settings_on_tray_double_click(button: MouseButton) -> bool {
    matches!(button, MouseButton::Left)
}

pub(crate) fn is_autostart_launch<I, S>(args: I) -> bool
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    args.into_iter()
        .any(|argument| argument.as_ref() == AUTOSTART_ARG)
}

fn next_autostart_state(enabled: bool) -> bool {
    !enabled
}

fn autostart_available() -> bool {
    !cfg!(debug_assertions)
}

#[cfg(all(debug_assertions, target_os = "windows"))]
fn remove_current_debug_autostart(app: &App) {
    const RUN_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run";
    let Ok(current_exe) = std::env::current_exe() else {
        return;
    };
    let app_name = &app.package_info().name;
    let Ok(run_key) = RegKey::predef(HKEY_CURRENT_USER).open_subkey(RUN_KEY) else {
        return;
    };
    let Ok(command) = run_key.get_value::<String, _>(app_name) else {
        return;
    };
    let current_exe = current_exe.to_string_lossy();
    if command.contains(current_exe.as_ref()) && command.contains(AUTOSTART_ARG) {
        if let Err(error) = app.autolaunch().disable() {
            log::warn!("failed to remove development autostart entry: {error}");
        } else {
            log::info!("removed development autostart entry");
        }
    }
}

#[cfg(not(all(debug_assertions, target_os = "windows")))]
fn remove_current_debug_autostart(_app: &App) {}

fn set_autostart(
    app: &AppHandle,
    menu_item: &CheckMenuItem<tauri::Wry>,
    enabled: bool,
) -> Result<bool, String> {
    if enabled && !autostart_available() {
        return Err("开发模式不能开启开机自启，请安装正式版后设置".into());
    }
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable()
    } else {
        autostart.disable()
    }
    .map_err(|error| error.to_string())?;
    menu_item
        .set_checked(enabled)
        .map_err(|error| error.to_string())?;
    Ok(enabled)
}

fn toggle_autostart_from_tray(app: &AppHandle, menu_item: &CheckMenuItem<tauri::Wry>) {
    let current = match app.autolaunch().is_enabled() {
        Ok(enabled) => enabled,
        Err(error) => {
            log::warn!("failed to read autostart state: {error}");
            let _ = menu_item.set_checked(false);
            return;
        }
    };
    if let Err(error) = set_autostart(app, menu_item, next_autostart_state(current)) {
        log::warn!("failed to change autostart state: {error}");
        let _ = menu_item.set_checked(current);
    }
}

#[tauri::command]
pub(crate) fn get_autostart_enabled(app: AppHandle) -> Result<bool, String> {
    if !autostart_available() {
        return Ok(false);
    }
    app.autolaunch()
        .is_enabled()
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn set_autostart_enabled(
    app: AppHandle,
    controls: State<TrayControls>,
    enabled: bool,
) -> Result<bool, String> {
    set_autostart(&app, &controls.autostart, enabled)
}

pub(crate) fn setup_tray(app: &App, pet_visible: bool) -> tauri::Result<TrayControls> {
    remove_current_debug_autostart(app);
    let toggle_visibility = MenuItem::with_id(
        app,
        "toggle-pet-visibility",
        pet_visibility_action_text(pet_visible),
        true,
        None::<&str>,
    )?;
    let toggle_visibility_for_event = toggle_visibility.clone();
    let autostart_enabled = if autostart_available() {
        app.autolaunch().is_enabled().unwrap_or_else(|error| {
            log::warn!("failed to read initial autostart state: {error}");
            false
        })
    } else {
        false
    };
    let autostart = CheckMenuItem::with_id(
        app,
        "autostart",
        "开机自启",
        autostart_available(),
        autostart_enabled,
        None::<&str>,
    )?;
    let autostart_for_event = autostart.clone();
    let pet_list = Submenu::with_id(app, "pet-list", "宠物列表", true)?;
    refresh_pet_submenu(app.handle(), &pet_list).map_err(std::io::Error::other)?;
    let pet_list_for_event = pet_list.clone();
    let settings = MenuItem::with_id(app, "settings", "宠物设置", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[&toggle_visibility, &pet_list, &autostart, &settings, &quit],
    )?;
    TrayIconBuilder::new()
        .icon(
            app.default_window_icon()
                .expect("missing application icon")
                .clone(),
        )
        .tooltip("凡人修仙传桌宠")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { button, .. } = event {
                if should_open_settings_on_tray_double_click(button) {
                    show_settings_window(tray.app_handle());
                }
            }
        })
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "toggle-pet-visibility" => {
                toggle_pet_visibility_from_tray(app, &toggle_visibility_for_event)
            }
            "autostart" => toggle_autostart_from_tray(app, &autostart_for_event),
            "settings" => show_settings_window(app),
            "quit" => app.exit(0),
            _ => {
                if let Some(id) = pet_id_from_menu_id(event.id.as_ref()) {
                    if let Err(error) = activate_pet_from_tray(app, id) {
                        log::warn!("failed to activate pet from tray: {error}");
                        let _ = refresh_pet_submenu(app, &pet_list_for_event);
                    }
                }
            }
        })
        .build(app)?;
    let app_handle = app.handle().clone();
    app.listen("player-state-changed", move |_| {
        if let Err(error) = refresh_pet_submenu(&app_handle, &pet_list) {
            log::warn!("failed to refresh tray pet list: {error}");
        }
    });
    Ok(TrayControls { autostart })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_visibility_action_matches_and_toggles_current_state() {
        assert_eq!(pet_visibility_action_text(true), "隐藏宠物");
        assert!(!next_pet_visibility(true));

        assert_eq!(pet_visibility_action_text(false), "显示宠物");
        assert!(next_pet_visibility(false));
    }

    #[test]
    fn only_primary_tray_double_click_opens_settings() {
        assert!(should_open_settings_on_tray_double_click(MouseButton::Left));
        assert!(!should_open_settings_on_tray_double_click(
            MouseButton::Right
        ));
        assert!(!should_open_settings_on_tray_double_click(
            MouseButton::Middle
        ));
    }

    #[test]
    fn autostart_launch_requires_the_dedicated_exact_argument() {
        assert!(is_autostart_launch([
            "fanren-desktop-pet.exe",
            AUTOSTART_ARG
        ]));
        assert!(!is_autostart_launch(["fanren-desktop-pet.exe"]));
        assert!(!is_autostart_launch([
            "fanren-desktop-pet.exe",
            "--autostart=true"
        ]));
    }

    #[test]
    fn tray_autostart_action_toggles_current_state() {
        assert!(next_autostart_state(false));
        assert!(!next_autostart_state(true));
    }

    #[test]
    fn autostart_is_available_only_in_packaged_builds() {
        assert_eq!(autostart_available(), !cfg!(debug_assertions));
    }
}
