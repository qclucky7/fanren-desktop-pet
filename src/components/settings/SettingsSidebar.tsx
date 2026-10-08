import { PawPrint, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import appIconUrl from "../../../src-tauri/icons/icon.png";

export type SettingsPage = "pets" | "settings";

interface SettingsSidebarProps {
  activePage: SettingsPage;
  onNavigate: (page: SettingsPage) => void;
}

const NAV_ITEMS = [
  { id: "pets" as const, label: "宠物", icon: PawPrint },
  { id: "settings" as const, label: "设置", icon: Settings2 },
];

export function SettingsSidebar({ activePage, onNavigate }: SettingsSidebarProps) {
  return (
    <aside className="settings-sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark"><img src={appIconUrl} alt="" /></div>
        <div className="sidebar-brand-copy">
          <div className="brand-title">凡人修仙传</div>
          <div className="brand-subtitle">桌宠</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="主菜单">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="ghost"
            className="sidebar-nav-item"
            aria-current={activePage === id ? "page" : undefined}
            onClick={() => onNavigate(id)}
          >
            <span className="sidebar-nav-icon"><Icon aria-hidden="true" /></span>
            <strong>{label}</strong>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
