import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export default function TermsView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col p-4 md:p-8 z-10 w-full max-w-4xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="self-start text-zinc-500 hover:text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-8 transition-colors"
      >
        <ChevronLeft size={20} /> Back to Arena
      </button>

      <div className="bg-zinc-900 border-2 border-zinc-800 p-4 sm:p-8 md:p-12 text-zinc-300 font-mono text-sm md:text-base overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 150px)' }}>
        <h1 className="text-3xl md:text-5xl font-black uppercase text-cyan-400 mb-8 tracking-tighter">Terms & Conditions</h1>
        
        <div className="space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">1. Acceptance of Terms</h2>
            <p>By registering for and playing games on the PaperLab Games Arena, you agree to abide by these Terms and Conditions. If you do not agree, you may not participate in the games or leaderboards.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">2. Eligibility</h2>
            <p>Participation is open to attendees of the event. You must provide accurate and truthful information during registration, including your real email address and college affiliation.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">3. Game Rules and Scoring</h2>
            <p>Each game has its own set of rules, time limits, and scoring mechanics. The scoring system is automated. In the event of a dispute or technical glitch, the decision of the event administrators is final.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">4. Invalid and Abusive Gameplay</h2>
            <p>You agree to play the games fairly. The following activities are strictly prohibited and may result in immediate disqualification and removal from the leaderboard:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-zinc-400">
              <li>Using automated scripts, bots, or any third-party tools to manipulate gameplay or scores.</li>
              <li>Exploiting bugs, glitches, or design flaws in the software.</li>
              <li>Submitting fraudulent data to our servers.</li>
              <li>Registering multiple accounts to gain an unfair advantage.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">5. Admin Authority</h2>
            <p>Event administrators reserve the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-zinc-400">
              <li>Modify, enable, or disable any game module at any time without prior notice.</li>
              <li>Hide or remove any player's scores from the leaderboard at their sole discretion.</li>
              <li>Alter the scoring algorithms or game configurations during the event.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">6. Intellectual Property</h2>
            <p>All content, designs, and code within the PaperLab Games Arena remain the intellectual property of PaperLab / R3ACTR or their respective owners. You may not copy, reverse engineer, or distribute the software.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">7. Limitation of Liability</h2>
            <p>The PaperLab Games Arena is provided "as is" for entertainment purposes during the event. We are not responsible for any technical failures, lost data, or interruptions to the service. We make no guarantees regarding the continuous availability of the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">8. Contact Information</h2>
            <p>For any questions or disputes regarding these terms, please contact the event organizers at:</p>
            <p className="mt-2 text-cyan-400">r3actr@gmail.com</p>
          </section>
          
          <div className="pt-8 mt-8 border-t border-zinc-800 text-xs text-zinc-500 uppercase">
            <p>Effective Date: September 26, 2026</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
