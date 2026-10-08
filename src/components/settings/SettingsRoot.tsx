import { SettingsApp } from "@/components/settings/SettingsApp";
import { SettingsThemeProvider } from "@/components/settings/SettingsThemeProvider";

export function SettingsRoot() {
  return (
    <SettingsThemeProvider>
      <SettingsApp />
    </SettingsThemeProvider>
  );
}
