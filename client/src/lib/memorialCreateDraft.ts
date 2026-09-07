/** Keep entrance credentials out of the saved writing draft, including older drafts. */
export function withoutDraftCredentials<T extends object>(form: T) {
  const {
    accessPassword: _password,
    managerMemo: _memo,
    ...writing
  } = form as T & { accessPassword?: unknown; managerMemo?: unknown };
  return writing;
}

export function serializeMemorialDraft(form: object, timeline: unknown[]) {
  return JSON.stringify({ form: withoutDraftCredentials(form), timeline });
}
