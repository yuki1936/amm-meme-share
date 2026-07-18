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
    <label className="studio-range-field">
      <span><span>{label}</span><output>{display ?? value}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function MemeGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uploadUrlRef = useRef('');
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
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
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !templateImage) return;
    renderMeme(canvas, { template, templateImage, overlayImage, editor, showGuide });
  }, [editor, overlayImage, showGuide, template, templateImage]);

  const useOverlayFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setNotice('请选择图片文件');
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
    if (file) void useOverlayFile(file);
    event.target.value = '';
  };

  const dropOverlay = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    const file = event.dataTransfer.files[0];
    if (file) void useOverlayFile(file);
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

  const download = () => {
    if (!templateImage) return;
    const output = document.createElement('canvas');
    renderMeme(output, { template, templateImage, overlayImage, editor, showGuide: false });
    try {
      output.toBlob((blob) => {
        if (!blob) {
          setNotice('PNG 生成失败');
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.id}-${Date.now()}.png`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setNotice('PNG 已开始下载');
      }, 'image/png');
    } catch {
      setNotice('导出失败，请刷新后重试');
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

  const movePositioning = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const width = event.currentTarget.clientWidth * template.bubble.width;
    const height = event.currentTarget.clientHeight * template.bubble.height;
    patchEditor({
      imageOffsetX: Math.max(-100, Math.min(100, start.offsetX + (event.clientX - start.x) / width * 100)),
      imageOffsetY: Math.max(-100, Math.min(100, start.offsetY + (event.clientY - start.y) / height * 100)),
    });
  };

  const stopPositioning = () => {
    dragStartRef.current = null;
    setIsPositioning(false);
  };

  return (
    <main className="studio-page">
      <header className="studio-header">
        <div className="studio-title">
          <span className="studio-title-icon"><ImagePlus size={19} /></span>
          <div>
            <h1>表情包生成器</h1>
            {templateImage && <p>{templateImage.naturalWidth} × {templateImage.naturalHeight}</p>}
          </div>
        </div>
        <div className="studio-header-actions">
          <button type="button" className="studio-icon-button" title="恢复默认设置" aria-label="恢复默认设置" onClick={resetEditor}>
            <RotateCcw size={17} />
          </button>
          <button type="button" className="studio-export-button" disabled={!templateImage} onClick={download}>
            <Download size={17} />
            导出 PNG
          </button>
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
            <div className="studio-section-title"><h2>模板</h2><span>{templateIndex + 1} / {memeTemplates.length}</span></div>
            <div className="studio-template-list">
              {memeTemplates.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className="studio-template-button"
                  data-active={index === templateIndex}
                  aria-label={`选择模板 ${index + 1}`}
                  aria-pressed={index === templateIndex}
                  onClick={() => setTemplateIndex(index)}
                >
                  <img src={item.source} crossOrigin="anonymous" alt="" />
                  {index === templateIndex && <Check size={15} />}
                </button>
              ))}
            </div>
          </section>

          <section className="studio-panel-section studio-content-section">
            <div className="studio-section-title"><h2>内容</h2></div>
            <div className="studio-mode-switch" role="group" aria-label="内容类型">
              <button type="button" data-active={editor.mode === 'text'} onClick={() => patchEditor({ mode: 'text' })}><Type size={16} />文字</button>
              <button type="button" data-active={editor.mode === 'image'} onClick={() => patchEditor({ mode: 'image' })}><ImagePlus size={16} />图片</button>
            </div>

            {editor.mode === 'text' ? (
              <div className="studio-fields">
                <label className="studio-text-field">
                  <span><span>文字</span><output>{editor.text.length} / 160</output></span>
                  <textarea rows={4} maxLength={160} value={editor.text} onChange={(event) => patchEditor({ text: event.target.value })} />
                </label>
                <RangeField label="字号" value={editor.fontSize} display={`${editor.fontSize}px`} min={18} max={96} onChange={(fontSize) => patchEditor({ fontSize })} />
                <RangeField label="行距" value={editor.lineHeight} display={editor.lineHeight.toFixed(2)} min={1} max={1.8} step={0.02} onChange={(lineHeight) => patchEditor({ lineHeight })} />
                <div className="studio-field-row">
                  <div className="studio-icon-segments" role="group" aria-label="文字对齐">
                    <button type="button" title="左对齐" aria-label="左对齐" data-active={editor.align === 'left'} onClick={() => patchEditor({ align: 'left' })}><AlignLeft size={17} /></button>
                    <button type="button" title="居中" aria-label="居中" data-active={editor.align === 'center'} onClick={() => patchEditor({ align: 'center' })}><AlignCenter size={17} /></button>
                    <button type="button" title="右对齐" aria-label="右对齐" data-active={editor.align === 'right'} onClick={() => patchEditor({ align: 'right' })}><AlignRight size={17} /></button>
                  </div>
                  <label className="studio-color-field" title="文字颜色">
                    <span>颜色</span>
                    <input type="color" value={editor.textColor} onChange={(event) => patchEditor({ textColor: event.target.value })} />
                  </label>
                </div>
                <RangeField label="水平位置" value={editor.textOffsetX} display={`${editor.textOffsetX > 0 ? '+' : ''}${editor.textOffsetX}`} min={-50} max={50} onChange={(textOffsetX) => patchEditor({ textOffsetX })} />
                <RangeField label="垂直位置" value={editor.textOffsetY} display={`${editor.textOffsetY > 0 ? '+' : ''}${editor.textOffsetY}`} min={-50} max={50} onChange={(textOffsetY) => patchEditor({ textOffsetY })} />
                <div className="studio-toggle-list">
                  <label><span>自动适配</span><input type="checkbox" checked={editor.autoFit} onChange={(event) => patchEditor({ autoFit: event.target.checked })} /></label>
                  <label><span>白色描边</span><input type="checkbox" checked={editor.outline} onChange={(event) => patchEditor({ outline: event.target.checked })} /></label>
                </div>
              </div>
            ) : (
              <div className="studio-fields">
                <label
                  className="studio-dropzone"
                  data-dragging={isDraggingFile}
                  onDragEnter={() => setIsDraggingFile(true)}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={dropOverlay}
                >
                  <Upload size={19} />
                  <span>{overlayName || '选择图片'}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadOverlay} />
                </label>
                {overlayImage && (
                  <button type="button" className="studio-clear-image" onClick={clearOverlay}><Trash2 size={15} />移除图片</button>
                )}
                <div className="studio-fit-switch" role="group" aria-label="图片填充方式">
                  <button type="button" data-active={editor.imageFit === 'contain'} onClick={() => patchEditor({ imageFit: 'contain' })}>适应</button>
                  <button type="button" data-active={editor.imageFit === 'cover'} onClick={() => patchEditor({ imageFit: 'cover' })}>填满</button>
                </div>
                <RangeField label="缩放" value={editor.imageScale} display={`${editor.imageScale}%`} min={40} max={240} onChange={(imageScale) => patchEditor({ imageScale })} />
                <RangeField label="水平位置" value={Math.round(editor.imageOffsetX)} min={-100} max={100} onChange={(imageOffsetX) => patchEditor({ imageOffsetX })} />
                <RangeField label="垂直位置" value={Math.round(editor.imageOffsetY)} min={-100} max={100} onChange={(imageOffsetY) => patchEditor({ imageOffsetY })} />
              </div>
            )}
          </section>

          <section className="studio-panel-section studio-surface-section">
            <label className="studio-surface-toggle">
              <span><strong>白色气泡底</strong><small>覆盖模板原有内容</small></span>
              <input type="checkbox" checked={editor.clearBubble} onChange={(event) => patchEditor({ clearBubble: event.target.checked })} />
            </label>
          </section>
        </aside>
      </div>
    </main>
  );
}
