// Every chapter, in reading order. main.ts picks one by <html data-chapter>, the contents lists
// them all, and vite.config.ts builds one page per chapter at its `path` (see src/page.ts).
import type { Chapter } from '../story';
import { chapterOne } from './one';
import { chapterTwo } from './two';

export const chapters: Chapter[] = [chapterOne, chapterTwo];

const NUMBERS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
/** "Two" for the second chapter */
export const chapterNumber = (c: Chapter) => {
  const k = chapters.indexOf(c);
  return NUMBERS[k] ?? String(k + 1);
};
