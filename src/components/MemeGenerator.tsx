import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Copy,
  Download,
  Grid2X2,
  ImagePlus,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { loadCanvasImage, renderMeme } from '../features/meme-generator/render';
import { memeTemplates } from '../features/meme-generator/templates';
import type { MemeEditorState } from '../features/meme-generator/types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

const defaultEditor: MemeEditorState = {
  mode: 'text',
  text: '我没意见',
  fontSize: 44,
  lineHeight: 1.18,
  align: 'center',
  autoFit: true,
  textColor: '#111111',
  textOffsetX: 0,
  textOffsetY: 0,
  outline: true,
  clearBubble: false,
  imageFit: 'contain',
  imageScale: 100,
  imageOffsetX: 0,
  imageOffsetY: 0,
};

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function RangeField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="flex items-center justify-between text-xs font-semibold text-secondary-foreground">
        <span>{label}</span>
        <output className="text-primary tabular-nums">{display ?? value}</output>
      </span>
      <Slider
        min={min}
        max={max}
        step={step ?? 1}
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
      />
    </div>
  );
}

export function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadUrlRef = useRef('');
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const moveFrameRef = useRef(0);
  const pendingPointRef = useRef<{ clientX: number; clientY: number; width: number; height: number } | null>(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [templateStatus, setTemplateStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [editor, setEditor] = useState<MemeEditorState>(defaultEditor);
  const [overlayImage, setOverlayImage] = useState<HTMLImageElement | null>(null);
  const [overlayName, setOverlayName] = useState('');
  const [showGuide, setShowGuide] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isPositioning, setIsPositioning] = useState(false);
  const [notice, setNotice] = useState('');
  const template = memeTemplates[templateIndex];

  const patchEditor = useCallback((patch: Partial<MemeEditorState>) => {
    setEditor((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTemplateStatus('loading');
    setTemplateImage(null);
    loadCanvasImage(template.source)
      .then((image) => {
        if (cancelled) return;
        setTemplateImage(image);
        setTemplateStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setTemplateStatus('error');
      });
    patchEditor({ clearBubble: template.clearBubble, imageScale: 100, imageOffsetX: 0, imageOffsetY: 0 });
    return () => { cancelled = true; };
  }, [patchEditor, template]);

  useEffect(() => () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    if (moveFrameRef.current) cancelAnimationFrame(moveFrameRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;
    renderMeme(canvas, { template, templateImage, overlayImage, editor, showGuide });
  }, [editor, overlayImage, showGuide, template, templateImage]);

  const applyOverlayFile = async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setNotice('请选择 PNG / JPEG / WebP 或 GIF 图片');
      return;
    }
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    uploadUrlRef.current = objectUrl;
    try {
      const image = await loadCanvasImage(objectUrl);
      setOverlayImage(image);
      setOverlayName(file.name);
      patchEditor({ mode: 'image', imageScale: 100, imageOffsetX: 0, imageOffsetY: 0 });
      setNotice('');
    } catch {
      setNotice('图片读取失败');
    }
  };

  const uploadOverlay = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void applyOverlayFile(file);
    event.target.value = '';
  };

  const dropOverlay = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (file) void applyOverlayFile(file);
  };

  const clearOverlay = () => {
    setOverlayImage(null);
    setOverlayName('');
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    uploadUrlRef.current = '';
    patchEditor({ imageScale: 100, imageOffsetX: 0, imageOffsetY: 0 });
  };

  const resetEditor = () => {
    setEditor({ ...defaultEditor, clearBubble: template.clearBubble });
    setPreviewZoom(100);
    setShowGuide(true);
    setNotice('已恢复默认设置');
  };

  const createOutputBlob = (): Promise<Blob> => new Promise((resolve, reject) => {
    if (!templateImage) {
      reject(new Error('Template is not ready'));
      return;
    }
    const output = document.createElement('canvas');
    renderMeme(output, { template, templateImage, overlayImage, editor, showGuide: false });
    try {
      output.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Unable to create PNG'));
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });

  const copyImage = async () => {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setNotice('当前浏览器不支持复制图片，请使用下载');
      return;
    }
    try {
      const blob = await createOutputBlob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setNotice('图片已复制');
    } catch {
      setNotice('复制失败，请允许剪贴板权限后重试');
    }
  };

  const download = async () => {
    try {
      const blob = await createOutputBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.id}-${Date.now()}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice('PNG 已开始下载');
    } catch {
      setNotice('下载失败，请刷新后重试');
    }
  };

  const startPositioning = (event: PointerEvent<HTMLCanvasElement>) => {
    if (editor.mode !== 'image' || !overlayImage) return;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: editor.imageOffsetX,
      offsetY: editor.imageOffsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPositioning(true);
  };

  const applyPendingPosition = () => {
    moveFrameRef.current = 0;
    const start = dragStartRef.current;
    const point = pendingPointRef.current;
    pendingPointRef.current = null;
    if (!start || !point) return;
    patchEditor({
      imageOffsetX: Math.max(-100, Math.min(100, start.offsetX + (point.clientX - start.x) / point.width * 100)),
      imageOffsetY: Math.max(-100, Math.min(100, start.offsetY + (point.clientY - start.y) / point.height * 100)),
    });
  };

  // pointermove 高频触发，每帧只做一次 canvas 全量重绘。
  const movePositioning = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    pendingPointRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: event.currentTarget.clientWidth * template.bubble.width,
      height: event.currentTarget.clientHeight * template.bubble.height,
    };
    if (!moveFrameRef.current) moveFrameRef.current = requestAnimationFrame(applyPendingPosition);
  };

  const stopPositioning = () => {
    if (moveFrameRef.current) {
      window.cancelAnimationFrame(moveFrameRef.current);
      applyPendingPosition();
    }
    dragStartRef.current = null;
    setIsPositioning(false);
  };

  return (
    <main className="studio-page">
      <header className="flex min-h-[76px] items-center justify-between gap-4 border-b">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <ImagePlus size={19} />
          </span>
          <div className="min-w-0">
            <h1 className="m-0 text-lg leading-tight font-bold text-foreground">表情包生成器</h1>
            {templateImage && (
              <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                {templateImage.naturalWidth} × {templateImage.naturalHeight}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="恢复默认设置" aria-label="恢复默认设置" onClick={resetEditor}>
            <RotateCcw size={17} />
          </Button>
          <Button size="sm" className="font-bold" disabled={!templateImage} onClick={() => void copyImage()}>
            <Copy size={16} />
            复制图片
          </Button>
          <Button variant="outline" size="icon" title="下载 PNG" aria-label="下载 PNG" disabled={!templateImage} onClick={() => void download()}>
            <Download size={17} />
          </Button>
        </div>
      </header>

      <div className="studio-workspace">
        <section className="studio-preview" aria-label="表情包预览">
          <div className="studio-preview-toolbar">
            <div className="studio-zoom-control" role="group" aria-label="预览缩放">
              <button type="button" title="缩小预览" aria-label="缩小预览" onClick={() => setPreviewZoom((value) => Math.max(60, value - 10))}><Minus size={15} /></button>
              <button type="button" title="适应画布" onClick={() => setPreviewZoom(100)}><Maximize2 size={14} /><span>{previewZoom}%</span></button>
              <button type="button" title="放大预览" aria-label="放大预览" onClick={() => setPreviewZoom((value) => Math.min(160, value + 10))}><Plus size={15} /></button>
            </div>
            <button
              type="button"
              className="studio-guide-button"
              data-active={showGuide}
              title="显示内容区域"
              aria-label="显示内容区域"
              aria-pressed={showGuide}
              onClick={() => setShowGuide((value) => !value)}
            >
              <Grid2X2 size={16} />
            </button>
          </div>

          <div className="studio-canvas-scroll">
            <div className="studio-canvas-stage">
              {templateStatus !== 'ready' && (
                <div className="studio-canvas-status" role="status">
                  {templateStatus === 'error' ? '模板加载失败' : '正在加载模板'}
                </div>
              )}
              <div className="studio-canvas-frame" style={{ width: `${previewZoom}%` }}>
                <canvas
                  ref={canvasRef}
                  aria-label="生成结果"
                  data-positionable={editor.mode === 'image' && Boolean(overlayImage)}
                  data-dragging={isPositioning}
                  onPointerDown={startPositioning}
                  onPointerMove={movePositioning}
                  onPointerUp={stopPositioning}
                  onPointerCancel={stopPositioning}
                />
              </div>
            </div>
          </div>
          <span className="studio-notice" aria-live="polite">{notice}</span>
        </section>

        <aside className="studio-inspector" aria-label="编辑选项">
          <section className="studio-panel-section">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[13px] font-bold text-foreground">模板</h2>
              <span className="text-[11px] text-muted-foreground tabular-nums">{templateIndex + 1} / {memeTemplates.length}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {memeTemplates.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    'relative min-w-0 cursor-pointer overflow-hidden rounded-lg border bg-card p-0 transition-shadow',
                    index === templateIndex
                      ? 'border-primary ring-2 ring-primary/25'
                      : 'border-input hover:border-primary/40',
                  )}
                  data-active={index === templateIndex}
                  aria-label={`选择模板 ${index + 1}`}
                  aria-pressed={index === templateIndex}
                  onClick={() => setTemplateIndex(index)}
                >
                  <img src={item.source} crossOrigin="anonymous" alt="" className="block w-full object-cover" style={{ aspectRatio: '1.3' }} />
                  {index === templateIndex && (
                    <span className="absolute top-1.5 right-1.5 grid size-[18px] place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="studio-panel-section">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="m-0 text-[13px] font-bold text-foreground">内容</h2>
            </div>
            <Tabs value={editor.mode} onValueChange={(mode) => patchEditor({ mode: mode as MemeEditorState['mode'] })}>
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="text"><Type size={15} />文字</TabsTrigger>
                <TabsTrigger value="image"><ImagePlus size={15} />图片</TabsTrigger>
              </TabsList>
            </Tabs>

            {editor.mode === 'text' ? (
              <div className="flex flex-col gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="flex items-center justify-between text-xs font-semibold text-secondary-foreground">
                    <span>文字</span>
                    <output className="text-primary tabular-nums">{editor.text.length} / 160</output>
                  </span>
                  <Textarea
                    rows={4}
                    maxLength={160}
                    value={editor.text}
                    onChange={(event) => patchEditor({ text: event.target.value })}
                    className="min-h-24 field-sizing-fixed"
                  />
                </div>
                <RangeField label="字号" value={editor.fontSize} display={`${editor.fontSize}px`} min={18} max={96} onChange={(fontSize) => patchEditor({ fontSize })} />
                <RangeField label="行距" value={editor.lineHeight} display={editor.lineHeight.toFixed(2)} min={1} max={1.8} step={0.02} onChange={(lineHeight) => patchEditor({ lineHeight })} />
                <div className="flex items-center justify-between gap-3">
                  <ToggleGroup
                    type="single"
                    value={editor.align}
                    onValueChange={(align) => { if (align) patchEditor({ align: align as MemeEditorState['align'] }); }}
                    aria-label="文字对齐"
                  >
                    <ToggleGroupItem value="left" title="左对齐" aria-label="左对齐"><AlignLeft size={16} /></ToggleGroupItem>
                    <ToggleGroupItem value="center" title="居中" aria-label="居中"><AlignCenter size={16} /></ToggleGroupItem>
                    <ToggleGroupItem value="right" title="右对齐" aria-label="右对齐"><AlignRight size={16} /></ToggleGroupItem>
                  </ToggleGroup>
                  <label className="flex items-center gap-2 text-xs font-semibold text-secondary-foreground" title="文字颜色">
                    <span>颜色</span>
                    <input
                      type="color"
                      className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5"
                      value={editor.textColor}
                      onChange={(event) => patchEditor({ textColor: event.target.value })}
                    />
                  </label>
                </div>
                <RangeField label="水平位置" value={editor.textOffsetX} display={`${editor.textOffsetX > 0 ? '+' : ''}${editor.textOffsetX}`} min={-50} max={50} onChange={(textOffsetX) => patchEditor({ textOffsetX })} />
                <RangeField label="垂直位置" value={editor.textOffsetY} display={`${editor.textOffsetY > 0 ? '+' : ''}${editor.textOffsetY}`} min={-50} max={50} onChange={(textOffsetY) => patchEditor({ textOffsetY })} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-secondary-foreground">
                    <span>自动适配</span>
                    <Switch checked={editor.autoFit} onCheckedChange={(autoFit) => patchEditor({ autoFit })} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-secondary-foreground">
                    <span>白色描边</span>
                    <Switch checked={editor.outline} onCheckedChange={(outline) => patchEditor({ outline })} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <label
                  className={cn(
                    'flex min-h-16 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed p-2.5 text-[13px] font-bold transition-colors',
                    isDraggingFile
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-muted/40 text-primary hover:border-primary/50 hover:bg-primary/5',
                  )}
                  data-dragging={isDraggingFile}
                  onDragEnter={() => setIsDraggingFile(true)}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={dropOverlay}
                >
                  <Upload size={19} />
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{overlayName || '选择图片'}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={uploadOverlay} />
                </label>
                {overlayImage && (
                  <Button variant="secondary" size="sm" className="self-start" onClick={clearOverlay}>
                    <Trash2 size={15} />
                    移除图片
                  </Button>
                )}
                <ToggleGroup
                  type="single"
                  value={editor.imageFit}
                  onValueChange={(fit) => { if (fit) patchEditor({ imageFit: fit as MemeEditorState['imageFit'] }); }}
                  className="w-full"
                  aria-label="图片填充方式"
                >
                  <ToggleGroupItem value="contain" className="flex-1">适应</ToggleGroupItem>
                  <ToggleGroupItem value="cover" className="flex-1">填满</ToggleGroupItem>
                </ToggleGroup>
                <RangeField label="缩放" value={editor.imageScale} display={`${editor.imageScale}%`} min={40} max={240} onChange={(imageScale) => patchEditor({ imageScale })} />
                <RangeField label="水平位置" value={Math.round(editor.imageOffsetX)} min={-100} max={100} onChange={(imageOffsetX) => patchEditor({ imageOffsetX })} />
                <RangeField label="垂直位置" value={Math.round(editor.imageOffsetY)} min={-100} max={100} onChange={(imageOffsetY) => patchEditor({ imageOffsetY })} />
              </div>
            )}
          </section>

          <section className="studio-panel-section">
            <label className="flex items-center justify-between gap-4">
              <span className="min-w-0">
                <strong className="block text-[13px] font-semibold text-foreground">白色气泡底</strong>
                <small className="mt-0.5 block text-[11px] text-muted-foreground">覆盖模板原有内容</small>
              </span>
              <Switch checked={editor.clearBubble} onCheckedChange={(clearBubble) => patchEditor({ clearBubble })} />
            </label>
          </section>
        </aside>
      </div>
    </main>
  );
}
