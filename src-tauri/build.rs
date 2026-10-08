use std::{env, fs, io, path::PathBuf};

fn clear_staged_pet_resources() -> io::Result<()> {
    let out_dir = PathBuf::from(
        env::var_os("OUT_DIR")
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "OUT_DIR 未设置"))?,
    );
    let profile_dir = out_dir
        .ancestors()
        .nth(3)
        .ok_or_else(|| io::Error::other("无法从 OUT_DIR 定位 Cargo profile 目录"))?;
    let profile = env::var_os("PROFILE")
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "PROFILE 未设置"))?;
    if profile_dir.file_name() != Some(profile.as_ref()) {
        return Err(io::Error::other(
            "拒绝清理无法确认属于当前 Cargo profile 的资源目录",
        ));
    }

    let staged_pets = profile_dir.join("_up_").join("pets");
    if staged_pets.is_dir() {
        fs::remove_dir_all(staged_pets)?;
    }
    Ok(())
}

fn main() {
    // Tauri embeds this file into the Windows executable. Track it explicitly so
    // `tauri dev` does not keep serving a stale debug executable after an icon update.
    println!("cargo:rerun-if-changed=icons/icon.ico");
    // Cargo otherwise tracks only the resource files that existed during the last
    // build. Watching the source directory makes newly added or removed pet packages
    // rebuild Tauri's debug resource staging before the application starts.
    println!("cargo:rerun-if-changed=../pets");
    clear_staged_pet_resources().expect("无法清理旧的宠物资源暂存目录");
    tauri_build::build()
}
