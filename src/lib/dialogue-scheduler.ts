export function normalizeDelayRange(minSeconds: number, maxSeconds: number) {
  const safeMin = Math.max(10, Math.round(Math.min(minSeconds, maxSeconds)));
  const safeMax = Math.max(safeMin, Math.round(Math.max(minSeconds, maxSeconds)));
  return { minSeconds: safeMin, maxSeconds: safeMax };
}

export function randomDelayMs(minSeconds: number, maxSeconds: number, random = Math.random) {
  const range = normalizeDelayRange(minSeconds, maxSeconds);
  return Math.round((range.minSeconds + random() * (range.maxSeconds - range.minSeconds)) * 1000);
}

export function chooseDialogue(lines: string[], previous: string | null, random = Math.random) {
  const candidates = lines.map((line) => line.trim()).filter(Boolean);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  const nonRepeating = candidates.filter((line) => line !== previous);
  return nonRepeating[Math.min(nonRepeating.length - 1, Math.floor(random() * nonRepeating.length))];
}
