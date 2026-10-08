export type DialogueKind = "idle" | "drag" | "touch";
export type DialogueDraft = Record<DialogueKind, string>;

export const MIN_DIALOGUE_SECONDS = 10;
export const MAX_DIALOGUE_SECONDS = 60;
export const DEFAULT_MIN_DIALOGUE_SECONDS = 10;
export const DEFAULT_MAX_DIALOGUE_SECONDS = 20;

export interface DialogueGroups {
  idle: string[];
  drag: string[];
  touch: string[];
}

export interface PetRecord {
  id: string;
  displayName: string;
  description: string;
  spriteVersionNumber: 2;
  spritesheetUrl: string;
  previewUrl: string;
  dialogues: DialogueGroups;
  builtIn?: boolean;
}

export interface PlayerPreferences {
  activePetId: string | null;
  petVisible: boolean;
  dialogueEnabled: boolean;
  minDialogueSeconds: number;
  maxDialogueSeconds: number;
  bubbleSeconds: number;
  scalePercent: number;
}
