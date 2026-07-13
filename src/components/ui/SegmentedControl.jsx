'use client';
import React, { useRef } from 'react';

export default function SegmentedControl({ options, value, onChange, className = '' }) {
  const refs = useRef([]);
  const idx = options.findIndex((o) => o.value === value);
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = e.key === 'ArrowRight' ? (idx + 1) % options.length : (idx - 1 + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" onKeyDown={onKeyDown} className={`bg-muted p-1 rounded-xl inline-flex gap-1 ${className}`}>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => (refs.current[i] = el)}
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 min-h-11 text-xs font-bold rounded-lg transition-colors ${
            o.value === value ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
