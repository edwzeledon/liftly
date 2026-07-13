'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AuthScreen from '../AuthScreen';

export default function AuthView({ onBack }) {
  const reduce = useReducedMotion();
  return (
    <motion.div key="auth" initial={{ opacity: 0, y: reduce ? 0 : 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : 16 }} transition={{ duration: 0.25 }}
      className="relative z-10 h-dvh flex flex-col">
      {/* Top row: AuthView owns its top bar — Back (left) + logo (right). The landing nav is hidden while auth is open. */}
      <div className="flex items-center justify-between p-4 pt-6">
        <button onClick={onBack} aria-label="Back to landing"
          className="flex items-center gap-2 min-h-11 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <button onClick={onBack} aria-label="Liftly — back to landing"
          className="flex items-center gap-2 min-h-11 px-2 cursor-pointer hover:bg-muted/50 rounded-xl transition-colors">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600">
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#EBE9E4" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="56" cy="50" r="14" fill="#EBE9E4" style={{ opacity: 0.25 }} />
              <circle cx="50" cy="50" r="14" fill="#EBE9E4" />
            </svg>
          </div>
          <span className="text-xl font-bold text-training-text">Liftly</span>
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
