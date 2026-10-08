import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const main = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");

describe("startup shell", () => {
  it("paints a system-theme-aware settings surface before React loads", () => {
    expect(html).toContain("prefers-color-scheme: dark");
    expect(html).toContain('class="startup-screen"');
    expect(html).toContain("正在打开宠物管理");
  });

  it("keeps a visible settings fallback while the settings bundle loads", () => {
    expect(main).toContain("function StartupScreen");
    expect(main).toMatch(/fallback=\{isPetWindow \? null : <StartupScreen \/>\}/);
  });
});
