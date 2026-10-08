import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageManifest {
  dependencies?: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as PackageManifest;

describe("UI dependency boundary", () => {
  it("does not retain Fluent after the shadcn migration", () => {
    expect(manifest.dependencies).not.toHaveProperty("@fluentui/react-components");
  });

  it("keeps shadcn components inside the repository", () => {
    const settingsSource = readFileSync(
      resolve(process.cwd(), "src/components/settings/PetInspector.tsx"),
      "utf8",
    );
    expect(settingsSource).toContain("@/components/ui/");
    expect(settingsSource).not.toContain("@fluentui/");
  });
});
