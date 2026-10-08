import { describe, expect, it } from "vitest";
import { selectCurrentVersionArtifacts } from "./release-artifacts.mjs";

describe("selectCurrentVersionArtifacts", () => {
  it("excludes stale Windows installers left by previous builds", () => {
    const artifacts = [
      "C:/bundle/凡人修仙传桌宠_0.1.0_x64-setup.exe",
      "C:/bundle/凡人修仙传桌宠_0.2.0_x64-setup.exe",
    ];

    expect(selectCurrentVersionArtifacts(artifacts, "0.2.0", "win32")).toEqual([
      artifacts[1],
    ]);
  });

  it("preserves other platform artifacts", () => {
    const artifacts = ["/bundle/凡人修仙传桌宠.app"];
    expect(selectCurrentVersionArtifacts(artifacts, "0.2.0", "darwin")).toEqual(artifacts);
  });
});
