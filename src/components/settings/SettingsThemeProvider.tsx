import type { ReactNode } from "react";

export function SettingsThemeProvider({ children }: { children: ReactNode }) {
  return <div className="settings-theme">{children}</div>;
}
