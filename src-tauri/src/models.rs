use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeSet, HashMap},
    path::PathBuf,
};

pub(crate) const MIN_DIALOGUE_SECONDS: u32 = 10;
pub(crate) const MAX_DIALOGUE_SECONDS: u32 = 60;
pub(crate) const DEFAULT_MIN_DIALOGUE_SECONDS: u32 = 10;
pub(crate) const DEFAULT_MAX_DIALOGUE_SECONDS: u32 = 20;

pub(crate) struct AppState {
    pub(crate) data_dir: PathBuf,
    pub(crate) built_in_pet_ids: BTreeSet<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PlayerPreferences {
    pub(crate) active_pet_id: Option<String>,
    pub(crate) pet_visible: bool,
    pub(crate) dialogue_enabled: bool,
    pub(crate) min_dialogue_seconds: u32,
    pub(crate) max_dialogue_seconds: u32,
    pub(crate) bubble_seconds: u32,
    pub(crate) scale_percent: u32,
}

impl Default for PlayerPreferences {
    fn default() -> Self {
        Self {
            active_pet_id: None,
            pet_visible: true,
            dialogue_enabled: true,
            min_dialogue_seconds: DEFAULT_MIN_DIALOGUE_SECONDS,
            max_dialogue_seconds: DEFAULT_MAX_DIALOGUE_SECONDS,
            bubble_seconds: 6,
            scale_percent: 100,
        }
    }
}

#[derive(Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredState {
    pub(crate) preferences: PlayerPreferences,
    pub(crate) dialogues: HashMap<String, StoredDialogueValue>,
    #[serde(default)]
    pub(crate) pet_position: Option<StoredWindowPosition>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct StoredWindowPosition {
    pub(crate) x: i32,
    pub(crate) y: i32,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub(crate) enum StoredDialogueValue {
    Legacy(Vec<String>),
    Grouped(DialogueGroups),
}

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DialogueGroups {
    #[serde(default)]
    pub(crate) idle: Vec<String>,
    #[serde(default)]
    pub(crate) drag: Vec<String>,
    #[serde(default)]
    pub(crate) touch: Vec<String>,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum DialogueKind {
    Idle,
    Drag,
    Touch,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CursorPosition {
    pub(crate) x: i32,
    pub(crate) y: i32,
    pub(crate) left_button_down: bool,
}
