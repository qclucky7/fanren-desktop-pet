import { describe, expect, it } from "vitest";
import {
  compareVersions,
  nextVersion,
  replaceCargoPackageVersion,
} from "./bump-version.mjs";

describe("release version", () => {
  it("increments semantic version levels", () => {
    expect(nextVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(nextVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(nextVersion("1.2.3", "major")).toBe("2.0.0");
  });

  it("compares semantic versions", () => {
    expect(compareVersions("1.3.0", "1.2.9")).toBeGreaterThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("updates only the application package in Cargo.lock", () => {
    const cargoLock = [
      "[[package]]",
      'name = "fanren-desktop-pet"',
      'version = "0.1.0"',
      "",
      "[[package]]",
      'name = "dependency"',
      'version = "0.1.0"',
      "",
    ].join("\n");

    const updated = replaceCargoPackageVersion(cargoLock, "fanren-desktop-pet", "0.2.0");

    expect(updated).toContain('name = "fanren-desktop-pet"\nversion = "0.2.0"');
    expect(updated).toContain('name = "dependency"\nversion = "0.1.0"');
  });
});
