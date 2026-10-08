import { describe, expect, it } from "vitest";
import {
  ANIMATIONS,
  CODEX_V2_ATLAS,
  POINTER_LOOK_MAX_DISTANCE,
  animationCycleMs,
  lookDirectionFrame,
  pointerLookAngle,
} from "./pet-contract";

describe("Codex v2 pet contract", () => {
  it("uses the official atlas geometry", () => {
    expect(CODEX_V2_ATLAS).toMatchObject({ width: 1536, height: 2288, columns: 8, rows: 11 });
  });

  it("maps standard animation rows and durations", () => {
    expect(ANIMATIONS.idle.row).toBe(0);
    expect(ANIMATIONS.idle.durations).toHaveLength(6);
    expect(ANIMATIONS.waving.durations).toHaveLength(4);
    expect(animationCycleMs("waving")).toBe(700);
  });

  it("maps clockwise look directions across rows 9 and 10", () => {
    expect(lookDirectionFrame(0)).toEqual({ row: 9, column: 0 });
    expect(lookDirectionFrame(180)).toEqual({ row: 10, column: 0 });
    expect(lookDirectionFrame(337.5)).toEqual({ row: 10, column: 7 });
  });

  it("converts pointer positions to clockwise look angles with a deadzone", () => {
    expect(pointerLookAngle(100, 0, 100, 100)).toBeCloseTo(0);
    expect(pointerLookAngle(200, 100, 100, 100)).toBeCloseTo(90);
    expect(pointerLookAngle(100, 200, 100, 100)).toBeCloseTo(180);
    expect(pointerLookAngle(0, 100, 100, 100)).toBeCloseTo(270);
    expect(pointerLookAngle(105, 105, 100, 100)).toBeNull();
    expect(pointerLookAngle(1000, 100, 100, 100, 28, 600)).toBeNull();
  });

  it("stops pointer tracking beyond the configured nearby range", () => {
    expect(pointerLookAngle(POINTER_LOOK_MAX_DISTANCE, 0, 0, 0, 0, POINTER_LOOK_MAX_DISTANCE)).toBeCloseTo(90);
    expect(pointerLookAngle(POINTER_LOOK_MAX_DISTANCE + 1, 0, 0, 0, 0, POINTER_LOOK_MAX_DISTANCE)).toBeNull();
  });
});
