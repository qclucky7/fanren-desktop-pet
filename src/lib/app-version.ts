import { version as previewVersion } from "../../package.json";
import { isTauriRuntime } from "./player-api";

export const fallbackAppVersion = previewVersion;

export async function readAppVersion(): Promise<string> {
  if (!isTauriRuntime()) return previewVersion;
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}

export function updateSettingsDocumentTitle(version: string): void {
  document.title = `凡人修仙传桌宠 · 宠物配置 · v${version}`;
}
