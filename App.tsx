import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProjectState, ToolType, Frame } from './types';
import { DEFAULT_SIZE, DEFAULT_PALETTE, INITIAL_FRAME_ID } from './constants';
import Tools from './components/Tools';
import Palette from './components/Palette';
import Timeline from './components/Timeline';
import Canvas from './components/Canvas';
import { generatePixelArt } from './services/geminiService';
import { exportFrameAsPNG, createGIF, exportSpriteSheet } from './utils/exportUtils';
import { importSpriteSheet } from './utils/importUtils';
import { rgbaToHex } from './utils/pixelUtils';
import { Loader2, X, Wand2, FilePlus, Upload } from 'lucide-react';

// Initial Empty Grid
const createEmptyGrid = (width: number, height: number) => Array(width * height).fill('transparent');

const App: React.FC = () => {
  // State
  const [size, setSize] = useState({ width: DEFAULT_SIZE, height: DEFAULT_SIZE });
  const [frames, setFrames] = useState<Frame[]>([
    { id: INITIAL_FRAME_ID, pixels: createEmptyGrid(DEFAULT_SIZE, DEFAULT_SIZE) }
  ]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [showGrid, setShowGrid] = useState(true);

  // Modal States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectSize, setNewProjectSize] = useState({ width: 32, height: 32 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isAIModalOpen || isNewProjectModalOpen) return; // Disable shortcuts when modals are open
        if (e.key.toLowerCase() === 'p') setActiveTool('pencil');
        if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
        if (e.key.toLowerCase() === 'f') setActiveTool('bucket');
        if (e.key.toLowerCase() === 'i') setActiveTool('picker');
        if (e.key === ' ') setIsPlaying(p => !p);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAIModalOpen, isNewProjectModalOpen]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
        setCurrentFrameIdx(current => (current + 1) % frames.length);
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, fps]);

  // Actions
  const handleUpdatePixels = (newPixels: string[]) => {
    const newFrames = [...frames];
    newFrames[currentFrameIdx] = { ...newFrames[currentFrameIdx], pixels: newPixels };
    setFrames(newFrames);
  };

  const handleAddFrame = () => {
    const newFrame = { id: `frame-${Date.now()}`, pixels: createEmptyGrid(size.width, size.height) };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIdx + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIdx(currentFrameIdx + 1);
  };

  const handleDuplicateFrame = () => {
    const current = frames[currentFrameIdx];
    const newFrame = { id: `frame-${Date.now()}`, pixels: [...current.pixels] };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIdx + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIdx(currentFrameIdx + 1);
  };

  const handleDeleteFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== currentFrameIdx);
    setFrames(newFrames);
    setCurrentFrameIdx(Math.max(0, currentFrameIdx - 1));
  };

  const handleNewProject = () => {
      // Apply new size and reset
      setSize(newProjectSize);
      setFrames([{ id: `frame-${Date.now()}`, pixels: createEmptyGrid(newProjectSize.width, newProjectSize.height) }]);
      setCurrentFrameIdx(0);
      setIsNewProjectModalOpen(false);
  };

  const handleExport = async (type: 'png' | 'gif' | 'sheet') => {
      if (type === 'png') {
          const dataUrl = exportFrameAsPNG(frames[currentFrameIdx].pixels, size, 20);
          const link = document.createElement('a');
          link.download = `pixel-art-frame-${currentFrameIdx + 1}.png`;
          link.href = dataUrl;
          link.click();
      } else if (type === 'sheet') {
          const dataUrl = exportSpriteSheet(frames, size, 1);
          const link = document.createElement('a');
          link.download = `sprite-sheet.png`;
          link.href = dataUrl;
          link.click();
      } else {
          const blob = await createGIF(frames, size, fps, 10);
          if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.download = 'animation.gif';
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
          }
      }
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          if (event.target?.result && typeof event.target.result === 'string') {
              try {
                  const importedFrames = await importSpriteSheet(event.target.result, size);
                  if (importedFrames.length > 0) {
                      setFrames(importedFrames);
                      setCurrentFrameIdx(0);
                  }
              } catch (error) {
                  console.error("Failed to import sprite sheet:", error);
                  alert("Failed to import sprite sheet. Please ensure the image dimensions align with the current project size.");
              }
          }
      };
      reader.readAsDataURL(file);
      
      // Reset input so same file can be selected again
      e.target.value = '';
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);

    try {
        const imageUrl = await generatePixelArt(aiPrompt);
        if (imageUrl) {
            // Load image to canvas to extract pixels
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size.width;
                canvas.height = size.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                
                // Draw and resize
                ctx.drawImage(img, 0, 0, size.width, size.height);
                const data = ctx.getImageData(0, 0, size.width, size.height).data;
                
                // Convert to our pixel format
                const newPixels = [];
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    if (a < 128) {
                        newPixels.push('transparent');
                    } else {
                        // Use helper
                        newPixels.push(rgbaToHex(r, g, b));
                    }
                }
                
                // Update current frame
                handleUpdatePixels(newPixels);
                setIsAIModalOpen(false);
            };
        } else {
            setAiError("Failed to generate image. Try a different prompt.");
        }
    } catch (e) {
        setAiError("Error connecting to Gemini API. Check your configuration.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {/* Top Bar */}
      <header className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-zinc-900 z-20">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-xs">Pf</div>
            <span className="font-bold text-sm tracking-wide">PixelForge AI</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
           <span>{size.width}x{size.height}px</span>
           <button onClick={() => setShowGrid(!showGrid)} className={`hover:text-white ${showGrid ? 'text-indigo-400' : ''}`}>Grid</button>
           
           <div className="h-4 w-px bg-zinc-700" />
           
           <button onClick={handleImportClick} className="flex items-center gap-1 hover:text-white text-zinc-300">
                <Upload size={14} /> Import
           </button>
           <button onClick={() => setIsNewProjectModalOpen(true)} className="flex items-center gap-1 hover:text-white text-zinc-300">
                <FilePlus size={14} /> New
           </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden">
        <Tools 
            activeTool={activeTool} 
            onSelectTool={setActiveTool} 
            onExport={handleExport} 
            onGenerateAI={() => setIsAIModalOpen(true)}
        />
        
        <div className="flex-1 flex flex-col relative">
            <Canvas 
                size={size}
                pixels={frames[currentFrameIdx].pixels}
                tool={activeTool}
                color={primaryColor}
                onDraw={handleUpdatePixels}
                onPickColor={setPrimaryColor}
                showGrid={showGrid}
                onionSkin={currentFrameIdx > 0 ? frames[currentFrameIdx - 1].pixels : undefined}
            />
            
            {/* Timeline Area */}
            <Timeline 
                frames={frames}
                size={size}
                currentFrameIndex={currentFrameIdx}
                fps={fps}
                isPlaying={isPlaying}
                onSelectFrame={setCurrentFrameIdx}
                onAddFrame={handleAddFrame}
                onDuplicateFrame={handleDuplicateFrame}
                onDeleteFrame={handleDeleteFrame}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
                onChangeFps={setFps}
            />
        </div>

        {/* Right Sidebar: Palette & Layers (Layers simplified to just Palette for now) */}
        <div className="w-64 bg-zinc-900 border-l border-zinc-800 flex flex-col">
            <div className="p-4 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Color Picker</h3>
                <div className="flex gap-2 items-center mb-4">
                     <div className="w-10 h-10 rounded border border-zinc-700 shadow-inner" style={{ backgroundColor: primaryColor }} />
                     <div className="flex flex-col gap-1 flex-1">
                        <input 
                            type="text" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-full bg-zinc-800 text-xs px-2 py-1 rounded border border-zinc-700 focus:outline-none focus:border-indigo-500 uppercase"
                        />
                     </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                 <Palette 
                    colors={palette} 
                    activeColor={primaryColor} 
                    onSelectColor={setPrimaryColor} 
                    onAddColor={(c) => setPalette([...palette, c])}
                />
            </div>
            
            <div className="p-4 border-t border-zinc-800 text-xs text-zinc-600">
                <p>Shortcuts:</p>
                <div className="grid grid-cols-2 gap-1 mt-1 font-mono">
                    <span>P: Pencil</span>
                    <span>E: Eraser</span>
                    <span>F: Fill</span>
                    <span>I: Picker</span>
                    <span>Space: Play</span>
                </div>
            </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                      <h2 className="font-bold flex items-center gap-2"><FilePlus size={16} className="text-indigo-400"/> New Project</h2>
                      <button onClick={() => setIsNewProjectModalOpen(false)} className="hover:text-white text-zinc-400"><X size={18} /></button>
                  </div>
                  <div className="p-6">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-xs text-zinc-400 block mb-1">Width (px)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="128" 
                                value={newProjectSize.width} 
                                onChange={(e) => setNewProjectSize({...newProjectSize, width: parseInt(e.target.value) || 32})}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 block mb-1">Height (px)</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="128" 
                                value={newProjectSize.height} 
                                onChange={(e) => setNewProjectSize({...newProjectSize, height: parseInt(e.target.value) || 32})}
                                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                        {[16, 32, 64].map(s => (
                            <button 
                                key={s}
                                onClick={() => setNewProjectSize({width: s, height: s})}
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-xs text-zinc-300 border border-zinc-700"
                            >
                                {s}x{s}
                            </button>
                        ))}
                      </div>

                      <p className="text-xs text-red-400 bg-red-900/10 p-2 rounded">
                          Warning: Starting a new project will discard current progress.
                      </p>
                  </div>
                  <div className="p-4 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-2">
                      <button 
                        onClick={() => setIsNewProjectModalOpen(false)}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-700"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleNewProject}
                        className="px-4 py-2 rounded-lg text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                      >
                          Create
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* AI Modal */}
      {isAIModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                      <h2 className="font-bold flex items-center gap-2"><Wand2 size={16} className="text-fuchsia-400"/> AI Sprite Generator</h2>
                      <button onClick={() => setIsAIModalOpen(false)} className="hover:text-white text-zinc-400"><X size={18} /></button>
                  </div>
                  <div className="p-6">
                      <p className="text-sm text-zinc-400 mb-4">
                          Describe the sprite you want to create. Gemini will generate a pixel-art style base for you.
                      </p>
                      <textarea 
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-fuchsia-500 transition-colors"
                        rows={3}
                        placeholder="e.g. A pixel art potion bottle with glowing blue liquid..."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        autoFocus
                      />
                      
                      {aiError && <div className="mt-2 text-red-400 text-xs bg-red-900/20 p-2 rounded">{aiError}</div>}
                  </div>
                  <div className="p-4 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-2">
                      <button 
                        onClick={() => setIsAIModalOpen(false)}
                        className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-700"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleGenerateAI}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="px-4 py-2 rounded-lg text-sm bg-fuchsia-600 hover:bg-fuchsia-500 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                      >
                          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                          Generate
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
