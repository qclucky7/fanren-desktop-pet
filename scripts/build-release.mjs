import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selectCurrentVersionArtifacts } from "./release-artifacts.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const platformBuilds = {
  win32: {
    directory: "windows",
    bundles: "nsis",
    sources: [{ directory: "nsis", extensions: [".exe"] }],
  },
  darwin: {
    directory: "macos",
    bundles: "app,dmg",
    sources: [
      { directory: "macos", extensions: [".app"] },
      { directory: "dmg", extensions: [".dmg"] },
    ],
  },
  linux: {
    directory: "linux",
    bundles: "appimage,deb",
    sources: [
      { directory: "appimage", extensions: [".AppImage"] },
      { directory: "deb", extensions: [".deb"] },
    ],
  },
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
}

function readReleaseVersion() {
  const tauriVersion = readJson("src-tauri/tauri.conf.json").version;
  const packageVersion = readJson("package.json").version;

  if (tauriVersion !== packageVersion) {
    throw new Error(
      `版本号不一致：package.json 为 ${packageVersion}，tauri.conf.json 为 ${tauriVersion}`,
    );
  }

  if (!/^[0-9A-Za-z][0-9A-Za-z.+-]*$/.test(tauriVersion)) {
    throw new Error(`无法用于发布目录的版本号：${tauriVersion}`);
  }

  return tauriVersion;
}

function readTargetTriple(args) {
  const targetIndex = args.indexOf("--target");
  if (targetIndex >= 0) {
    const target = args[targetIndex + 1];
    if (!target || target.startsWith("--")) {
      throw new Error("--target 参数缺少目标三元组");
    }
    return target;
  }

  return args.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
}

function resolveBuildPlatform(targetTriple) {
  if (!targetTriple) {
    return process.platform;
  }
  if (targetTriple.includes("windows")) {
    return "win32";
  }
  if (targetTriple.includes("apple-darwin")) {
    return "darwin";
  }
  if (targetTriple.includes("linux")) {
    return "linux";
  }

  throw new Error(`无法识别目标系统：${targetTriple}`);
}

function ensureManagedDirectory(targetDirectory, releaseRoot) {
  const resolvedTarget = path.resolve(targetDirectory);
  const resolvedRoot = `${path.resolve(releaseRoot)}${path.sep}`;

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`拒绝清理发布目录之外的路径：${resolvedTarget}`);
  }
}

function collectArtifacts(bundleRoot, sources) {
  return sources.flatMap(({ directory, extensions }) => {
    const sourceDirectory = path.join(bundleRoot, directory);
    if (!existsSync(sourceDirectory)) {
      return [];
    }

    return readdirSync(sourceDirectory, { withFileTypes: true })
      .filter((entry) => extensions.some((extension) => entry.name.endsWith(extension)))
      .map((entry) => path.join(sourceDirectory, entry.name));
  });
}

function rejectBundleOverrides(args) {
  const unsupported = args.find(
    (argument) =>
      argument === "--bundles" ||
      argument.startsWith("--bundles=") ||
      argument === "--no-bundle",
  );

  if (unsupported) {
    throw new Error(`打包类型由发布脚本按操作系统管理，请移除参数 ${unsupported}`);
  }
}

function run() {
  const forwardedArguments = process.argv.slice(2);
  const targetTriple = readTargetTriple(forwardedArguments);
  const buildPlatform = resolveBuildPlatform(targetTriple);
  const platform = platformBuilds[buildPlatform];
  if (!platform) {
    throw new Error(`暂不支持当前打包系统：${buildPlatform}`);
  }

  rejectBundleOverrides(forwardedArguments);

  const version = readReleaseVersion();
  const tauriCli = path.join(projectRoot, "node_modules", "@tauri-apps", "cli", "tauri.js");
  const buildArguments = [tauriCli, "build", "--bundles", platform.bundles, ...forwardedArguments];
  const buildResult = spawnSync(process.execPath, buildArguments, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (buildResult.error) {
    throw buildResult.error;
  }
  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }

  const targetRoot = path.join(projectRoot, "src-tauri", "target");
  const bundleRoot = path.join(targetRoot, ...(targetTriple ? [targetTriple] : []), "release", "bundle");
  const artifacts = selectCurrentVersionArtifacts(
    collectArtifacts(bundleRoot, platform.sources),
    version,
    buildPlatform,
  );

  if (artifacts.length === 0) {
    throw new Error(`构建成功，但没有在 ${bundleRoot} 找到可发布文件`);
  }

  const releaseRoot = path.join(projectRoot, "release");
  const destination = path.join(releaseRoot, version, platform.directory);
  ensureManagedDirectory(destination, releaseRoot);
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });

  for (const artifact of artifacts) {
    cpSync(artifact, path.join(destination, path.basename(artifact)), { recursive: true });
  }

  console.log(`\n发布产物已整理到：${destination}`);
  for (const artifact of artifacts) {
    console.log(`- ${path.basename(artifact)}`);
  }
}

try {
  run();
} catch (error) {
  console.error(`\n发布失败：${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
