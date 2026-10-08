import { isTauriRuntime } from "./player-api";

export const PROJECT_LINKS = {
  releases: "https://github.com/qclucky7/fanren-desktop-pet/releases",
  bilibili: "https://space.bilibili.com/60387074/dynamic",
} as const;

export type ProjectLink = keyof typeof PROJECT_LINKS;

export async function openProjectLink(link: ProjectLink): Promise<void> {
  const url = PROJECT_LINKS[link];
  if (isTauriRuntime()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
