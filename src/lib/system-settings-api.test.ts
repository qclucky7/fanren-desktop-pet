import { beforeEach, describe, expect, it } from "vitest";
import {
  getAutostartEnabled,
  openPetDirectory,
  setAutostartEnabled,
} from "@/lib/player-api";

describe("browser system settings fallback", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists the autostart preview state without native APIs", async () => {
    await expect(getAutostartEnabled()).resolves.toBe(false);
    await expect(setAutostartEnabled(true)).resolves.toBe(true);
    await expect(getAutostartEnabled()).resolves.toBe(true);
    expect(localStorage.getItem("fanren-desktop-pet.autostart-preview")).toBe("true");
  });

  it("reports that the pet directory requires the desktop runtime", async () => {
    await expect(openPetDirectory()).rejects.toThrow("桌面应用");
  });
});
