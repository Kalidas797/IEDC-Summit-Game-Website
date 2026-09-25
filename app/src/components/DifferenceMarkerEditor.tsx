import React, { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import type { DifferenceRegion } from '../../../shared/types';

interface DifferenceMarkerEditorProps {
  originalImageUrl: string;
  modifiedImageUrl: string;
  regions: DifferenceRegion[];
  onChange: (regions: DifferenceRegion[]) => void;
}

export default function DifferenceMarkerEditor({ originalImageUrl, modifiedImageUrl, regions, onChange }: DifferenceMarkerEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState({ orig: false, mod: false });

  const getNormCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getNormCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const coords = getNormCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    setDrawStart(coords);
    setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawStart) return;
    const coords = getNormCoords(e);
    if (!coords) return;
    setCurrentRect({
      x: Math.min(drawStart.x, coords.x),
      y: Math.min(drawStart.y, coords.y),
      w: Math.abs(coords.x - drawStart.x),
      h: Math.abs(coords.y - drawStart.y),
    });
  };

  const handleEnd = () => {
    if (!isDrawing || !currentRect) return;
    setIsDrawing(false);
    setDrawStart(null);

    // Only add if region is big enough (at least 2% of image)
    if (currentRect.w > 0.02 && currentRect.h > 0.02) {
      const newRegion: DifferenceRegion = {
        id: crypto.randomUUID(),
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.w,
        height: currentRect.h,
        label: `Difference ${regions.length + 1}`,
      };
      onChange([...regions, newRegion]);
    }
    setCurrentRect(null);
  };

  const deleteRegion = (id: string) => {
    onChange(regions.filter(r => r.id !== id));
  };

  const updateLabel = (id: string, label: string) => {
    onChange(regions.map(r => r.id === id ? { ...r, label } : r));
    setEditingLabel(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Side-by-side images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original (view only) */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Original (Reference)</span>
          <div className="relative bg-zinc-900 border border-white/10 rounded-lg overflow-hidden aspect-video">
            <img 
              src={originalImageUrl} 
              alt="Original" 
              className="w-full h-full object-contain"
              onLoad={() => setImagesLoaded(p => ({ ...p, orig: true }))}
            />
            {/* Show regions overlay on original too */}
            {regions.map(r => (
              <div
                key={`orig-${r.id}`}
                className="absolute border-2 border-cyan-400/50 bg-cyan-400/10 pointer-events-none"
                style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}
              />
            ))}
          </div>
        </div>

        {/* Modified (interactive drawing surface) */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Modified — Draw Differences Here</span>
          <div
            ref={canvasRef}
            className="relative bg-zinc-900 border-2 border-cyan-400/30 rounded-lg overflow-hidden aspect-video cursor-crosshair select-none touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          >
            <img 
              src={modifiedImageUrl} 
              alt="Modified" 
              className="w-full h-full object-contain pointer-events-none"
              onLoad={() => setImagesLoaded(p => ({ ...p, mod: true }))}
            />
            
            {/* Existing regions */}
            {regions.map((r, i) => (
              <div
                key={r.id}
                className="absolute border-2 border-lime-400 bg-lime-400/10 group"
                style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <span className="absolute -top-5 left-0 bg-lime-400 text-black text-[10px] font-bold px-1 whitespace-nowrap">
                  #{i + 1}
                </span>
              </div>
            ))}

            {/* Currently drawing rectangle */}
            {currentRect && (
              <div
                className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none"
                style={{ left: `${currentRect.x * 100}%`, top: `${currentRect.y * 100}%`, width: `${currentRect.w * 100}%`, height: `${currentRect.h * 100}%` }}
              />
            )}

            {!imagesLoaded.mod && (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-mono text-sm">
                Loading image...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Regions list */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest mb-2">
          Marked Differences ({regions.length})
        </span>
        {regions.length === 0 && (
          <p className="text-zinc-600 text-sm font-mono">Click and drag on the modified image to mark differences</p>
        )}
        {regions.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 bg-black/30 border border-white/5 rounded-lg p-3">
            <span className="w-8 h-8 bg-lime-400/20 text-lime-400 rounded flex items-center justify-center font-bold text-sm">
              {i + 1}
            </span>
            {editingLabel === r.id ? (
              <input
                autoFocus
                className="flex-1 bg-black/50 border border-white/10 text-white font-mono p-2 text-sm rounded outline-none focus:border-cyan-400"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onBlur={() => updateLabel(r.id, labelInput)}
                onKeyDown={e => e.key === 'Enter' && updateLabel(r.id, labelInput)}
              />
            ) : (
              <span
                className="flex-1 text-white text-sm cursor-pointer hover:text-cyan-400 transition-colors"
                onClick={() => { setEditingLabel(r.id); setLabelInput(r.label); }}
              >
                {r.label}
              </span>
            )}
            <span className="text-zinc-600 text-[10px] font-mono">
              ({(r.x * 100).toFixed(0)}%, {(r.y * 100).toFixed(0)}%)
            </span>
            <button onClick={() => deleteRegion(r.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
