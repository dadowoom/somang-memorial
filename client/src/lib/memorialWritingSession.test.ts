import { afterEach, describe, expect, it, vi } from "vitest";
import {
  confirmLeavingWriting,
  forgetWriting,
  getWritingSession,
  rememberWriting,
  subscribeToWriting,
} from "./memorialWritingSession";

afterEach(() => {
  forgetWriting();
  vi.unstubAllGlobals();
});
const sample = {
  userId: 7,
  form: { name: "작성 예시", accessPassword: "test-only" },
  timeline: [],
  step: 2,
  savedAt: null,
  savedFingerprint: "initial",
  dirty: true,
  persistedKeys: [],
};
describe("writing kept only in tab memory", () => {
  it("retains the step and writing but not entrance credentials", () => {
    rememberWriting(sample);
    expect(getWritingSession()).toMatchObject({
      userId: 7,
      step: 2,
      form: { name: "작성 예시" },
    });
    expect(getWritingSession()?.form).not.toHaveProperty("accessPassword");
    expect(sample.form.accessPassword).toBe("test-only");
  });
  it("notifies subscribers and clears on logout or successful registration", () => {
    const change = vi.fn();
    const unsubscribe = subscribeToWriting(change);
    rememberWriting(sample);
    forgetWriting();
    expect(change).toHaveBeenCalledTimes(2);
    expect(getWritingSession()).toBeNull();
    unsubscribe();
  });
  it("lets the writer cancel leaving while changes are unsaved", () => {
    const confirm = vi.fn(() => false);
    vi.stubGlobal("window", { confirm });
    rememberWriting(sample);
    expect(confirmLeavingWriting()).toBe(false);
    expect(confirm).toHaveBeenCalledTimes(1);
    rememberWriting({ ...sample, dirty: false });
    expect(confirmLeavingWriting()).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
  });
});
