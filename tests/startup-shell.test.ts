import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
const main = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8");

describe("startup shell", () => {
  it("resolves the saved or system theme before React loads", () => {
    expect(html).toContain('localStorage.getItem("fanren-desktop-pet-theme")');
    expect(html).toContain('matchMedia("(prefers-color-scheme: dark)")');
    expect(html).toContain('document.documentElement.dataset.theme = dark ? "dark" : "light"');
    expect(html).toContain('html[data-view="settings"] body { background: #121b18; }');
    expect(html).toContain('html[data-view="settings"][data-theme="light"] body { background: #f5f6f2; }');
    expect(html).toContain('html[data-view="pet"] body { background: transparent; }');
    expect(html).toContain('class="startup-screen"');
    expect(html).toContain("正在打开宠物管理");
  });

  it("keeps a visible settings fallback while the settings bundle loads", () => {
    expect(main).toContain("function StartupScreen");
    expect(main).toMatch(/fallback=\{isPetWindow \? null : <StartupScreen \/>\}/);
  });
});
