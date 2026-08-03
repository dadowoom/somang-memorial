import {
  backspaceKioskKeyboardValue,
  insertKioskKeyboardToken,
} from "@/lib/kioskKeyboardInput";
import { cn } from "@/lib/utils";
import { ArrowUp, CornerDownLeft, Delete as DeleteIcon, X } from "lucide-react";
import {
  createContext,
  FocusEvent,
  MouseEvent,
  MutableRefObject,
  PointerEvent,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type KioskKeyboardMode = "ko" | "en" | "number" | "symbol";
type KioskKeyboardElement = HTMLInputElement | HTMLTextAreaElement;

type ActiveField = {
  id: string;
  label: string;
  defaultMode: KioskKeyboardMode;
  multiline: boolean;
  maxLength?: number;
  submitLabel?: string;
  elementRef: RefObject<KioskKeyboardElement | null>;
  getValue: () => string;
  setValue: (value: string) => void;
  onSubmit?: () => boolean | void;
};

type KioskKeyboardContextValue = {
  activeFieldId: string | null;
  isOpen: boolean;
  closeKeyboard: () => void;
  closeKeyboardField: (id: string) => void;
  openKeyboard: (field: ActiveField) => void;
};

const KioskKeyboardContext = createContext<KioskKeyboardContextValue | null>(
  null
);

const KOREAN_ROWS = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
];

const ENGLISH_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const SHIFTED_KOREAN: Record<string, string> = {
  ㅂ: "ㅃ",
  ㅈ: "ㅉ",
  ㄷ: "ㄸ",
  ㄱ: "ㄲ",
  ㅅ: "ㅆ",
  ㅐ: "ㅒ",
  ㅔ: "ㅖ",
};

export function KioskKeyboardProvider({ children }: { children: ReactNode }) {
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const closeKeyboard = useCallback(() => setActiveField(null), []);
  const closeKeyboardField = useCallback((id: string) => {
    setActiveField(current => (current?.id === id ? null : current));
  }, []);
  const openKeyboard = useCallback((field: ActiveField) => {
    setActiveField(current => (current?.id === field.id ? current : field));
  }, []);

  return (
    <KioskKeyboardContext.Provider
      value={{
        activeFieldId: activeField?.id ?? null,
        isOpen: Boolean(activeField),
        closeKeyboard,
        closeKeyboardField,
        openKeyboard,
      }}
    >
      {children}
      {activeField && (
        <>
          <div aria-hidden="true" className="h-[min(360px,55dvh)]" />
          <KioskKeyboard field={activeField} onClose={closeKeyboard} />
        </>
      )}
    </KioskKeyboardContext.Provider>
  );
}

export function useKioskKeyboard() {
  const context = useContext(KioskKeyboardContext);
  if (!context) {
    throw new Error(
      "useKioskKeyboard must be used inside KioskKeyboardProvider"
    );
  }
  return context;
}

type KioskKeyboardFieldOptions = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  defaultMode?: KioskKeyboardMode;
  submitLabel?: string;
  onSubmit?: () => boolean | void;
};

export function useKioskKeyboardField<
  TElement extends KioskKeyboardElement = HTMLInputElement,
>({
  id,
  label,
  value,
  onChange,
  maxLength,
  multiline = false,
  defaultMode = "ko",
  submitLabel,
  onSubmit,
}: KioskKeyboardFieldOptions) {
  const {
    activeFieldId,
    closeKeyboard,
    closeKeyboardField,
    isOpen,
    openKeyboard,
  } = useKioskKeyboard();
  const elementRef = useRef<TElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onSubmitRef = useRef(onSubmit);

  valueRef.current = value;
  onChangeRef.current = onChange;
  onSubmitRef.current = onSubmit;

  const activate = useCallback(() => {
    openKeyboard({
      id,
      label,
      defaultMode,
      multiline,
      maxLength,
      submitLabel,
      elementRef: elementRef as MutableRefObject<KioskKeyboardElement | null>,
      getValue: () => valueRef.current,
      setValue: nextValue => onChangeRef.current(nextValue),
      onSubmit: () => onSubmitRef.current?.(),
    });
  }, [defaultMode, id, label, maxLength, multiline, openKeyboard, submitLabel]);

  useEffect(() => {
    return () => closeKeyboardField(id);
  }, [closeKeyboardField, id]);

  const onFocus = useCallback(
    (_event: FocusEvent<TElement>) => activate(),
    [activate]
  );
  const onClick = useCallback(
    (_event: MouseEvent<TElement>) => activate(),
    [activate]
  );

  return {
    ref: elementRef,
    inputMode: "none" as const,
    onFocus,
    onClick,
    keyboardOpen: isOpen && activeFieldId === id,
    closeKeyboard,
  };
}

