import { useEffect, useRef } from "react";
import { CODEX_V2_ATLAS } from "@/lib/pet-contract";
import { cn } from "@/lib/utils";

export function SpritePreview({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let image: HTMLImageElement | null = null;
    image = new Image();
    image.onload = () => {
      canvas.width = CODEX_V2_ATLAS.cellWidth;
      canvas.height = CODEX_V2_ATLAS.cellHeight;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image!, 0, 0, CODEX_V2_ATLAS.cellWidth, CODEX_V2_ATLAS.cellHeight, 0, 0, canvas.width, canvas.height);
    };
    image.src = src;
    return () => {
      if (image) image.onload = null;
    };
  }, [src]);

  return (
    <span className={cn("sprite-preview-frame", className)} aria-hidden="true">
      <canvas
        ref={ref}
        width={CODEX_V2_ATLAS.cellWidth}
        height={CODEX_V2_ATLAS.cellHeight}
      />
    </span>
  );
}
