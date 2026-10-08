import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles/settings.css"), "utf8");
const settingsApp = readFileSync(
  resolve(process.cwd(), "src/components/settings/SettingsApp.tsx"),
  "utf8",
);

describe("settings pet library layout", () => {
  it("lets the library panel shrink so a long pet list scrolls inside the window", () => {
    expect(styles).toMatch(
      /\.library-panel\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;[^}]*overflow:\s*hidden;/s,
    );
    expect(styles).toMatch(
      /\.pet-grid-scroll\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;/s,
    );
  });

  it("uses a responsive full-width gallery while preserving the full sprite frame", () => {
    expect(styles).toMatch(
      /\.workspace-grid\s*\{[^}]*display:\s*flex;[^}]*height:\s*100%;/s,
    );
    expect(styles).toMatch(
      /\.pet-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill, minmax\(150px, 1fr\)\);/s,
    );
    expect(styles).toMatch(
      /\.pet-card-stage\s*\{[^}]*width:\s*100%;[^}]*height:\s*clamp\(140px, 18vh, 176px\);/s,
    );
    expect(styles).toMatch(
      /\.pet-card-stage\s*\{[^}]*padding:\s*6px 8px;/s,
    );
    expect(styles).toMatch(
      /\.sprite-preview-frame\s*\{[^}]*aspect-ratio:\s*192 \/ 208;/s,
    );
    expect(styles).toMatch(
      /\.sprite-preview-frame > canvas\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s,
    );
    expect(styles).toMatch(
      /\.pet-card-sprite\s*\{[^}]*width:\s*auto;[^}]*height:\s*100%;[^}]*max-width:\s*100%;[^}]*max-height:\s*100%;/s,
    );
  });

  it("uses a bounded right detail sheet with its own inspector scroll area", () => {
    expect(styles).toMatch(
      /\.pet-detail-sheet\s*\{[^}]*width:\s*min\(540px, calc\(100vw - 56px\)\);[^}]*max-width:\s*540px;[^}]*overflow:\s*hidden;/s,
    );
    expect(styles).toMatch(/\.inspector-scroll\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s);
  });

  it("keeps sidebar navigation separate from the constrained page stage", () => {
    expect(styles).toMatch(
      /\.settings-shell\s*\{[^}]*grid-template-columns:\s*168px minmax\(0, 1fr\);[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;/s,
    );
    expect(styles).toMatch(
      /\.settings-page-stage\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;/s,
    );
  });

  it("does not repeat the active navigation label in a page header", () => {
    expect(settingsApp).not.toContain("PAGE_TITLES");
    expect(settingsApp).not.toContain('className="app-header"');
    expect(styles).toMatch(
      /\.runtime-notice-layer\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*40;/s,
    );
  });

  it("softens page changes and respects reduced motion", () => {
    expect(styles).toMatch(
      /\.settings-page-view:not\(\[hidden\]\)\s*\{[^}]*animation:\s*settings-page-enter 160ms ease-out;/s,
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.settings-page-view:not\(\[hidden\]\)\s*\{[^}]*animation:\s*none;/s,
    );
  });

  it("reveals the shared pet shortcut on hover and keyboard focus", () => {
    expect(styles).toMatch(
      /\.pet-quick-activate\s*\{[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s,
    );
    expect(styles).toMatch(
      /\.pet-card:hover \.pet-quick-activate,\s*\.pet-card:focus-within \.pet-quick-activate\s*\{[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;/s,
    );
    expect(styles).toMatch(
      /@media \(hover: none\)\s*\{[^}]*\.pet-quick-activate\s*\{[^}]*opacity:\s*1;[^}]*pointer-events:\s*auto;/s,
    );
  });

  it("keeps every pet name centered while actions stay aligned right", () => {
    expect(styles).toMatch(
      /\.pet-card\s*\{[^}]*position:\s*relative;/s,
    );
    expect(styles).toMatch(
      /\.pet-card-footer\s*\{[^}]*justify-content:\s*center;/s,
    );
    expect(styles).toMatch(
      /\.pet-card-name\s*\{[^}]*width:\s*100%;[^}]*text-align:\s*center;/s,
    );
    expect(styles).toMatch(
      /\.pet-quick-activate\s*\{[^}]*position:\s*absolute;[^}]*top:\s*16px;[^}]*right:\s*16px;/s,
    );
    expect(styles).toMatch(
      /\.pet-status\.is-active\s*\{[^}]*color:\s*hsl\(142 70% 48%\);/s,
    );
    expect(styles).toMatch(
      /\.pet-status\s*\{[^}]*position:\s*absolute;[^}]*top:\s*16px;[^}]*right:\s*16px;/s,
    );
  });
});
