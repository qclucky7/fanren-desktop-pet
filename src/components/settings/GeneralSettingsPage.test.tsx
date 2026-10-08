import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import { SettingsThemeProvider } from "./SettingsThemeProvider";
import {
  getAutostartEnabled,
  openPetDirectory,
  setAutostartEnabled,
} from "@/lib/player-api";
import { openProjectLink } from "@/lib/project-links";

vi.mock("@/lib/player-api", () => ({
  getAutostartEnabled: vi.fn(),
  isTauriRuntime: vi.fn(() => true),
  openPetDirectory: vi.fn(),
  setAutostartEnabled: vi.fn(),
  syncSettingsWindowTheme: vi.fn(async () => {}),
}));
vi.mock("@/lib/project-links", () => ({ openProjectLink: vi.fn() }));

const getAutostartMock = vi.mocked(getAutostartEnabled);
const setAutostartMock = vi.mocked(setAutostartEnabled);
const openPetDirectoryMock = vi.mocked(openPetDirectory);
const openProjectLinkMock = vi.mocked(openProjectLink);

function renderSettingsPage(onNotice: (message: string) => void) {
  return render(
    <SettingsThemeProvider>
      <GeneralSettingsPage appVersion="0.1.0" onNotice={onNotice} />
    </SettingsThemeProvider>,
  );
}

describe("GeneralSettingsPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    getAutostartMock.mockResolvedValue(false);
    setAutostartMock.mockImplementation(async (enabled) => enabled);
    openPetDirectoryMock.mockResolvedValue();
    openProjectLinkMock.mockResolvedValue();
  });

  it("loads and immediately persists the autostart switch", async () => {
    const onNotice = vi.fn();
    renderSettingsPage(onNotice);
    const toggle = await screen.findByRole("switch", { name: "开机自启" });

    await waitFor(() => expect(toggle).toBeEnabled());
    fireEvent.click(toggle);

    await waitFor(() => expect(setAutostartMock).toHaveBeenCalledWith(true));
    expect(onNotice).toHaveBeenCalledWith("开机自启已开启");
  });

  it("opens the application pet directory", async () => {
    const onNotice = vi.fn();
    renderSettingsPage(onNotice);
    expect(screen.queryByRole("button", { name: "打开宠物目录" })).not.toBeInTheDocument();
    expect(openPetDirectoryMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "高级设置" }));
    const button = await screen.findByRole("button", { name: "打开宠物目录" });

    fireEvent.click(button);

    await waitFor(() => expect(openPetDirectoryMock).toHaveBeenCalledOnce());
    expect(onNotice).toHaveBeenCalledWith("已打开宠物目录");
  });

  it("keeps advanced actions hidden again after collapsing the section", () => {
    renderSettingsPage(() => {});
    const disclosure = screen.getByRole("button", { name: "高级设置" });

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "打开宠物目录" })).toBeVisible();
    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "打开宠物目录" })).not.toBeInTheDocument();
  });

  it("keeps the settings page concise without redundant storage messaging", async () => {
    renderSettingsPage(() => {});

    expect(await screen.findByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "常用设置" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "外观主题" })).toBeVisible();
    expect(screen.getByRole("switch", { name: "开机自启" })).toBeVisible();
    expect(screen.queryByText(/所有设置均保存在本机/)).not.toBeInTheDocument();
    expect(screen.queryByText(/当前为浏览器预览/)).not.toBeInTheDocument();
  });

  it("shows the installed app version in the about section", () => {
    renderSettingsPage(() => {});

    expect(screen.getByRole("heading", { name: "关于" })).toBeInTheDocument();
    expect(screen.getByText("当前版本")).toBeInTheDocument();
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
  });

  it("opens GitHub releases and Bilibili updates from the about section", async () => {
    renderSettingsPage(() => {});

    const githubButton = screen.getByRole("button", { name: "打开 GitHub 版本发布页" });
    const bilibiliButton = screen.getByRole("button", { name: "打开 B站动态" });
    expect(githubButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(bilibiliButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(githubButton);
    await waitFor(() => expect(openProjectLinkMock).toHaveBeenCalledWith("releases"));

    fireEvent.click(bilibiliButton);
    await waitFor(() => expect(openProjectLinkMock).toHaveBeenCalledWith("bilibili"));
    expect(openProjectLinkMock).toHaveBeenCalledTimes(2);
  });
});
