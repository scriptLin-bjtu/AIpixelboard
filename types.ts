export type ToolType = 'pencil' | 'eraser' | 'bucket' | 'picker' | 'move';

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type PixelGrid = string[]; // Flat array representing the grid

export interface Frame {
  id: string;
  pixels: PixelGrid;
}

export interface ProjectState {
  size: Size;
  frames: Frame[];
  currentFrameIndex: number;
  palette: string[];
  primaryColor: string;
  secondaryColor: string;
  tool: ToolType;
  penSize: number;
}

export interface AIConfig {
  apiKey: string;
  prompt: string;
}
