import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import "@/styles.css";
import "@/styles/settings.css";
import "@/styles/settings-library.css";
import "@/styles/settings-detail.css";
import "@/styles/settings-general.css";

const PetStage = lazy(() => import("@/components/pet/PetStage")
  .then((module) => ({ default: module.PetStage })));
const SettingsRoot = lazy(() => import("@/components/settings/SettingsRoot")
  .then((module) => ({ default: module.SettingsRoot })));

const isPetWindow = new URLSearchParams(window.location.search).get("view") === "pet";
document.body.classList.add(isPetWindow ? "pet-window" : "settings-window");

function StartupScreen() {
  return (
    <div className="startup-screen" role="status">
      <div className="startup-screen__content">
        <span className="startup-screen__indicator" aria-hidden="true" />
        <span>正在打开宠物管理…</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={isPetWindow ? null : <StartupScreen />}>
      {isPetWindow ? <PetStage /> : <SettingsRoot />}
    </Suspense>
  </React.StrictMode>,
);
