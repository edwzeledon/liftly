import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useModalBehavior } from '@/hooks/useModalBehavior';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel', isDestructive = true, isLoading = false }) {
  // Always-rendered by parents (WorkoutView), gated by isOpen — pass the boolean.
  // Escape is loading-guarded like the Cancel button and backdrop: the hook
  // ref-stabilizes this inline arrow (re-captured every render), so it always
  // reads the fresh isLoading closure.
  const { closeRef } = useModalBehavior(isOpen, () => { if (!isLoading) onCancel(); });
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => !isLoading && onCancel()}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-destructive/15 text-destructive-text' : 'bg-training-soft-border text-training-text'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="flex gap-3">
          <button
            ref={closeRef}
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isDestructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
