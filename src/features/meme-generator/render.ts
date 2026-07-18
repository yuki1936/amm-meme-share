import type { MemeEditorState, RenderOptions } from './types';

const fontFamily = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  });
}

export async function loadCanvasImage(source: string): Promise<HTMLImageElement> {
  if (!/^https?:\/\//.test(source)) return loadImageElement(source);

  const response = await fetch(source, { mode: 'cors' });
  if (!response.ok) throw new Error(`Unable to load image: ${response.status}`);
  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    return await loadImageElement(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
}

function splitToken(context: CanvasRenderingContext2D, token: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let current = '';
  for (const character of token) {
    const candidate = current + character;
    if (current && context.measureText(candidate).width > maxWidth) {
      pieces.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (!text.trim()) return [''];
  const lines: string[] = [];

  for (const paragraph of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    const tokens = paragraph.match(/[A-Za-z0-9_@#./:-]+|\s+|./g) ?? [paragraph];
    let line = '';
    for (const token of tokens) {
      if (/^\s+$/.test(token) && !line) continue;
      const candidate = line + token;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line.trimEnd());
      line = '';
      if (context.measureText(token).width > maxWidth) {
        const pieces = splitToken(context, token.trim(), maxWidth);
        lines.push(...pieces.slice(0, -1));
        line = pieces.at(-1) ?? '';
      } else {
        line = token.trimStart();
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

function drawText(
  context: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  editor: MemeEditorState,
  canvasWidth: number,
) {
  const maxWidth = box.width * 0.88;
  const maxHeight = box.height * 0.86;
  const sizeRatio = canvasWidth / 600;
  const minimumSize = Math.max(12, canvasWidth * 0.018);
  let size = editor.fontSize * sizeRatio;
  let lines: string[] = [];

  while (size >= minimumSize) {
    context.font = `800 ${size}px ${fontFamily}`;
    lines = wrapText(context, editor.text, maxWidth);
    const contentHeight = lines.length * size * editor.lineHeight;
    const fits = lines.every((line) => context.measureText(line).width <= maxWidth) && contentHeight <= maxHeight;
    if (!editor.autoFit || fits) break;
    size -= Math.max(1, sizeRatio * 2);
  }

  const lineGap = size * editor.lineHeight;
  const contentHeight = lines.length * lineGap;
  const offsetX = editor.textOffsetX / 100 * box.width;
  const offsetY = editor.textOffsetY / 100 * box.height;
  const startY = box.y + box.height / 2 - contentHeight / 2 + lineGap / 2 + offsetY;
  let x = box.x + box.width / 2 + offsetX;
  if (editor.align === 'left') x = box.x + box.width * 0.06 + offsetX;
  if (editor.align === 'right') x = box.x + box.width * 0.94 + offsetX;

  context.save();
  roundedRect(context, box.x, box.y, box.width, box.height, Math.min(box.width, box.height) * 0.18);
  context.clip();
  context.font = `800 ${size}px ${fontFamily}`;
  context.textBaseline = 'middle';
  context.textAlign = editor.align;
  context.lineJoin = 'round';
  for (const [index, line] of lines.entries()) {
    const y = startY + index * lineGap;
    if (editor.outline) {
      context.strokeStyle = 'rgba(255, 255, 255, 0.94)';
      context.lineWidth = Math.max(3, size * 0.11);
      context.strokeText(line, x, y);
    }
    context.fillStyle = editor.textColor;
    context.fillText(line, x, y);
  }
  context.restore();
}

export function renderMeme(canvas: HTMLCanvasElement, options: RenderOptions) {
  const { template, templateImage, overlayImage, editor, showGuide } = options;
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = templateImage.naturalWidth;
  canvas.height = templateImage.naturalHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(templateImage, 0, 0, canvas.width, canvas.height);

  const box = {
    x: template.bubble.x * canvas.width,
    y: template.bubble.y * canvas.height,
    width: template.bubble.width * canvas.width,
    height: template.bubble.height * canvas.height,
  };
  const radius = Math.min(box.width, box.height) * 0.18;

  if (editor.clearBubble) {
    context.save();
    context.fillStyle = '#ffffff';
    roundedRect(context, box.x, box.y, box.width, box.height, radius);
    context.fill();
    context.restore();
  }

  if (editor.mode === 'text') {
    drawText(context, box, editor, canvas.width);
  } else if (overlayImage) {
    const baseScale = editor.imageFit === 'cover'
      ? Math.max(box.width / overlayImage.naturalWidth, box.height / overlayImage.naturalHeight)
      : Math.min(box.width / overlayImage.naturalWidth, box.height / overlayImage.naturalHeight);
    const scale = baseScale * editor.imageScale / 100;
    const width = overlayImage.naturalWidth * scale;
    const height = overlayImage.naturalHeight * scale;
    const x = box.x + (box.width - width) / 2 + editor.imageOffsetX / 100 * box.width;
    const y = box.y + (box.height - height) / 2 + editor.imageOffsetY / 100 * box.height;
    context.save();
    roundedRect(context, box.x, box.y, box.width, box.height, radius);
    context.clip();
    context.drawImage(overlayImage, x, y, width, height);
    context.restore();
  }

  if (showGuide) {
    context.save();
    context.setLineDash([Math.max(5, canvas.width * 0.009), Math.max(4, canvas.width * 0.006)]);
    context.lineWidth = Math.max(2, canvas.width * 0.003);
    context.strokeStyle = 'rgba(8, 128, 144, 0.78)';
    roundedRect(context, box.x, box.y, box.width, box.height, radius);
    context.stroke();
    context.restore();
  }
}
