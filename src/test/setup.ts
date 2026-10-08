import "@testing-library/jest-dom/vitest";

// Node 26 exposes an unconfigured localStorage placeholder inside Vitest
// workers, so browser-fallback tests use a deterministic in-memory store.
const storedValues = new Map<string, string>();
const testStorage: Storage = {
  get length() { return storedValues.size; },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => storedValues.delete(key),
  setItem: (key, value) => storedValues.set(key, value),
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: testStorage,
});
