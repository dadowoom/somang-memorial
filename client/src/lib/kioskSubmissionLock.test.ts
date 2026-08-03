import { describe, expect, it } from "vitest";
import {
  acquireKioskSubmissionLock,
  releaseKioskSubmissionLock,
  resetKioskSubmissionLock,
} from "./kioskSubmissionLock";

function createLock() {
  return { current: null as symbol | null };
}

describe("kiosk submission lock", () => {
  it("allows only the first submission while locked", () => {
    const lock = createLock();
    const firstToken = acquireKioskSubmissionLock(lock);

    expect(firstToken).toBeTypeOf("symbol");
    expect(acquireKioskSubmissionLock(lock)).toBeNull();
  });

  it("allows another submission after the active request finishes", () => {
    const lock = createLock();
    const firstToken = acquireKioskSubmissionLock(lock)!;

    releaseKioskSubmissionLock(lock, firstToken);

    expect(acquireKioskSubmissionLock(lock)).toBeTypeOf("symbol");
  });

  it("does not let an old request unlock a newer request", () => {
    const lock = createLock();
    const oldToken = acquireKioskSubmissionLock(lock)!;
    resetKioskSubmissionLock(lock);
    const newToken = acquireKioskSubmissionLock(lock)!;

    releaseKioskSubmissionLock(lock, oldToken);

    expect(acquireKioskSubmissionLock(lock)).toBeNull();
    releaseKioskSubmissionLock(lock, newToken);
    expect(acquireKioskSubmissionLock(lock)).toBeTypeOf("symbol");
  });
});
