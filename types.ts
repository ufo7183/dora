export interface Point {
  x: number;
  y: number;
}

export type ElementType = 'note' | 'image' | 'arrow';

interface BaseElement {
  id: string;
  position: Point;
  width: number;
  height: number;
  rotation: number; // in degrees
  zIndex: number;
}

export interface NoteElement extends BaseElement {
  type: 'note';
  content: string;
  color: string;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  start: Point;
  end: Point;
  color: string;
}

export type CanvasElement = NoteElement | ImageElement | ArrowElement;