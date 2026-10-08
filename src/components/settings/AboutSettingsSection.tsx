import SiBilibili from "@icons-pack/react-simple-icons/icons/SiBilibili";
import SiGithub from "@icons-pack/react-simple-icons/icons/SiGithub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProjectLink } from "@/lib/project-links";

interface AboutSettingsSectionProps {
  appVersion: string;
  disabled: boolean;
  onOpenLink: (link: ProjectLink) => void;
}

export function AboutSettingsSection({ appVersion, disabled, onOpenLink }: AboutSettingsSectionProps) {
  return (
    <section className="settings-group" aria-labelledby="about-settings-group-title">
      <header className="settings-group-heading">
        <h2 id="about-settings-group-title">关于</h2>
      </header>

      <Card className="system-settings-card settings-about-card">
        <div className="system-setting-row settings-about-version">
          <div className="system-setting-copy">
            <h3>凡人修仙传桌宠</h3>
            <p>当前版本 <span className="app-version-value">v{appVersion}</span></p>
          </div>
        </div>

        <div className="system-setting-divider" />

        <div className="settings-project-links">
          <Button
            type="button"
            variant="ghost"
            className="settings-project-link"
            aria-label="打开 GitHub 版本发布页"
            disabled={disabled}
            onClick={() => onOpenLink("releases")}
          >
            <SiGithub aria-hidden="true" />
            <span className="settings-project-link-copy">
              <strong>GitHub</strong>
              <span>版本发布</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="settings-project-link"
            aria-label="打开 B站动态"
            disabled={disabled}
            onClick={() => onOpenLink("bilibili")}
          >
            <SiBilibili aria-hidden="true" />
            <span className="settings-project-link-copy">
              <strong>B站</strong>
              <span>项目动态</span>
            </span>
          </Button>
        </div>
      </Card>
    </section>
  );
}
