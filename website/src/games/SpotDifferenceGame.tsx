import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import type { GameContent, DifferenceRegion } from '../../../shared/types';

interface SpotDifferenceGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

function isPointInRegion(px: number, py: number, r: DifferenceRegion): boolean {
  const shape = r.shape || 'rectangle';
  // generous tolerance pad for click imprecision
  const PAD = 0.03;

  if (shape === 'rectangle' && r.x !== undefined && r.width !== undefined) {
    return px >= r.x - PAD && px <= r.x + r.width + PAD && py >= r.y! - PAD && py <= r.y! + r.height! + PAD;
  }
  if (shape === 'ellipse' && r.cx !== undefined && r.rx !== undefined) {
    const dx = px - r.cx;
    const dy = py - r.cy!;
    const rx = r.rx + PAD;
    const ry = r.ry! + PAD;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }
  if (shape === 'polygon' && r.points && r.points.length > 2) {
    let inside = false;
    for (let i = 0, j = r.points.length - 1; i < r.points.length; j = i++) {
      const xi = r.points[i].x, yi = r.points[i].y;
      const xj = r.points[j].x, yj = r.points[j].y;
      if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SpotDifferenceGame({ onComplete, onExit: _onExit }: SpotDifferenceGameProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [content, setContent] = useState<GameContent | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [wrongClicks, setWrongClicks] = useState<{ id: string; x: number; y: number; side: 'orig' | 'mod' }[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [allFound, setAllFound] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Attach click containers directly — NOT inner components
  const origContainerRef = useRef<HTMLDivElement>(null);
  const modContainerRef = useRef<HTMLDivElement>(null);
  const origImgRef = useRef<HTMLImageElement>(null);
  const modImgRef = useRef<HTMLImageElement>(null);
  const startTimeRef = useRef<number>(0);

  // Use refs to avoid stale closures in callbacks
  const foundIdsRef = useRef<Set<string>>(new Set());
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const contentRef = useRef<GameContent | null>(null);

  useEffect(() => { foundIdsRef.current = foundIds; }, [foundIds]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { contentRef.current = content; }, [content]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    async function load() {
      const { data: gameData } = await supabase
        .from('games').select('id').eq('slug', 'spot-difference').single();
      if (!gameData) { setError(true); setLoading(false); return; }

      const { data: contentData } = await supabase
        .from('game_content').select('*')
        .eq('game_id', gameData.id).eq('is_active', true);
      if (!contentData || contentData.length === 0) { setError(true); setLoading(false); return; }

      const chosen = contentData[Math.floor(Math.random() * contentData.length)];
      setContent(chosen);
      contentRef.current = chosen;
      setTimeLeft(chosen.data?.timeLimit ?? 60);
      setLoading(false);
      startTimeRef.current = performance.now();
    }
    load();
  }, []);

  useEffect(() => {
    if (loading || gameOver || error) return;
    if (timeLeft <= 0) {
      gameOverRef.current = true;
      setGameOver(true);
      const elapsed = performance.now() - startTimeRef.current;
      setTimeout(() => onComplete(scoreRef.current, elapsed), 2000);
      return;
    }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, gameOver, error, onComplete]);

  const handleClick = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    containerRef: React.RefObject<HTMLDivElement | null>,
    imgRef: React.RefObject<HTMLImageElement | null>,
    side: 'orig' | 'mod'
  ) => {
    if (gameOverRef.current || !contentRef.current) return;

    const el = containerRef.current;
    if (!el) return;

    // Normalize against the actual rendered image pixels, not the outer div.
    // This prevents letterboxing offsets when object-contain adds invisible space.
    const imgEl = imgRef.current;
    const rect = imgEl ? imgEl.getBoundingClientRect() : el.getBoundingClientRect();

    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    // Normalize to 0-1 within the actual image pixels
    const normX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const normY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const regions: DifferenceRegion[] = contentRef.current.data?.regions ?? [];
    let found = false;

    for (const region of regions) {
      if (foundIdsRef.current.has(region.id)) continue;
      if (isPointInRegion(normX, normY, region)) {
        found = true;

        const newFound = new Set(foundIdsRef.current);
        newFound.add(region.id);
        const newScore = scoreRef.current + 100;

        foundIdsRef.current = newFound;
        scoreRef.current = newScore;

        setFoundIds(new Set(newFound));
        setScore(newScore);
        setFlashId(region.id);
        setTimeout(() => setFlashId(null), 700);

        if (newFound.size === regions.length) {
          gameOverRef.current = true;
          setAllFound(true);
          setGameOver(true);
          const elapsed = performance.now() - startTimeRef.current;
          setTimeout(() => onComplete(newScore, elapsed), 2000);
        }
        break;
      }
    }

    if (!found) {
      const cid = `${Date.now()}-${Math.random()}`;
      setWrongClicks(prev => [...prev, { id: cid, x: normX, y: normY, side }]);
      setTimeout(() => setWrongClicks(prev => prev.filter(c => c.id !== cid)), 700);
    }
  }, [onComplete]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center font-mono animate-pulse uppercase text-cyan-400 tracking-widest">
      Loading Challenge...
    </div>
  );
  if (error) return (
    <div className="flex-1 flex items-center justify-center font-mono text-red-400 uppercase tracking-widest text-xl">
      Module Unavailable — No Content
    </div>
  );
  if (!content) return null;

  const regions: DifferenceRegion[] = content.data?.regions ?? [];
  const origUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.originalImagePath}`;
  const modUrl = `${supabaseUrl}/storage/v1/object/public/game-documents/${content.data?.modifiedImagePath}`;
  const pct = regions.length > 0 ? Math.round((foundIds.size / regions.length) * 100) : 0;

  // SVG overlay: viewBox matches 0-1 coord space, no aspect ratio correction needed
  // because coords were annotated relative to the container (same as here)
  const renderOverlay = (side: 'orig' | 'mod') => (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
    >
      {regions.map(r => {
        const isFound = foundIds.has(r.id);
        const isFlash = flashId === r.id;
        if (!isFound) return null;

        const stroke = isFlash ? '#facc15' : '#a3e635';
        const fill = isFlash ? 'rgba(250,204,21,0.4)' : 'rgba(163,230,53,0.25)';
        const sw = 0.006;
        const shape = r.shape || 'rectangle';

        if (shape === 'rectangle' && r.x !== undefined && r.width !== undefined) {
          return <rect key={r.id} x={r.x} y={r.y} width={r.width} height={r.height} fill={fill} stroke={stroke} strokeWidth={sw} rx={0.01} />;
        }
        if (shape === 'ellipse' && r.cx !== undefined && r.rx !== undefined) {
          return <ellipse key={r.id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} fill={fill} stroke={stroke} strokeWidth={sw} />;
        }
        if (shape === 'polygon' && r.points) {
          return <polygon key={r.id} points={r.points.map(p => `${p.x},${p.y}`).join(' ')} fill={fill} stroke={stroke} strokeWidth={sw} />;
        }
        return null;
      })}

      {wrongClicks.filter(c => c.side === side).map(c => (
        <g key={c.id}>
          <circle cx={c.x} cy={c.y} r={0.03} fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth={0.005} />
          <line x1={c.x - 0.02} y1={c.y} x2={c.x + 0.02} y2={c.y} stroke="#ef4444" strokeWidth={0.005} />
          <line x1={c.x} y1={c.y - 0.02} x2={c.x} y2={c.y + 0.02} stroke="#ef4444" strokeWidth={0.005} />
        </g>
      ))}
    </svg>
  );

  return (
    <div className="flex-1 flex flex-col pt-24 pb-2 px-2 md:pt-28 md:px-6 relative z-10 w-full max-w-none mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
        <div>
          <h2 className="text-lg md:text-2xl font-black uppercase text-red-400 tracking-widest">Spot the Difference</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-zinc-400 font-mono text-xs uppercase">{foundIds.size}/{regions.length} found</span>
            <div className="flex gap-1">
              {regions.map((r, i) => (
                <div
                  key={r.id}
                  className={`w-3 h-3 rounded-full border transition-all duration-300 ${foundIds.has(r.id) ? 'bg-lime-400 border-lime-400' : 'bg-zinc-800 border-zinc-600'}`}
                  title={`Difference ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className={`text-3xl font-black font-mono tabular-nums ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
          <div className="text-lime-400 font-mono text-sm font-bold">{score} pts</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-zinc-800 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-lime-400 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Game-over overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-50 bg-zinc-950/95 flex flex-col items-center justify-center gap-3"
          >
            <motion.div
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', damping: 14 }}
              className="flex flex-col items-center"
            >
              <h1 className={`text-5xl md:text-7xl font-black uppercase text-center mb-2 ${allFound ? 'text-lime-400' : 'text-red-400'}`}>
                {allFound ? '🎉 All Found!' : '⏰ Time Up!'}
              </h1>
              <p className="text-xl font-mono text-zinc-400">{foundIds.size} / {regions.length} differences</p>
              <p className="text-4xl font-black text-white mt-2">{score} pts</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Images */}
      <div className={`flex ${isPortrait ? 'flex-row' : 'flex-col'} gap-3 md:gap-6 flex-1 items-center justify-center`}>

        {/* Original */}
        <div className="flex-1 flex flex-col gap-1 items-center">
          <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest w-full text-left">Original</span>
          <div
            ref={origContainerRef}
            className="w-auto max-w-full relative bg-zinc-950 border-2 border-zinc-700 rounded-xl overflow-hidden select-none inline-block"
            style={{ cursor: gameOver ? 'default' : 'crosshair' }}
            onClick={(e) => handleClick(e, origContainerRef, origImgRef, 'orig')}
            onTouchStart={(e) => { e.preventDefault(); handleClick(e, origContainerRef, origImgRef, 'orig'); }}
          >
            <img
              ref={origImgRef}
              src={origUrl}
              alt="Original"
              className={`block pointer-events-none ${isPortrait ? 'h-[65vh] w-auto max-w-full' : 'max-h-[38vh] w-auto max-w-full'}`}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setIsPortrait(img.naturalHeight > img.naturalWidth);
              }}
            />
            {renderOverlay('orig')}
          </div>
        </div>

        {/* Modified */}
        <div className="flex-1 flex flex-col gap-1 items-center">
          <span className="text-red-400 font-mono text-[10px] uppercase tracking-widest w-full text-left">Modified — Tap differences ↓</span>
          <div
            ref={modContainerRef}
            className="w-auto max-w-full relative bg-zinc-950 border-2 border-red-800/60 rounded-xl overflow-hidden select-none inline-block"
            style={{ cursor: gameOver ? 'default' : 'crosshair' }}
            onClick={(e) => handleClick(e, modContainerRef, modImgRef, 'mod')}
            onTouchStart={(e) => { e.preventDefault(); handleClick(e, modContainerRef, modImgRef, 'mod'); }}
          >
            <img
              ref={modImgRef}
              src={modUrl}
              alt="Modified"
              className={`block pointer-events-none ${isPortrait ? 'h-[65vh] w-auto max-w-full' : 'max-h-[38vh] w-auto max-w-full'}`}
              draggable={false}
            />
            {renderOverlay('mod')}
          </div>
        </div>

      </div>

      <p className="mt-2 text-zinc-600 font-mono text-[10px] tracking-widest uppercase text-center">
        Click on either image where you spot a difference • +100 pts each
      </p>
    </div>
  );
}
