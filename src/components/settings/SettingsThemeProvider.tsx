import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { syncSettingsWindowTheme } from "@/lib/player-api";
import {
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme-preference";

interface SettingsThemeContextValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const SettingsThemeContext = createContext<SettingsThemeContextValue | null>(null);

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function SettingsThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readThemePreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useLayoutEffect(() => {
    const theme = resolveTheme(preference, systemDark);
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#121b18" : "#f5f6f2",
    );
    void syncSettingsWindowTheme(preference, theme)
      .then(() => {
        if (preference === "system") setSystemDark(systemPrefersDark());
      })
      .catch((error) => {
        console.warn("无法同步原生窗口主题", error);
      });
  }, [preference, systemDark]);

  useLayoutEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onSystemChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  useLayoutEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) setPreference(readThemePreference());
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  function changePreference(next: ThemePreference) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // The current window can still use the selected theme without storage.
    }
    setPreference(next);
  }

  return (
    <SettingsThemeContext.Provider value={{ preference, setPreference: changePreference }}>
      <div className="settings-theme">{children}</div>
    </SettingsThemeContext.Provider>
  );
}

export function useSettingsTheme() {
  const context = useContext(SettingsThemeContext);
  if (!context) throw new Error("主题设置必须在 SettingsThemeProvider 内使用");
  return context;
}
