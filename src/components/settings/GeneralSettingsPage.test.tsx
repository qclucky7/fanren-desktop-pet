import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import {
  getAutostartEnabled,
  openPetDirectory,
  setAutostartEnabled,
} from "@/lib/player-api";

vi.mock("@/lib/player-api", () => ({
  getAutostartEnabled: vi.fn(),
  isTauriRuntime: vi.fn(() => true),
  openPetDirectory: vi.fn(),
  setAutostartEnabled: vi.fn(),
}));

const getAutostartMock = vi.mocked(getAutostartEnabled);
const setAutostartMock = vi.mocked(setAutostartEnabled);
const openPetDirectoryMock = vi.mocked(openPetDirectory);

describe("GeneralSettingsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    getAutostartMock.mockResolvedValue(false);
    setAutostartMock.mockImplementation(async (enabled) => enabled);
    openPetDirectoryMock.mockResolvedValue();
  });

  it("loads and immediately persists the autostart switch", async () => {
    const onNotice = vi.fn();
    render(<GeneralSettingsPage onNotice={onNotice} />);
    const toggle = await screen.findByRole("switch", { name: "开机自启" });

    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);

    await waitFor(() => expect(setAutostartMock).toHaveBeenCalledWith(true));
    expect(onNotice).toHaveBeenCalledWith("开机自启已开启");
  });

  it("opens the application pet directory", async () => {
    const onNotice = vi.fn();
    render(<GeneralSettingsPage onNotice={onNotice} />);
    const button = await screen.findByRole("button", { name: "打开宠物目录" });

    fireEvent.click(button);

    await waitFor(() => expect(openPetDirectoryMock).toHaveBeenCalledOnce());
    expect(onNotice).toHaveBeenCalledWith("已打开宠物目录");
  });

  it("keeps the settings page concise without redundant storage messaging", async () => {
    render(<GeneralSettingsPage onNotice={() => {}} />);

    expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "常规" })).toBeInTheDocument();
    expect(screen.queryByText(/所有设置均保存在本机/)).not.toBeInTheDocument();
    expect(screen.queryByText(/当前为浏览器预览/)).not.toBeInTheDocument();
  });
});
