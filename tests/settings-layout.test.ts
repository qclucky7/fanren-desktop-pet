import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function stylesheet(name: string) {
  return readFileSync(resolve(process.cwd(), `src/styles/${name}.css`), "utf8");
}

const shell = stylesheet("settings");
const library = stylesheet("settings-library");
const detail = stylesheet("settings-detail");

describe("settings layout", () => {
  it("keeps the page fixed while the pet library scrolls independently", () => {
    expect(shell).toMatch(/\.settings-shell\s*\{[^}]*height:\s*100vh;[^}]*overflow:\s*hidden;/s);
    expect(shell).toMatch(/\.settings-page-stage\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;/s);
    expect(library).toMatch(/\.library-panel\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;[^}]*overflow:\s*hidden;/s);
    expect(library).toMatch(/\.pet-grid-scroll\s*\{[^}]*min-height:\s*0;[^}]*flex:\s*1;[^}]*overflow-y:\s*auto;/s);
  });

  it("uses responsive cards without cropping the sprite frame", () => {
    expect(library).toMatch(/\.pet-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill, minmax\(/s);
    expect(library).toMatch(/\.pet-card-stage\s*\{[^}]*aspect-ratio:\s*192 \/ 208;/s);
    expect(library).toMatch(/\.sprite-preview-frame\s*\{[^}]*aspect-ratio:\s*192 \/ 208;/s);
    expect(library).toMatch(/\.sprite-preview-frame > canvas\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
    expect(library).toMatch(/\.pet-card-sprite\s*\{[^}]*max-width:\s*100%;[^}]*max-height:\s*100%;/s);
  });

  it("bounds the detail sheet and lets its content scroll", () => {
    expect(detail).toMatch(/\.pet-detail-sheet\s*\{[^}]*width:\s*min\(/s);
    expect(detail).toMatch(/\.inspector-scroll\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/s);
  });

  it("keeps the quick action accessible on hover, focus and touch screens", () => {
    expect(library).toMatch(/\.pet-card:hover \.pet-quick-activate,\s*\.pet-card:focus-within \.pet-quick-activate/s);
    expect(library).toMatch(/@media \(hover: none\)\s*\{[^}]*\.pet-quick-activate\s*\{[^}]*opacity:\s*1;/s);
  });

  it("removes page and card motion for reduced-motion users", () => {
    expect(shell).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.settings-page-view:not\(\[hidden\]\)/s);
    expect(library).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.pet-card/s);
  });
});
