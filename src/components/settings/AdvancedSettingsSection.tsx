import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdvancedSettingsSectionProps {
  disabled: boolean;
  openingDirectory: boolean;
  onOpenDirectory: () => void;
}

export function AdvancedSettingsSection({
  disabled,
  openingDirectory,
  onOpenDirectory,
}: AdvancedSettingsSectionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="advanced-settings-section" aria-label="高级设置">
      <button
        type="button"
        className="advanced-settings-trigger"
        aria-label="高级设置"
        aria-expanded={expanded}
        aria-controls="advanced-settings-content"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="advanced-settings-trigger-copy">
          <strong>高级设置</strong>
          <span>需要手动管理宠物文件时使用</span>
        </span>
        <ChevronDown className="advanced-settings-chevron" aria-hidden="true" />
      </button>

      {expanded && (
        <div id="advanced-settings-content" className="advanced-settings-content">
          <div className="system-setting-copy">
            <h3>宠物目录</h3>
            <p>查看或管理宠物与对话文件</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="settings-action-button"
            aria-label="打开宠物目录"
            disabled={disabled}
            onClick={onOpenDirectory}
          >
            {openingDirectory ? "正在打开…" : "打开目录"}
          </Button>
        </div>
      )}
    </section>
  );
}
