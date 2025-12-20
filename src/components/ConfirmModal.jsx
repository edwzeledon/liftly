import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Delete', cancelText = 'Cancel', isDestructive = true, isLoading = false }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-500">{message}</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
