import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Download,
  ImagePlus,
  RotateCcw,
  Type,
  Upload,
} from 'lucide-react';

const templateBaseUrl = `${import.meta.env.VITE_ASSET_BASE_URL?.replace(/\/$/, '') ?? 'https://pub-94ae1456da3d4179a4b9f3543f91240d.r2.dev'}/meme-generator/templates`;
const templateOne = `${templateBaseUrl}/mutsumi-thought-bubble.png?v=cf2d7c241c46-cors`;
const templateTwo = `${templateBaseUrl}/mutsumi-speech-bubble.png?v=731a14d9709b-cors`;
const templateThree = `${templateBaseUrl}/mutsumi-thought-closeup.png?v=d01bdf31ff35-cors`;

interface BubbleBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MemeTemplate {
  name: string;
  source: string;
  bubble: BubbleBox;
  clearBubble: boolean;
}

type ContentMode = 'text' | 'image';
type TextAlign = 'left' | 'center' | 'right';
type ImageFit = 'contain' | 'cover';

const templates: MemeTemplate[] = [
  {
    name: '想法气泡',
    source: templateOne,
    bubble: { x: 0.08, y: 0.12, width: 0.44, height: 0.22 },
    clearBubble: false,
  },
  {
    name: '对话气泡',
    source: templateTwo,
    bubble: { x: 0.75, y: 0.075, width: 0.22, height: 0.16 },
    clearBubble: false,
  },
  {
    name: '大字气泡',
    source: templateThree,
    bubble: { x: 0.085, y: 0.11, width: 0.43, height: 0.22 },
    clearBubble: false,
  },
];

