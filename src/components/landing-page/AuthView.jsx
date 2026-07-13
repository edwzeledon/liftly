'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AuthScreen from '../AuthScreen';

export default function AuthView({ onBack }) {
  return (
    <motion.div key="auth" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.25 }}
      className="relative z-10 h-dvh flex flex-col">
      {/* Top row: back — the nav's logo also exits, this is the explicit affordance */}
      <div className="flex items-center p-4 pt-6">
        <button onClick={onBack} aria-label="Back to landing"
          className="flex items-center gap-2 min-h-11 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
      </div>
      {/* Keyboard-safety valve: no scroll at rest; scrolls only when the keyboard shrinks dvh */}
      <div className="flex-1 min-h-0 flex flex-col justify-center overflow-y-auto px-6 pb-safe">
        <div className="w-full max-w-md mx-auto md:bg-card/80 md:backdrop-blur-md md:border md:border-border md:rounded-2xl md:p-8">
          <AuthScreen embedded={true} compact={true} />
        </div>
      </div>
    </motion.div>
  );
}
