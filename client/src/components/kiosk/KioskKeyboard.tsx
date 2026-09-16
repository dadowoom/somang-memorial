import {
  backspaceKioskKeyboardValue,
  insertKioskKeyboardToken,
} from "@/lib/kioskKeyboardInput";
import { cn } from "@/lib/utils";
import { getKioskKeyboardScrollOffset } from "@/lib/kioskKeyboardLayout";
import { commitKioskKeyboardEdit } from "@/lib/kioskKeyboardCommit";
import "./kioskKeyboard.css";
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
/** digits: 숫자와 지우기만 (가족관 비밀번호처럼 숫자만 받는 칸, 2026-09-16). */
type KioskKeyboardVariant = "full" | "korean-name" | "digits";
type KioskKeyboardElement = HTMLInputElement | HTMLTextAreaElement;

type ActiveField = {
  id: string;
  label: string;
  defaultMode: KioskKeyboardMode;
  variant: KioskKeyboardVariant;
  multiline: boolean;
  alignToTop: boolean;
  maxLength?: number;
  submitLabel?: string;
  submitDisabled: boolean;
  elementRef: RefObject<KioskKeyboardElement | null>;
  getValue: () => string;
  setValue: (value: string) => void;
  onSubmit?: () => boolean | void;
};

type KioskKeyboardContextValue = {
  activeFieldId: string | null;
  isOpen: boolean;
  keyboardHeight: number;
  closeKeyboard: () => void;
  closeKeyboardField: (id: string) => void;
  openKeyboard: (field: ActiveField) => void;
  updateKeyboardFieldSubmitDisabled: (id: string, disabled: boolean) => void;
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const closeKeyboard = useCallback(() => setActiveField(null), []);
  const closeKeyboardField = useCallback((id: string) => {
    setActiveField(current => (current?.id === id ? null : current));
  }, []);
  const openKeyboard = useCallback((field: ActiveField) => {
    setActiveField(current => (current?.id === field.id ? current : field));
  }, []);
  const updateKeyboardFieldSubmitDisabled = useCallback(
    (id: string, disabled: boolean) => {
      setActiveField(current => {
        if (current?.id !== id || current.submitDisabled === disabled) {
          return current;
        }
        return { ...current, submitDisabled: disabled };
      });
    },
    []
  );

  const contextValue: KioskKeyboardContextValue = {
    activeFieldId: activeField?.id ?? null,
    isOpen: Boolean(activeField),
    keyboardHeight: activeField ? keyboardHeight : 0,
    closeKeyboard,
    closeKeyboardField,
    openKeyboard,
    updateKeyboardFieldSubmitDisabled,
  };

  return (
    <KioskKeyboardContext.Provider value={contextValue}>
      {children}
      {activeField && (
        <>
          <div aria-hidden="true" style={{ height: keyboardHeight }} />
          <KioskKeyboard
            field={activeField}
            onClose={closeKeyboard}
            onHeightChange={setKeyboardHeight}
          />
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
  alignToTop?: boolean;
  defaultMode?: KioskKeyboardMode;
  variant?: KioskKeyboardVariant;
  submitLabel?: string;
  submitDisabled?: boolean;
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
  alignToTop = false,
  defaultMode = "ko",
  variant = "full",
  submitLabel,
  submitDisabled = false,
  onSubmit,
}: KioskKeyboardFieldOptions) {
  const {
    activeFieldId,
    closeKeyboard,
    closeKeyboardField,
    isOpen,
    openKeyboard,
    updateKeyboardFieldSubmitDisabled,
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
      variant,
      multiline,
      alignToTop,
      maxLength,
      submitLabel,
      submitDisabled,
      elementRef: elementRef as MutableRefObject<KioskKeyboardElement | null>,
      getValue: () => valueRef.current,
      setValue: nextValue => {
        // A second touch can arrive before React renders the first edit.
        valueRef.current = nextValue;
        onChangeRef.current(nextValue);
      },
      onSubmit: () => onSubmitRef.current?.(),
    });
  }, [
    defaultMode,
    variant,
    alignToTop,
    id,
    label,
    maxLength,
    multiline,
    openKeyboard,
    submitDisabled,
    submitLabel,
  ]);

  useEffect(() => {
    if (activeFieldId === id) {
      updateKeyboardFieldSubmitDisabled(id, submitDisabled);
    }
  }, [activeFieldId, id, submitDisabled, updateKeyboardFieldSubmitDisabled]);

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

