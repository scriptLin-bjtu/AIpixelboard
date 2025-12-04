import React from 'react';
import { Frame, Size } from '../types';
import { Plus, Trash2, Copy, Play, Square } from 'lucide-react';
import { getCoords } from '../utils/pixelUtils';

interface TimelineProps {
  frames: Frame[];
  size: Size;
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: () => void;
  onTogglePlay: () => void;
  onChangeFps: (fps: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  frames,
  size,
  currentFrameIndex,
  fps,
  isPlaying,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onTogglePlay,
  onChangeFps
}) => {
  
  const renderPreview = (frame: Frame) => {
    return (
        <FramePreviewCanvas frame={frame} size={size} />
    );
  };

  return (
    <div className="h-48 border-t border-zinc-800 bg-zinc-900 flex flex-col">
      {/* Controls */}
      <div className="h-10 flex items-center px-4 border-b border-zinc-800 gap-4">
        <button
          onClick={onTogglePlay}
          className={`p-1.5 rounded hover:bg-zinc-700 ${isPlaying ? 'text-green-400' : 'text-zinc-300'}`}
          title={isPlaying ? "Stop" : "Play"}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        
        <div className="flex items-center gap-2 text-xs text-zinc-400">
           <span>FPS:</span>
           <input 
             type="number" 
             min="1" 
             max="60" 
             value={fps} 
             onChange={(e) => onChangeFps(parseInt(e.target.value))}
             className="w-12 bg-zinc-800 border border-zinc-700 rounded px-1 text-white focus:outline-none focus:border-indigo-500"
           />
        </div>

        <div className="h-4 w-px bg-zinc-700 mx-2" />

        <button onClick={onAddFrame} className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">
            <Plus size={12} /> New Frame
        </button>
        <button onClick={onDuplicateFrame} className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300">
            <Copy size={12} /> Clone
        </button>
        <button 
            onClick={onDeleteFrame} 
            disabled={frames.length <= 1}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 rounded text-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Trash2 size={12} /> Delete
        </button>
      </div>

      {/* Frames List */}
      <div className="flex-1 overflow-x-auto p-4 flex gap-2">
        {frames.map((frame, idx) => (
          <div
            key={frame.id}
            onClick={() => onSelectFrame(idx)}
            className={`
                relative min-w-[80px] w-[80px] h-[80px] rounded-md border-2 cursor-pointer flex flex-col items-center justify-center bg-zinc-950
                ${currentFrameIndex === idx ? 'border-indigo-500 shadow-indigo-500/20 shadow-lg' : 'border-zinc-700 hover:border-zinc-500'}
            `}
          >
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden pixelated">
                {renderPreview(frame)}
            </div>
            <span className="absolute bottom-1 right-2 text-[10px] text-zinc-500 font-mono">{idx + 1}</span>
          </div>
        ))}
        
        <button
          onClick={onAddFrame}
          className="min-w-[40px] h-[80px] rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 flex items-center justify-center text-zinc-500 transition-colors"
        >
            <Plus size={20} />
        </button>
      </div>
    </div>
  );
};

// Mini canvas for frame preview
const FramePreviewCanvas = ({ frame, size }: { frame: Frame, size: Size }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate scale to fit the 64x64 canvas
        // We use Math.min to maintain aspect ratio and fit within the preview box
        const scaleX = canvas.width / size.width;
        const scaleY = canvas.height / size.height;
        const scale = Math.min(scaleX, scaleY);
        
        // Center the preview
        const offsetX = (canvas.width - size.width * scale) / 2;
        const offsetY = (canvas.height - size.height * scale) / 2;

        frame.pixels.forEach((color, idx) => {
            if (color && color !== 'transparent') {
                const { x, y } = getCoords(idx, size.width);
                ctx.fillStyle = color;
                ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
            }
        });
    }, [frame, size]);

    return <canvas ref={canvasRef} width={64} height={64} className="w-full h-full object-contain" />;
}

export default Timeline;
