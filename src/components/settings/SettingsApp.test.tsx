import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsApp } from "./SettingsApp";
import { version as projectVersion } from "../../../package.json";

vi.mock("@/components/settings/PetManagementPage", () => ({
  PetManagementPage: ({ onNotice }: { onNotice: (message: string) => void }) => (
    <button type="button" onClick={() => onNotice("配置已保存")}>触发提示</button>
  ),
}));

vi.mock("@/components/settings/GeneralSettingsPage", () => ({
  GeneralSettingsPage: () => <div>设置内容</div>,
}));

vi.mock("@/components/settings/SettingsSidebar", () => ({
  SettingsSidebar: ({ onNavigate }: { onNavigate: (page: "pets" | "settings") => void }) => (
    <nav>
      <button type="button" onClick={() => onNavigate("pets")}>宠物</button>
      <button type="button" onClick={() => onNavigate("settings")}>设置</button>
    </nav>
  ),
}));

describe("SettingsApp runtime notice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = "未设置版本";
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("fades and removes a notice after three seconds", () => {
    render(<SettingsApp />);
    fireEvent.click(screen.getByRole("button", { name: "触发提示" }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("配置已保存");

    act(() => vi.advanceTimersByTime(2700));
    expect(status.parentElement).toHaveClass("is-leaving");

    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("clears the current notice when switching pages", () => {
    render(<SettingsApp />);
    fireEvent.click(screen.getByRole("button", { name: "触发提示" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "设置" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("设置内容")).toBeVisible();
  });

  it("adds the current version to the window title", async () => {
    render(<SettingsApp />);

    await act(async () => { await Promise.resolve(); });

    expect(document.title).toBe(`凡人修仙传桌宠 · 宠物配置 · v${projectVersion}`);
  });
});
