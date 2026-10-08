import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
} from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DialogueListEditorProps {
  label: string;
  hint: string;
  value: string;
  disabled: boolean;
  resetDisabled: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
}

function dialogueLines(value: string) {
  return value === "" ? [""] : value.split("\n");
}

function dialogueListHeight(lineCount: number) {
  return Math.min(238, Math.max(150, lineCount * 54));
}

export function DialogueListEditor(props: DialogueListEditorProps) {
  const { label, hint, value, disabled, resetDisabled, onChange, onReset } = props;
  const lines = dialogueLines(value);
  const inputRefs = useRef<Array<HTMLTextAreaElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex === null) return;
    const input = inputRefs.current[focusIndex];
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
    setFocusIndex(null);
  }, [focusIndex, value]);

  function commit(nextLines: string[]) {
    onChange(nextLines.join("\n"));
  }

  function updateLine(index: number, nextValue: string) {
    const nextLines = [...lines];
    nextLines[index] = nextValue.replace(/[\r\n]+/g, " ");
    commit(nextLines);
  }

  function insertLine(afterIndex: number) {
    const nextLines = [...lines];
    const nextIndex = afterIndex + 1;
    nextLines.splice(nextIndex, 0, "");
    commit(nextLines);
    setFocusIndex(nextIndex);
  }

  function removeLine(index: number) {
    if (lines.length === 1) {
      commit([""]);
      setFocusIndex(0);
      return;
    }
    const nextLines = lines.filter((_, lineIndex) => lineIndex !== index);
    commit(nextLines);
    setFocusIndex(Math.min(index, nextLines.length - 1));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    insertLine(index);
  }

  return (
    <section className="dialogue-editor" aria-label={label}>
      <div className="dialogue-editor-heading">
        <div className="dialogue-editor-copy">
          <div className="dialogue-editor-title">
            <Label>{label}</Label>
            <span>{lines.filter((line) => line.trim()).length} 条</span>
          </div>
          <p>{hint}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="dialogue-reset"
          onClick={onReset}
          disabled={resetDisabled}
          aria-label={`恢复${label}默认内容`}
        >
          <RotateCcw aria-hidden="true" />
          恢复默认
        </Button>
      </div>

      <div
        className="dialogue-list-scroll"
        style={{ height: dialogueListHeight(lines.length) }}
        onWheelCapture={(event) => event.stopPropagation()}
        tabIndex={lines.length > 3 ? 0 : undefined}
      >
        <div className="dialogue-list">
          {lines.map((line, index) => (
            <div className="dialogue-line" key={index}>
              <span className="dialogue-line-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <AutoSizeTextarea
                ref={(input) => { inputRefs.current[index] = input; }}
                value={line}
                disabled={disabled}
                aria-label={`${label}第 ${index + 1} 条`}
                placeholder="输入一句对话"
                onChange={(event) => updateLine(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="dialogue-line-delete"
                disabled={disabled}
                onClick={() => removeLine(index)}
                aria-label={`删除${label}第 ${index + 1} 条`}
              ><Trash2 aria-hidden="true" /></Button>
            </div>
          ))}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="dialogue-add"
        disabled={disabled}
        onClick={() => insertLine(lines.length - 1)}
      >
        <Plus aria-hidden="true" />
        新增一条
      </Button>
    </section>
  );
}

const AutoSizeTextarea = forwardRef<
  HTMLTextAreaElement,
  ComponentPropsWithoutRef<typeof Textarea> & { value: string }
>(function AutoSizeTextarea({ value, ...props }, ref) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const input = localRef.current;
    if (!input) return;
    input.style.height = "0px";
    const nextHeight = Math.min(Math.max(input.scrollHeight, 42), 144);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > 144 ? "auto" : "hidden";
  }, [value]);

  return (
    <Textarea
      {...props}
      ref={(input) => {
        localRef.current = input;
        if (typeof ref === "function") ref(input);
        else if (ref) ref.current = input;
      }}
      value={value}
      rows={1}
      className="dialogue-line-input"
    />
  );
});
