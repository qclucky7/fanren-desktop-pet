import { beforeEach, describe, expect, it } from "vitest";
import yinyueDialogues from "../../pets/yinyue/dialogues.json";
import { DEFAULT_PET_ID, DEFAULT_PREFERENCES, DISCOVERED_PETS } from "@/data/pet-catalog";
import { getPreferences, listPets, resetDialogueGroup, saveDialogues } from "@/lib/player-api";

describe("event dialogue configuration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides all version 1 event pools", () => {
    const dialogues = yinyueDialogues;
    expect(dialogues.version).toBe(1);
    expect(dialogues.idle.length).toBeGreaterThan(0);
    expect(dialogues.drag.length).toBeGreaterThan(0);
    expect(dialogues.touch.length).toBeGreaterThan(0);
  });

  it("discovers every pet package under the pets directory", () => {
    const manifests = import.meta.glob("../../pets/*/pet.json", { eager: true });
    const directoryIds = Object.keys(manifests)
      .map((path) => path.split("/").at(-2))
      .filter((id): id is string => Boolean(id))
      .sort();

    expect(DISCOVERED_PETS.map((pet) => pet.id)).toEqual(directoryIds);
    expect(DISCOVERED_PETS.every((pet) => pet.builtIn)).toBe(true);
    expect(DISCOVERED_PETS.every((pet) => pet.previewUrl?.includes("preview"))).toBe(true);
  });

  it("uses Song Yu as the first-run pet", async () => {
    expect(DISCOVERED_PETS.some((pet) => pet.id === DEFAULT_PET_ID)).toBe(true);
    expect(DEFAULT_PREFERENCES.activePetId).toBe("songyu");
    await expect(getPreferences()).resolves.toMatchObject({ activePetId: "songyu" });
  });

  it("imports bundled dialogue groups into browser state on first read", async () => {
    const pets = await listPets();
    const saved = JSON.parse(localStorage.getItem("lingban.dialogues") ?? "{}");
    const yinyue = pets.find((pet) => pet.id === "yinyue");

    expect(yinyue?.spritesheetUrl).toContain("spritesheet");
    expect(yinyue?.previewUrl).toContain("preview");
    expect(yinyue?.dialogues).toEqual(
      DISCOVERED_PETS.find((pet) => pet.id === "yinyue")?.dialogues,
    );
    expect(saved.yinyue).toEqual({
      idle: yinyueDialogues.idle,
      drag: yinyueDialogues.drag,
      touch: yinyueDialogues.touch,
    });
  });

  it("keeps browser state dialogue groups instead of reimporting package changes", async () => {
    const custom = { idle: ["自定义待机"], drag: [], touch: ["自定义触摸"] };
    localStorage.setItem("lingban.dialogues", JSON.stringify({ yinyue: custom }));

    const pets = await listPets();

    expect(pets.find((pet) => pet.id === "yinyue")?.dialogues).toEqual(custom);
  });

  it("restores only the selected browser dialogue group from the pet package", async () => {
    const custom = {
      idle: ["自定义待机"],
      drag: ["自定义拖拽"],
      touch: ["自定义触摸"],
    };
    await saveDialogues("yinyue", custom);

    const restored = await resetDialogueGroup("yinyue", "drag");
    const saved = JSON.parse(localStorage.getItem("lingban.dialogues") ?? "{}");

    expect(restored).toEqual({
      idle: custom.idle,
      drag: yinyueDialogues.drag,
      touch: custom.touch,
    });
    expect(saved.yinyue).toEqual(restored);
  });

  it("recovers malformed browser storage and removes stale pet state", async () => {
    localStorage.setItem("lingban.preferences", "{broken");
    localStorage.setItem(
      "lingban.dialogues",
      JSON.stringify({
        removed: { idle: ["旧宠物"], drag: [], touch: [] },
        yinyue: { idle: "错误类型", drag: [], touch: [] },
      }),
    );

    const [preferences, pets] = await Promise.all([getPreferences(), listPets()]);
    const saved = JSON.parse(localStorage.getItem("lingban.dialogues") ?? "{}");

    expect(preferences.activePetId).toBe(DEFAULT_PREFERENCES.activePetId);
    expect(pets.find((pet) => pet.id === "yinyue")?.dialogues).toEqual(
      DISCOVERED_PETS.find((pet) => pet.id === "yinyue")?.dialogues,
    );
    expect(saved.removed).toBeUndefined();
  });

  it("repairs a saved active pet that no longer exists", async () => {
    localStorage.setItem(
      "lingban.preferences",
      JSON.stringify({ activePetId: "removed-pet", petVisible: false }),
    );

    const preferences = await getPreferences();

    expect(preferences.activePetId).toBe(DEFAULT_PREFERENCES.activePetId);
    expect(preferences.petVisible).toBe(false);
  });

  it("uses a 10 to 20 second dialogue interval by default", async () => {
    const preferences = await getPreferences();

    expect(preferences.minDialogueSeconds).toBe(10);
    expect(preferences.maxDialogueSeconds).toBe(20);
  });
});
