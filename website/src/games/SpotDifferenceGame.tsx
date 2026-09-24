import React, { useState } from 'react';
import { Crosshair } from 'lucide-react';

interface SpotDifferenceGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

export default function SpotDifferenceGame({ onComplete, onExit }: SpotDifferenceGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!isPlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center relative z-10">
        <Crosshair size={64} className="text-red-400 mb-8" />
        <h1 className="text-6xl md:text-8xl font-black uppercase mb-6 tracking-tighter">Spot the Difference</h1>
        <p className="text-xl text-zinc-400 font-mono max-w-2xl mx-auto mb-12 uppercase tracking-widest leading-relaxed">
          Compare the two feeds side-by-side. Locate and tap the anomaly before the system lock triggers.
        </p>
        <div className="flex gap-6">
          <button onClick={() => setIsPlaying(true)} className="btn-primary bg-red-500 hover:bg-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            BEGIN SCAN
          </button>
          <button onClick={onExit} className="btn-secondary">ABORT</button>
        </div>
      </div>
    );
  }

  // Interactive Demo implementation
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 relative z-10 w-full max-w-7xl mx-auto">
       <header className="flex justify-between w-full items-center mb-8">
         <h2 className="text-2xl font-black uppercase text-red-400 animate-pulse tracking-widest">SCANNING IN PROGRESS...</h2>
         <div className="text-3xl font-mono font-bold text-white">00:45:00</div>
       </header>

       <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl mx-auto">
         <div className="flex-1 aspect-square md:aspect-video bg-zinc-900 border-2 border-zinc-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-80" />
            <div className="absolute top-4 left-4 bg-black/80 px-3 py-1 text-zinc-400 font-mono text-xs uppercase tracking-widest border border-zinc-800">FEED // ALPHA (SOURCE)</div>
         </div>
         <div className="flex-1 aspect-square md:aspect-video bg-zinc-900 border-2 border-red-900/50 relative overflow-hidden cursor-crosshair">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-80 mix-blend-luminosity" />
            
            {/* The hidden clickable anomaly */}
            <button 
              onClick={() => onComplete(9500, 15000)}
              className="absolute top-[30%] left-[45%] w-16 h-16 rounded-full hover:bg-red-500/20 border-2 border-transparent hover:border-red-500 transition-colors"
            />
            <div className="absolute top-4 left-4 bg-red-950/80 px-3 py-1 text-red-400 font-mono text-xs uppercase tracking-widest border border-red-900">FEED // BETA (ANOMALY)</div>
         </div>
       </div>
       <p className="mt-12 text-zinc-500 font-mono text-sm tracking-widest uppercase">Tap the hidden anomaly in FEED BETA to secure the network.</p>
    </div>
  );
}
