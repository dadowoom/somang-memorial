import { cn } from "@/lib/utils";
import {
  normalizeTextDisplaySize,
  TEXT_SIZE_OPTIONS,
  TextDisplaySize,
} from "@/lib/textDisplay";
import { Check, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type InlineEditTextProps = {
  value: string;
  isAdmin: boolean;
  onSave: (value: string) => Promise<unknown> | void;
  textSize?: TextDisplaySize | string | null;
  onTextSizeSave?: (size: TextDisplaySize) => Promise<unknown> | void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
};

export default function InlineEditText({
  value,
  isAdmin,
  onSave,
  textSize,
  onTextSizeSave,
  placeholder = "클릭하여 입력하세요",
  multiline = false,
  rows = 3,
  className = "",
  inputClassName = "",
}: InlineEditTextProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editSize, setEditSize] = useState<TextDisplaySize>(
    normalizeTextDisplaySize(textSize)
  );
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    if (!multiline || !inputRef.current) return;
    if (inputRef.current.tagName !== "TEXTAREA") return;
    const textarea = inputRef.current as HTMLTextAreaElement;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 380)}px`;
  }, [multiline]);

  useEffect(() => {
    if (editing) resizeTextarea();
  }, [editValue, editing, resizeTextarea]);

  const startEdit = useCallback(() => {
    if (!isAdmin) return;
    setEditValue(value);
    setEditSize(normalizeTextDisplaySize(textSize));
    setEditing(true);
    window.setTimeout(() => {
      inputRef.current?.focus();
      resizeTextarea();
    }, 30);
  }, [isAdmin, resizeTextarea, textSize, value]);

  const cancel = useCallback(() => {
    setEditValue(value);
    setEditSize(normalizeTextDisplaySize(textSize));
    setEditing(false);
  }, [textSize, value]);

  const save = useCallback(async () => {
    if (saving) return;
    const nextValue = editValue.trim();
    const valueChanged = nextValue !== value.trim();
    const sizeChanged = editSize !== normalizeTextDisplaySize(textSize);

    if (!valueChanged && !sizeChanged) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      if (valueChanged) await onSave(nextValue);
      if (sizeChanged && onTextSizeSave) await onTextSizeSave(editSize);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [editSize, editValue, onSave, onTextSizeSave, saving, textSize, value]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return;
      }
      if (event.key === "Enter" && !multiline) {
        event.preventDefault();
        save();
      }
      if (event.key === "Enter" && multiline && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        save();
      }
    },
    [cancel, multiline, save]
  );

  if (editing) {
    return (
      <div className="w-full">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            rows={rows}
            onChange={event => setEditValue(event.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full resize-y border border-[#d8c7a3] bg-[#fffdf8] px-3 py-2 text-sm leading-7 text-[#2e2218] outline-none focus:border-[#9c7437]",
              inputClassName
            )}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={editValue}
            onChange={event => setEditValue(event.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full border border-[#d8c7a3] bg-[#fffdf8] px-3 py-2 text-sm text-[#2e2218] outline-none focus:border-[#9c7437]",
              inputClassName
            )}
          />
        )}

        {onTextSizeSave && (
          <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-[#7a674a]">
            <span className="mr-1">글씨</span>
            {TEXT_SIZE_OPTIONS.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => setEditSize(size)}
                className={cn(
                  "border border-[#d8c7a3] px-2 py-1 transition-colors",
                  editSize === size
                    ? "bg-[#8b642c] text-white"
                    : "bg-white/65 hover:bg-[#fbf4e8]"
                )}
              >
                {size === "auto" && "자동"}
                {size === "small" && "작게"}
                {size === "normal" && "보통"}
                {size === "large" && "크게"}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="inline-flex items-center gap-1 border border-[#d8c7a3] bg-white/70 px-3 py-1.5 text-xs text-[#6f5b35]"
          >
            <X className="h-3 w-3" />
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 bg-[#8b642c] px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            <Check className="h-3 w-3" />
            {saving ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    );
  }

  const empty = value.trim() === "";

  return (
    <span
      className={cn(
        "group relative inline-block whitespace-pre-wrap",
        isAdmin && "cursor-pointer",
        empty && isAdmin && "border-b border-dashed border-[#b99352] text-[#9c835b]",
        className
      )}
      style={{ overflowWrap: "break-word", wordBreak: "keep-all" }}
      onClick={startEdit}
    >
      {empty && isAdmin ? placeholder : value}
      {isAdmin && (
        <Pencil className="ml-2 inline h-3.5 w-3.5 text-[#9c7437] opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </span>
  );
}
