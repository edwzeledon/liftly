import React from 'react';
import { Droplet } from 'lucide-react';

export default function HydrationTracker({ waterIntake = 0, goal = 8, onUpdateWater }) {

  const toggleGlass = (index) => {
    // Star-rating behavior: click index `i` sets count to `i + 1`.
    // Clicking the currently-topmost filled glass toggles it off (count - 1).
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
        {[...Array(goal)].map((_, i) => (
          <button
            key={i}
            onClick={() => toggleGlass(i)}
            aria-label={`Glass ${i + 1}`}
            aria-pressed={i < waterIntake}
            className={`p-2 rounded-xl transition-all duration-300 min-h-11 min-w-11 flex items-center justify-center ${
              i < waterIntake
                ? 'bg-deficit text-background scale-105'
                : 'bg-muted text-faint hover:bg-deficit/15 hover:text-deficit'
            }`}
          >
            <Droplet className={`w-5 h-5 ${i < waterIntake ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-faint mt-4 font-medium shrink-0">
        {waterIntake} / {goal} Glasses
      </p>
    </div>
  );
}
