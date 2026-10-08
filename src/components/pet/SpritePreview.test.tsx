import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpritePreview } from "./SpritePreview";

describe("SpritePreview", () => {
  const assignedSources: string[] = [];

  beforeEach(() => {
    assignedSources.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue({} as CanvasRenderingContext2D);
    class MockImage {
      onload: (() => void) | null = null;
      set src(value: string) { assignedSources.push(value); }
    }
    vi.stubGlobal("Image", MockImage);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("starts loading the generated preview immediately", () => {
    render(<SpritePreview src="preview.webp" />);
    expect(assignedSources).toEqual(["preview.webp"]);
  });

  it("keeps the preview canvas at the full-frame aspect ratio", () => {
    const { container } = render(<SpritePreview src="pet.webp" className="pet-card-sprite" />);
    const frame = container.querySelector(".sprite-preview-frame");
    const canvas = container.querySelector("canvas");

    expect(frame).toHaveClass("sprite-preview-frame", "pet-card-sprite");
    expect(canvas).toHaveAttribute("width", "192");
    expect(canvas).toHaveAttribute("height", "208");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
