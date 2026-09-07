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

export type DraftTimeline = {
  id: string;
  year: string;
  title: string;
  description: string;
};
export type DraftWriting = {
  form: Record<string, string>;
  timeline: DraftTimeline[];
  step: number;
  savedAt: number | null;
};

export const legacyDraftKey = "somang.memorialCreateDraft";
export const draftKeyForUser = (userId: number) =>
  `${legacyDraftKey}.v2.${userId}`;

const fieldLimits: Record<string, number> = {
  name: 120,
  role: 80,
  birthDate: 20,
  deathDate: 20,
  church: 160,
  familyContact: 120,
  familyPhone: 80,
  slug: 120,
  verse: 1000,
  verseRef: 120,
  summary: 255,
  story: 10000,
  serviceTime: 40,
  memorialDay: 40,
};

/** Validate stored data before placing it in controlled input fields. Never truncate writing. */
export function readMemorialDraft(
  raw: string,
  userId: number,
  legacy = false
): DraftWriting | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !parsed.form ||
      typeof parsed.form !== "object" ||
      Array.isArray(parsed.form)
    )
      return null;
    if (!legacy && (parsed.version !== 2 || parsed.userId !== userId))
      return null;
    if (legacy && parsed.userId !== undefined && parsed.userId !== userId)
      return null;
    const form: Record<string, string> = {};
    for (const [key, limit] of Object.entries(fieldLimits)) {
      const value = parsed.form[key];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > limit) return null;
      form[key] = value;
    }
    if (parsed.form.visibility !== undefined) {
      if (!["public", "private"].includes(parsed.form.visibility)) return null;
      form.visibility = parsed.form.visibility;
    }
    if (!Array.isArray(parsed.timeline) || parsed.timeline.length > 30)
      return null;
    const timeline: DraftTimeline[] = [];
    for (const [index, item] of parsed.timeline.entries()) {
      if (!item || typeof item !== "object") return null;
      for (const [key, limit] of [
        ["year", 20],
        ["title", 160],
        ["description", 1000],
      ] as const) {
        if (typeof item[key] !== "string" || item[key].length > limit)
          return null;
      }
      timeline.push({
        id: `restored-${index}`,
        year: item.year,
        title: item.title,
        description: item.description,
      });
    }
    return {
      form,
      timeline,
      step:
        Number.isInteger(parsed.step) && parsed.step >= 0 && parsed.step < 5
          ? parsed.step
          : 0,
      savedAt:
        typeof parsed.savedAt === "number" &&
        Number.isFinite(parsed.savedAt) &&
        parsed.savedAt > 0
          ? parsed.savedAt
          : null,
    };
  } catch {
    return null;
  }
}

export function serializeOwnedDraft(
  userId: number,
  form: object,
  timeline: DraftTimeline[],
  step: number,
  savedAt: number
) {
  return JSON.stringify({
    version: 2,
    userId,
    form: withoutDraftCredentials(form),
    timeline,
    step,
    savedAt,
  });
}

export function writingFingerprint(form: object, timeline: DraftTimeline[]) {
  return serializeMemorialDraft(
    form,
    timeline
      .filter(
        item => item.year.trim() || item.title.trim() || item.description.trim()
      )
      .map(({ year, title, description }) => ({ year, title, description }))
  );
}
