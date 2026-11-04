import type { Chapter } from '../story';

export const chapterOne: Chapter = {
  id: 'one',
  scenes: [
    {
      id: 'hall',
      chapter: 'I',
      title: 'The Hall',
      src: 'hall',
      cam: { from: [1.0, 0.5, 0.3], to: [1.12, 0.45, 0.6] },
      tone: [0.21, 0.57],
      power: 0,
      transition: 'melt',
      depth: {
        amount: 0.029,
        gradient: [0.62, 1.0, 0, 0.6],
        layers: [
          { depth: 0.45, poly: [[0.775, 0.08], [0.95, 0.08], [0.95, 0.62], [0.92, 0.64], [0.79, 0.64], [0.785, 0.3]] },
          {
            depth: 0.85,
            poly: [
              [0.58, 0.4], [0.63, 0.385], [0.68, 0.415], [0.72, 0.455], [0.76, 0.52], [0.75, 0.6], [0.7, 0.625],
              [0.62, 0.665], [0.55, 0.7], [0.5, 0.665], [0.52, 0.58], [0.55, 0.5], [0.57, 0.45],
            ],
          },
        ],
      },
      captions: [
        {
          text: 'In the Hall of the Silent Order, magic is weighed, measured, and given only to the chosen.',
          at: [0.08, 0.6],
          pos: { top: '18%', left: '6%' },
        },
        {
          text: 'Ione was never chosen. She swept the stairs.',
          at: [0.3, 0.62],
          pos: { bottom: '16%', right: '7%' },
        },
      ],
    },
    {
      id: 'keeper',
      chapter: 'II',
      title: 'The Keeper',
      src: 'keeper',
      cam: { from: [1.0, 0.45, 0.5], to: [1.18, 0.42, 0.64] },
      tone: [0.22, 0.58],
      power: 0,
      transition: 'iris',
      iris: [0.5, 0.42],
      inset: { center: [0.42, 0.585], zoom: 6, rect: [0.6, 0.4, 0.3, 0.32], at: [0.32, 0.6], drift: 0.12 },
      depth: {
        amount: 0.026,
        gradient: [0.8, 1.0, 0, 0.35],
        layers: [
          {
            depth: 1,
            poly: [
              [0.36, 0.506], [0.41, 0.52], [0.43, 0.6], [0.46, 0.62], [0.5, 0.635], [0.53, 0.68], [0.6, 0.735],
              [0.75, 0.775], [0.86, 0.795], [0.78, 0.83], [0.6, 0.84], [0.5, 0.848], [0.42, 0.845], [0.3, 0.832],
              [0.27, 0.74], [0.28, 0.62], [0.31, 0.56], [0.33, 0.52],
            ],
          },
        ],
      },
      captions: [
        {
          text: 'Old Maelis kept the last ember of a god the Order had killed.',
          at: [0.08, 0.6],
          pos: { top: '16%', right: '7%' },
        },
        {
          text: 'On the night he died, he pressed it into the hands of the girl who swept the stairs.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', left: '6%' },
        },
      ],
    },
    {
      id: 'ember',
      chapter: 'III',
      title: 'The Ember',
      src: 'ember',
      cam: { from: [1.0, 0.48, 0.5], to: [1.35, 0.48, 0.42] },
      tone: [0.22, 0.58],
      power: 0.35,
      ember: [0.48, 0.42],
      gate: { kind: 'hold', at: 0.32 },
      transition: 'melt',
      captions: [
        {
          text: 'It was cold. It was quiet. It was waiting for someone to hold on.',
          at: [0.06, 0.6],
          pos: { top: '14%', left: '6%' },
          when: 'before',
        },
        {
          text: 'It woke.',
          at: [0.06, 0.6],
          pos: { bottom: '16%', right: '8%' },
          when: 'after',
        },
      ],
    },
    {
      id: 'burning',
      chapter: 'IV',
      title: 'The Burning',
      src: 'burning',
      cam: { from: [1.0, 0.5, 0.28], to: [1.15, 0.55, 0.4] },
      tone: [0.2, 0.52],
      power: 0.7,
      transition: 'panels',
      inset: { center: [0.48, 0.262], zoom: 14, rect: [0.07, 0.38, 0.42, 0.17], at: [0.2, 0.6], drift: 0.1 },
      depth: {
        amount: 0.033,
        layers: [
          {
            depth: 1,
            poly: [
              [0.117, 0.18], [0.25, 0.195], [0.33, 0.24], [0.42, 0.258], [0.45, 0.262], [0.5, 0.252], [0.556, 0.258],
              [0.58, 0.2], [0.68, 0.098], [0.6, 0.215], [0.565, 0.31], [0.565, 0.4], [0.58, 0.47], [0.565, 0.545],
              [0.61, 0.62], [0.585, 0.638], [0.52, 0.682], [0.495, 0.665], [0.475, 0.6], [0.455, 0.54], [0.36, 0.52],
              [0.37, 0.465], [0.39, 0.37], [0.33, 0.38], [0.28, 0.42], [0.26, 0.36], [0.2, 0.28],
            ],
          },
        ],
      },
      captions: [
        {
          text: 'Power is not a gift. It is a fire looking for a door.',
          at: [0.08, 0.6],
          pos: { top: '18%', right: '7%' },
        },
        {
          text: 'Wings of smoke tore out of her back. For the first time in her life, Ione was the door.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', left: '6%' },
        },
      ],
    },
    {
      id: 'watchers',
      chapter: 'V',
      title: 'The Watchers',
      src: 'watchers',
      cam: { from: [1.15, 0.5, 0.6], to: [1.0, 0.5, 0.42] },
      tone: [0.17, 0.48],
      power: 0.5,
      transition: 'melt',
      inset: { center: [0.635, 0.4], zoom: 3.3, rect: [0.66, 0.18, 0.24, 0.52], at: [0.22, 0.6], drift: 0.14 },
      depth: {
        amount: 0.029,
        gradient: [0.56, 1.0, 0, 0.65],
        layers: [
          {
            depth: 0.9,
            poly: [
              [0.56, 0.258], [0.6, 0.31], [0.625, 0.315], [0.685, 0.3], [0.715, 0.36], [0.735, 0.42], [0.74, 0.535],
              [0.7, 0.545], [0.66, 0.565], [0.6, 0.56], [0.585, 0.5], [0.578, 0.44], [0.595, 0.38], [0.575, 0.3],
            ],
          },
        ],
      },
      captions: [
        {
          text: 'The Order felt it wake. Ten thousand spears turned toward a single heartbeat.',
          at: [0.08, 0.62],
          pos: { top: '16%', left: '6%' },
        },
      ],
    },
    {
      id: 'storm',
      chapter: 'VI',
      title: 'The Storm',
      src: 'storm',
      cam: { from: [1.2, 0.5, 0.35], to: [1.0, 0.5, 0.6] },
      tone: [0.3, 0.7],
      power: 0.6,
      transition: 'iris',
      iris: [0.5, 0.4],
      inset: { center: [0.48, 0.64], zoom: 4.5, rect: [0.07, 0.5, 0.32, 0.3], at: [0.28, 0.6], drift: 0.12 },
      captions: [
        {
          text: 'They came all at once: spear, wing, and fire.',
          at: [0.08, 0.6],
          pos: { top: '16%', right: '7%' },
        },
        {
          text: 'Ione did not know how to fight. The ember did.',
          at: [0.3, 0.62],
          pos: { bottom: '14%', right: '7%' },
        },
      ],
    },
    {
      id: 'leap',
      chapter: 'VII',
      title: 'The Leap',
      src: 'leap',
      cam: { from: [1.3, 0.5, 0.4], to: [1.0, 0.5, 0.3] },
      tone: [0.25, 0.6],
      power: 1,
      transition: 'melt',
      length: 1.6,
      depth: {
        amount: 0.036,
        gradient: [0.5, 1.0, 0, 0.5],
        layers: [
          {
            depth: 1,
            poly: [
              [0.66, 0.205], [0.69, 0.22], [0.675, 0.27], [0.705, 0.31], [0.7, 0.37], [0.73, 0.43], [0.765, 0.49],
              [0.7, 0.47], [0.64, 0.44], [0.55, 0.445], [0.47, 0.42], [0.28, 0.43], [0.4, 0.39], [0.47, 0.37],
              [0.56, 0.32], [0.6, 0.29], [0.63, 0.25], [0.64, 0.22],
            ],
          },
        ],
      },
      captions: [
        {
          text: 'So she did the one thing no one had ever dared. She fell upward.',
          at: [0.04, 0.2],
          pos: { top: '16%', right: '7%' },
        },
      ],
    },
    {
      id: 'perch',
      chapter: 'II',
      title: 'Chapter Two',
      src: 'perch',
      cam: { from: [1.35, 0.38, 0.52], to: [1.12, 0.42, 0.5] },
      tone: [0.24, 0.62],
      power: 0.8,
      length: 1.3,
      teaser: true,
      depth: {
        amount: 0.029,
        gradient: [0.5, 1.0, 0.25, 0.7],
        layers: [
          {
            depth: 1,
            poly: [
              [0.03, 0.535], [0.12, 0.5], [0.19, 0.48], [0.25, 0.49], [0.3, 0.515], [0.33, 0.5], [0.37, 0.5],
              [0.41, 0.475], [0.48, 0.468], [0.57, 0.495], [0.65, 0.53], [0.73, 0.556], [0.64, 0.6], [0.6, 0.62],
              [0.66, 0.7], [0.64, 0.72], [0.55, 0.7], [0.45, 0.66], [0.33, 0.63], [0.22, 0.59], [0.1, 0.56],
            ],
          },
        ],
      },
      captions: [],
    },
  ],
};
