import type { DialogueDraft, DialogueGroups } from "@/lib/types";

export const EMPTY_DIALOGUE_DRAFT: DialogueDraft = {
  idle: "",
  drag: "",
  touch: "",
};

export function formatDialogueGroups(dialogues: DialogueGroups): DialogueDraft {
  return {
    idle: dialogues.idle.join("\n"),
    drag: dialogues.drag.join("\n"),
    touch: dialogues.touch.join("\n"),
  };
}

function parseDialogueLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseDialogueDraft(draft: DialogueDraft): DialogueGroups {
  return {
    idle: parseDialogueLines(draft.idle),
    drag: parseDialogueLines(draft.drag),
    touch: parseDialogueLines(draft.touch),
  };
}
