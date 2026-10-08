import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function SpeechBubble({ text, visible }: { text: string | null; visible: boolean }) {
  const [lastText, setLastText] = useState(text);

  useEffect(() => {
    if (text) setLastText(text);
  }, [text]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      className={cn("speech-bubble", visible ? "is-visible" : "is-hidden")}
    >
      {text ?? lastText}
    </div>
  );
}
