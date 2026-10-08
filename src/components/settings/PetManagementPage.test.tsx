import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PetRecord, PlayerPreferences } from "@/lib/types";
import { setActivePet } from "@/lib/player-api";
import { PetManagementPage } from "./PetManagementPage";

const pets: PetRecord[] = [
  {
    id: "nangong-wan",
    displayName: "南宫婉",
    description: "掩月宗修士",
    spriteVersionNumber: 2,
    spritesheetUrl: "/spritesheet.webp",
    previewUrl: "/preview.webp",
    dialogues: { idle: [], drag: [], touch: [] },
    builtIn: true,
  },
  {
    id: "yuanyao",
    displayName: "元瑶",
    description: "青阳门修士",
    spriteVersionNumber: 2,
    spritesheetUrl: "/yuanyao.webp",
    previewUrl: "/yuanyao-preview.webp",
    dialogues: { idle: [], drag: [], touch: [] },
    builtIn: true,
  },
];

const preferences: PlayerPreferences = {
  activePetId: "nangong-wan",
  petVisible: true,
  dialogueEnabled: true,
  minDialogueSeconds: 10,
  maxDialogueSeconds: 20,
  bubbleSeconds: 6,
  scalePercent: 100,
};

vi.mock("@/components/pet/SpritePreview", () => ({
  SpritePreview: () => <div data-testid="sprite-preview" />,
}));

vi.mock("@/lib/player-api", () => ({
  getPreferences: vi.fn(async () => preferences),
  listPets: vi.fn(async () => pets),
  resetDialogueGroup: vi.fn(),
  saveDialogues: vi.fn(),
  setActivePet: vi.fn(),
  uninstallPet: vi.fn(),
  updatePreferences: vi.fn(),
}));

const setActivePetMock = vi.mocked(setActivePet);

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  setActivePetMock.mockResolvedValue({ ...preferences, activePetId: "yuanyao" });
});

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

describe("PetManagementPage", () => {
  it("opens the selected pet configuration in a right detail sheet", async () => {
    render(<PetManagementPage onNotice={() => {}} />);

    const petButton = await screen.findByRole("button", { name: "南宫婉，当前正在使用" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(petButton);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "南宫婉配置" })).toBeInTheDocument();
    expect(screen.queryByText("掩月宗修士")).not.toBeInTheDocument();
  });

  it("sets a pet directly from the shared card shortcut", async () => {
    const onNotice = vi.fn();
    render(<PetManagementPage onNotice={onNotice} />);

    fireEvent.click(await screen.findByRole("button", { name: "将元瑶设为桌宠" }));

    await waitFor(() => expect(setActivePetMock).toHaveBeenCalledWith("yuanyao"));
    expect(onNotice).toHaveBeenCalledWith("元瑶 已开始陪伴");
    expect(await screen.findByText("使用中")).toBeInTheDocument();
  });
});
