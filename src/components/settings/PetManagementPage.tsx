import { useEffect, useMemo, useRef, useState } from "react";
import { PetDetailSheet } from "@/components/settings/PetDetailSheet";
import { PetLibrary } from "@/components/settings/PetLibrary";
import { EMPTY_DIALOGUE_DRAFT, formatDialogueGroups, parseDialogueDraft } from "@/lib/dialogue-text";
import {
  getPreferences,
  listPets,
  resetDialogueGroup,
  saveDialogues,
  setActivePet,
  uninstallPet,
  updatePreferences,
} from "@/lib/player-api";
import type { DialogueDraft, DialogueKind, PetRecord, PlayerPreferences } from "@/lib/types";

interface PetManagementPageProps {
  onNotice: (message: string) => void;
}

export function PetManagementPage({ onNotice }: PetManagementPageProps) {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [preferences, setPreferences] = useState<PlayerPreferences | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dialogueDraft, setDialogueDraft] = useState<DialogueDraft>(EMPTY_DIALOGUE_DRAFT);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);

  async function refresh(preferId?: string) {
    const [nextPets, nextPreferences] = await Promise.all([listPets(), getPreferences()]);
    if (!mounted.current) return;
    setPets(nextPets);
    setPreferences(nextPreferences);
    setSelectedId((current) => {
      const candidates = [preferId, current, nextPreferences.activePetId];
      return candidates.find((id) => id && nextPets.some((pet) => pet.id === id))
        ?? nextPets[0]?.id
        ?? null;
    });
  }

  useEffect(() => {
    mounted.current = true;
    void refresh().catch((error) => {
      if (mounted.current) setLoadError(error instanceof Error ? error.message : "无法读取宠物配置");
    });
    return () => { mounted.current = false; };
  }, []);

  const selected = useMemo(
    () => pets.find((pet) => pet.id === selectedId) ?? null,
    [pets, selectedId],
  );

  useEffect(() => {
    setDialogueDraft(selected ? formatDialogueGroups(selected.dialogues) : EMPTY_DIALOGUE_DRAFT);
  }, [selected?.id, selected?.dialogues]);

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    try {
      await action();
      onNotice(success);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  function activatePet(id: string) {
    const pet = pets.find((candidate) => candidate.id === id);
    if (!pet) return;
    void run(async () => {
      const next = await setActivePet(pet.id);
      setPreferences(next);
    }, `${pet.displayName} 已开始陪伴`);
  }

  function save() {
    if (!selected || !preferences) return;
    void run(async () => {
      await Promise.all([
        saveDialogues(selected.id, parseDialogueDraft(dialogueDraft)),
        updatePreferences(preferences),
      ]);
      await refresh(selected.id);
    }, "配置已保存");
  }

  function restoreDialogue(kind: DialogueKind, label: string) {
    if (!selected) return;
    void run(async () => {
      const restored = await resetDialogueGroup(selected.id, kind);
      setDialogueDraft((current) => ({ ...current, [kind]: restored[kind].join("\n") }));
    }, `${label}已恢复默认`);
  }

  function remove() {
    if (!selected) return;
    void run(async () => {
      await uninstallPet(selected.id);
      await refresh();
      setDetailsOpen(false);
    }, "宠物已卸载");
  }

  function selectPet(id: string) {
    setSelectedId(id);
    setDetailsOpen(true);
  }

  if (loadError) {
    return <div role="alert" className="page-state page-state-error">宠物库加载失败：{loadError}</div>;
  }
  if (!preferences) {
    return <div className="page-state">正在唤醒宠物库…</div>;
  }

  return (
    <section className="workspace-grid" aria-label="宠物管理">
      <PetLibrary
        pets={pets}
        activePetId={preferences.activePetId}
        selectedId={selectedId}
        busy={busy}
        onSelect={selectPet}
        onActivate={activatePet}
      />
      <PetDetailSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        selected={selected}
        preferences={preferences}
        dialogueDraft={dialogueDraft}
        busy={busy}
        onPreferencesChange={setPreferences}
        onDraftChange={setDialogueDraft}
        onActivate={() => selected && activatePet(selected.id)}
        onSave={save}
        onRestore={restoreDialogue}
        onRemove={remove}
      />
    </section>
  );
}
