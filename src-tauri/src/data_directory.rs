use std::path::{Path, PathBuf};

pub(crate) fn application_data_directory(data_root: &Path) -> PathBuf {
    data_root.join("fanren-desktop-pet")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_data_uses_the_requested_directory_name() {
        let root = Path::new("C:/Users/test/AppData/Roaming");
        assert_eq!(
            application_data_directory(root),
            root.join("fanren-desktop-pet")
        );
    }
}
