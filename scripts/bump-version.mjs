import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes("--dry-run");
const requestedVersion = argumentsList.find((argument) => !argument.startsWith("--"));

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function write(relativePath, content) {
  writeFileSync(path.join(projectRoot, relativePath), content, "utf8");
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`版本号必须符合 x.y.z：${version}`);
  }
  return match.slice(1).map(Number);
}

function nextVersion(current, requested) {
  if (/^\d+\.\d+\.\d+$/.test(requested)) {
    return requested;
  }

  const [major, minor, patch] = parseVersion(current);
  if (requested === "major") return `${major + 1}.0.0`;
  if (requested === "minor") return `${major}.${minor + 1}.0`;
  if (requested === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error("请指定 major、minor、patch 或完整版本号");
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCargoPackageVersion(content, packageName, version) {
  const pattern = new RegExp(
    `(\\[\\[package\\]\\]\\r?\\nname = "${escapeRegExp(packageName)}"\\r?\\nversion = ")[^"]+("$)`,
    "m",
  );
  if (!pattern.test(content)) {
    throw new Error(`Cargo.lock 中没有找到 ${packageName}`);
  }
  return content.replace(pattern, `$1${version}$2`);
}

function run() {
  if (!requestedVersion) {
    throw new Error("请指定 major、minor、patch 或完整版本号");
  }

  const packageJson = JSON.parse(read("package.json"));
  const packageLock = JSON.parse(read("package-lock.json"));
  const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
  const cargoToml = read("src-tauri/Cargo.toml");
  const cargoLock = read("src-tauri/Cargo.lock");
  const cargoVersion = /^version = "([^"]+)"/m.exec(cargoToml)?.[1];
  const versions = [packageJson.version, packageLock.version, packageLock.packages?.[""]?.version, tauriConfig.version, cargoVersion];

  if (new Set(versions).size !== 1 || versions.some((version) => !version)) {
    throw new Error(`当前版本号不一致：${versions.join(", ")}`);
  }

  const currentVersion = packageJson.version;
  const version = nextVersion(currentVersion, requestedVersion);
  if (compareVersions(version, currentVersion) <= 0) {
    throw new Error(`新版本必须高于当前版本：${currentVersion} -> ${version}`);
  }

  console.log(`${dryRun ? "计划" : "正在"}更新版本：${currentVersion} -> ${version}`);
  if (dryRun) return;

  packageJson.version = version;
  packageLock.version = version;
  packageLock.packages[""].version = version;
  tauriConfig.version = version;

  const cargoTomlPattern = /^(\[package\]\r?\nname = "[^"]+"\r?\nversion = ")[^"]+("$)/m;
  const nextCargoToml = cargoToml.replace(cargoTomlPattern, `$1${version}$2`);

  if (nextCargoToml === cargoToml) {
    throw new Error("Cargo.toml 中没有找到 package.version");
  }

  write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  write("package-lock.json", `${JSON.stringify(packageLock, null, 2)}\n`);
  write("src-tauri/tauri.conf.json", `${JSON.stringify(tauriConfig, null, 2)}\n`);
  write("src-tauri/Cargo.toml", nextCargoToml);
  write(
    "src-tauri/Cargo.lock",
    replaceCargoPackageVersion(cargoLock, packageJson.name, version),
  );

  console.log("版本号已同步完成");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { compareVersions, nextVersion, replaceCargoPackageVersion };
