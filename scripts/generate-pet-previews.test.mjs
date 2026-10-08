import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { generatePreview } from "./generate-pet-previews.mjs";

sharp.cache(false);
const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("generatePreview", () => {
  it("replaces an existing outdated preview on Windows", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "fanren-preview-test-"));
    temporaryDirectories.push(directory);
    const sourcePath = path.join(directory, "spritesheet.webp");
    const previewPath = path.join(directory, "preview.webp");
    await writeFile(path.join(directory, "pet.json"), JSON.stringify({ spritesheetPath: "spritesheet.webp" }));
    await sharp({ create: { width: 192, height: 208, channels: 4, background: "#ffffff" } })
      .webp().toFile(sourcePath);
    await sharp({ create: { width: 24, height: 24, channels: 4, background: "#000000" } })
      .webp().toFile(previewPath);

    expect(await generatePreview(directory)).toBe(true);
    const metadata = await sharp(await readFile(previewPath)).metadata();
    expect([metadata.width, metadata.height]).toEqual([192, 208]);
  });
});
