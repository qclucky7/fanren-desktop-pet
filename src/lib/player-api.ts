import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { DEFAULT_PREFERENCES, DISCOVERED_PETS, loadBrowserPets } from "@/data/pet-catalog";
import { MAX_DIALOGUE_SECONDS, MIN_DIALOGUE_SECONDS, type DialogueGroups, type DialogueKind, type PetRecord, type PlayerPreferences } from "./types";

const PREFS_KEY = "fanren-desktop-pet.preferences";
const DIALOGUES_KEY = "fanren-desktop-pet.dialogues";
const AUTOSTART_KEY = "fanren-desktop-pet.autostart-preview";
const STATE_CHANGE_EVENT = "fanren-desktop-pet-state-changed";

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedLines(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((line) => typeof line === "string")) return null;
  return value.map((line) => line.trim()).filter(Boolean);
}

function normalizedDialogueGroups(value: unknown): DialogueGroups | null {
  if (!isRecord(value)) return null;
  const idle = normalizedLines(value.idle);
  const drag = normalizedLines(value.drag);
  const touch = normalizedLines(value.touch);
  return idle && drag && touch ? { idle, drag, touch } : null;
}

function petExists(id: string | null): id is string {
  return id !== null && DISCOVERED_PETS.some((pet) => pet.id === id);
}

function normalizeBrowserPreferences(value: unknown): PlayerPreferences {
  const source = isRecord(value) ? value : {};
  const activeCandidate = typeof source.activePetId === "string" ? source.activePetId : null;
  const numberValue = (key: keyof PlayerPreferences, fallback: number) => {
    const candidate = source[key];
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
  };
  const minDialogueSeconds = Math.min(
    MAX_DIALOGUE_SECONDS,
    Math.max(
      MIN_DIALOGUE_SECONDS,
      Math.round(numberValue("minDialogueSeconds", DEFAULT_PREFERENCES.minDialogueSeconds)),
    ),
  );
  const maxDialogueSeconds = Math.min(
    MAX_DIALOGUE_SECONDS,
    Math.max(
      minDialogueSeconds,
      Math.round(numberValue("maxDialogueSeconds", DEFAULT_PREFERENCES.maxDialogueSeconds)),
    ),
  );
  return {
    activePetId: petExists(activeCandidate) ? activeCandidate : DEFAULT_PREFERENCES.activePetId,
    petVisible: typeof source.petVisible === "boolean" ? source.petVisible : DEFAULT_PREFERENCES.petVisible,
    dialogueEnabled: typeof source.dialogueEnabled === "boolean"
      ? source.dialogueEnabled
      : DEFAULT_PREFERENCES.dialogueEnabled,
    minDialogueSeconds,
    maxDialogueSeconds,
    bubbleSeconds: Math.min(30, Math.max(2, Math.round(numberValue("bubbleSeconds", DEFAULT_PREFERENCES.bubbleSeconds)))),
    scalePercent: Math.min(200, Math.max(40, Math.round(numberValue("scalePercent", DEFAULT_PREFERENCES.scalePercent)))),
  };
}

export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export interface CursorPosition {
  x: number;
  y: number;
  leftButtonDown: boolean;
}

export async function getCursorPosition(): Promise<CursorPosition | null> {
  if (!isTauriRuntime()) return null;
  return invoke<CursorPosition>("get_cursor_position");
}