function KioskKeyboard({
  field,
  onClose,
}: {
  field: ActiveField;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<KioskKeyboardMode>(field.defaultMode);
  const [shifted, setShifted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(field.defaultMode);
    setShifted(false);

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const element = field.elementRef.current;
        if (!element) return;

        element.scrollIntoView({ behavior: "auto", block: "nearest" });
        moveElementAboveKeyboard(element, panelRef.current);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [field.id]);

  const restoreSelection = useCallback(
    (cursor: number) => {
      window.requestAnimationFrame(() => {
        const element = field.elementRef.current;
        if (!element) return;
        element.focus({ preventScroll: true });
        element.setSelectionRange(cursor, cursor);
      });
    },
    [field]
  );

  const insertToken = useCallback(
    (token: string) => {
      const element = field.elementRef.current;
      const value = field.getValue();
      const start = element?.selectionStart ?? value.length;
      const end = element?.selectionEnd ?? start;
      const result = insertKioskKeyboardToken(
        value,
        start,
        end,
        token,
        field.maxLength
      );

      field.setValue(result.value);
      restoreSelection(result.cursor);
      setShifted(false);
    },
    [field, restoreSelection]
  );

  const backspace = useCallback(() => {
    const element = field.elementRef.current;
    const value = field.getValue();
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const result = backspaceKioskKeyboardValue(value, start, end);

    field.setValue(result.value);
    restoreSelection(result.cursor);
  }, [field, restoreSelection]);

  const submit = useCallback(() => {
    const shouldClose = field.onSubmit?.();
    if (shouldClose !== false) onClose();
  }, [field, onClose]);

  const keepInputFocused = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
    },
    []
  );

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="화면 키보드"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#c8c5c0] bg-[#efede9] shadow-[0_-12px_32px_rgba(0,0,0,0.16)]"
      onPointerDown={keepInputFocused}
    >
      <div className="mx-auto w-full max-w-[760px] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-3 sm:pt-3">
        <div className="mb-2 flex h-9 items-center justify-between gap-3 px-1">
          <p className="min-w-0 truncate text-sm font-medium text-[#57534e]">
            {field.label} · {modeLabel(mode)}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#bdb8b0] bg-white px-3 text-sm font-medium active:bg-[#dedad3]"
            aria-label="화면 키보드 닫기"
          >
            <X className="h-4 w-4" />
            닫기
          </button>
        </div>

        {mode === "number" ? (
          <NumberLayout onToken={insertToken} onBackspace={backspace} />
        ) : mode === "symbol" ? (
          <SymbolLayout onToken={insertToken} onBackspace={backspace} />
        ) : (
          <TextLayout
            mode={mode}
            shifted={shifted}
            onShift={() => setShifted(current => !current)}
            onToken={insertToken}
            onBackspace={backspace}
          />
        )}

        <div className="mt-1.5 flex gap-1.5">
          <ModeKey
            active={mode === "ko"}
            label="한글"
            onClick={() => {
              setMode("ko");
              setShifted(false);
            }}
          />
          <ModeKey
            active={mode === "en"}
            label="영문"
            onClick={() => {
              setMode("en");
              setShifted(false);
            }}
          />
          <ModeKey
            active={mode === "number"}
            label="숫자"
            onClick={() => {
              setMode("number");
              setShifted(false);
            }}
          />
          <ModeKey
            active={mode === "symbol"}
            label="기호"
            onClick={() => {
              setMode("symbol");
              setShifted(false);
            }}
          />
          <KeyboardKey
            label="띄어쓰기"
            onClick={() => insertToken(" ")}
            className="min-w-0 flex-[2.7] text-base"
          />
          {field.multiline && (
            <KeyboardKey
              label="줄바꿈"
              ariaLabel="줄바꿈"
              onClick={() => insertToken("\n")}
              className="min-w-[58px] flex-[0.75]"
              icon={<CornerDownLeft className="h-5 w-5" />}
            />
          )}
          <KeyboardKey
            label={field.submitLabel ?? "완료"}
            onClick={submit}
            className="min-w-[68px] flex-[1.15] border-[#18181b] bg-[#18181b] text-base font-semibold text-white active:bg-black"
          />
        </div>
      </div>
    </div>
  );
}

