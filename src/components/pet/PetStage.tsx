import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ambientDelayMs, canStartIdleReaction, chooseAmbientAction, dragAnimationForDelta, shouldPointerInterruptIdleReaction, type AmbientAction } from "@/lib/ambient-scheduler";
import { chooseDialogue, randomDelayMs } from "@/lib/dialogue-scheduler";
import { getCursorPosition, getPreferences, isTauriRuntime, listPets, savePetWindowPosition, subscribeToStateChanges } from "@/lib/player-api";
import {
  POINTER_LOOK_MAX_DISTANCE,
  pointerLookAngle,
  type AnimationState,
} from "@/lib/pet-contract";
import type { DialogueKind, PetRecord, PlayerPreferences } from "@/lib/types";
import { SpeechBubble } from "./SpeechBubble";
import { SpriteCanvas } from "./SpriteCanvas";

interface DragStart { x: number; y: number }
interface DragSession {
  startCursorX: number;
  startCursorY: number;
  startWindowX: number;
  startWindowY: number;
  lastCursorX: number;
}

export function PetStage() {
  const [pet, setPet] = useState<PetRecord | null>(null);
  const [preferences, setPreferences] = useState<PlayerPreferences | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [animation, setAnimation] = useState<AnimationState>("idle");
  const [lookAngle, setLookAngle] = useState<number | null>(null);
  const [playOnce, setPlayOnce] = useState(false);
  const lastDialogue = useRef<Record<DialogueKind, string | null>>({ idle: null, drag: null, touch: null });
  const lastAmbientAction = useRef<AmbientAction | null>(null);
  const lastLookAngle = useRef<number | null>(null);
  const reacting = useRef(false);
  const passiveReaction = useRef(false);
  const dragStart = useRef<DragStart | null>(null);
  const dragSession = useRef<DragSession | null>(null);
  const dragging = useRef(false);
  const pointerDown = useRef(false);
  const movementDirection = useRef<"running-left" | "running-right" | null>(null);
  const dragTimer = useRef(0);
  const dragTickBusy = useRef(false);
  const bubbleTimer = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    const [pets, prefs] = await Promise.all([listPets(), getPreferences()]);
    if (!mounted.current) return;
    setPreferences(prefs);
    setPet(pets.find((candidate) => candidate.id === prefs.activePetId) ?? pets[0] ?? null);
  }, []);

  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let unlisten: (() => void) | undefined;
    const safelyRefresh = () => {
      void refresh().catch((error) => {
        console.error("无法刷新宠物状态", error);
      });
    };
    safelyRefresh();
    void subscribeToStateChanges(safelyRefresh).then((value) => {
      if (stopped) value();
      else unlisten = value;
    }).catch((error) => {
      console.error("无法订阅宠物状态", error);
    });
    return () => {
      stopped = true;
      mounted.current = false;
      unlisten?.();
    };
  }, [refresh]);

  const playReaction = useCallback((state: AnimationState, passive = false) => {
    reacting.current = true;
    passiveReaction.current = passive;
    setPlayOnce(true);
    setLookAngle(null);
    setAnimation(state);
  }, []);

  const playMovement = useCallback((state: "running-left" | "running-right") => {
    reacting.current = true;
    passiveReaction.current = false;
    setPlayOnce(false);
    setLookAngle(null);
    setAnimation(state);
  }, []);

  const showDialogue = useCallback((kind: DialogueKind) => {
    if (!pet || !preferences?.dialogueEnabled) return;
    const selected = chooseDialogue(pet.dialogues[kind], lastDialogue.current[kind]);
    if (!selected) return;
    lastDialogue.current[kind] = selected;
    setDialogue(selected);
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setDialogue(null), preferences.bubbleSeconds * 1000);
  }, [pet, preferences]);

  const speak = useCallback((reaction: AnimationState, kind: DialogueKind, passive = false) => {
    playReaction(reaction, passive);
    showDialogue(kind);
  }, [playReaction, showDialogue]);

  useEffect(() => {
    lastDialogue.current = { idle: null, drag: null, touch: null };
  }, [pet?.id]);

  useEffect(() => {
    if (!pet) return;
    let stopped = false;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (
          !stopped
          && canStartIdleReaction(
            reacting.current,
            dragging.current,
            lastLookAngle.current,
          )
        ) {
          const action = chooseAmbientAction(lastAmbientAction.current);
          lastAmbientAction.current = action;
          playReaction(action, true);
        }
        if (!stopped) schedule();
      }, ambientDelayMs());
    };
    schedule();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [pet, playReaction]);

  useEffect(() => {
    if (!pet || !preferences?.dialogueEnabled) return;
    let stopped = false;
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (
          !stopped
          && canStartIdleReaction(
            reacting.current,
            dragging.current,
            lastLookAngle.current,
          )
        ) {
          speak("jumping", "idle", true);
        }
        if (!stopped) schedule();
      }, randomDelayMs(preferences.minDialogueSeconds, preferences.maxDialogueSeconds));
    };
    schedule();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [pet, preferences, speak]);

  useEffect(() => () => {
    window.clearTimeout(bubbleTimer.current);
    window.clearInterval(dragTimer.current);
  }, []);

  useEffect(() => {
    if (!isTauriRuntime() || !preferences) return;
    let stopped = false;
    let timer = 0;
    const scale = preferences.scalePercent / 100;

    const updateFromDesktopCursor = async () => {
      try {
        const [{ getCurrentWindow }, cursor] = await Promise.all([
          import("@tauri-apps/api/window"),
          getCursorPosition(),
        ]);
        if (!cursor || stopped) return;
        const petWindow = getCurrentWindow();
        const [position, factor] = await Promise.all([petWindow.outerPosition(), petWindow.scaleFactor()]);
        const angle = pointerLookAngle(
          (cursor.x - position.x) / factor,
          (cursor.y - position.y) / factor,
          160,
          360 - 170 * scale,
          undefined,
          POINTER_LOOK_MAX_DISTANCE,
        );
        lastLookAngle.current = angle;
        if (
          shouldPointerInterruptIdleReaction(passiveReaction.current, angle)
        ) {
          reacting.current = false;
          passiveReaction.current = false;
          setPlayOnce(false);
          setAnimation("idle");
          setLookAngle(angle);
        } else if (!reacting.current) {
          setLookAngle(angle);
        }
      } catch {
        // Pointer events inside the pet window remain available as a fallback.
      } finally {
        if (!stopped) timer = window.setTimeout(updateFromDesktopCursor, 90);
      }
    };

    void updateFromDesktopCursor();
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [preferences]);

  const finishReaction = () => {
    reacting.current = false;
    passiveReaction.current = false;
    setPlayOnce(false);
    setAnimation("idle");
    setLookAngle(lastLookAngle.current);
  };

  const clearDragTimer = () => {
    window.clearInterval(dragTimer.current);
    dragTimer.current = 0;
    dragTickBusy.current = false;
  };

  const finishDragInteraction = (triggerClick: boolean) => {
    if (!pointerDown.current) return;
    const wasDragging = dragging.current;
    pointerDown.current = false;
    dragStart.current = null;
    dragSession.current = null;
    dragging.current = false;
    movementDirection.current = null;
    clearDragTimer();
    if (wasDragging) {
      finishReaction();
      window.setTimeout(() => {
        void savePetWindowPosition().catch(() => {
          // A failed position save should not interrupt the drag interaction.
        });
      }, 0);
    }
    else if (triggerClick) speak("jumping", "touch");
  };

  const beginDragInteraction = async (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    pointerDown.current = true;
    dragging.current = false;
    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (!isTauriRuntime()) return;

    try {
      const [{ getCurrentWindow }, { PhysicalPosition }, cursor] = await Promise.all([
        import("@tauri-apps/api/window"),
        import("@tauri-apps/api/dpi"),
        getCursorPosition(),
      ]);
      if (!cursor || !pointerDown.current) return;
      const petWindow = getCurrentWindow();
      const origin = await petWindow.outerPosition();
      dragSession.current = {
        startCursorX: cursor.x,
        startCursorY: cursor.y,
        startWindowX: origin.x,
        startWindowY: origin.y,
        lastCursorX: cursor.x,
      };

      clearDragTimer();
      dragTimer.current = window.setInterval(() => {
        if (dragTickBusy.current || !pointerDown.current || !dragSession.current) return;
        dragTickBusy.current = true;
        void getCursorPosition().then(async (nextCursor) => {
          const session = dragSession.current;
          if (!nextCursor || !session) return;
          if (!nextCursor.leftButtonDown) {
            finishDragInteraction(true);
            return;
          }

          const totalX = nextCursor.x - session.startCursorX;
          const totalY = nextCursor.y - session.startCursorY;
          if (!dragging.current && Math.hypot(totalX, totalY) >= 5) {
            dragging.current = true;
            showDialogue("drag");
          }
          if (!dragging.current) return;

          const stepX = nextCursor.x - session.lastCursorX;
          if (Math.abs(stepX) >= 1) {
            const nextDirection = dragAnimationForDelta(stepX);
            if (movementDirection.current !== nextDirection) {
              movementDirection.current = nextDirection;
              playMovement(nextDirection);
            }
          }
          session.lastCursorX = nextCursor.x;
          await petWindow.setPosition(new PhysicalPosition(session.startWindowX + totalX, session.startWindowY + totalY));
        }).catch(() => {
          // A transient native-window failure should not leave the drag loop locked.
        }).finally(() => { dragTickBusy.current = false; });
      }, 24);
    } catch {
      clearDragTimer();
    }
  };

  const updateLookDirection = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = (preferences?.scalePercent ?? 100) / 100;
    const angle = pointerLookAngle(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width / 2,
      rect.height - 170 * scale,
      28,
      600,
    );
    lastLookAngle.current = angle;
    if (
      shouldPointerInterruptIdleReaction(passiveReaction.current, angle)
    ) {
      reacting.current = false;
      passiveReaction.current = false;
      setPlayOnce(false);
      setAnimation("idle");
      setLookAngle(angle);
    } else if (!reacting.current) {
      setLookAngle(angle);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    updateLookDirection(event);
  };

  const handlePointerLeave = () => {
    if (isTauriRuntime()) return;
    lastLookAngle.current = null;
    if (!reacting.current) setLookAngle(null);
  };

  const handlePointerUp = () => {
    finishDragInteraction(true);
  };

  if (!pet || !preferences) return null;

  return (
    <main
      className="pet-stage"
      onContextMenu={(event) => event.preventDefault()}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <div
        className="pet-bubble-slot"
        style={{ bottom: `${43 + 173 * (preferences.scalePercent / 100)}px` }}
      >
        <SpeechBubble text={dialogue} visible={Boolean(dialogue)} />
      </div>
      <button
        type="button"
        className="pet-drag-target"
        aria-label={`拖动${pet.displayName}，单击让宠物说话`}
        onPointerDown={(event) => void beginDragInteraction(event)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => finishDragInteraction(false)}
      >
        <div
          className="pet-visual-anchor"
          style={{ transform: `scale(${preferences.scalePercent / 100})` }}
        >
          <SpriteCanvas
            src={pet.spritesheetUrl}
            state={animation}
            lookAngle={lookAngle}
            playOnce={playOnce}
            className="pet-standard-canvas"
            onCycleEnd={finishReaction}
          />
        </div>
      </button>
    </main>
  );
}
