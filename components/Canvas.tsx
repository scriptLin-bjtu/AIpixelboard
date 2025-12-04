import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Size, PixelGrid, ToolType, Point } from '../types';
import { getIndex, getCoords, getLinePixels, floodFill } from '../utils/pixelUtils';

interface CanvasProps {
  size: Size;
  pixels: PixelGrid;
  tool: ToolType;
  color: string;
  onDraw: (newPixels: PixelGrid) => void;
  onPickColor: (color: string) => void;
  showGrid: boolean;
  onionSkin?: PixelGrid; // Previous frame for reference
}

const Canvas: React.FC<CanvasProps> = ({ 
  size, 
  pixels, 
  tool, 
  color, 
  onDraw, 
  onPickColor,
  showGrid,
  onionSkin
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastDrawPoint, setLastDrawPoint] = useState<Point | null>(null);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  
  // View State
  const [zoom, setZoom] = useState(20); // visual scale multiplier
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // 1. Render Canvas Content
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, size.width, size.height);

    // Draw Onion Skin (if available)
    if (onionSkin) {
        ctx.globalAlpha = 0.3;
        onionSkin.forEach((pColor, i) => {
            if (pColor && pColor !== 'transparent') {
                const { x, y } = getCoords(i, size.width);
                ctx.fillStyle = pColor;
                ctx.fillRect(x, y, 1, 1);
            }
        });
        ctx.globalAlpha = 1.0;
    }

    // Draw Pixels
    pixels.forEach((pColor, i) => {
      if (pColor && pColor !== 'transparent') {
        const { x, y } = getCoords(i, size.width);
        ctx.fillStyle = pColor;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }, [pixels, size, onionSkin]);

  // 2. Handle Wheel Zoom (Native Listener for preventDefault)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        // Direction: negative deltaY is usually scrolling up (Zoom In)
        const direction = -Math.sign(e.deltaY);
        const factor = 1.1; // 10% change per tick

        setZoom(z => {
            const newZoom = direction > 0 ? z * factor : z / factor;
            return Math.max(1, Math.min(200, newZoom));
        });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // 3. Helper: Map screen pointer to grid coordinates
  const getGridPoint = (clientX: number, clientY: number): Point => {
      if (!canvasRef.current) return { x: -1, y: -1 };
      const rect = canvasRef.current.getBoundingClientRect();
      
      const x = Math.floor((clientX - rect.left) / (rect.width / size.width));
      const y = Math.floor((clientY - rect.top) / (rect.height / size.height));
      return { x, y };
  };

  const drawPixel = useCallback((point: Point, currentPixels: PixelGrid) => {
    if (point.x < 0 || point.x >= size.width || point.y < 0 || point.y >= size.height) return currentPixels;
    
    const idx = getIndex(point.x, point.y, size.width);
    const newPixels = [...currentPixels];

    if (tool === 'pencil') {
      newPixels[idx] = color;
    } else if (tool === 'eraser') {
      newPixels[idx] = 'transparent';
    }
    return newPixels;
  }, [tool, color, size.width, size.height]);

  // 4. Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    
    // Middle Mouse (button 1) OR Move Tool -> Pan
    if (e.button === 1 || tool === 'move') {
        e.preventDefault();
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        containerRef.current.setPointerCapture(e.pointerId);
        return;
    }

    // Left Mouse (button 0) -> Draw
    if (e.button === 0) {
        const point = getGridPoint(e.clientX, e.clientY);
        
        // Only start drawing if we clicked ON the canvas
        if (point.x >= 0 && point.x < size.width && point.y >= 0 && point.y < size.height) {
            setIsDrawing(true);
            setLastDrawPoint(point);
            containerRef.current.setPointerCapture(e.pointerId);

            if (tool === 'bucket') {
                const idx = getIndex(point.x, point.y, size.width);
                const targetColor = pixels[idx] || 'transparent';
                if (targetColor !== color) {
                    const filled = floodFill(pixels, point, targetColor, color, size);
                    onDraw(filled);
                }
                // Bucket is single-click action, stop drawing immediately
                setIsDrawing(false);
                return;
            }

            if (tool === 'picker') {
                const idx = getIndex(point.x, point.y, size.width);
                const picked = pixels[idx];
                if (picked && picked !== 'transparent') {
                    onPickColor(picked);
                }
                setIsDrawing(false);
                return;
            }

            const newPixels = drawPixel(point, pixels);
            onDraw(newPixels);
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Panning
    if (isPanning && dragStart) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
    }

    // Drawing
    if (isDrawing && lastDrawPoint) {
        const point = getGridPoint(e.clientX, e.clientY);
        
        // Interpolate line
        const linePoints = getLinePixels(lastDrawPoint, point);
        let tempPixels = [...pixels];
        
        for (const p of linePoints) {
            tempPixels = drawPixel(p, tempPixels);
        }
        
        onDraw(tempPixels);
        setLastDrawPoint(point);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDrawing(false);
    setIsPanning(false);
    setDragStart(null);
    setLastDrawPoint(null);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
        ref={containerRef}
        className="flex-1 bg-zinc-950 overflow-hidden relative flex items-center justify-center cursor-crosshair checkerboard touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
    >
      <div 
        style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center', // Scale from center of the div, translation moves the center
            width: size.width,
            height: size.height,
        }}
        className="relative bg-white shadow-2xl"
      >
        <canvas
            ref={canvasRef}
            width={size.width}
            height={size.height}
            className="block pixelated w-full h-full pointer-events-none" 
        />
        {/* Pointer events are handled by container, canvas is just visual now to avoid coordinate confusing during transform */}

        {/* Grid Overlay */}
        {showGrid && zoom > 8 && (
            <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                    backgroundSize: `1px 1px`, 
                    backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)`
                }} 
            />
        )}
      </div>
      
      {/* HUD Info */}
      <div className="absolute top-4 right-4 bg-zinc-900/80 p-2 rounded text-xs text-zinc-400 backdrop-blur pointer-events-none select-none">
         {zoom.toFixed(1)}x
      </div>
    </div>
  );
};

export default Canvas;
