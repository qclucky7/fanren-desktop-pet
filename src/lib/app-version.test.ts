import { beforeEach, describe, expect, it, vi } from "vitest";
import { getVersion } from "@tauri-apps/api/app";
import { isTauriRuntime } from "./player-api";
import { fallbackAppVersion, readAppVersion, updateSettingsDocumentTitle } from "./app-version";

vi.mock("./player-api", () => ({ isTauriRuntime: vi.fn() }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: vi.fn() }));

describe("app version", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the package version for browser previews", async () => {
    vi.mocked(isTauriRuntime).mockReturnValue(false);

    expect(await readAppVersion()).toBe(fallbackAppVersion);
    expect(getVersion).not.toHaveBeenCalled();
  });

  it("uses the running Tauri version and updates the document title", async () => {
    vi.mocked(isTauriRuntime).mockReturnValue(true);
    vi.mocked(getVersion).mockResolvedValue("2.3.4");

    const version = await readAppVersion();
    updateSettingsDocumentTitle(version);

    expect(version).toBe("2.3.4");
    expect(document.title).toBe("凡人修仙传桌宠 · 宠物配置 · v2.3.4");
  });
});
