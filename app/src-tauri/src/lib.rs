use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, &content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![write_text_file, read_text_file])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 菜单项
            let new_canvas = MenuItemBuilder::with_id("new_canvas", "新建画布").build(app)?;
            let open_json = MenuItemBuilder::with_id("open_json", "打开 JSON...").build(app)?;
            let save_json = MenuItemBuilder::with_id("save_json", "保存 JSON...").build(app)?;
            let sep1 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let import_yaml = MenuItemBuilder::with_id("import_yaml", "导入 YAML...").build(app)?;
            let sep2 = tauri::menu::PredefinedMenuItem::separator(app)?;
            let export_yaml =
                MenuItemBuilder::with_id("export_yaml", "导出 YAML...").build(app)?;
            let export_pytorch =
                MenuItemBuilder::with_id("export_pytorch", "导出 PyTorch...").build(app)?;

            let undo = MenuItemBuilder::with_id("undo", "撤销").build(app)?;
            let redo = MenuItemBuilder::with_id("redo", "重做").build(app)?;

            let fit_view = MenuItemBuilder::with_id("fit_view", "适应画布").build(app)?;

            let file_submenu = SubmenuBuilder::new(app, "文件")
                .items(&[&new_canvas, &open_json, &save_json])
                .item(&sep1)
                .items(&[&import_yaml])
                .item(&sep2)
                .items(&[&export_yaml, &export_pytorch])
                .build()?;

            let edit_submenu = SubmenuBuilder::new(app, "编辑")
                .items(&[&undo, &redo])
                .build()?;

            let view_submenu = SubmenuBuilder::new(app, "视图")
                .items(&[&fit_view])
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&file_submenu)
                .item(&edit_submenu)
                .item(&view_submenu)
                .build()?;

            app.set_menu(menu)?;

            // 系统托盘
            let show_item = MenuItemBuilder::with_id("tray_show", "显示窗口").build(app)?;
            let quit_item = MenuItemBuilder::with_id("tray_quit", "退出").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[&show_item, &quit_item])
                .build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("Block Builder")
                .on_menu_event(move |app, event| match event.id().as_ref() {
                    "tray_show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "tray_quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            // 关闭窗口时隐藏到托盘
            if let Some(window) = app.get_webview_window("main") {
                let win = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
