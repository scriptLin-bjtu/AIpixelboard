import React from 'react';
import { Plus } from 'lucide-react';

interface PaletteProps {
  colors: string[];
  activeColor: string;
  onSelectColor: (color: string) => void;
  onAddColor: (color: string) => void;
}

const Palette: React.FC<PaletteProps> = ({ colors, activeColor, onSelectColor, onAddColor }) => {
  return (
    <div className="p-4 border-t border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap gap-1.5">
        {colors.map((color, idx) => (
          <button
            key={idx}
            className={`w-6 h-6 rounded-sm border ${
              activeColor === color ? 'border-white scale-110 shadow-lg' : 'border-zinc-700 hover:border-zinc-500'
            } transition-all`}
            style={{ backgroundColor: color }}
            onClick={() => onSelectColor(color)}
            title={color}
          />
        ))}
        <div className="relative group">
            <input 
                type="color" 
                className="opacity-0 absolute inset-0 w-6 h-6 cursor-pointer"
                onChange={(e) => onAddColor(e.target.value)}
            />
            <button className="w-6 h-6 rounded-sm border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-500 bg-zinc-800">
                <Plus size={14} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default Palette;
