import { describe, expect, it } from "vitest";
import { chooseDialogue, normalizeDelayRange, randomDelayMs } from "./dialogue-scheduler";

describe("dialogue scheduler", () => {
  it("returns null for an empty dialogue list", () => {
    expect(chooseDialogue(["", "  "], null)).toBeNull();
  });

  it("does not immediately repeat when alternatives exist", () => {
    expect(chooseDialogue(["甲", "乙"], "甲", () => 0)).toBe("乙");
  });

  it("normalizes reversed ranges and applies deterministic random delay", () => {
    expect(normalizeDelayRange(80, 30)).toEqual({ minSeconds: 30, maxSeconds: 80 });
    expect(randomDelayMs(30, 80, () => 0.5)).toBe(55_000);
  });
});
