import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyView({ onBack }: { onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col p-8 z-10 w-full max-w-4xl mx-auto"
    >
      <button 
        onClick={onBack}
        className="self-start text-zinc-500 hover:text-white uppercase font-mono tracking-widest flex items-center gap-2 mb-8 transition-colors"
      >
        <ChevronLeft size={20} /> Back to Arena
      </button>

      <div className="bg-zinc-900 border-2 border-zinc-800 p-8 md:p-12 text-zinc-300 font-mono text-sm md:text-base overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        <h1 className="text-3xl md:text-5xl font-black uppercase text-lime-400 mb-8 tracking-tighter">Privacy Policy</h1>
        
        <div className="space-y-6 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">1. Introduction</h2>
            <p>Welcome to PaperLab Games Arena. This privacy policy explains how we collect, use, and protect your personal information when you participate in our games and leaderboards during the event.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">2. Information We Collect</h2>
            <p>We only collect the information necessary to operate the Games Arena and maintain the leaderboards. When you register, we collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-zinc-400">
              <li>Your Name / Nickname</li>
              <li>Your Email Address</li>
              <li>Your College / Institution Name</li>
              <li>Your game scores, session timestamps, and device identifiers</li>
              <li>A record of your consent to this policy (timestamp and version)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">3. How We Use Your Information</h2>
            <p>Your information is used exclusively for the following purposes:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1 text-zinc-400">
              <li>To identify you on the public leaderboard (using your Nickname and College).</li>
              <li>To prevent fraudulent or duplicate score submissions.</li>
              <li>To allow event administrators to contact you if you win a prize or require support.</li>
              <li>To analyze overall engagement and participation at the event.</li>
            </ul>
            <p className="mt-2 text-lime-400">We do not sell your personal data or share it with third-party marketers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">4. Data Storage and Security</h2>
            <p>Your data is securely stored using Supabase, our backend service provider. Supabase employs industry-standard security measures to protect your data. Access to your email address and consent records is restricted to authorized event administrators. Only your Nickname and College are visible on the public leaderboard.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">5. Data Retention</h2>
            <p>We retain your data only for as long as necessary to fulfill the purposes outlined in this policy, typically for the duration of the event and a short post-event period for prize distribution and analysis. After this period, personal identifiers may be deleted or anonymized.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">6. Your Rights</h2>
            <p>You have the right to request access to, correction of, or deletion of your personal information. You may also withdraw your consent at any time. However, withdrawing consent or requesting deletion will result in your removal from the leaderboard and disqualify you from any associated prizes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2 uppercase">7. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact the event organizers at:</p>
            <p className="mt-2 text-cyan-400">r3actr@gmail.com</p>
          </section>
          
          <div className="pt-8 mt-8 border-t border-zinc-800 text-xs text-zinc-500 uppercase">
            <p>Effective Date: September 26, 2026</p>
            <p>Consent Version: privacy-v1</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
