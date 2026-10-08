export const CODEX_V2_ATLAS = {
  width: 1536,
  height: 2288,
  columns: 8,
  rows: 11,
  cellWidth: 192,
  cellHeight: 208,
} as const;

export const POINTER_LOOK_DEADZONE = 28;
export const POINTER_LOOK_MAX_DISTANCE = 350;

export type AnimationState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export interface AnimationDefinition {
  row: number;
  durations: readonly number[];
  loop: boolean;
}

export const ANIMATIONS: Record<AnimationState, AnimationDefinition> = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320], loop: true },
  "running-right": { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220], loop: true },
  "running-left": { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220], loop: true },
  waving: { row: 3, durations: [140, 140, 140, 280], loop: false },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280], loop: false },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240], loop: false },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260], loop: true },
  running: { row: 7, durations: [120, 120, 120, 120, 120, 220], loop: true },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280], loop: true },
};

export function lookDirectionFrame(angleDegrees: number) {
  const normalized = ((angleDegrees % 360) + 360) % 360;
  const directionIndex = Math.round(normalized / 22.5) % 16;
  return {
    row: 9 + Math.floor(directionIndex / 8),
    column: directionIndex % 8,
  };
}

export function pointerLookAngle(
  pointerX: number,
  pointerY: number,
  originX: number,
  originY: number,
  deadzone = POINTER_LOOK_DEADZONE,
  maxDistance = Number.POSITIVE_INFINITY,
) {
  const deltaX = pointerX - originX;
  const deltaY = pointerY - originY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < deadzone || distance > maxDistance) return null;
  return ((Math.atan2(deltaX, -deltaY) * 180) / Math.PI + 360) % 360;
}

export function animationCycleMs(state: AnimationState) {
  return ANIMATIONS[state].durations.reduce((total, duration) => total + duration, 0);
}
