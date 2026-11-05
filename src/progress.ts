// Where the reader left off in each chapter, kept in localStorage so a reload (or a later visit)
// can pick up from the same scene. Storage can be disabled or full, so every access is guarded.

export type Progress = {
  /** position on the chapter's timeline, in scene units */
  p: number;
  /** the chapter's gate had been passed */
  open: boolean;
};

const key = (chapter: string) => `emberwake:${chapter}`;

export function loadProgress(chapter: string): Progress | undefined {
  try {
    const v = JSON.parse(localStorage.getItem(key(chapter)) ?? 'null');
    if (v && typeof v.p === 'number' && Number.isFinite(v.p) && v.p >= 0) return { p: v.p, open: !!v.open };
  } catch {
    // unreadable or blocked storage: start from the top
  }
  return undefined;
}

export function saveProgress(chapter: string, progress: Progress) {
  try {
    localStorage.setItem(key(chapter), JSON.stringify(progress));
  } catch {
    // private mode or full storage: nothing to keep
  }
}
