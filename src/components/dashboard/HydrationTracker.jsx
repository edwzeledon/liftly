import React from 'react';
import { Droplet } from 'lucide-react';

export default function HydrationTracker({ waterIntake = 0, onUpdateWater }) {
  
  const toggleGlass = (index) => {
    // If clicking the current level, decrease by 1 (toggle off). 
    // If clicking a higher level, set to that level (index + 1).
    // If clicking a lower level, set to that level (index + 1).
    
    // Logic: 
    // If I have 3 glasses (indices 0, 1, 2 are filled).
    // Clicking index 2 (3rd glass) -> should probably go to 2.
    // Clicking index 3 (4th glass) -> should go to 4.
    // Clicking index 0 (1st glass) -> should go to 1.
    
    // Let's simplify: Click index `i` sets count to `i + 1`.
    // Unless we are clicking the last filled one, then maybe toggle off?
    // Standard star rating behavior: click i -> set to i+1.
    // If we want to allow clearing, maybe clicking the current max removes it?
    
    const newCount = index + 1 === waterIntake ? index : index + 1;
    onUpdateWater(newCount);
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border h-full flex flex-col justify-center">
      <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 shrink-0">
        <Droplet className="w-5 h-5 text-deficit" />
        Hydration
      </h3>
      
      <div className="flex flex-wrap gap-2 justify-center">
        {[...Array(8)].map((_, i) => (
          <button
            key={i}
            onClick={() => toggleGlass(i)}
            className={`p-2 rounded-xl transition-all duration-300 ${
              i < waterIntake 
                ? 'bg-deficit text-white scale-105' 
                : 'bg-muted text-faint hover:bg-deficit/15 hover:text-deficit'
            }`}
          >
            <Droplet className={`w-5 h-5 ${i < waterIntake ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-faint mt-4 font-medium shrink-0">
        {waterIntake} / 8 Bottles
      </p>
    </div>
  );
}
