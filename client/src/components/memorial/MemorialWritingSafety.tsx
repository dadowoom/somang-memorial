import { useEffect, useSyncExternalStore } from "react";
import {
  confirmLeavingWriting,
  getWritingSession,
  subscribeToWriting,
} from "@/lib/memorialWritingSession";

export default function MemorialWritingSafety() {
  const writing = useSyncExternalStore(
    subscribeToWriting,
    getWritingSession,
    () => null
  );
  useEffect(() => {
    if (!writing?.dirty) return;
    let leaving = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const followLink = (event: MouseEvent) => {
      if (
        window.location.pathname !== "/memorial/create" ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const target = new URL(anchor.href, window.location.href);
      if (
        !["http:", "https:"].includes(target.protocol) ||
        (target.origin === location.origin &&
          target.pathname === location.pathname &&
          target.search === location.search)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (confirmLeavingWriting()) {
        leaving = true;
        window.location.assign(target.href);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", followLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", followLink, true);
    };
  }, [writing?.dirty]);
  return null;
}