export async function savePetWindowPosition() {
  if (!isTauriRuntime()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const position = await getCurrentWindow().outerPosition();
  return invoke<void>("save_pet_window_position", { x: position.x, y: position.y });
}

function browserPreferences(): PlayerPreferences {
  const raw = localStorage.getItem(PREFS_KEY);
  const normalized = normalizeBrowserPreferences(parseJson(raw));
  if (raw !== JSON.stringify(normalized)) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

async function browserPets(): Promise<PetRecord[]> {
  const bundledPets = await loadBrowserPets();
  const raw = localStorage.getItem(DIALOGUES_KEY);
  const parsed = parseJson(raw);
  const saved: Record<string, DialogueGroups | string[]> = {};
  if (isRecord(parsed)) {
    for (const [id, value] of Object.entries(parsed)) {
      const legacy = normalizedLines(value);
      const grouped = normalizedDialogueGroups(value);
      if (legacy) saved[id] = legacy;
      else if (grouped) saved[id] = grouped;
    }
  }
  let changed = !isRecord(parsed);
  const discoveredIds = new Set(DISCOVERED_PETS.map((pet) => pet.id));
  for (const id of Object.keys(saved)) {
    if (!discoveredIds.has(id)) {
      delete saved[id];
      changed = true;
    }
  }
  const pets = bundledPets.map((pet) => {
    const override = saved[pet.id];
    let dialogues: DialogueGroups;
    if (Array.isArray(override)) {
      dialogues = {
        idle: [...override],
        drag: [...pet.dialogues.drag],
        touch: [...pet.dialogues.touch],
      };
      saved[pet.id] = dialogues;
      changed = true;
    } else if (override) {
      dialogues = {
        idle: [...override.idle],
        drag: [...override.drag],
        touch: [...override.touch],
      };
    } else {
      dialogues = {
        idle: [...pet.dialogues.idle],
        drag: [...pet.dialogues.drag],
        touch: [...pet.dialogues.touch],
      };
      saved[pet.id] = dialogues;
      changed = true;
    }
    return { ...pet, dialogues };
  });
  const serialized = JSON.stringify(saved);
  if (changed || raw !== serialized) localStorage.setItem(DIALOGUES_KEY, serialized);
  return pets;
}

export async function listPets(): Promise<PetRecord[]> {
  if (!isTauriRuntime()) return browserPets();
  const pets = await invoke<Array<Omit<PetRecord, "previewUrl">>>("list_pets");
  const builtInPreviews = new Map(
    DISCOVERED_PETS.flatMap((pet) => pet.previewUrl ? [[pet.id, pet.previewUrl] as const] : []),
  );
  return pets.map((pet) => ({
    ...pet,
    spritesheetUrl: convertFileSrc(pet.spritesheetUrl),
    previewUrl: builtInPreviews.get(pet.id) ?? convertFileSrc(pet.spritesheetUrl),
  }));
}

export async function getPreferences(): Promise<PlayerPreferences> {
  return isTauriRuntime() ? invoke<PlayerPreferences>("get_preferences") : browserPreferences();
}

export async function updatePreferences(preferences: PlayerPreferences) {
  if (isTauriRuntime()) return invoke<PlayerPreferences>("update_preferences", { preferences });
  const normalized = normalizeBrowserPreferences(preferences);
  localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(STATE_CHANGE_EVENT));
  return normalized;
}

export async function setActivePet(id: string) {
  if (isTauriRuntime()) return invoke<PlayerPreferences>("set_active_pet", { id });
  if (!petExists(id)) throw new Error("宠物尚未安装");
  return updatePreferences({ ...browserPreferences(), activePetId: id });
}

export async function saveDialogues(id: string, dialogues: DialogueGroups) {
  if (isTauriRuntime()) return invoke<void>("save_dialogues", { id, dialogues });
  if (!petExists(id)) throw new Error("宠物尚未安装");
  const raw = localStorage.getItem(DIALOGUES_KEY);
  const parsed = parseJson(raw);
  const saved = isRecord(parsed) ? parsed : {};
  const normalized = normalizedDialogueGroups(dialogues) ?? { idle: [], drag: [], touch: [] };
  saved[id] = normalized;
  localStorage.setItem(DIALOGUES_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event(STATE_CHANGE_EVENT));
}

export async function resetDialogueGroup(id: string, kind: DialogueKind): Promise<DialogueGroups> {
  if (isTauriRuntime()) {
    return invoke<DialogueGroups>("reset_dialogue_group", { id, kind });
  }
  const pet = DISCOVERED_PETS.find((candidate) => candidate.id === id);
  if (!pet) throw new Error("宠物尚未安装");
  const raw = localStorage.getItem(DIALOGUES_KEY);
  const parsed = parseJson(raw);
  const saved: Record<string, DialogueGroups | string[]> = {};
  if (isRecord(parsed)) {
    for (const [savedId, value] of Object.entries(parsed)) {
      const legacy = normalizedLines(value);
      const grouped = normalizedDialogueGroups(value);
      if (legacy) saved[savedId] = legacy;
      else if (grouped) saved[savedId] = grouped;
    }
  }
  const packaged = pet.dialogues;
  const stored = saved[id];
  const current = Array.isArray(stored)
    ? { idle: stored, drag: packaged.drag, touch: packaged.touch }
    : stored ?? packaged;
  const restored: DialogueGroups = {
    idle: [...current.idle],
    drag: [...current.drag],
    touch: [...current.touch],
    [kind]: [...packaged[kind]],
  };
  saved[id] = restored;
  localStorage.setItem(DIALOGUES_KEY, JSON.stringify(saved));
  window.dispatchEvent(new Event(STATE_CHANGE_EVENT));
  return restored;
}

export async function installPet() {
  if (!isTauriRuntime()) throw new Error("浏览器预览模式不能安装宠物，请在 Tauri 应用中使用此功能。");
  const directory = await open({ directory: true, multiple: false, title: "选择 Codex 宠物目录" });
  if (!directory) return null;
  return invoke<PetRecord>("install_pet", { sourceDirectory: directory });
}

export async function uninstallPet(id: string) {
  if (!isTauriRuntime()) throw new Error("浏览器预览模式不能卸载宠物。");
  return invoke<void>("uninstall_pet", { id });
}

export async function getAutostartEnabled(): Promise<boolean> {
  if (isTauriRuntime()) return invoke<boolean>("get_autostart_enabled");
  return localStorage.getItem(AUTOSTART_KEY) === "true";
}

export async function setAutostartEnabled(enabled: boolean): Promise<boolean> {
  if (isTauriRuntime()) {
    return invoke<boolean>("set_autostart_enabled", { enabled });
  }
  localStorage.setItem(AUTOSTART_KEY, String(enabled));
  return enabled;
}

export async function openPetDirectory(): Promise<void> {
  if (!isTauriRuntime()) {
    throw new Error("浏览器预览模式无法打开本地宠物目录，请在桌面应用中使用此功能。");
  }
  return invoke<void>("open_pet_directory");
}

export async function subscribeToStateChanges(callback: () => void): Promise<UnlistenFn> {
  if (isTauriRuntime()) return listen("player-state-changed", callback);
  const listener = () => callback();
  window.addEventListener(STATE_CHANGE_EVENT, listener);
  return () => window.removeEventListener(STATE_CHANGE_EVENT, listener);
}
