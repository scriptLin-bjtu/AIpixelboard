import React from 'react';
import { Pencil, Eraser, PaintBucket, Pipette, Move, Download, Wand2, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { ToolType } from '../types';

interface ToolsProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onExport: (type: 'png' | 'gif' | 'sheet') => void;
  onGenerateAI: () => void;
}

const Tools: React.FC<ToolsProps> = ({ activeTool, onSelectTool, onExport, onGenerateAI }) => {
  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'pencil', icon: <Pencil size={20} />, label: 'Pencil (P)' },
    { id: 'eraser', icon: <Eraser size={20} />, label: 'Eraser (E)' },
    { id: 'bucket', icon: <PaintBucket size={20} />, label: 'Fill (F)' },
    { id: 'picker', icon: <Pipette size={20} />, label: 'Picker (I)' },
    { id: 'move', icon: <Move size={20} />, label: 'Move (M)' },
  ];

  return (
    <div className="w-16 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 gap-4 z-10">
      <div className="flex flex-col gap-2 w-full px-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={`
              p-3 rounded-lg flex justify-center items-center transition-all
              ${activeTool === tool.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}
            `}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="h-px w-8 bg-zinc-800 my-2" />

      {/* AI Button */}
      <button
        onClick={onGenerateAI}
        className="p-3 rounded-lg text-fuchsia-400 hover:bg-fuchsia-900/20 hover:text-fuchsia-300 transition-all flex flex-col items-center gap-1"
        title="Generate with Gemini"
      >
        <Wand2 size={20} />
      </button>

      <div className="flex-1" />

      <div className="flex flex-col gap-2 w-full px-2">
         <button
            onClick={() => onExport('sheet')}
            className="p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-orange-400 transition-all"
            title="Export Sprite Sheet"
         >
            <Grid3X3 size={20} />
         </button>
         <button
            onClick={() => onExport('png')}
            className="p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-green-400 transition-all"
            title="Export Frame PNG"
         >
            <ImageIcon size={20} />
         </button>
         <button
            onClick={() => onExport('gif')}
            className="p-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-blue-400 transition-all"
            title="Export GIF"
         >
            <Download size={20} />
         </button>
      </div>
    </div>
  );
};

export default Tools;
