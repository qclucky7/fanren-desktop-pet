import type { ReactNode } from "react";
import { Check, Clock3, MessageCircle, Save, Scaling, Trash2 } from "lucide-react";
import { SpritePreview } from "@/components/pet/SpritePreview";
import { DialogueListEditor } from "@/components/settings/DialogueListEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  MAX_DIALOGUE_SECONDS,
  MIN_DIALOGUE_SECONDS,
  type DialogueDraft,
  type DialogueKind,
  type PetRecord,
  type PlayerPreferences,
} from "@/lib/types";

export interface PetInspectorProps {
  selected: PetRecord | null;
  preferences: PlayerPreferences;
  dialogueDraft: DialogueDraft;
  busy: boolean;
  onPreferencesChange: (preferences: PlayerPreferences) => void;
  onDraftChange: (draft: DialogueDraft) => void;
  onActivate: () => void;
  onSave: () => void;
  onRestore: (kind: DialogueKind, label: string) => void;
  onRemove: () => void;
}

export function PetInspector(props: PetInspectorProps) {
  const {
    selected,
    preferences,
    dialogueDraft,
    busy,
    onPreferencesChange,
    onDraftChange,
    onActivate,
    onSave,
    onRestore,
    onRemove,
  } = props;

  return (
    <Card className="inspector-panel" role="complementary" aria-label="宠物配置">
      <div className="inspector-scroll">
        <div className="inspector-content">
          {selected ? (
            <>
              <div className="inspector-hero">
                <div className="inspector-avatar">
                  <SpritePreview src={selected.previewUrl} />
                </div>
                <div className="inspector-title"><h2>{selected.displayName}</h2></div>
              </div>
              <Button
                className="inspector-activate"
                variant={preferences.activePetId === selected.id ? "secondary" : "default"}
                onClick={onActivate}
                disabled={busy || preferences.activePetId === selected.id}
              >
                {preferences.activePetId === selected.id && <Check aria-hidden="true" />}
                {preferences.activePetId === selected.id ? "当前正在使用" : "设为桌面宠物"}
              </Button>

              <div className="rule" />
              <div className="setting-row">
                <div className="setting-icon"><MessageCircle /></div>
                <div className="setting-copy"><Label>随机对话</Label><p>按随机间隔显示本地台词</p></div>
                <Switch
                  aria-label="随机对话"
                  checked={preferences.dialogueEnabled}
                  onCheckedChange={(checked) => onPreferencesChange({ ...preferences, dialogueEnabled: checked })}
                />
              </div>
              <div className="dialogue-stack">
                <DialogueListEditor label="待机对话" hint="按设定间隔出现" value={dialogueDraft.idle} disabled={!preferences.dialogueEnabled} resetDisabled={busy} onChange={(idle) => onDraftChange({ ...dialogueDraft, idle })} onReset={() => onRestore("idle", "待机对话")} />
                <DialogueListEditor label="拖拽对话" hint="每次开始拖动时出现" value={dialogueDraft.drag} disabled={!preferences.dialogueEnabled} resetDisabled={busy} onChange={(drag) => onDraftChange({ ...dialogueDraft, drag })} onReset={() => onRestore("drag", "拖拽对话")} />
                <DialogueListEditor label="触摸对话" hint="单击宠物时出现" value={dialogueDraft.touch} disabled={!preferences.dialogueEnabled} resetDisabled={busy} onChange={(touch) => onDraftChange({ ...dialogueDraft, touch })} onReset={() => onRestore("touch", "触摸对话")} />
              </div>
              <div className="metrics-grid">
                <DialogueIntervalMetric
                  min={preferences.minDialogueSeconds}
                  max={preferences.maxDialogueSeconds}
                  onChange={(minDialogueSeconds, maxDialogueSeconds) => onPreferencesChange({ ...preferences, minDialogueSeconds, maxDialogueSeconds })}
                />
                <Metric label="气泡停留" value={`${preferences.bubbleSeconds} 秒`} icon={<MessageCircle />}>
                  <Slider aria-label="气泡停留时间" min={2} max={15} value={[preferences.bubbleSeconds]} onValueChange={([bubbleSeconds = preferences.bubbleSeconds]) => onPreferencesChange({ ...preferences, bubbleSeconds })} />
                </Metric>
                <Metric label="宠物缩放" value={`${preferences.scalePercent}%`} icon={<Scaling />}>
                  <Slider aria-label="宠物缩放比例" min={60} max={160} step={5} value={[preferences.scalePercent]} onValueChange={([scalePercent = preferences.scalePercent]) => onPreferencesChange({ ...preferences, scalePercent })} />
                </Metric>
              </div>
              <div className="inspector-footer">
                <Button className="save-button" onClick={onSave} disabled={busy}>
                  <Save aria-hidden="true" />保存配置
                </Button>
                <RemovePetDialog
                  name={selected.displayName}
                  disabled={busy || selected.builtIn === true}
                  builtIn={selected.builtIn === true}
                  onRemove={onRemove}
                />
              </div>
            </>
          ) : (
            <div className="empty-inspector">还没有安装宠物</div>
          )}
        </div>
      </div>
    </Card>
  );
}

function RemovePetDialog({ name, disabled, builtIn, onRemove }: { name: string; disabled: boolean; builtIn: boolean; onRemove: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon" disabled={disabled} title={builtIn ? "仓库内置宠物不可卸载" : "卸载宠物"} aria-label="卸载宠物">
          <Trash2 aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>卸载“{name}”？</AlertDialogTitle>
          <AlertDialogDescription>将删除播放器内安装的宠物副本，不会影响原始 Codex 宠物目录。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onRemove}>确认卸载</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DialogueIntervalMetric({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  return (
    <div className="metric-card metric-card-wide">
      <div className="metric-heading">
        <span className="metric-icon"><Clock3 /></span>
        <div className="metric-copy"><span>对话间隔</span><p>每次在范围内随机等待</p></div>
        <strong>{min}–{max} 秒</strong>
      </div>
      <Slider className="metric-control" min={MIN_DIALOGUE_SECONDS} max={MAX_DIALOGUE_SECONDS} step={10} value={[min, max]} thumbLabels={["最短对话间隔", "最长对话间隔"]} onValueChange={([nextMin = min, nextMax = max]) => onChange(nextMin, nextMax)} />
      <div className="interval-range-labels"><span>最短 {min} 秒</span><span>最长 {max} 秒</span></div>
    </div>
  );
}

function Metric({ label, value, icon, children }: { label: string; value: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="metric-card">
      <div className="metric-heading"><span className="metric-icon">{icon}</span><span>{label}</span><strong>{value}</strong></div>
      <div className="metric-control">{children}</div>
    </div>
  );
}
