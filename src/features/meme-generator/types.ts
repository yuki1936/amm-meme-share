export type ContentMode = 'text' | 'image';
export type TextAlignment = 'left' | 'center' | 'right';
export type ImageFit = 'contain' | 'cover';

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MemeTemplate {
  id: string;
  source: string;
  bubble: NormalizedRect;
  clearBubble: boolean;
}

export interface MemeEditorState {
  mode: ContentMode;
  text: string;
  fontSize: number;
  lineHeight: number;
  align: TextAlignment;
  autoFit: boolean;
  textColor: string;
  textOffsetX: number;
  textOffsetY: number;
  outline: boolean;
  clearBubble: boolean;
  imageFit: ImageFit;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
}

export interface RenderOptions {
  template: MemeTemplate;
  templateImage: HTMLImageElement;
  overlayImage: HTMLImageElement | null;
  editor: MemeEditorState;
  showGuide: boolean;
}
