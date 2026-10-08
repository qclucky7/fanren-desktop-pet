import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PetRecord } from "@/lib/types";
import { PetCard } from "./PetCard";

vi.mock("@/components/pet/SpritePreview", () => ({
  SpritePreview: ({ src }: { src: string }) => <div data-testid="sprite-preview" data-src={src} />,
}));

afterEach(cleanup);

function pet(): PetRecord {
  return {
    id: "nangong-wan",
    displayName: "南宫婉",
    description: "",
    spriteVersionNumber: 2,
    spritesheetUrl: "/spritesheet.webp",
    previewUrl: "/preview.webp",
    dialogues: { idle: [], drag: [], touch: [] },
    builtIn: true,
  };
}

describe("PetCard", () => {
  it("shows the pet name and active status", () => {
    render(
      <PetCard pet={pet()} active selected onSelect={() => {}} onActivate={() => {}} />,
    );

    expect(screen.getByText("南宫婉")).toBeInTheDocument();
    expect(screen.getByText("使用中")).toBeInTheDocument();
    expect(screen.getByTestId("sprite-preview")).toHaveAttribute("data-src", "/preview.webp");
  });

  it("activates an inactive pet without opening its details", () => {
    const onSelect = vi.fn();
    const onActivate = vi.fn();
    render(
      <PetCard pet={pet()} active={false} selected={false} onSelect={onSelect} onActivate={onActivate} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "将南宫婉设为桌宠" }));

    expect(onActivate).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
