import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsThemeProvider, useSettingsTheme } from "@/components/settings/SettingsThemeProvider";
import { ThemePreferenceControl } from "@/components/settings/ThemePreferenceControl";
import { THEME_STORAGE_KEY } from "@/lib/theme-preference";

function ThemeHarness() {
  const { preference, setPreference } = useSettingsTheme();
  return <ThemePreferenceControl value={preference} onChange={setPreference} />;
}

describe("settings theme", () => {
  let systemDark: boolean;
  let notifySystemChange: (dark: boolean) => void;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.view = "settings";
    systemDark = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    notifySystemChange = (dark) => {
      systemDark = dark;
      for (const listener of listeners) listener({ matches: dark } as MediaQueryListEvent);
    };
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation(() => ({
      get matches() { return systemDark; },
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("defaults to following the system and reacts to OS appearance changes", () => {
    render(<SettingsThemeProvider><ThemeHarness /></SettingsThemeProvider>);
    expect(screen.getByRole("radio", { name: "跟随系统" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => notifySystemChange(true));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("keeps a manual choice even when the OS appearance changes", () => {
    render(<SettingsThemeProvider><ThemeHarness /></SettingsThemeProvider>);
    fireEvent.click(screen.getByRole("radio", { name: "浅色" }));
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    act(() => notifySystemChange(true));
    expect(document.documentElement.dataset.theme).toBe("light");

    fireEvent.click(screen.getByRole("radio", { name: "深色" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    fireEvent.click(screen.getByRole("radio", { name: "跟随系统" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    act(() => notifySystemChange(false));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("restores a saved choice after the settings page remounts", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    const view = render(<SettingsThemeProvider><ThemeHarness /></SettingsThemeProvider>);
    expect(screen.getByRole("radio", { name: "深色" })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe("dark");

    view.unmount();
    render(<SettingsThemeProvider><ThemeHarness /></SettingsThemeProvider>);
    expect(screen.getByRole("radio", { name: "深色" })).toBeChecked();
  });
});
