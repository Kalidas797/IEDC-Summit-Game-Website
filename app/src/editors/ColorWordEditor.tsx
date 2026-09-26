import { motion } from 'framer-motion';
import QuestionsPerGameEditor from '../components/QuestionsPerGameEditor';

interface Props { gameId: string; }

export default function ColorWordEditor({ gameId }: Props) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
      <h3 className="text-xl font-black uppercase tracking-wider">Color/Word Challenge Settings</h3>
      <p className="text-zinc-500 font-mono text-sm">Configure the scoring, rounds, and time limits.</p>

      <QuestionsPerGameEditor 
        gameId={gameId} 
        settingsContentType="color-word-settings" 
        activeContentCount={-1} 
        label="Number of Rounds"
      />
    </motion.div>
  );
}
