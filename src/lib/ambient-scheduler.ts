import type { AnimationState } from "./pet-contract";

export const AMBIENT_ACTIONS = ["jumping", "review"] as const satisfies readonly AnimationState[];
export type AmbientAction = (typeof AMBIENT_ACTIONS)[number];

export function ambientDelayMs(random = Math.random, minimumMs = 12_000, maximumMs = 25_000) {
  const low = Math.min(minimumMs, maximumMs);
  const high = Math.max(minimumMs, maximumMs);
  return Math.round(low + random() * (high - low));
}

export function chooseAmbientAction(previous: AmbientAction | null, random = Math.random): AmbientAction {
  const candidates = previous ? AMBIENT_ACTIONS.filter((action) => action !== previous) : [...AMBIENT_ACTIONS];
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

export function canStartIdleReaction(
  reacting: boolean,
  dragging: boolean,
  lookAngle: number | null,
) {
  return !reacting && !dragging && lookAngle === null;
}

export function shouldPointerInterruptIdleReaction(
  passiveReaction: boolean,
  lookAngle: number | null,
) {
  return passiveReaction && lookAngle !== null;
}

export function dragAnimationForDelta(deltaX: number): "running-left" | "running-right" {
  return deltaX < 0 ? "running-left" : "running-right";
}
