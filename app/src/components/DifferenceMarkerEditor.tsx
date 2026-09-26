// @ts-nocheck
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Trash2, MousePointer2, Square, Circle, Hexagon, Move } from 'lucide-react';
import type { DifferenceRegion } from '../../../shared/types';

interface DifferenceMarkerEditorProps {
  originalImageUrl: string;
  modifiedImageUrl: string;
  regions: DifferenceRegion[];
  onChange: (regions: DifferenceRegion[]) => void;
}

type Tool = 'select' | 'rectangle' | 'ellipse' | 'polygon';

export default function DifferenceMarkerEditor({ originalImageUrl, modifiedImageUrl, regions, onChange }: DifferenceMarkerEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>('rectangle');
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState('');

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);
  const [tempPoint, setTempPoint] = useState<{x: number, y: number} | null>(null);

  // Interaction state
  const [dragState, setDragState] = useState<{ type: 'move' | 'resize' | 'point', regionId: string, startX: number, startY: number, handleIndex?: number, originalRegion: DifferenceRegion } | null>(null);

  const getNormCoords = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as any).clientY;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getNormCoords(e);
    if (!coords) return;
    
    if (activeTool === 'select') {
      if (!dragState) {
        setSelectedRegionId(null);
      }
      return;
    }

    if (activeTool === 'polygon') {
      if (currentPoints.length === 0) {
        setCurrentPoints([coords]);
      } else {
        // Add point
        const newPoints = [...currentPoints, coords];
        // If close to first point, finish
        const dx = coords.x - currentPoints[0].x;
        const dy = coords.y - currentPoints[0].y;
        if (newPoints.length > 2 && Math.sqrt(dx*dx + dy*dy) < 0.05) {
          finishPolygon();
        } else {
          setCurrentPoints(newPoints);
        }
      }
      return;
    }

    // Rectangle or Ellipse
    setIsDrawing(true);
    setDrawStart(coords);
    setTempPoint(coords);
    setSelectedRegionId(null);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getNormCoords(e);
    if (!coords) return;

    if (dragState) {
      const dx = coords.x - dragState.startX;
      const dy = coords.y - dragState.startY;
      const orig = dragState.originalRegion;
      
      let newRegion = { ...orig };
      
      if (dragState.type === 'move') {
        if (orig.shape === 'rectangle' && orig.x !== undefined) {
          newRegion.x = orig.x + dx;
          newRegion.y = orig.y! + dy;
        } else if (orig.shape === 'ellipse' && orig.cx !== undefined) {
          newRegion.cx = orig.cx + dx;
          newRegion.cy = orig.cy! + dy;
        } else if (orig.shape === 'polygon' && orig.points) {
          newRegion.points = orig.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
        }
      } else if (dragState.type === 'resize') {
        if (orig.shape === 'rectangle' && orig.x !== undefined && orig.width !== undefined) {
          // simple resize from bottom right for now
          newRegion.width = Math.max(0.01, orig.width + dx);
          newRegion.height = Math.max(0.01, orig.height! + dy);
        } else if (orig.shape === 'ellipse' && orig.rx !== undefined) {
          newRegion.rx = Math.max(0.01, orig.rx + dx);
          newRegion.ry = Math.max(0.01, orig.ry! + dy);
        }
      } else if (dragState.type === 'point' && dragState.handleIndex !== undefined) {
        if (orig.shape === 'polygon' && orig.points) {
          const pts = [...orig.points];
          pts[dragState.handleIndex] = { x: coords.x, y: coords.y };
          newRegion.points = pts;
        }
      }
      onChange(regions.map(r => r.id === orig.id ? newRegion : r));
      return;
    }

    if (activeTool === 'polygon' && currentPoints.length > 0) {
      setTempPoint(coords);
      return;
    }

    if (isDrawing && drawStart) {
      setTempPoint(coords);
    }
  };

  const finishPolygon = () => {
    if (currentPoints.length > 2) {
      const newRegion: DifferenceRegion = {
        id: crypto.randomUUID(),
        label: `Difference ${regions.length + 1}`,
        shape: 'polygon',
        points: [...currentPoints]
      };
      onChange([...regions, newRegion]);
      setSelectedRegionId(newRegion.id);
      setActiveTool('select');
    }
    setCurrentPoints([]);
    setTempPoint(null);
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
      return;
    }

    if (activeTool === 'polygon') return; // polygon handles up differently

    if (isDrawing && drawStart && tempPoint) {
      const w = Math.abs(tempPoint.x - drawStart.x);
      const h = Math.abs(tempPoint.y - drawStart.y);
      if (w > 0.02 && h > 0.02) {
        const newRegion: DifferenceRegion = {
          id: crypto.randomUUID(),
          label: `Difference ${regions.length + 1}`,
          shape: activeTool as any
        };
        if (activeTool === 'rectangle') {
          newRegion.x = Math.min(drawStart.x, tempPoint.x);
          newRegion.y = Math.min(drawStart.y, tempPoint.y);
          newRegion.width = w;
          newRegion.height = h;
        } else if (activeTool === 'ellipse') {
          newRegion.cx = drawStart.x + (tempPoint.x - drawStart.x) / 2;
          newRegion.cy = drawStart.y + (tempPoint.y - drawStart.y) / 2;
          newRegion.rx = w / 2;
          newRegion.ry = h / 2;
        }
        onChange([...regions, newRegion]);
        setSelectedRegionId(newRegion.id);
        setActiveTool('select');
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setTempPoint(null);
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'resize' | 'point', region: DifferenceRegion, index?: number) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const coords = getNormCoords(e);
    if (!coords) return;
    setSelectedRegionId(region.id);
    setDragState({ type, regionId: region.id, startX: coords.x, startY: coords.y, originalRegion: region, handleIndex: index });
  };

  const renderShape = (r: DifferenceRegion, isSelected: boolean) => {
    const stroke = isSelected ? "#a3e635" : "#22d3ee";
    const fill = isSelected ? "rgba(163, 230, 53, 0.2)" : "rgba(34, 211, 238, 0.1)";
    const strokeWidth = isSelected ? 3 : 2;

    let shapeElement = null;
    let handles = null;

    if (r.shape === 'rectangle' && r.x !== undefined && r.width !== undefined) {
      shapeElement = (
        <rect 
          x={r.x * 100 + "%"} y={r.y! * 100 + "%"} 
          width={r.width * 100 + "%"} height={r.height! * 100 + "%"}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          style={{ cursor: activeTool === 'select' ? 'move' : 'default', pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
          onMouseDown={e => startDrag(e, 'move', r)}
          onTouchStart={e => startDrag(e, 'move', r)}
        />
      );
      if (isSelected && activeTool === 'select') {
        handles = (
          <circle 
            cx={(r.x + r.width) * 100 + "%"} cy={(r.y! + r.height!) * 100 + "%"} 
            r={6} fill="white" stroke="#a3e635" strokeWidth={2}
            style={{ cursor: 'se-resize', pointerEvents: 'auto' }}
            onMouseDown={e => startDrag(e, 'resize', r)}
            onTouchStart={e => startDrag(e, 'resize', r)}
          />
        );
      }
    } else if (r.shape === 'ellipse' && r.cx !== undefined && r.rx !== undefined) {
      shapeElement = (
        <ellipse 
          cx={r.cx * 100 + "%"} cy={r.cy! * 100 + "%"} 
          rx={r.rx * 100 + "%"} ry={r.ry! * 100 + "%"}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          style={{ cursor: activeTool === 'select' ? 'move' : 'default', pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
          onMouseDown={e => startDrag(e, 'move', r)}
          onTouchStart={e => startDrag(e, 'move', r)}
        />
      );
      if (isSelected && activeTool === 'select') {
        handles = (
          <circle 
            cx={(r.cx + r.rx) * 100 + "%"} cy={(r.cy! + r.ry!) * 100 + "%"} 
            r={6} fill="white" stroke="#a3e635" strokeWidth={2}
            style={{ cursor: 'se-resize', pointerEvents: 'auto' }}
            onMouseDown={e => startDrag(e, 'resize', r)}
            onTouchStart={e => startDrag(e, 'resize', r)}
          />
        );
      }
    } else if (r.shape === 'polygon' && r.points) {
      const pointsStr = r.points.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
      shapeElement = (
        <polygon 
          points={pointsStr}
          fill={fill} stroke={stroke} strokeWidth={strokeWidth}
          style={{ cursor: activeTool === 'select' ? 'move' : 'default', pointerEvents: activeTool === 'select' ? 'auto' : 'none' }}
          onMouseDown={e => startDrag(e, 'move', r)}
          onTouchStart={e => startDrag(e, 'move', r)}
        />
      );
      if (isSelected && activeTool === 'select') {
        handles = r.points.map((p, i) => (
          <circle 
            key={i}
            cx={p.x * 100 + "%"} cy={p.y * 100 + "%"} 
            r={6} fill="white" stroke="#a3e635" strokeWidth={2}
            style={{ cursor: 'move', pointerEvents: 'auto' }}
            onMouseDown={e => startDrag(e, 'point', r, i)}
            onTouchStart={e => startDrag(e, 'point', r, i)}
          />
        ));
      }
    }

    return (
      <g key={r.id}>
        {shapeElement}
        {handles}
      </g>
    );
  };

  const renderDrawing = () => {
    if (activeTool === 'polygon' && currentPoints.length > 0) {
      let pts = [...currentPoints];
      if (tempPoint) pts.push(tempPoint);
      const pointsStr = pts.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
      return (
        <g>
          <polyline points={pointsStr} fill="rgba(250, 204, 21, 0.2)" stroke="#facc15" strokeWidth={2} strokeDasharray="4 4" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x * 100 + "%"} cy={p.y * 100 + "%"} r={4} fill="#facc15" />
          ))}
        </g>
      );
    }
    
    if (isDrawing && drawStart && tempPoint) {
      const x = Math.min(drawStart.x, tempPoint.x);
      const y = Math.min(drawStart.y, tempPoint.y);
      const w = Math.abs(tempPoint.x - drawStart.x);
      const h = Math.abs(tempPoint.y - drawStart.y);
      
      if (activeTool === 'rectangle') {
        return <rect x={x*100+"%"} y={y*100+"%"} width={w*100+"%"} height={h*100+"%"} fill="rgba(250, 204, 21, 0.2)" stroke="#facc15" strokeWidth={2} strokeDasharray="4 4" />;
      } else if (activeTool === 'ellipse') {
        return <ellipse cx={(drawStart.x + w/2)*100+"%"} cy={(drawStart.y + h/2)*100+"%"} rx={(w/2)*100+"%"} ry={(h/2)*100+"%"} fill="rgba(250, 204, 21, 0.2)" stroke="#facc15" strokeWidth={2} strokeDasharray="4 4" />;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* TOOLBAR */}
      <div className="flex gap-2 p-2 bg-black/40 border border-white/10 rounded-lg">
        <button onClick={() => setActiveTool('select')} className={`p-2 rounded flex items-center gap-2 text-sm font-bold uppercase transition-colors ${activeTool === 'select' ? 'bg-cyan-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <MousePointer2 size={16} /> Select / Move
        </button>
        <button onClick={() => setActiveTool('rectangle')} className={`p-2 rounded flex items-center gap-2 text-sm font-bold uppercase transition-colors ${activeTool === 'rectangle' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Square size={16} /> Rectangle
        </button>
        <button onClick={() => setActiveTool('ellipse')} className={`p-2 rounded flex items-center gap-2 text-sm font-bold uppercase transition-colors ${activeTool === 'ellipse' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Circle size={16} /> Ellipse
        </button>
        <button onClick={() => setActiveTool('polygon')} className={`p-2 rounded flex items-center gap-2 text-sm font-bold uppercase transition-colors ${activeTool === 'polygon' ? 'bg-lime-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
          <Hexagon size={16} /> Polygon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Original (Reference)</span>
          <div className="relative bg-zinc-900 border border-white/10 rounded-lg overflow-hidden aspect-video">
            <img src={originalImageUrl} alt="Original" className="w-full h-full object-contain" onLoad={() => setImagesLoaded(p => ({ ...p, orig: true }))} />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {regions.map(r => renderShape(r, false))}
            </svg>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">Modified — Draw Differences</span>
          <div
            ref={containerRef}
            className="relative bg-zinc-900 border-2 border-cyan-400/30 rounded-lg overflow-hidden aspect-video select-none touch-none"
            style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <img src={modifiedImageUrl} alt="Modified" className="w-full h-full object-contain pointer-events-none" onLoad={() => setImagesLoaded(p => ({ ...p, mod: true }))} />
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {regions.map(r => renderShape(r, r.id === selectedRegionId))}
              {renderDrawing()}
            </svg>

            {activeTool === 'polygon' && currentPoints.length > 0 && (
              <button 
                className="absolute bottom-2 right-2 px-3 py-1 bg-lime-500 text-black text-xs font-bold uppercase rounded z-50 pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); finishPolygon(); }}
              >
                Finish Polygon
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">
            Differences ({regions.length})
          </span>
          <button 
            className="text-xs font-mono uppercase text-red-400 hover:text-red-300"
            onClick={() => { if(confirm('Clear all differences?')) onChange([]); }}
          >
            Clear All
          </button>
        </div>
        
        {regions.length === 0 && (
          <p className="text-zinc-600 text-sm font-mono">Select a tool and draw on the modified image.</p>
        )}
        {regions.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${selectedRegionId === r.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/30 border-white/5'}`} onClick={() => { setActiveTool('select'); setSelectedRegionId(r.id); }}>
            <span className="w-8 h-8 bg-zinc-800 text-zinc-300 rounded flex items-center justify-center font-bold text-sm uppercase">
              {r.shape.substring(0,3)}
            </span>
            {editingLabel === r.id ? (
              <input
                autoFocus
                className="flex-1 bg-black/50 border border-white/10 text-white font-mono p-2 text-sm rounded outline-none focus:border-cyan-400"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onBlur={() => { onChange(regions.map(reg => reg.id === r.id ? { ...reg, label: labelInput } : reg)); setEditingLabel(null); }}
                onKeyDown={e => { if(e.key === 'Enter') { onChange(regions.map(reg => reg.id === r.id ? { ...reg, label: labelInput } : reg)); setEditingLabel(null); } }}
              />
            ) : (
              <span className="flex-1 text-white text-sm cursor-pointer hover:text-cyan-400 transition-colors" onClick={(e) => { e.stopPropagation(); setEditingLabel(r.id); setLabelInput(r.label); }}>
                {r.label}
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); onChange(regions.filter(reg => reg.id !== r.id)); }} className="text-zinc-500 hover:text-red-400 transition-colors p-2">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

