import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  readMemorialDraft,
  type DraftWriting,
} from "@/lib/memorialCreateDraft";

/** 글을 멈추고 이만큼 지나면 서버에 저장한다. */
export const AUTOSAVE_DELAY_MS = 3000;

export type AutosaveState =
  | "checking" // 서버에 저장된 글이 있는지 보는 중
  | "waiting-choice" // 저장된 글을 이어 쓸지 고르기 전 (덮어쓰지 않으려고 멈춤)
  | "check-failed" // 저장된 글을 확인하지 못함 (덮어쓰지 않으려고 멈춤)
  | "idle"
  | "saving"
  | "saved"
  | "failed";

/**
 * 추모관 작성 중 서버 자동 저장 (2026-09-23).
 *
 * 글을 멈추고 3초 뒤, 그리고 창을 내리거나 닫을 때 로그인한 계정에 저장한다.
 * 카카오톡 안에서 연 창이 닫혀도 글이 남고, 다른 기기에서 이어 쓸 수 있다.
 * 기기(브라우저)에는 남기지 않으므로 교회 공용 PC 에도 흔적이 없다.
 *
 * 서버에 이미 저장된 글이 있으면, 이어 쓸지 새로 쓸지 고르기 전까지는 자동
 * 저장을 멈춘다. 모르고 새 글을 쓰다가 옛 글을 덮어쓰지 않게 하려는 것이다.
 */
export function useServerDraftAutosave(options: {
  userId: number | null;
  /** 화면이 이 계정의 작성 상태를 다 불러온 뒤 true */
  ready: boolean;
  /** 이 탭에서 쓰던 글을 이어 받았으면 true (그 글을 우선한다) */
  resumedInTab: boolean;
  /** 등록 중이거나 등록이 끝나면 true (더 저장하지 않는다) */
  stopped: boolean;
  dirty: boolean;
  fingerprint: string;
  buildPayload: (savedAt: number) => string;
  onSaved: (fingerprint: string, savedAt: number) => void;
  onRestore: (writing: DraftWriting) => void;
}) {
  const { userId, ready, resumedInTab, stopped, dirty, fingerprint } = options;
  const draftQuery = trpc.memorialDraft.get.useQuery(undefined, {
    enabled: Boolean(userId) && ready && !resumedInTab,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const saveMutation = trpc.memorialDraft.save.useMutation();
  const clearMutation = trpc.memorialDraft.clear.useMutation();
  // 저장 함수가 화면을 다시 그릴 때마다 바뀌지 않게 붙잡아 둔다.
  const saveRef = useRef(saveMutation.mutateAsync);
  saveRef.current = saveMutation.mutateAsync;

  const [decided, setDecided] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    writing: DraftWriting;
    updatedAt: number;
  } | null>(null);
  const [state, setState] = useState<AutosaveState>("checking");

  const latest = useRef(options);
  latest.current = options;
  const inFlight = useRef(false);
  const decidedRef = useRef(false);
  decidedRef.current = decided;

  // 계정이 바뀌면 처음부터 다시 확인한다.
  useEffect(() => {
    setDecided(false);
    setPendingDraft(null);
    setState("checking");
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready || decided) return;
    if (resumedInTab) {
      setDecided(true);
      setState("idle");
      return;
    }
    if (draftQuery.isError) {
      setState("check-failed");
      return;
    }
    if (!draftQuery.isSuccess) return;
    const data = draftQuery.data;
    const writing = data ? readMemorialDraft(data.payload, userId) : null;
    if (data && writing) {
      // 저장한 시각은 글을 저장할 때 브라우저가 적어 둔 값을 쓴다. DB 시각은
      // DB 시간대 설정에 따라 몇 시간 어긋나 보일 수 있다.
      setPendingDraft({
        writing,
        updatedAt: writing.savedAt ?? data.updatedAt,
      });
      setState("waiting-choice");
      return;
    }
    setDecided(true);
    setState("idle");
  }, [
    userId,
    ready,
    decided,
    resumedInTab,
    draftQuery.isError,
    draftQuery.isSuccess,
    draftQuery.data,
  ]);

  const flush = useCallback(async () => {
    const current = latest.current;
    if (!current.userId || current.stopped || !current.dirty) return;
    // 저장된 글을 이어 쓸지 고르기 전에는 덮어쓰지 않는다.
    if (!decidedRef.current || inFlight.current) return;
    inFlight.current = true;
    const savedAt = Date.now();
    const savedFingerprint = current.fingerprint;
    setState("saving");
    try {
      await saveRef.current({
        payload: current.buildPayload(savedAt),
      });
      latest.current.onSaved(savedFingerprint, savedAt);
      setState("saved");
    } catch {
      setState("failed");
    } finally {
      inFlight.current = false;
    }
    // 저장하는 동안 더 쓴 글이 있으면 이어서 한 번 더 저장한다.
    if (latest.current.fingerprint !== savedFingerprint) {
      window.setTimeout(() => void flushRef.current(), AUTOSAVE_DELAY_MS);
    }
  }, []);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  // 글을 멈추고 3초 뒤 저장
  useEffect(() => {
    if (!decided || stopped || !dirty) return;
    const timer = window.setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [decided, stopped, dirty, fingerprint, flush]);

  // 창을 내리거나(카카오톡으로 돌아가기 등) 닫을 때 바로 저장
  useEffect(() => {
    if (!decided) return;
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [decided, flush]);

  const restore = useCallback(() => {
    if (!pendingDraft) return;
    latest.current.onRestore(pendingDraft.writing);
    setPendingDraft(null);
    setDecided(true);
    setState("saved");
  }, [pendingDraft]);

  /** 저장된 글을 지우고 새로 쓴다. */
  const discard = useCallback(async () => {
    try {
      await clearMutation.mutateAsync();
    } catch {
      // 지우지 못해도 새 글이 저장되면 옛 글은 덮어써진다.
    }
    setPendingDraft(null);
    setDecided(true);
    setState("idle");
  }, [clearMutation]);

  const retryCheck = useCallback(() => {
    setState("checking");
    void draftQuery.refetch();
  }, [draftQuery]);

  /** 추모관을 만든 뒤 부른다. 서버도 지우지만, 늦게 도착한 저장본까지 지운다. */
  const clearAfterCreate = useCallback(() => {
    clearMutation.mutate();
  }, [clearMutation]);

  return {
    state,
    decided,
    pendingDraft,
    saveNow: flush,
    restore,
    discard,
    retryCheck,
    clearAfterCreate,
  };
}
