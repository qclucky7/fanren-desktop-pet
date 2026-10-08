import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GeneralSettingsPage } from "@/components/settings/GeneralSettingsPage";
import { PetManagementPage } from "@/components/settings/PetManagementPage";
import { SettingsSidebar, type SettingsPage } from "@/components/settings/SettingsSidebar";

interface RuntimeNotice {
  id: number;
  message: string;
  leaving: boolean;
}

const NOTICE_FADE_DELAY_MS = 2700;
const NOTICE_REMOVE_DELAY_MS = 3000;

export function SettingsApp() {
  const [activePage, setActivePage] = useState<SettingsPage>("pets");
  const [notice, setNotice] = useState<RuntimeNotice | null>(null);
  const noticeId = useRef(0);
  const showNotice = useCallback((message: string) => {
    noticeId.current += 1;
    setNotice({ id: noticeId.current, message, leaving: false });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = notice.id;
    const fadeTimer = window.setTimeout(() => {
      setNotice((current) => current?.id === id ? { ...current, leaving: true } : current);
    }, NOTICE_FADE_DELAY_MS);
    const removeTimer = window.setTimeout(() => {
      setNotice((current) => current?.id === id ? null : current);
    }, NOTICE_REMOVE_DELAY_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [notice?.id]);

  const navigate = useCallback((page: SettingsPage) => {
    setNotice(null);
    setActivePage(page);
  }, []);

  return (
    <main className="settings-shell">
      <SettingsSidebar activePage={activePage} onNavigate={navigate} />

      <div className="settings-main">
        {notice && (
          <div className={`runtime-notice-layer${notice.leaving ? " is-leaving" : ""}`}>
            <Alert className="runtime-notice" role="status">
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="settings-page-stage">
          <div className="settings-page-view" hidden={activePage !== "pets"}>
            <PetManagementPage onNotice={showNotice} />
          </div>
          <div className="settings-page-view" hidden={activePage !== "settings"}>
            <GeneralSettingsPage onNotice={showNotice} />
          </div>
        </div>
      </div>
    </main>
  );
}