const fontFamily = '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${source}`));
    image.src = source;
  });
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
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
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [''];
  const lines: string[] = [];

  for (const paragraph of normalized.split('\n')) {
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

export function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadUrlRef = useRef('');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateError, setTemplateError] = useState(false);
  const [mode, setMode] = useState<ContentMode>('text');
  const [text, setText] = useState('我没意见');
  const [fontSize, setFontSize] = useState(44);
  const [lineHeight, setLineHeight] = useState(1.18);
  const [align, setAlign] = useState<TextAlign>('center');
  const [autoFit, setAutoFit] = useState(true);
  const [textColor, setTextColor] = useState('#111111');
  const [clearBubble, setClearBubble] = useState(templates[0].clearBubble);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [overlayName, setOverlayName] = useState('');
  const [imageFit, setImageFit] = useState<ImageFit>('contain');
  const [imageScale, setImageScale] = useState(100);
  const [imageOffsetX, setImageOffsetX] = useState(0);
  const [imageOffsetY, setImageOffsetY] = useState(0);
  const template = templates[templateIndex];

  useEffect(() => {
    let cancelled = false;
    setTemplateImage(null);
    setTemplateError(false);
    loadImage(template.source).then((image) => {
      if (!cancelled) setTemplateImage(image);
    }).catch(() => {
      if (!cancelled) setTemplateError(true);
    });
    setClearBubble(template.clearBubble);
    return () => { cancelled = true; };
  }, [template]);

  useEffect(() => () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
  }, []);

  const drawCanvas = useCallback((canvas: HTMLCanvasElement, showGuide: boolean) => {
    if (!templateImage) return;
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

    if (clearBubble) {
      context.save();
      context.fillStyle = '#ffffff';
      roundedRect(context, box.x, box.y, box.width, box.height, radius);
      context.fill();
      context.restore();
    }

    if (mode === 'text') {
      const maxWidth = box.width * 0.88;
      const maxHeight = box.height * 0.86;
      let size = fontSize * (canvas.width / 600);
      let lines: string[] = [];
      const minimumSize = Math.max(12, canvas.width * 0.018);
      while (size >= minimumSize) {
        context.font = `800 ${size}px ${fontFamily}`;
        lines = wrapText(context, text, maxWidth);
        const totalHeight = lines.length * size * lineHeight;
        if (!autoFit || (lines.every((line) => context.measureText(line).width <= maxWidth) && totalHeight <= maxHeight)) break;
        size -= Math.max(1, canvas.width / 600 * 2);
      }
      const lineGap = size * lineHeight;
      const totalHeight = lines.length * lineGap;
      const startY = box.y + box.height / 2 - totalHeight / 2 + lineGap / 2;
      context.save();
      context.font = `800 ${size}px ${fontFamily}`;
      context.textBaseline = 'middle';
      context.textAlign = align;
      context.lineJoin = 'round';
      let x = box.x + box.width / 2;
      if (align === 'left') x = box.x + box.width * 0.06;
      if (align === 'right') x = box.x + box.width * 0.94;
      for (const [index, line] of lines.entries()) {
        const y = startY + index * lineGap;
        context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        context.lineWidth = Math.max(3, size * 0.11);
        context.strokeText(line, x, y);
        context.fillStyle = textColor;
        context.fillText(line, x, y);
      }
      context.restore();
    } else if (overlayImage) {
      const naturalWidth = overlayImage.naturalWidth;
      const naturalHeight = overlayImage.naturalHeight;
      const baseScale = imageFit === 'cover'
        ? Math.max(box.width / naturalWidth, box.height / naturalHeight)
        : Math.min(box.width / naturalWidth, box.height / naturalHeight);
      const scale = baseScale * (imageScale / 100);
      const width = naturalWidth * scale;
      const height = naturalHeight * scale;
      const x = box.x + (box.width - width) / 2 + imageOffsetX / 100 * box.width;
      const y = box.y + (box.height - height) / 2 + imageOffsetY / 100 * box.height;
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
      context.strokeStyle = 'rgba(20, 125, 146, 0.72)';
      roundedRect(context, box.x, box.y, box.width, box.height, radius);
      context.stroke();
      context.restore();
    }
  }, [align, autoFit, clearBubble, fontSize, imageFit, imageOffsetX, imageOffsetY, imageScale, lineHeight, mode, overlayImage, template, templateImage, text, textColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) drawCanvas(canvas, true);
  }, [drawCanvas]);

  const selectTemplate = (index: number) => {
    setTemplateIndex(index);
    setImageScale(100);
    setImageOffsetX(0);
    setImageOffsetY(0);
  };

  const uploadOverlay = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    uploadUrlRef.current = objectUrl;
    const image = await loadImage(objectUrl);
    setOverlayImage(image);
    setOverlayName(file.name);
    setMode('image');
    setImageScale(100);
    setImageOffsetX(0);
    setImageOffsetY(0);
    event.target.value = '';
  };

  const resetContent = () => {
    setText('我没意见');
    setFontSize(44);
    setLineHeight(1.18);
    setAlign('center');
    setAutoFit(true);
    setTextColor('#111111');
    setClearBubble(template.clearBubble);
    setImageFit('contain');
    setImageScale(100);
    setImageOffsetX(0);
    setImageOffsetY(0);
  };

  const download = () => {
    if (!templateImage) return;
    const output = document.createElement('canvas');
    drawCanvas(output, false);
    output.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meme-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }, 'image/png');
  };

  return (
    <main className="generator-page">
      <header className="generator-header">
        <div>
          <p className="category-eyebrow">MEME STUDIO</p>
          <h1>表情包生成器</h1>
        </div>
        <div className="generator-header-actions">
          <button type="button" className="generator-button secondary" onClick={resetContent}>
            <RotateCcw size={16} />重置
          </button>
          <button type="button" className="generator-button primary" onClick={download}>
            <Download size={17} />下载 PNG
          </button>
        </div>
      </header>

      <div className="generator-workspace">
        <section className="generator-preview" aria-label="表情包预览">
          <div className="generator-canvas-stage">
            <canvas ref={canvasRef} aria-label="生成结果" />
            {!templateImage && (
              <span className="generator-canvas-status">{templateError ? '模板加载失败' : '正在加载模板'}</span>
            )}
          </div>
          <span className="generator-preview-note">虚线仅用于标记气泡区域</span>
        </section>

        <aside className="generator-controls" aria-label="生成器选项">
          <section className="generator-control-section">
            <h2>模板</h2>
            <div className="generator-template-grid">
              {templates.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className="generator-template"
                  data-active={templateIndex === index}
                  onClick={() => selectTemplate(index)}
                  aria-label={`选择${item.name}`}
                >
                  <img src={item.source} crossOrigin="anonymous" alt="" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="generator-control-section">
            <div className="generator-section-heading">
              <h2>气泡内容</h2>
              <label className="generator-toggle">
                <input type="checkbox" checked={clearBubble} onChange={(event) => setClearBubble(event.target.checked)} />
                <span>白色底</span>
              </label>
            </div>
            <div className="generator-mode-switch" role="group" aria-label="气泡内容类型">
              <button type="button" data-active={mode === 'text'} onClick={() => setMode('text')}><Type size={16} />文字</button>
              <button type="button" data-active={mode === 'image'} onClick={() => setMode('image')}><ImagePlus size={16} />图片</button>
            </div>

            {mode === 'text' ? (
              <div className="generator-fields">
                <label className="generator-field">
                  <span>内容</span>
                  <textarea value={text} maxLength={160} rows={4} onChange={(event) => setText(event.target.value)} />
                </label>
                <div className="generator-inline-fields">
                  <label className="generator-field grow">
                    <span>字号 <output>{fontSize}</output></span>
                    <input type="range" min="18" max="96" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
                  </label>
                  <label className="generator-color-field" title="文字颜色">
                    <span>颜色</span>
                    <input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} />
                  </label>
                </div>
                <label className="generator-field">
                  <span>行距 <output>{lineHeight.toFixed(2)}</output></span>
                  <input type="range" min="1" max="1.8" step="0.02" value={lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} />
                </label>
                <div className="generator-inline-fields">
                  <div className="generator-icon-segments" role="group" aria-label="文字对齐">
                    <button type="button" title="左对齐" aria-label="左对齐" data-active={align === 'left'} onClick={() => setAlign('left')}><AlignLeft size={17} /></button>
                    <button type="button" title="居中" aria-label="居中" data-active={align === 'center'} onClick={() => setAlign('center')}><AlignCenter size={17} /></button>
                    <button type="button" title="右对齐" aria-label="右对齐" data-active={align === 'right'} onClick={() => setAlign('right')}><AlignRight size={17} /></button>
                  </div>
                  <label className="generator-toggle">
                    <input type="checkbox" checked={autoFit} onChange={(event) => setAutoFit(event.target.checked)} />
                    <span>自动适配</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="generator-fields">
                <label className="generator-upload">
                  <Upload size={18} />
                  <span>{overlayName || '选择气泡图片'}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadOverlay} />
                </label>
                <div className="generator-mode-switch compact" role="group" aria-label="图片填充方式">
                  <button type="button" data-active={imageFit === 'contain'} onClick={() => setImageFit('contain')}>适应</button>
                  <button type="button" data-active={imageFit === 'cover'} onClick={() => setImageFit('cover')}>填满</button>
                </div>
                <label className="generator-field">
                  <span>缩放 <output>{imageScale}%</output></span>
                  <input type="range" min="50" max="200" value={imageScale} onChange={(event) => setImageScale(Number(event.target.value))} />
                </label>
                <label className="generator-field">
                  <span>水平位置 <output>{imageOffsetX}</output></span>
                  <input type="range" min="-50" max="50" value={imageOffsetX} onChange={(event) => setImageOffsetX(Number(event.target.value))} />
                </label>
                <label className="generator-field">
                  <span>垂直位置 <output>{imageOffsetY}</output></span>
                  <input type="range" min="-50" max="50" value={imageOffsetY} onChange={(event) => setImageOffsetY(Number(event.target.value))} />
                </label>
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
