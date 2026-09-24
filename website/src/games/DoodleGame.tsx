import React, { useState } from 'react';
import { PenTool } from 'lucide-react';

interface DoodleGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

export default function DoodleGame({ onComplete, onExit }: DoodleGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!isPlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center relative z-10">
        <PenTool size={64} className="text-pink-400 mb-8" />
        <h1 className="text-6xl md:text-8xl font-black uppercase mb-6 tracking-tighter">Doodle Telephone</h1>
        <p className="text-xl text-zinc-400 font-mono max-w-2xl mx-auto mb-12 uppercase tracking-widest leading-relaxed">
          Draw the prompt provided by the system. The Neural Net will attempt to decipher your creation.
        </p>
        <div className="flex gap-6">
          <button onClick={() => setIsPlaying(true)} className="btn-primary bg-pink-500 hover:bg-pink-400 text-white shadow-[0_0_30px_rgba(236,72,153,0.3)]">
            INITIALIZE CANVAS
          </button>
          <button onClick={onExit} className="btn-secondary">ABORT</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 relative z-10 w-full max-w-4xl mx-auto">
       <div className="text-center mb-8">
         <p className="text-zinc-500 font-mono mb-2 uppercase tracking-widest text-sm">TARGET SUBJECT</p>
         <h2 className="text-4xl md:text-5xl font-black text-pink-400 uppercase tracking-widest bg-pink-400/10 inline-block px-8 py-4 border border-pink-400/30">A CYBERPUNK CAT</h2>
       </div>
       
       <div className="w-full aspect-video bg-zinc-100 rounded-xl mb-12 relative cursor-crosshair shadow-2xl overflow-hidden border-4 border-zinc-800 hover:border-pink-500 transition-colors">
         <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 font-mono opacity-50">
            <PenTool size={48} className="mb-4" />
            <span>[ INK INJECTION READY ]</span>
            <span className="text-xs mt-2">Draw anywhere in this sector</span>
         </div>
         {/* In a real implementation, a <canvas> element would go here hooked up to touch/mouse events */}
       </div>
       
       <button onClick={() => onComplete(8200, 24000)} className="btn-primary bg-pink-500 text-white text-xl px-12 py-6 w-full max-w-md shadow-[0_0_30px_rgba(236,72,153,0.3)]">
          SUBMIT TO NEURAL NET
       </button>
    </div>
  );
}
