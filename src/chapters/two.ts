import type { Chapter } from '../story';

// Chapter Two: The Ashen Choir.
// Picks up after the leap: the ember is awake from the first frame, and the Order answers
// with singers who unmake magic by naming it. The gate inverts Chapter One's: instead of
// holding on, the reader has to go completely still so the song passes over her.

export const chapterTwo: Chapter = {
  id: 'two',
  startAwake: true,
  scenes: [
    {
      id: 'cliff',
      chapter: 'VIII',
      title: 'The Edge',
      src: 'cliff',
      cam: { from: [1.3, 0.4, 0.32], to: [1.0, 0.5, 0.5] },
      tone: [0.27, 0.58],
      power: 0.4,
      transition: 'melt',
      inset: { center: [0.36, 0.3], zoom: 9, rect: [0.62, 0.2, 0.28, 0.3], at: [0.24, 0.6], drift: 0.12 },
      depth: { amount: 0.026, gradient: [0.55, 1.0, 0, 0.55], layers: [] },
      captions: [
        {
          text: 'She came down at dawn, on the last cliff before the wild country.',
          at: [0.08, 0.6],
          pos: { top: '16%', left: '6%' },
        },
        {
          text: 'Behind her, the Hall was still burning. Ahead, nothing had a name yet.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', right: '7%' },
        },
      ],
    },
    {
      id: 'choir',
      chapter: 'IX',
      title: 'The Choir',
      src: 'choir',
      cam: { from: [1.0, 0.5, 0.5], to: [1.28, 0.56, 0.4] },
      tone: [0.2, 0.4],
      power: 0.2,
      song: 0.55,
      transition: 'panels',
      inset: { center: [0.565, 0.315], zoom: 8, rect: [0.07, 0.4, 0.3, 0.3], at: [0.26, 0.6], drift: 0.12 },
      captions: [
        {
          text: 'The Order did not send soldiers this time. It woke the Ashen Choir.',
          at: [0.08, 0.6],
          pos: { top: '16%', right: '7%' },
        },
        {
          text: 'They do not fight magic. They name it. Whatever they name turns to ash.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', right: '7%' },
        },
      ],
    },
    {
      id: 'ridge',
      chapter: 'X',
      title: 'The Ash',
      src: 'ridge',
      cam: { from: [1.3, 0.36, 0.36], to: [1.0, 0.5, 0.56] },
      tone: [0.17, 0.4],
      power: 0.3,
      song: 0.9,
      transition: 'melt',
      inset: { center: [0.34, 0.335], zoom: 6, rect: [0.6, 0.16, 0.32, 0.24], at: [0.22, 0.6], drift: 0.1 },
      depth: { amount: 0.026, gradient: [0.45, 1.0, 0, 0.6], layers: [] },
      captions: [
        {
          text: 'Every spell they named fell out of the sky.',
          at: [0.08, 0.6],
          pos: { top: '18%', left: '6%' },
        },
        {
          text: 'By nightfall the Choir stood on a hill of quiet witches, listening for one more heartbeat.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', left: '6%' },
        },
      ],
    },
    {
      id: 'thicket',
      chapter: 'XI',
      title: 'The Thicket',
      src: 'thicket',
      cam: { from: [1.0, 0.5, 0.5], to: [1.32, 0.68, 0.42] },
      tone: [0.23, 0.64],
      power: 0.3,
      ember: [0.75, 0.4],
      gate: { kind: 'still', at: 0.32 },
      song: 0.8,
      transition: 'iris',
      iris: [0.62, 0.42],
      captions: [
        {
          text: 'She hid where the trees were oldest. The song came looking, one name at a time.',
          at: [0.06, 0.6],
          pos: { top: '14%', left: '6%' },
          when: 'before',
        },
        {
          text: 'The song passed over her, and did not find her.',
          at: [0.06, 0.6],
          pos: { bottom: '16%', left: '6%' },
          when: 'after',
        },
      ],
    },
    {
      id: 'voice',
      chapter: 'XII',
      title: 'The Voice',
      src: 'voice',
      cam: { from: [1.3, 0.47, 0.42], to: [1.0, 0.5, 0.46] },
      tone: [0.26, 0.48],
      power: 0.95,
      transition: 'melt',
      captions: [
        {
          text: 'In the silence, the ember spoke for the first time.',
          at: [0.08, 0.6],
          pos: { top: '16%', left: '6%' },
        },
        {
          text: '“They named me wrong,” it said. “That is why I am still alive. Do you want my true name?”',
          at: [0.3, 0.62],
          pos: { bottom: '14%', right: '7%' },
        },
      ],
    },
    {
      id: 'answer',
      chapter: 'XIII',
      title: 'The Answer',
      src: 'answer',
      cam: { from: [1.0, 0.5, 0.6], to: [1.3, 0.46, 0.3] },
      tone: [0.16, 0.44],
      power: 1,
      song: 1,
      transition: 'panels',
      inset: { center: [0.45, 0.21], zoom: 5, rect: [0.6, 0.48, 0.3, 0.3], at: [0.3, 0.6], drift: 0.12 },
      captions: [
        {
          text: 'When the Choir found her at last, Ione did not run. She sang back.',
          at: [0.08, 0.6],
          pos: { top: '16%', right: '7%' },
        },
        {
          text: 'One word, the god’s true name, and the sky split open beneath the Choir.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', left: '6%' },
        },
      ],
    },
    {
      id: 'price',
      chapter: 'XIV',
      title: 'The Price',
      src: 'price',
      cam: { from: [1.3, 0.4, 0.44], to: [1.0, 0.5, 0.46] },
      tone: [0.27, 0.62],
      power: 0.55,
      transition: 'melt',
      length: 1.6,
      depth: { amount: 0.026, gradient: [0.6, 1.0, 0, 0.5], layers: [] },
      captions: [
        {
          text: 'Every name has a price. When the ash settled, the girl with smoke for wings could not remember her own.',
          at: [0.04, 0.2],
          pos: { top: '16%', right: '7%' },
        },
      ],
    },
    {
      id: 'wild',
      chapter: 'III',
      title: 'Chapter Three',
      src: 'wild',
      cam: { from: [1.3, 0.5, 0.42], to: [1.1, 0.5, 0.5] },
      tone: [0.21, 0.5],
      power: 0.8,
      length: 1.3,
      teaser: true,
      depth: { amount: 0.028, gradient: [0.55, 1.0, 0.2, 0.7], layers: [] },
      captions: [],
    },
  ],
};
