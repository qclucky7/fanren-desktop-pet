import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsSidebar } from "./SettingsSidebar";

describe("SettingsSidebar", () => {
  it("shows the two application pages and marks the active one", () => {
    const onNavigate = vi.fn();
    render(<SettingsSidebar activePage="pets" onNavigate={onNavigate} />);

    expect(screen.getByRole("button", { name: /宠物/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /设置/ })).not.toHaveAttribute("aria-current");

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });
});
