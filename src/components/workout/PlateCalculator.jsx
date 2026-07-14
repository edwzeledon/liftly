import React, { useState } from 'react';
import { X, Check, RotateCcw, Minus, Plus } from 'lucide-react';
import { useModalBehavior } from '@/hooks/useModalBehavior';
import { BARS, PLATES } from '@/lib/units';

const BAR_OPTIONS = { lb: [45, 35, 25, 0], kg: [20, 15, 10, 0] };
const emptyRack = (unit) => Object.fromEntries(PLATES[unit].map((p) => [p, 0]));

export default function PlateCalculator({ isOpen, onClose, onApply, unit = 'lb' }) {
  // Always-rendered (key-remounted) with an isOpen gate — pass the boolean.
  const { closeRef } = useModalBehavior(isOpen, onClose);
  const [barWeight, setBarWeight] = useState(BARS[unit]);
  const [plates, setPlates] = useState(() => emptyRack(unit));

  if (!isOpen) return null;

  const calculateTotal = () => {
    let total = barWeight;
    Object.entries(plates).forEach(([weight, count]) => {
      total += parseFloat(weight) * count * 2; // 2 sides
    });
    return total;
  };

  const updatePlate = (weight, delta) => {
    setPlates(prev => ({
      ...prev,
      [weight]: Math.max(0, prev[weight] + delta)
    }));
  };

  const reset = () => {
    setPlates(emptyRack(unit));
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Plate Calculator</h3>
          <button ref={closeRef} onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Total Display */}
        <div className="bg-primary text-primary-foreground p-6 rounded-2xl mb-6 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-primary-foreground/80 text-xs uppercase font-bold tracking-wider mb-1">Total Weight</p>
            <div className="text-5xl font-bold tracking-tight">
              {calculateTotal()}
              <span className="text-2xl text-primary-foreground/70 ml-1">{unit === 'kg' ? 'kg' : 'lb'}</span>
            </div>
            <p className="text-primary-foreground/70 text-xs mt-2">
               Bar ({barWeight}) + Plates ({calculateTotal() - barWeight})
            </p>
            <p className="text-primary-foreground/70 text-[10px] mt-1">
               *Includes plates for both sides
            </p>
          </div>
          
        </div>

        {/* Bar Weight Toggle */}
        <div className="mb-6">
           <p className="text-xs text-faint uppercase font-bold tracking-wider mb-2 text-center">Bar Weight</p>
           <div className="flex justify-center">
             <div className="bg-muted p-1 rounded-xl flex text-sm font-bold overflow-x-auto max-w-full">
                {BAR_OPTIONS[unit].map(w => (
                  <button
                    key={w}
                    onClick={() => setBarWeight(w)}
                    className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${barWeight === w ? 'bg-card text-foreground' : 'text-faint'}`}
                  >
                    {w} {unit === 'kg' ? 'kg' : 'lb'}
                  </button>
                ))}
             </div>
           </div>
        </div>

        {/* Plates Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {PLATES[unit].map(weight => (
            <div key={weight} className="bg-muted p-3 rounded-xl flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="font-bold text-foreground text-lg">{weight}</span>
                 <span className="text-[10px] text-faint uppercase font-bold">{unit === 'kg' ? 'kg' : 'lb'}</span>
               </div>

               <div className="flex items-center gap-3 bg-card rounded-lg p-1">
                 <button
                   onClick={() => updatePlate(weight, -1)}
                   className="w-8 h-8 flex items-center justify-center text-faint hover:text-training-text hover:bg-training-soft rounded-md transition-colors"
                   disabled={plates[weight] === 0}
                 >
                   <Minus className="w-4 h-4" />
                 </button>
                 <span className="font-bold text-foreground w-4 text-center">{plates[weight]}</span>
                 <button
                   onClick={() => updatePlate(weight, 1)}
                   className="w-8 h-8 flex items-center justify-center text-faint hover:text-training-text hover:bg-training-soft rounded-md transition-colors"
                 >
                   <Plus className="w-4 h-4" />
                 </button>
               </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="p-4 bg-muted text-muted-foreground rounded-xl font-bold hover:bg-muted/80 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onApply(calculateTotal())}
            className="flex-1 py-4 bg-training text-white rounded-xl font-bold hover:bg-training/90 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Use Weight
          </button>
        </div>
      </div>
    </div>
  );
}
