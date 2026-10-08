import { DEFAULT_MAX_DIALOGUE_SECONDS, DEFAULT_MIN_DIALOGUE_SECONDS, type DialogueGroups, type PetRecord, type PlayerPreferences } from "@/lib/types";

interface PetManifest {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 2;
  spritesheetPath: string;
}

interface DialogueFile extends DialogueGroups {
  version: 1;
}

export const DEFAULT_PET_ID = "songyu";

const manifestModules = import.meta.glob<PetManifest>("../../pets/*/pet.json", {
  eager: true,
  import: "default",
});
const spritesheetModules = import.meta.glob<string>([
  "../../pets/**/*.webp",
  "!../../pets/*/preview.webp",
], {
  import: "default",
  query: "?url",
});
const previewModules = import.meta.glob<string>("../../pets/*/preview.webp", {
  eager: true,
  import: "default",
  query: "?url",
});
const dialogueModules = import.meta.glob<DialogueFile>("../../pets/*/dialogues.json", {
  eager: true,
  import: "default",
});
function petIdFromManifestPath(path: string) {
  const match = path.match(/\/([^/]+)\/pet\.json$/);
  if (!match) throw new Error(`无法从宠物路径识别 ID：${path}`);
  return match[1];
}

function emptyDialogues(): DialogueGroups {
  return { idle: [], drag: [], touch: [] };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

type DiscoveredPet = Omit<PetRecord, "spritesheetUrl" | "previewUrl"> & {
  previewUrl: string | null;
};

const spritesheetLoaders = new Map<string, () => Promise<string>>();

export const DISCOVERED_PETS: DiscoveredPet[] = Object.entries(manifestModules)
  .map(([manifestPath, manifest]) => {
    const directoryId = petIdFromManifestPath(manifestPath);
    if (manifest.id !== directoryId) {
      throw new Error(`宠物目录 ${directoryId} 与 pet.json ID ${manifest.id} 不一致`);
    }
    if (
      manifest.spriteVersionNumber !== 2
      || !manifest.spritesheetPath
      || manifest.spritesheetPath.startsWith("/")
      || manifest.spritesheetPath.includes("..")
    ) {
      throw new Error(`内置宠物 ${manifest.id} 的 spritesheetPath 无效`);
    }
    const basePath = manifestPath.slice(0, -"pet.json".length);
    const spritesheetLoader = spritesheetModules[`${basePath}${manifest.spritesheetPath}`];
    if (!spritesheetLoader) {
      throw new Error(`内置宠物 ${manifest.id} 找不到 ${manifest.spritesheetPath}`);
    }
    spritesheetLoaders.set(manifest.id, spritesheetLoader);
    const dialogueFile = dialogueModules[`${basePath}dialogues.json`];
    if (
      dialogueFile
      && (
        dialogueFile.version !== 1
        || !isStringArray(dialogueFile.idle)
        || !isStringArray(dialogueFile.drag)
        || !isStringArray(dialogueFile.touch)
      )
    ) {
      throw new Error(`内置宠物 ${manifest.id} 的 dialogues.json 格式无效`);
    }
    const dialogues = dialogueFile
      ? {
          idle: [...dialogueFile.idle],
          drag: [...dialogueFile.drag],
          touch: [...dialogueFile.touch],
        }
      : emptyDialogues();
    return {
      ...manifest,
      previewUrl: previewModules[`${basePath}preview.webp`] ?? null,
      dialogues,
      builtIn: true,
    };
  })
  .sort((left, right) => left.id.localeCompare(right.id));

export async function loadBrowserPets(): Promise<PetRecord[]> {
  return Promise.all(DISCOVERED_PETS.map(async (pet) => {
    const loadSpritesheet = spritesheetLoaders.get(pet.id);
    if (!loadSpritesheet) throw new Error(`内置宠物 ${pet.id} 缺少图集加载器`);
    const spritesheetUrl = await loadSpritesheet();
    return {
      ...pet,
      spritesheetUrl,
      previewUrl: pet.previewUrl ?? spritesheetUrl,
    };
  }));
}

export const DEFAULT_PREFERENCES: PlayerPreferences = {
  activePetId: DISCOVERED_PETS.some((pet) => pet.id === DEFAULT_PET_ID)
    ? DEFAULT_PET_ID
    : DISCOVERED_PETS[0]?.id ?? null,
  petVisible: true,
  dialogueEnabled: true,
  minDialogueSeconds: DEFAULT_MIN_DIALOGUE_SECONDS,
  maxDialogueSeconds: DEFAULT_MAX_DIALOGUE_SECONDS,
  bubbleSeconds: 6,
  scalePercent: 100,
};
