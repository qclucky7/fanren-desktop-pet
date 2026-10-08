import { describe, expect, it } from "vitest";
import { sortPetsByDisplayName } from "@/lib/pet-sort";
import type { PetRecord } from "@/lib/types";

function pet(id: string, displayName: string): PetRecord {
  return {
    id,
    displayName,
    description: "",
    spriteVersionNumber: 2,
    spritesheetUrl: "/spritesheet.webp",
    previewUrl: "/preview.webp",
    dialogues: { idle: [], drag: [], touch: [] },
  };
}

describe("sortPetsByDisplayName", () => {
  it("sorts Chinese display names by pinyin without mutating discovery order", () => {
    const discovered = [
      pet("ziling", "紫灵"),
      pet("yuanyao", "元瑶"),
      pet("hanli", "韩立"),
      pet("nangong-wan", "南宫婉"),
      pet("meining", "梅凝"),
    ];

    expect(sortPetsByDisplayName(discovered).map(({ displayName }) => displayName)).toEqual([
      "韩立",
      "梅凝",
      "南宫婉",
      "元瑶",
      "紫灵",
    ]);
    expect(discovered.map(({ displayName }) => displayName)).toEqual([
      "紫灵",
      "元瑶",
      "韩立",
      "南宫婉",
      "梅凝",
    ]);
  });
});
