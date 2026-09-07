import type { DraftWriting } from "./memorialCreateDraft";
import { withoutDraftCredentials } from "./memorialCreateDraft";

export type WritingSession = DraftWriting & {
  userId: number;
  savedFingerprint: string;
  dirty: boolean;
  persistedKeys: string[];
};

// Memory only: browser Back can restore writing without silently saving on a shared device.
let session: WritingSession | null = null;
const listeners = new Set<() => void>();
export const getWritingSession = () => session;
export function subscribeToWriting(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function rememberWriting(next: WritingSession) {
  session = { ...next, form: withoutDraftCredentials(next.form) };
  listeners.forEach(listener => listener());
}
export function forgetWriting() {
  session = null;
  listeners.forEach(listener => listener());
}
export function confirmLeavingWriting() {
  return (
    !session?.dirty ||
    window.confirm(
      "임시저장하지 않은 변경 사항이 있습니다. 나가면 저장하지 않은 내용이 사라질 수 있습니다. 그래도 나가시겠습니까?"
    )
  );
}
