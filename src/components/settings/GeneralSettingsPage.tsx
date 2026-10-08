import { useEffect, useRef, useState } from "react";
import { AdvancedSettingsSection } from "@/components/settings/AdvancedSettingsSection";
import { AboutSettingsSection } from "@/components/settings/AboutSettingsSection";
import { ThemePreferenceControl } from "@/components/settings/ThemePreferenceControl";
import { useSettingsTheme } from "@/components/settings/SettingsThemeProvider";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getAutostartEnabled,
  openPetDirectory,
  setAutostartEnabled,
} from "@/lib/player-api";
import { openProjectLink, type ProjectLink } from "@/lib/project-links";

interface GeneralSettingsPageProps {
  appVersion: string;
  onNotice: (message: string) => void;
}

export function GeneralSettingsPage({ appVersion, onNotice }: GeneralSettingsPageProps) {
  const { preference, setPreference } = useSettingsTheme();
  const [autostartEnabled, setAutostartState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"autostart" | "directory" | ProjectLink | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    void getAutostartEnabled()
      .then((enabled) => {
        if (mounted.current) setAutostartState(enabled);
      })
      .catch((error) => {
        if (mounted.current) onNotice(error instanceof Error ? error.message : "无法读取开机自启状态");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => { mounted.current = false; };
  }, [onNotice]);

  async function changeAutostart(enabled: boolean) {
    setBusyAction("autostart");
    try {
      const saved = await setAutostartEnabled(enabled);
      setAutostartState(saved);
      onNotice(saved ? "开机自启已开启" : "开机自启已关闭");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "开机自启设置失败");
    } finally {
      setBusyAction(null);
    }
  }

  async function openDirectory() {
    setBusyAction("directory");
    try {
      await openPetDirectory();
      onNotice("已打开宠物目录");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "无法打开宠物目录");
    } finally {
      setBusyAction(null);
    }
  }

  async function openLink(link: ProjectLink) {
    setBusyAction(link);
    try {
      await openProjectLink(link);
    } catch (error) {
      const fallback = link === "releases" ? "无法打开 GitHub 版本发布页" : "无法打开 B站动态";
      onNotice(error instanceof Error ? error.message : fallback);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="general-settings-page" aria-labelledby="general-settings-title">
      <div className="settings-page-content">
        <header className="section-heading settings-page-heading">
          <div className="section-heading-copy">
            <h1 id="general-settings-title">设置</h1>
            <p>选择外观，管理启动方式与版本信息</p>
          </div>
        </header>

        <section className="settings-group" aria-labelledby="general-settings-group-title">
          <header className="settings-group-heading">
            <h2 id="general-settings-group-title">常用设置</h2>
          </header>

          <Card className="system-settings-card">
            <div className="system-setting-row theme-setting-row">
              <div className="system-setting-copy">
                <h3>外观主题</h3>
                <p>跟随系统时会自动适配系统外观</p>
              </div>
              <ThemePreferenceControl value={preference} onChange={setPreference} />
            </div>

            <div className="system-setting-divider" />

            <div className="system-setting-row">
              <div className="system-setting-copy">
                <h3>开机自启</h3>
                <p>登录 Windows 后静默启动至托盘</p>
              </div>
              <Switch
                aria-label="开机自启"
                checked={autostartEnabled}
                disabled={loading || busyAction !== null}
                onCheckedChange={(checked) => void changeAutostart(checked)}
              />
            </div>

          </Card>
        </section>

        <AboutSettingsSection
          appVersion={appVersion}
          disabled={busyAction !== null}
          onOpenLink={(link) => void openLink(link)}
        />

        <AdvancedSettingsSection
          disabled={busyAction !== null}
          openingDirectory={busyAction === "directory"}
          onOpenDirectory={() => void openDirectory()}
        />
      </div>
    </section>
  );
}
