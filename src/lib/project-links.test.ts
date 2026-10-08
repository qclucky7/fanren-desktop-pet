import { beforeEach, describe, expect, it, vi } from "vitest";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "./player-api";
import { openProjectLink, PROJECT_LINKS } from "./project-links";

vi.mock("./player-api", () => ({ isTauriRuntime: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

describe("project links", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["releases", "bilibili"] as const)("opens %s in the browser preview", async (link) => {
    vi.mocked(isTauriRuntime).mockReturnValue(false);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    await openProjectLink(link);

    expect(open).toHaveBeenCalledWith(PROJECT_LINKS[link], "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it.each(["releases", "bilibili"] as const)("opens %s in the system browser from Tauri", async (link) => {
    vi.mocked(isTauriRuntime).mockReturnValue(true);
    vi.mocked(openUrl).mockResolvedValue();

    await openProjectLink(link);

    expect(openUrl).toHaveBeenCalledWith(PROJECT_LINKS[link]);
  });
});
