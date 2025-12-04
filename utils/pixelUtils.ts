import { Point, Size, PixelGrid } from '../types';

export const getIndex = (x: number, y: number, width: number): number => {
  return y * width + x;
};

export const getCoords = (index: number, width: number): Point => {
  return {
    x: index % width,
    y: Math.floor(index / width),
  };
};

// Bresenham's Line Algorithm
export const getLinePixels = (start: Point, end: Point): Point[] => {
  const points: Point[] = [];
  let x0 = start.x;
  let y0 = start.y;
  const x1 = end.x;
  const y1 = end.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
};

// Flood Fill Algorithm (Iterative to avoid recursion depth limits)
export const floodFill = (
  pixels: PixelGrid,
  start: Point,
  targetColor: string,
  fillColor: string,
  size: Size
): PixelGrid => {
  const { width, height } = size;
  const startIndex = getIndex(start.x, start.y, width);
  
  if (startIndex < 0 || startIndex >= pixels.length) return pixels;
  if (pixels[startIndex] === fillColor) return pixels; // Already same color
  if (pixels[startIndex] !== targetColor) return pixels; // Not the target

  const newPixels = [...pixels];
  const queue: Point[] = [start];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const p = queue.pop()!;
    const idx = getIndex(p.x, p.y, width);

    if (visited.has(idx)) continue;
    visited.add(idx);

    if (newPixels[idx] === targetColor) {
      newPixels[idx] = fillColor;

      const neighbors = [
        { x: p.x + 1, y: p.y },
        { x: p.x - 1, y: p.y },
        { x: p.x, y: p.y + 1 },
        { x: p.x, y: p.y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
          queue.push(n);
        }
      }
    }
  }

  return newPixels;
};

export const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};
