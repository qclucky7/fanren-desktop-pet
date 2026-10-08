import { PawPrint, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
