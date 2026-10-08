import path from "node:path";

export function selectCurrentVersionArtifacts(artifacts, version, platform) {
  if (platform !== "win32") return artifacts;
  return artifacts.filter((artifact) => path.basename(artifact).includes(`_${version}_`));
}
