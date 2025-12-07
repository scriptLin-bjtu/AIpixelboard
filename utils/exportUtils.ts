import { Frame, Size } from '../types';
import { getCoords } from './pixelUtils';

export const exportFrameAsPNG = (pixels: string[], size: Size, scale = 10): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size.width * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;

  pixels.forEach((color, idx) => {
    if (color && color !== 'transparent') {
      const { x, y } = getCoords(idx, size.width);
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  });

  return canvas.toDataURL('image/png');
};

export const exportSpriteSheet = (frames: Frame[], size: Size, scale = 1): string => {
  const canvas = document.createElement('canvas');
  // Create a horizontal strip
  canvas.width = size.width * frames.length * scale;
  canvas.height = size.height * scale;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;

  frames.forEach((frame, idx) => {
      // Draw individual pixels for each frame
      // We do this instead of drawing a frame canvas to ensure clean scaling if needed
      frame.pixels.forEach((color, pIdx) => {
          if (color && color !== 'transparent') {
              const { x, y } = getCoords(pIdx, size.width);
              ctx.fillStyle = color;
              // Offset by frame index * width
              const drawX = (idx * size.width + x) * scale;
              const drawY = y * scale;
              ctx.fillRect(drawX, drawY, scale, scale);
          }
      });
  });

  return canvas.toDataURL('image/png');
};

export const createGIF = async (frames: Frame[], size: Size, fps: number, scale = 10): Promise<Blob | null> => {
  try {
    const mod: any = await import('gifenc');
    
    // With the proper ESM build from unpkg, named exports should be available on the module namespace.
    let GIFEncoder = mod.GIFEncoder;
    let quantize = mod.quantize;
    let applyPalette = mod.applyPalette;

    // Fallback: If somehow we get a default export wrapper (common with some CDNs/bundlers)
    if (!GIFEncoder && mod.default) {
        GIFEncoder = mod.default.GIFEncoder;
        quantize = mod.default.quantize;
        applyPalette = mod.default.applyPalette;
    }

    if (typeof GIFEncoder !== 'function') {
        console.error("GIFEncoder function not found in module. Keys:", Object.keys(mod));
        if (mod.default) console.error("Default export keys:", Object.keys(mod.default));
        return null;
    }

    // Using gifenc for lightweight GIF creation in browser
    const gif = GIFEncoder();
    
    for (const frame of frames) {
      // 1. Draw frame to an offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) continue;
      
      // Clear
      ctx.clearRect(0, 0, size.width, size.height);

      frame.pixels.forEach((color, idx) => {
          if (color && color !== 'transparent') {
              const { x, y } = getCoords(idx, size.width);
              ctx.fillStyle = color;
              ctx.fillRect(x, y, 1, 1);
          }
      });

      // Get raw image data
      const imageData = ctx.getImageData(0, 0, size.width, size.height);
      const { data } = imageData; // RGBA

      // Quantize to palette for GIF
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);

      // Add frame
      // delay is in 10ms units. 1000ms / fps / 10
      const delay = Math.round((1000 / fps) / 10);
      
      gif.writeFrame(index, size.width, size.height, { 
          palette, 
          delay,
          transparent: true, 
          dispose: -1 // restore to background
      });
    }

    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });

  } catch (e) {
    console.error("Failed to generate GIF:", e);
    return null;
  }
};
