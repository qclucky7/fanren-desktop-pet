import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const PETS_DIRECTORY = path.resolve("pets");
const PREVIEW_FILENAME = "preview.webp";
const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

function isSafeRelativePath(value) {
  return typeof value === "string"
    && value.length > 0
    && !path.isAbsolute(value)
    && !value.split(/[\\/]/).includes("..");
}

async function needsRefresh(sourcePath, previewPath) {
  try {
    const [sourceInfo, previewInfo, metadata] = await Promise.all([
      stat(sourcePath),
      stat(previewPath),
      sharp(previewPath).metadata(),
    ]);
    return previewInfo.mtimeMs < sourceInfo.mtimeMs
      || metadata.width !== FRAME_WIDTH
      || metadata.height !== FRAME_HEIGHT;
  } catch (error) {
    if (error?.code === "ENOENT") return true;
    throw error;
  }
}

async function generatePreview(directory) {
  const manifestPath = path.join(directory, "pet.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!isSafeRelativePath(manifest.spritesheetPath)) {
    throw new Error(`${manifestPath} 的 spritesheetPath 无效`);
  }

  const sourcePath = path.resolve(directory, manifest.spritesheetPath);
  if (!sourcePath.startsWith(`${path.resolve(directory)}${path.sep}`)) {
    throw new Error(`${manifestPath} 的 spritesheetPath 超出宠物目录`);
  }
  const previewPath = path.join(directory, PREVIEW_FILENAME);
  if (sourcePath === previewPath) {
    throw new Error(`${manifestPath} 不能将 ${PREVIEW_FILENAME} 作为主图集`);
  }
  if (!(await needsRefresh(sourcePath, previewPath))) return false;

  await sharp(sourcePath)
    .extract({ left: 0, top: 0, width: FRAME_WIDTH, height: FRAME_HEIGHT })
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(previewPath);
  return true;
}

const entries = await readdir(PETS_DIRECTORY, { withFileTypes: true });
let generated = 0;
for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const directory = path.join(PETS_DIRECTORY, entry.name);
  try {
    if (await generatePreview(directory)) generated += 1;
  } catch (error) {
    throw new Error(`生成宠物 ${entry.name} 的预览图失败：${error.message}`, { cause: error });
  }
}

console.log(generated > 0 ? `已生成 ${generated} 张宠物预览图。` : "宠物预览图已是最新。");
