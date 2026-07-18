import type { MemeTemplate } from './types';

const templateBase = '/studio/templates';

export const memeTemplates: MemeTemplate[] = [
  {
    id: 'thought-bubble',
    source: `${templateBase}/mutsumi-thought-bubble.png?v=4598f3ba`,
    bubble: { x: 0.08, y: 0.12, width: 0.44, height: 0.22 },
    clearBubble: false,
  },
  {
    id: 'speech-bubble',
    source: `${templateBase}/mutsumi-speech-bubble.png?v=0963ae51`,
    bubble: { x: 0.75, y: 0.075, width: 0.22, height: 0.16 },
    clearBubble: false,
  },
  {
    id: 'thought-closeup',
    source: `${templateBase}/mutsumi-thought-closeup.png?v=7ee753d8`,
    bubble: { x: 0.085, y: 0.11, width: 0.43, height: 0.22 },
    clearBubble: false,
  },
];
