import { useState } from 'react';
import { LayoutDashboard } from 'lucide-react';

interface CrosswordGameProps {
  onComplete: (score: number, timeMs: number) => void;
  onExit: () => void;
}

export default function CrosswordGame({ onComplete, onExit }: CrosswordGameProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!isPlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-center relative z-10">
        <LayoutDashboard size={64} className="text-emerald-400 mb-8" />
        <h1 className="text-6xl md:text-8xl font-black uppercase mb-6 tracking-tighter">Terminal Grid</h1>
        <p className="text-xl text-zinc-400 font-mono max-w-2xl mx-auto mb-12 uppercase tracking-widest leading-relaxed">
          Decrypt the tech acronyms and cybersecurity terminology in a race against the clock.
        </p>
        <div className="flex gap-6">
          <button onClick={() => setIsPlaying(true)} className="btn-primary bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            COMPILE PUZZLE
          </button>
          <button onClick={onExit} className="btn-secondary">ABORT</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col md:flex-row items-center justify-center gap-12 p-8 md:p-12 relative z-10 w-full max-w-6xl mx-auto">
       
       <div className="flex-1 w-full max-w-lg aspect-square grid grid-cols-5 gap-[2px] bg-zinc-800 p-[2px] border-4 border-emerald-900/50">
         {[...Array(25)].map((_, i) => {
           const isBlack = [0, 4, 12, 20, 24].includes(i);
           return (
             <div 
               key={i} 
               className={`relative flex items-center justify-center text-3xl font-black uppercase transition-colors
                 ${isBlack ? 'bg-zinc-900' : 'bg-zinc-100 text-black cursor-pointer hover:bg-emerald-200'}
               `}
             >
               {!isBlack && (
                 <>
                   {/* Dummy clue numbers */}
                   {(i === 1 || i === 5 || i === 10) && <span className="absolute top-1 left-1 text-[10px] font-mono leading-none">{(i%5)+1}</span>}
                   {i % 2 === 0 ? '' : ''}
                 </>
               )}
             </div>
           );
         })}
       </div>

       <div className="w-full md:w-80 flex flex-col gap-6">
         <div className="bg-zinc-900 border border-zinc-800 p-6">
           <h3 className="text-emerald-400 font-mono font-bold text-sm tracking-widest uppercase border-b border-zinc-800 pb-2 mb-4">ACROSS</h3>
           <ol className="text-zinc-300 font-mono text-sm space-y-4">
             <li><span className="text-emerald-500 mr-2">1.</span> Universal Serial Bus (abbr.)</li>
             <li><span className="text-emerald-500 mr-2">3.</span> Primary memory of a computer</li>
             <li><span className="text-emerald-500 mr-2">4.</span> Global network</li>
           </ol>
         </div>

         <button onClick={() => onComplete(9000, 45000)} className="btn-primary bg-emerald-500 text-zinc-950 text-xl py-6 w-full shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            VERIFY & SUBMIT
         </button>
       </div>
    </div>
  );
}
