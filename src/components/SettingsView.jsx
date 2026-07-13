import React from 'react';
import { Settings, RefreshCw } from 'lucide-react';

export default function SettingsView({ onRetakeAssessment }) {
  return (
    <div className="p-6 md:p-8 h-full flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <Settings className="w-10 h-10 text-faint" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">Settings</h2>
      <p className="text-muted-foreground max-w-xs mb-8">
        Manage your account preferences and update your fitness profile.
      </p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={onRetakeAssessment}
          className="w-full py-4 bg-card border border-border rounded-2xl shadow-sm hover:border-training-soft-border hover:shadow-md transition-all flex items-center justify-between px-6 group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-training-soft text-training-text rounded-lg group-hover:bg-training-soft-border transition-colors">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-foreground">Retake Assessment</h3>
              <p className="text-xs text-faint">Update goals & measurements</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