export function KioskKeyboard({
  field,
  onClose,
  onHeightChange,
}: {
  field: ActiveField;
  onClose: () => void;
  onHeightChange: (height: number) => void;
}) {
  const [mode, setMode] = useState<KioskKeyboardMode>(field.defaultMode);
  const nameOnly = field.variant === "korean-name";
  const digitsOnly = field.variant === "digits";
  // Do not expose the previous field's mode while the field-change effect runs.
  const displayedMode = nameOnly ? "ko" : digitsOnly ? "number" : mode;
  const [shifted, setShifted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(field.defaultMode);
    setShifted(false);
  }, [field.id, field.defaultMode]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let firstFrame = 0;
    let secondFrame = 0;
    const updateLayout = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      onHeightChange(panel.getBoundingClientRect().height);
      // Let the measured spacer and fixed password dialog update before scrolling.
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const element = field.elementRef.current;
          if (!element) return;
          // The site's smooth scrolling must not animate the input underneath
          // the keyboard while its size is changing.
          element.scrollIntoView({ behavior: "instant", block: "nearest" });
          moveElementAboveKeyboard(element, panel, field.alignToTop);
        });
      });
    };
    const observer = new ResizeObserver(updateLayout);
    observer.observe(panel);
    const form = field.elementRef.current?.closest("form");
    if (form) observer.observe(form);
    window.addEventListener("resize", updateLayout);
    updateLayout();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateLayout);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [field.id, field.elementRef, field.alignToTop, onHeightChange]);

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

      commitKioskKeyboardEdit(element, result, field.setValue);
      setShifted(false);
    },
    [field]
  );

  const backspace = useCallback(() => {
    const element = field.elementRef.current;
    const value = field.getValue();
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const result = backspaceKioskKeyboardValue(value, start, end);

    commitKioskKeyboardEdit(element, result, field.setValue);
  }, [field]);

  const submit = useCallback(() => {
    if (field.submitDisabled) return;
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
      data-keyboard-variant={field.variant}
      className="kiosk-keyboard fixed inset-x-0 bottom-0 z-[70] border-t border-[#33333a] bg-[#1b1b1e] shadow-[0_-18px_44px_rgba(0,0,0,0.4)]"
      onPointerDown={keepInputFocused}
    >
      <div className="kiosk-keyboard-inner mx-auto w-full max-w-[760px] px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 sm:px-3 sm:pt-3">
        <div className="kiosk-keyboard-header mb-2 flex h-9 items-center justify-between gap-3 px-1">
          <p className="kiosk-keyboard-label min-w-0 truncate text-sm font-medium text-[#a7a7af]">
            {field.label} · {modeLabel(displayedMode)}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="kiosk-keyboard-close flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-[#4a4a53] bg-[#2b2b30] px-3 text-sm font-medium text-[#e9e9e6] active:bg-[#222226]"
            aria-label="화면 키보드 닫기"
          >
            <X className="h-4 w-4" />
            닫기
          </button>
        </div>

        {displayedMode === "number" ? (
          <NumberLayout
            onToken={insertToken}
            onBackspace={backspace}
            showDash={!digitsOnly}
          />
        ) : displayedMode === "symbol" ? (
          <SymbolLayout onToken={insertToken} onBackspace={backspace} />
        ) : (
          <TextLayout
            mode={displayedMode}
            lettersOnly={nameOnly}
            shifted={shifted}
            onShift={() => setShifted(current => !current)}
            onToken={insertToken}
            onBackspace={backspace}
          />
        )}

        <div className="kiosk-keyboard-actions mt-1.5 flex gap-1.5">
          {!nameOnly && !digitsOnly && (
            <>
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
            </>
          )}
          {!digitsOnly && (
            <KeyboardKey
              label="띄어쓰기"
              onClick={() => insertToken(" ")}
              className="kiosk-keyboard-space min-w-0 flex-[2.7] text-base"
            />
          )}
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
            disabled={field.submitDisabled}
            className="kiosk-keyboard-submit min-w-[68px] flex-[1.15] border-[#f4f4f1] bg-[linear-gradient(180deg,#fbfbf9,#e7e7e3)] text-base font-semibold text-[#1b1b1e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_3px_0_#9d9d98,0_6px_14px_rgba(0,0,0,0.4)] active:bg-[linear-gradient(180deg,#e7e7e3,#dadad6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_0_#9d9d98]"
          />
        </div>
      </div>
    </div>
  );
}

