import { useEffect, useRef, useState } from "react";
import { ANIMATIONS, CODEX_V2_ATLAS, lookDirectionFrame, type AnimationState } from "@/lib/pet-contract";
import { cn } from "@/lib/utils";

interface SpriteCanvasProps {
  src: string;
  state?: AnimationState;
  lookAngle?: number | null;
  playOnce?: boolean;
  className?: string;
  onCycleEnd?: () => void;
}

export function SpriteCanvas({ src, state = "idle", lookAngle = null, playOnce = false, className, onCycleEnd }: SpriteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbackRef = useRef(onCycleEnd);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  callbackRef.current = onCycleEnd;

  useEffect(() => {
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = src;
    return () => { nextImage.onload = null; };
  }, [src]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !image) return;

    let cancelled = false;
    let timer = 0;
    let frame = 0;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CODEX_V2_ATLAS.cellWidth * ratio;
    canvas.height = CODEX_V2_ATLAS.cellHeight * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    const drawCell = (row: number, column: number) => {
      context.clearRect(0, 0, CODEX_V2_ATLAS.cellWidth, CODEX_V2_ATLAS.cellHeight);
      context.drawImage(
        image,
        column * CODEX_V2_ATLAS.cellWidth,
        row * CODEX_V2_ATLAS.cellHeight,
        CODEX_V2_ATLAS.cellWidth,
        CODEX_V2_ATLAS.cellHeight,
        0,
        0,
        CODEX_V2_ATLAS.cellWidth,
        CODEX_V2_ATLAS.cellHeight,
      );
    };

    if (lookAngle !== null) {
      const direction = lookDirectionFrame(lookAngle);
      drawCell(direction.row, direction.column);
      return;
    }

    const definition = ANIMATIONS[state];
    const drawAnimationFrame = () => {
      if (cancelled) return;
      drawCell(definition.row, frame);
      timer = window.setTimeout(() => {
        if (frame >= definition.durations.length - 1) {
          if (!definition.loop || playOnce) {
            callbackRef.current?.();
            return;
          }
          frame = 0;
        } else {
          frame += 1;
        }
        drawAnimationFrame();
      }, definition.durations[frame]);
    };

    drawAnimationFrame();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [image, lookAngle, playOnce, state]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={lookAngle === null ? `宠物动画：${state}` : "宠物视线跟随鼠标"}
      className={cn("block h-[208px] w-[192px] select-none", className)}
    />
  );
}
