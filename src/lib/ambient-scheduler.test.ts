import { describe, expect, it } from "vitest";
import { AMBIENT_ACTIONS, ambientDelayMs, canStartIdleReaction, chooseAmbientAction, dragAnimationForDelta, shouldPointerInterruptIdleReaction } from "./ambient-scheduler";

describe("ambient pet scheduler", () => {
  it("keeps idle pauses much longer than one reaction cycle", () => {
    expect(ambientDelayMs(() => 0)).toBe(12_000);
    expect(ambientDelayMs(() => 1)).toBe(25_000);
  });

  it("avoids immediately repeating the same ambient action", () => {
    expect(chooseAmbientAction("review", () => 0)).not.toBe("review");
    expect(chooseAmbientAction("jumping", () => 0.99)).not.toBe("jumping");
  });

  it("only uses jumping and review for ambient reactions", () => {
    expect(AMBIENT_ACTIONS).toEqual(["jumping", "review"]);
  });

  it("does not start idle reactions while pointer look tracking is active", () => {
    expect(canStartIdleReaction(false, false, 45)).toBe(false);
    expect(canStartIdleReaction(false, false, null)).toBe(true);
  });

  it("does not start idle reactions while reacting or dragging", () => {
    expect(canStartIdleReaction(true, false, null)).toBe(false);
    expect(canStartIdleReaction(false, true, null)).toBe(false);
  });

  it("lets pointer tracking interrupt passive idle reactions only", () => {
    expect(shouldPointerInterruptIdleReaction(true, 90)).toBe(true);
    expect(shouldPointerInterruptIdleReaction(false, 90)).toBe(false);
    expect(shouldPointerInterruptIdleReaction(true, null)).toBe(false);
  });

  it("selects the movement row from the horizontal drag direction", () => {
    expect(dragAnimationForDelta(-4)).toBe("running-left");
    expect(dragAnimationForDelta(4)).toBe("running-right");
  });

  it("switches the movement row when an active drag reverses direction", () => {
    const sampledDeltas = [-8, -3, 2, 7, -1];
    expect(sampledDeltas.map(dragAnimationForDelta)).toEqual([
      "running-left",
      "running-left",
      "running-right",
      "running-right",
      "running-left",
    ]);
  });
});