function TextLayout({
  mode,
  shifted,
  onShift,
  onToken,
  onBackspace,
}: {
  mode: "ko" | "en";
  shifted: boolean;
  onShift: () => void;
  onToken: (token: string) => void;
  onBackspace: () => void;
}) {
  const rows = mode === "ko" ? KOREAN_ROWS : ENGLISH_ROWS;

  const displayKey = (key: string) => {
    if (!shifted) return key;
    if (mode === "ko") return SHIFTED_KOREAN[key] ?? key;
    return key.toUpperCase();
  };

  return (
    <>
      <div className="mb-1.5 flex gap-1">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(key => (
          <KeyboardKey
            key={key}
            label={key}
            onClick={() => onToken(key)}
            compact
          />
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "mb-1.5 flex gap-1",
            rowIndex === 1 && "px-[4.5%]",
            rowIndex === 2 && "px-[1.5%]"
          )}
        >
          {rowIndex === 2 && (
            <KeyboardKey
              label="대문자·쌍자음"
              ariaLabel="대문자와 쌍자음 전환"
              onClick={onShift}
              active={shifted}
              className="flex-[1.25]"
              icon={<ArrowUp className="h-5 w-5" />}
            />
          )}
          {row.map(key => {
            const displayed = displayKey(key);
            return (
              <KeyboardKey
                key={key}
                label={displayed}
                onClick={() => onToken(displayed)}
              />
            );
          })}
          {rowIndex === 2 && (
            <KeyboardKey
              label="지우기"
              ariaLabel="한 글자 지우기"
              onClick={onBackspace}
              className="flex-[1.25]"
              icon={<DeleteIcon className="h-5 w-5" />}
            />
          )}
        </div>
      ))}
      <div className="flex gap-1">
        {["-", "'", ",", ".", "?", "!"].map(key => (
          <KeyboardKey
            key={key}
            label={key}
            onClick={() => onToken(key)}
            compact
          />
        ))}
      </div>
    </>
  );
}

function NumberLayout({
  onToken,
  onBackspace,
}: {
  onToken: (token: string) => void;
  onBackspace: () => void;
}) {
  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <div className="mx-auto max-w-[460px]">
      {rows.map(row => (
        <div key={row[0]} className="mb-1.5 flex gap-1.5">
          {row.map(key => (
            <KeyboardKey key={key} label={key} onClick={() => onToken(key)} />
          ))}
        </div>
      ))}
      <div className="flex gap-1.5">
        <KeyboardKey label="-" onClick={() => onToken("-")} />
        <KeyboardKey label="0" onClick={() => onToken("0")} />
        <KeyboardKey
          label="지우기"
          ariaLabel="한 글자 지우기"
          onClick={onBackspace}
          icon={<DeleteIcon className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}

function SymbolLayout({
  onToken,
  onBackspace,
}: {
  onToken: (token: string) => void;
  onBackspace: () => void;
}) {
  const rows = [
    ["!", "@", "#", "$", "%", "^", "&", "*"],
    ["(", ")", "-", "_", "=", "+", "[", "]"],
    ["{", "}", "\\", "|", "/", ":", ";", '"'],
    ["'", "`", "~", "<", ">", ",", ".", "?"],
  ];

  return (
    <>
      {rows.map(row => (
        <div key={row[0]} className="mb-1.5 flex gap-1">
          {row.map(key => (
            <KeyboardKey key={key} label={key} onClick={() => onToken(key)} />
          ))}
        </div>
      ))}
      <div className="flex gap-1">
        <KeyboardKey
          label="지우기"
          ariaLabel="한 글자 지우기"
          onClick={onBackspace}
          icon={<DeleteIcon className="h-5 w-5" />}
        />
      </div>
    </>
  );
}

function ModeKey({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <KeyboardKey
      active={active}
      label={label}
      onClick={onClick}
      className="min-w-[44px] flex-[0.85] text-xs sm:text-base"
    />
  );
}

function KeyboardKey({
  active = false,
  ariaLabel,
  className,
  compact = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-pressed={active || undefined}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 touch-manipulation select-none items-center justify-center rounded-md border border-[#cbc6be] bg-white text-xl font-medium text-[#18181b] shadow-sm active:bg-[#d9d5ce] sm:text-2xl",
        compact ? "h-[clamp(30px,4.3dvh,36px)]" : "h-[clamp(36px,5.6dvh,48px)]",
        active && "border-[#18181b] bg-[#d7d3cc]",
        className
      )}
    >
      {icon ?? label}
    </button>
  );
}

function modeLabel(mode: KioskKeyboardMode) {
  if (mode === "ko") return "한글 자판";
  if (mode === "en") return "영문 자판";
  if (mode === "number") return "숫자 자판";
  return "기호 자판";
}

function moveElementAboveKeyboard(
  element: KioskKeyboardElement,
  panel: HTMLDivElement | null
) {
  const panelTop = panel?.getBoundingClientRect().top ?? window.innerHeight;
  const elementBottom = element.getBoundingClientRect().bottom;
  const distance = elementBottom - (panelTop - 20);
  if (distance <= 0) return;

  const scrollParent = findScrollableParent(element);
  if (scrollParent) {
    scrollParent.scrollTop += distance;
    return;
  }

  window.scrollBy({ top: distance, behavior: "auto" });
}

function findScrollableParent(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent && parent !== document.body) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (
      /(auto|scroll)/.test(overflowY) &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}
