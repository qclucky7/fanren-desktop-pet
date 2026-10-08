import { describe, expect, it } from "vitest";
import {
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "@/lib/theme-preference";

describe("theme preference", () => {
  it("defaults to system when nothing was saved", () => {
    expect(readThemePreference({ getItem: () => null })).toBe("system");
  });

  it("ignores an unknown saved value", () => {
    expect(readThemePreference({ getItem: () => "sepia" })).toBe("system");
  });

  it("keeps a valid saved choice", () => {
    expect(readThemePreference({ getItem: (key) => key === THEME_STORAGE_KEY ? "light" : null })).toBe("light");
  });

  it("falls back to system when storage cannot be read", () => {
    expect(readThemePreference({ getItem: () => { throw new Error("unavailable"); } })).toBe("system");
  });

  it("follows the OS only for the system choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
