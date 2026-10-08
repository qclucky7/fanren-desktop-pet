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
fn tray_choices_only_include_valid_installed_packages() {
    let data_dir = temporary_directory("tray-choices");
    let root = pets_dir(&data_dir);
    let valid = root.join("valid-pet");
    let broken = root.join("broken-pet");
    let mismatched = root.join("wrong-folder");
    for directory in [&valid, &broken, &mismatched] {
        fs::create_dir_all(directory).unwrap();
    }
    fs::write(
        valid.join("pet.json"),
        r#"{"id":"valid-pet","displayName":"有效角色","description":"","spriteVersionNumber":2,"spritesheetPath":"spritesheet.webp"}"#,
    )
    .unwrap();
    fs::write(valid.join("spritesheet.webp"), b"atlas").unwrap();
    fs::write(broken.join("pet.json"), b"{not json").unwrap();
    fs::write(
        mismatched.join("pet.json"),
        r#"{"id":"other-pet","displayName":"错误目录","description":"","spriteVersionNumber":2,"spritesheetPath":"spritesheet.webp"}"#,
    )
    .unwrap();
    fs::write(mismatched.join("spritesheet.webp"), b"atlas").unwrap();

    assert_eq!(
        installed_pet_names(&data_dir).unwrap(),
        vec![("valid-pet".into(), "有效角色".into())]
    );
    fs::remove_dir_all(data_dir).unwrap();
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
