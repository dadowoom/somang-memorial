export type KioskSubmissionLock = {
  current: symbol | null;
};

export function acquireKioskSubmissionLock(lock: KioskSubmissionLock) {
  if (lock.current) return null;

  const token = Symbol("kiosk-submission");
  lock.current = token;
  return token;
}

export function releaseKioskSubmissionLock(
  lock: KioskSubmissionLock,
  token: symbol
) {
  if (lock.current === token) lock.current = null;
}

export function resetKioskSubmissionLock(lock: KioskSubmissionLock) {
  lock.current = null;
}
