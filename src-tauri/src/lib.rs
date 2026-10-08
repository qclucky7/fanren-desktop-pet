mod dialogues;
mod models;
mod pets;
mod state;
mod tray;
mod windows;

use models::AppState;
use std::fs;
use tauri::{Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![tray::AUTOSTART_ARG]),
        ))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(state::pets_dir(&data_dir))?;
            let built_in_pet_ids =
                pets::seed_built_ins(app.handle(), &data_dir).map_err(std::io::Error::other)?;
            let mut stored =
                state::read_state_with_recovery(&data_dir).map_err(std::io::Error::other)?;
            let autostart_launch = tray::is_autostart_launch(std::env::args());
            let state_changed = pets::ensure_active_pet(&mut stored, &data_dir, &built_in_pet_ids);
            if state_changed {
                state::write_state(&data_dir, &stored).map_err(std::io::Error::other)?;
            }

            let initial = stored.preferences.clone();
            let initial_position = stored.pet_position;
            let initial_pet_visible = initial.pet_visible && !autostart_launch;
            app.manage(AppState {
                data_dir,
                built_in_pet_ids,
            });
            windows::position_pet_window(app.handle(), initial_position);
            windows::apply_pet_visibility(app.handle(), initial_pet_visible);
            let tray_controls = tray::setup_tray(app, initial_pet_visible)?;
            app.manage(tray_controls);
            if !autostart_launch {
                tray::show_settings_window(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "settings" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            pets::list_pets,
            state::get_preferences,
            state::update_preferences,
            pets::set_active_pet,
            dialogues::save_dialogues,
            dialogues::reset_dialogue_group,
            pets::install_pet,
            pets::uninstall_pet,
            pets::open_pet_directory,
            tray::get_autostart_enabled,
            tray::set_autostart_enabled,
            windows::get_cursor_position,
            windows::save_pet_window_position
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
