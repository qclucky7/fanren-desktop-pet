import { useEffect, useRef, useState } from "react";
import { FolderOpen, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  getAutostartEnabled,
  openPetDirectory,
  setAutostartEnabled,
} from "@/lib/player-api";

interface GeneralSettingsPageProps {
  onNotice: (message: string) => void;
}

export function GeneralSettingsPage({ onNotice }: GeneralSettingsPageProps) {
  const [autostartEnabled, setAutostartState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"autostart" | "directory" | null>(null);
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

  return (
    <section className="general-settings-page" aria-labelledby="general-settings-title">
      <div className="settings-page-content">
        <header className="section-heading settings-page-heading">
          <div className="section-heading-copy">
            <h1 id="general-settings-title">设置</h1>
            <p>应用启动与宠物资源</p>
          </div>
        </header>

        <section className="settings-group" aria-labelledby="general-settings-group-title">
          <header className="settings-group-heading">
            <h2 id="general-settings-group-title">常规</h2>
          </header>

          <Card className="system-settings-card">
            <div className="system-setting-row">
              <span className="system-setting-icon"><Power aria-hidden="true" /></span>
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

            <div className="system-setting-divider" />

            <div className="system-setting-row">
              <span className="system-setting-icon"><FolderOpen aria-hidden="true" /></span>
              <div className="system-setting-copy">
                <h3>宠物目录</h3>
                <p>查看播放器正在使用的宠物与对话文件</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="directory-button"
                aria-label="打开宠物目录"
                disabled={busyAction !== null}
                onClick={() => void openDirectory()}
              >
                {busyAction === "directory" ? "正在打开…" : "打开目录"}
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </section>
  );
}