function TextLayout({
  mode,
  lettersOnly = false,
  shifted,
  onShift,
  onToken,
  onBackspace,
}: {
  mode: "ko" | "en";
  lettersOnly?: boolean;
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
    <div className="kiosk-keyboard-layout">
      {!lettersOnly && (
        <div className="kiosk-keyboard-row mb-1.5 flex gap-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(key => (
            <KeyboardKey
              key={key}
              label={key}
              onClick={() => onToken(key)}
              compact
            />
          ))}
        </div>
      )}
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "kiosk-keyboard-row mb-1.5 flex gap-1",
            rowIndex === 1 && "px-[4.5%]",
            rowIndex === 2 && "px-[1.5%]"
          )}
        >
          {rowIndex === 2 && (
            <KeyboardKey
              label="대문자·쌍자음"
              ariaLabel={lettersOnly ? "쌍자음 전환" : "대문자와 쌍자음 전환"}
              onClick={onShift}
              active={shifted}
              className={cn(
                "flex-[1.25]",
                !shifted &&
                  "bg-[linear-gradient(180deg,#34343a,#2a2a2f)] text-[#d6d6d3]"
              )}
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
              className="flex-[1.25] bg-[linear-gradient(180deg,#34343a,#2a2a2f)] text-[#d6d6d3]"
              icon={<DeleteIcon className="h-5 w-5" />}
            />
          )}
        </div>
      ))}
      {!lettersOnly && (
        <div className="kiosk-keyboard-row flex gap-1">
          {["-", "'", ",", ".", "?", "!"].map(key => (
            <KeyboardKey
              key={key}
              label={key}
              onClick={() => onToken(key)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NumberLayout({
  onToken,
  onBackspace,
  showDash = true,
}: {
  onToken: (token: string) => void;
  onBackspace: () => void;
  showDash?: boolean;
}) {
  const rows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
  ];

  return (
    <div className="kiosk-keyboard-layout kiosk-keyboard-numbers mx-auto max-w-[460px]">
      {rows.map(row => (
        <div key={row[0]} className="kiosk-keyboard-row mb-1.5 flex gap-1.5">
          {row.map(key => (
            <KeyboardKey key={key} label={key} onClick={() => onToken(key)} />
          ))}
        </div>
      ))}
      <div className="kiosk-keyboard-row flex gap-1.5">
        {showDash ? (
          <KeyboardKey label="-" onClick={() => onToken("-")} />
        ) : (
          <span aria-hidden="true" className="min-w-0 flex-1" />
        )}
        <KeyboardKey label="0" onClick={() => onToken("0")} />
        <KeyboardKey
          label="지우기"
          ariaLabel="한 글자 지우기"
          onClick={onBackspace}
          className="bg-[linear-gradient(180deg,#34343a,#2a2a2f)] text-[#d6d6d3]"
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
    <div className="kiosk-keyboard-layout">
      {rows.map(row => (
        <div key={row[0]} className="kiosk-keyboard-row mb-1.5 flex gap-1">
          {row.map(key => (
            <KeyboardKey key={key} label={key} onClick={() => onToken(key)} />
          ))}
        </div>
      ))}
      <div className="kiosk-keyboard-row flex gap-1">
        <KeyboardKey
          label="지우기"
          ariaLabel="한 글자 지우기"
          onClick={onBackspace}
          className="bg-[linear-gradient(180deg,#34343a,#2a2a2f)] text-[#d6d6d3]"
          icon={<DeleteIcon className="h-5 w-5" />}
        />
      </div>
    </div>
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
      className={cn(
        "min-w-[44px] flex-[0.85] text-xs sm:text-base",
        !active && "bg-[linear-gradient(180deg,#34343a,#2a2a2f)] text-[#d6d6d3]"
      )}
    />
  );
}

function KeyboardKey({
  active = false,
  ariaLabel,
  className,
  compact = false,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-pressed={active || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "kiosk-keyboard-key flex min-w-0 flex-1 touch-manipulation select-none items-center justify-center rounded-[10px] border border-[#4d4d55] bg-[linear-gradient(180deg,#46464d,#36363c)] text-xl font-medium text-[#f3f3f0] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_3px_0_#111113,0_6px_14px_rgba(0,0,0,0.4)] transition-[transform,box-shadow] duration-75 active:translate-y-[2px] active:bg-[linear-gradient(180deg,#2d2d33,#27272c)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_0_#111113] sm:text-2xl",
        compact ? "h-[clamp(30px,4.3dvh,36px)]" : "h-[clamp(36px,5.6dvh,48px)]",
        active &&
          "border-[#f4f4f1] bg-[linear-gradient(180deg,#f7f7f4,#e5e5e1)] text-[#1b1b1e] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_3px_0_#9d9d98,0_6px_14px_rgba(0,0,0,0.4)]",
        disabled && "cursor-not-allowed opacity-40 active:translate-y-0",
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
  panel: HTMLDivElement | null,
  alignToTop: boolean
) {
  const panelTop = panel?.getBoundingClientRect().top ?? window.innerHeight;
  const elementRect = element.getBoundingClientRect();
  const formRect = element.closest("form")?.getBoundingClientRect();
  const heading = element.closest("section")?.querySelector("h2");
  const scrollParent = findScrollableParent(element);
  const scrollRect = scrollParent?.getBoundingClientRect();
  const distance = getKioskKeyboardScrollOffset({
    inputTop: elementRect.top,
    inputBottom: elementRect.bottom,
    keyboardTop: Math.min(panelTop, scrollRect?.bottom ?? panelTop),
    formTop: formRect?.top,
    formBottom: formRect?.bottom,
    contextTop: heading?.getBoundingClientRect().top,
    visibleTop: Math.max(0, scrollRect?.top ?? 0),
    preferTop:
      alignToTop &&
      window.matchMedia(
        "(min-width: 640px) and (min-height: 900px) and (orientation: portrait)"
      ).matches,
  });
  if (Math.abs(distance) < 0.5) return;

  if (scrollParent) {
    scrollParent.scrollBy({ top: distance, behavior: "instant" });
    return;
  }

  window.scrollBy({ top: distance, behavior: "instant" });
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
