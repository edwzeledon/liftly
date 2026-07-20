import React from 'react';
import { cn } from '@/lib/utils';

// Single source for the Liftly mark (was inlined in 6 files).
export default function Logo({ size = 36, className = '' }) {
  const icon = size >= 40 ? 24 : 20;
  return (
    <div className={cn('rounded-lg flex items-center justify-center bg-training', className)} style={{ width: size, height: size }}>
      <svg width={icon} height={icon} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 75 18 H 35 C 22 18, 15 25, 15 38 V 62 C 15 75, 22 82, 35 82 H 65 C 78 82, 85 75, 85 62 V 38" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="56" cy="50" r="14" fill="#FFFFFF" style={{ opacity: 0.25 }} />
        <circle cx="50" cy="50" r="14" fill="#FFFFFF" />
      </svg>
    </div>
  );
}
