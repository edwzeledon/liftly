import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Minus, Plus } from 'lucide-react';

export default function PlateCalculator({ isOpen, onClose, onApply }) {
  const [barWeight, setBarWeight] = useState(45);
  const [plates, setPlates] = useState({
    45: 0,
    35: 0,
    25: 0,
    10: 0,
    5: 0,
    2.5: 0
  });

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setPlates({
        45: 0,
        35: 0,
        25: 0,
        10: 0,
        5: 0,
        2.5: 0
      });
      setBarWeight(45);
    }
  }, [isOpen]);

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
    setPlates({
      45: 0,
      35: 0,
      25: 0,
      10: 0,
      5: 0,
      2.5: 0
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Plate Calculator</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Total Display */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl mb-6 text-center relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Total Weight</p>
            <div className="text-5xl font-bold tracking-tight">
              {calculateTotal()}
              <span className="text-2xl text-slate-500 ml-1">lbs</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">
               Bar ({barWeight}) + Plates ({calculateTotal() - barWeight})
            </p>
            <p className="text-slate-600 text-[10px] mt-1">
               *Includes plates for both sides
            </p>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute -right-5 -top-5 w-32 h-32 bg-indigo-500 rounded-full blur-3xl"></div>
             <div className="absolute -left-5 -bottom-5 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Bar Weight Toggle */}
        <div className="mb-6">
           <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 text-center">Bar Weight</p>
           <div className="flex justify-center">
             <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-bold overflow-x-auto max-w-full">
                {[45, 35, 25, 0].map(w => (
                  <button 
                    key={w}
                    onClick={() => setBarWeight(w)}
                    className={`px-3 py-2 rounded-lg transition-all whitespace-nowrap ${barWeight === w ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400'}`}
                  >
                    {w} lbs
                  </button>
                ))}
             </div>
           </div>
        </div>

        {/* Plates Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[45, 35, 25, 10, 5, 2.5].map(weight => (
            <div key={weight} className="bg-slate-50 p-3 rounded-xl flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="font-bold text-slate-800 text-lg">{weight}</span>
                 <span className="text-[10px] text-slate-400 uppercase font-bold">lbs</span>
               </div>
               
               <div className="flex items-center gap-3 bg-white rounded-lg p-1 shadow-sm">
                 <button 
                   onClick={() => updatePlate(weight, -1)}
                   className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                   disabled={plates[weight] === 0}
                 >
                   <Minus className="w-4 h-4" />
                 </button>
                 <span className="font-bold text-slate-800 w-4 text-center">{plates[weight]}</span>
                 <button 
                   onClick={() => updatePlate(weight, 1)}
                   className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
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
            className="p-4 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onApply(calculateTotal())}
            className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Use Weight
          </button>
        </div>
      </div>
    </div>
  );
}