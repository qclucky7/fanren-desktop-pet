use crate::{
    models::{AppState, CursorPosition, StoredWindowPosition},
    state::{read_state, write_state},
};
use tauri::{AppHandle, Manager, PhysicalPosition, Position, State};

#[cfg(target_os = "windows")]
#[repr(C)]
struct WindowsPoint {
    x: i32,
    y: i32,
}

#[derive(Clone, Copy)]
#[repr(C)]
struct WindowsRect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

#[cfg(target_os = "windows")]
#[link(name = "user32")]
extern "system" {
    fn GetCursorPos(point: *mut WindowsPoint) -> i32;
    fn GetAsyncKeyState(virtual_key: i32) -> i16;
    fn SystemParametersInfoW(
        action: u32,
        parameter: u32,
        value: *mut WindowsRect,
        update_flags: u32,
    ) -> i32;
}

fn bottom_right_position(
    work_area: WindowsRect,
    window_width: u32,
    window_height: u32,
    margin: i32,
) -> (i32, i32) {
    let margin = i64::from(margin.max(0));
    let x = (i64::from(work_area.right) - i64::from(window_width) - margin)
        .max(i64::from(work_area.left));
    let y = (i64::from(work_area.bottom) - i64::from(window_height) - margin)
        .max(i64::from(work_area.top));
    (x as i32, y as i32)
}

fn window_position_is_visible(
    position: StoredWindowPosition,
    window_width: u32,
    window_height: u32,
    monitor: WindowsRect,
    minimum_visible: u32,
) -> bool {
    let window_left = i64::from(position.x);
    let window_top = i64::from(position.y);
    let window_right = window_left + i64::from(window_width);
    let window_bottom = window_top + i64::from(window_height);
    let visible_width = window_right
        .min(i64::from(monitor.right))
        .saturating_sub(window_left.max(i64::from(monitor.left)));
    let visible_height = window_bottom
        .min(i64::from(monitor.bottom))
        .saturating_sub(window_top.max(i64::from(monitor.top)));
    let required_width = i64::from(minimum_visible.min(window_width));
    let required_height = i64::from(minimum_visible.min(window_height));

    visible_width >= required_width && visible_height >= required_height
}

#[cfg(target_os = "windows")]
fn primary_work_area() -> Option<WindowsRect> {
    const SPI_GETWORKAREA: u32 = 0x0030;
    let mut area = WindowsRect {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
    };
    let succeeded = unsafe { SystemParametersInfoW(SPI_GETWORKAREA, 0, &mut area, 0) };
    (succeeded != 0).then_some(area)
}

#[tauri::command]
pub(crate) fn get_cursor_position() -> Result<CursorPosition, String> {
    #[cfg(target_os = "windows")]
    {
        let mut point = WindowsPoint { x: 0, y: 0 };
        let succeeded = unsafe { GetCursorPos(&mut point) };
        if succeeded == 0 {
            return Err("无法读取鼠标位置".into());
        }
        return Ok(CursorPosition {
            x: point.x,
            y: point.y,
            left_button_down: unsafe { GetAsyncKeyState(0x01) } < 0,
        });
    }

    #[cfg(not(target_os = "windows"))]
    Err("当前平台暂不支持全局鼠标跟随".into())
}

pub(crate) fn apply_pet_visibility(app: &AppHandle, visible: bool) {
    if let Some(window) = app.get_webview_window("pet") {
        let _ = if visible {
            window.show()
        } else {
            window.hide()
        };
    }
}

pub(crate) fn position_pet_window(app: &AppHandle, saved_position: Option<StoredWindowPosition>) {
    let Some(window) = app.get_webview_window("pet") else {
        return;
    };
    let Ok(window_size) = window.outer_size() else {
        return;
    };

    if let Some(position) = saved_position {
        let is_visible = window
            .available_monitors()
            .map(|monitors| {
                monitors.iter().any(|monitor| {
                    let monitor_position = monitor.position();
                    let monitor_size = monitor.size();
                    let monitor_width = i32::try_from(monitor_size.width).unwrap_or(i32::MAX);
                    let monitor_height = i32::try_from(monitor_size.height).unwrap_or(i32::MAX);
                    window_position_is_visible(
                        position,
                        window_size.width,
                        window_size.height,
                        WindowsRect {
                            left: monitor_position.x,
                            top: monitor_position.y,
                            right: monitor_position.x.saturating_add(monitor_width),
                            bottom: monitor_position.y.saturating_add(monitor_height),
                        },
                        48,
                    )
                })
            })
            .unwrap_or(false);
        if is_visible {
            log::info!(
                "restoring saved pet window position: ({}, {})",
                position.x,
                position.y
            );
            let _ = window.set_position(Position::Physical(PhysicalPosition::new(
                position.x, position.y,
            )));
            return;
        }
    }

    #[cfg(target_os = "windows")]
    if let Some(work_area) = primary_work_area() {
        let (x, y) = bottom_right_position(work_area, window_size.width, window_size.height, 24);
        log::info!(
            "positioning pet window: work_area=({}, {}, {}, {}), outer_size={}x{}, position=({}, {})",
            work_area.left,
            work_area.top,
            work_area.right,
            work_area.bottom,
            window_size.width,
            window_size.height,
            x,
            y
        );
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
        return;
    }

    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let monitor_size = monitor.size();
    let monitor_position = monitor.position();
    let monitor_width = i32::try_from(monitor_size.width).unwrap_or(i32::MAX);
    let monitor_height = i32::try_from(monitor_size.height).unwrap_or(i32::MAX);
    let monitor_area = WindowsRect {
        left: monitor_position.x,
        top: monitor_position.y,
        right: monitor_position.x.saturating_add(monitor_width),
        bottom: monitor_position.y.saturating_add(monitor_height),
    };
    let (x, y) = bottom_right_position(monitor_area, window_size.width, window_size.height, 24);
    let _ = window.set_position(Position::Physical(PhysicalPosition::new(x, y)));
}

#[tauri::command]
pub(crate) fn save_pet_window_position(
    state: State<AppState>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let mut stored = read_state(&state.data_dir)?;
    stored.pet_position = Some(StoredWindowPosition { x, y });
    write_state(&state.data_dir, &stored)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pet_window_position_uses_work_area_edges_and_equal_margins() {
        let work_area = WindowsRect {
            left: 0,
            top: 0,
            right: 2560,
            bottom: 1552,
        };

        assert_eq!(bottom_right_position(work_area, 320, 360, 24), (2216, 1168));
    }

    #[test]
    fn pet_window_position_preserves_negative_monitor_coordinates() {
        let work_area = WindowsRect {
            left: -1920,
            top: 0,
            right: 0,
            bottom: 1040,
        };

        assert_eq!(bottom_right_position(work_area, 320, 360, 24), (-344, 656));
    }

    #[test]
    fn saved_pet_position_requires_a_visible_window_area() {
        let monitor = WindowsRect {
            left: 0,
            top: 0,
            right: 1920,
            bottom: 1080,
        };
        let partially_visible = StoredWindowPosition { x: 1872, y: 1032 };
        let off_screen = StoredWindowPosition { x: 1920, y: 1080 };

        assert!(window_position_is_visible(
            partially_visible,
            320,
            360,
            monitor,
            48
        ));
        assert!(!window_position_is_visible(
            off_screen, 320, 360, monitor, 48
        ));
    }
}
