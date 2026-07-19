import React, { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import CountUp from './CountUp';
import { useModalBehavior } from '@/hooks/useModalBehavior';

const DualRing = ({ protein, proteinGoal, calories, calorieGoal, baseCalorieGoal, onEditProtein }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const outer = { r: 42, w: 9 }; // protein
  const inner = { r: 31, w: 5 }; // calories
  const ring = (r) => 2 * Math.PI * r;
  const pct = (v, m) => Math.min(Math.max(v / (m || 1), 0), 1);
  const offset = (r, v, m) => ring(r) - (mounted ? pct(v, m) : 0) * ring(r);
  // ghost notch: marks the base (rest-day) goal position on the calorie ring
  const notchAngle = pct(baseCalorieGoal, calorieGoal) * 360 - 90;

  return (
    <div className="relative w-64 h-64 md:w-72 md:h-72 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} className="stroke-muted" stroke="currentColor" />
        <circle cx="50" cy="50" r={outer.r} fill="none" strokeWidth={outer.w} strokeLinecap="round"
          stroke="var(--color-protein)" strokeDasharray={ring(outer.r)} strokeDashoffset={offset(outer.r, protein, proteinGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} className="stroke-muted" stroke="currentColor" />
        <circle cx="50" cy="50" r={inner.r} fill="none" strokeWidth={inner.w} strokeLinecap="round"
          stroke="var(--color-ring-calorie)" strokeDasharray={ring(inner.r)} strokeDashoffset={offset(inner.r, calories, calorieGoal)}
          className="transition-all duration-700 ease-out motion-reduce:transition-none" />
        {baseCalorieGoal !== calorieGoal && (
          /* Invariant: notch must sit at the base-goal fraction along the calorie arc; the arc starts at 12 o'clock (svg -rotate-90), and this line is drawn at svg-top, so it needs rotate(notchAngle + 180). */
          <line x1="50" y1={50 - inner.r - inner.w / 2} x2="50" y2={50 - inner.r + inner.w / 2}
            stroke="var(--color-ring-notch)" strokeWidth="1.5" transform={`rotate(${notchAngle + 180} 50 50)`} />
        )}
      </svg>
      <button onClick={onEditProtein}
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-protein"
        aria-label={`Protein ${protein} of ${proteinGoal} grams. Edit goal.`}>
        <CountUp value={protein} className="font-display text-6xl md:text-7xl font-black text-foreground tabular-nums leading-none" />
        <span className="text-sm font-semibold text-protein-text tabular-nums">/ {proteinGoal} g protein</span>
        <span className="text-sm text-muted-foreground tabular-nums mt-1">{calories} / {calorieGoal} kcal · {Math.max(0, calorieGoal - calories)} left</span>
      </button>
    </div>
  );
};

const MacroBar = ({ label, value, max, barClass, onClick }) => (
  <button onClick={onClick} className="flex-1 text-left group" aria-label={`${label} ${value} of ${max} grams. Edit goal.`}>
    <div className="flex justify-between text-xs font-semibold mb-1">
      <span className="text-muted-foreground group-hover:text-foreground">{label}</span>
      <span className="text-faint tabular-nums">{value} / {max} g</span>
    </div>
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${barClass} transition-all duration-700 motion-reduce:transition-none`}
        style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }} />
    </div>
  </button>
);

function DailyProgress({ caloriesToday, dailyGoal, macroGoals, todaysLogs, onUpdateGoal, streak = 0, streakStatus = 'broken', trainingDay = false, calorieOffset = 0, trainingOffset = 250, offsetSkipped = false, onToggleBumpSkip }) {
  const [editingGoal, setEditingGoal] = useState(null);
  const [tempGoalValue, setTempGoalValue] = useState('');
  const [showBumpPopover, setShowBumpPopover] = useState(false);
  const bumpRef = useRef(null);
  const bumpTriggerRef = useRef(null);

  // Goal-editor overlay: Escape-to-close, scroll lock, focus capture/restore.
  // The training-bump popover below has its own Escape/outside-click effect, but
  // the two are mutually exclusive — opening the editor from the popover's Adjust
  // button first sets showBumpPopover=false, so the popover's keydown listener is
  // unregistered before this one runs. No Escape double-handling can occur.
  const { closeRef: goalCloseRef } = useModalBehavior(!!editingGoal, () => setEditingGoal(null));

  // Close the training-bump popover on outside click or Escape
  useEffect(() => {
    if (!showBumpPopover) return;
    const handleClick = (e) => {
      if (bumpRef.current && !bumpRef.current.contains(e.target)) {
        setShowBumpPopover(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowBumpPopover(false);
        bumpTriggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBumpPopover]);

  // Calculate Macros
  const macros = todaysLogs.reduce((acc, log) => ({
    protein: acc.protein + (parseInt(log.protein) || 0),
    carbs: acc.carbs + (parseInt(log.carbs) || 0),
    fats: acc.fats + (parseInt(log.fats) || 0)
  }), { protein: 0, carbs: 0, fats: 0 });

  // Default goals if not provided
  const currentGoals = {
    calories: dailyGoal,
    protein: macroGoals?.protein || Math.round((dailyGoal * 0.3) / 4),
    carbs: macroGoals?.carbs || Math.round((dailyGoal * 0.4) / 4),
    fats: macroGoals?.fats || Math.round((dailyGoal * 0.3) / 9)
  };

  // Rest-day offset is intentionally not applied here; if a rest-offset UI is ever added, apply calorieOffset unconditionally to match the budget math in page.jsx/Dashboard.jsx.
  const effectiveCalorieGoal = currentGoals.calories + (trainingDay ? calorieOffset : 0);

  const handleStartEdit = (type, value) => {
    setEditingGoal(type);
    setTempGoalValue(value.toString());
  };

  // (Body scroll lock for the goal editor is now handled by useModalBehavior.)

  const handleSaveGoal = () => {
    if (editingGoal === 'calories') {
      onUpdateGoal({ dailyGoal: parseInt(tempGoalValue) });
    } else if (editingGoal === 'trainingOffset') {
      onUpdateGoal({ trainingDayOffset: parseInt(tempGoalValue) });
    } else {
      onUpdateGoal({ [`${editingGoal}Goal`]: parseInt(tempGoalValue) });
    }
    setEditingGoal(null);
  };

  const editLabel = editingGoal === 'trainingOffset' ? 'training bump' : editingGoal;

  return (
    <div className="px-6 pt-2 pb-6 md:px-0 relative">
      <div className="mb-6">
        {/* Status row: training pill (or Rest day) on the left, streak chip on the right */}
        <div className="flex items-center justify-between mb-4">
          {(trainingDay || offsetSkipped) ? (
            <div ref={bumpRef} className="relative inline-block">
              <button
                ref={bumpTriggerRef}
                onClick={() => setShowBumpPopover((v) => !v)}
                aria-expanded={showBumpPopover}
                aria-haspopup="dialog"
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  trainingDay
                    ? 'bg-training-soft text-training border-training-soft-border'
                    : 'bg-muted text-faint border-border'
                }`}
              >
                {trainingDay ? `Training day +${calorieOffset}` : 'Training bump off (+0)'}
              </button>
              {showBumpPopover && (
                <div role="dialog" aria-label="Training bump options"
                  className="absolute top-full left-0 mt-2 bg-card rounded-2xl border border-border p-4 w-64 z-20">
                  <p className="text-xs text-muted-foreground mb-3">
                    Training days adjust your calorie target. Base goal stays marked on the ring.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowBumpPopover(false); handleStartEdit('trainingOffset', trainingOffset); }}
                      className="flex-1 py-2 text-xs font-bold bg-muted rounded-xl text-muted-foreground hover:bg-muted/80 transition-colors">
                      Adjust
                    </button>
                    <button
                      onClick={() => { setShowBumpPopover(false); onToggleBumpSkip && onToggleBumpSkip(); }}
                      className="flex-1 py-2 text-xs font-bold bg-training text-background rounded-xl hover:bg-training/90 transition-colors">
                      {trainingDay ? 'Skip today' : 'Re-apply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <span className="text-faint text-xs">Rest day</span>
          )}
          {streak > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border animate-in fade-in slide-in-from-right-4 ${
              streakStatus === 'safe'
                ? 'bg-streak-soft border-streak-soft-border'
                : 'bg-muted border-border'
            }`}>
              <Flame className={`w-5 h-5 ${
                streakStatus === 'safe' ? 'text-streak fill-streak' : 'text-faint fill-faint'
              }`} />
              <span className={`font-bold text-lg ${
                streakStatus === 'safe' ? 'text-streak' : 'text-faint'
              }`}>{streak}</span>
            </div>
          )}
        </div>

        {streakStatus === 'at_risk' && streak > 0 && (
          <p className="text-xs font-medium text-destructive-text mb-4">
            Log food or train today to keep your {streak} day streak!
          </p>
        )}

        <DualRing
          protein={macros.protein} proteinGoal={currentGoals.protein}
          calories={caloriesToday} calorieGoal={effectiveCalorieGoal} baseCalorieGoal={currentGoals.calories}
          onEditProtein={() => handleStartEdit('protein', currentGoals.protein)}
        />
        <div className="flex gap-6 mt-6">
          <MacroBar label="Carbs" value={macros.carbs} max={currentGoals.carbs} barClass="bg-carb"
            onClick={() => handleStartEdit('carbs', currentGoals.carbs)} />
          <MacroBar label="Fats" value={macros.fats} max={currentGoals.fats} barClass="bg-fat"
            onClick={() => handleStartEdit('fats', currentGoals.fats)} />
        </div>
        <div className="mt-3">
          <button onClick={() => handleStartEdit('calories', currentGoals.calories)}
            className="text-xs font-semibold text-faint hover:text-muted-foreground">
            Edit calorie goal
          </button>
        </div>
      </div>

      {/* Edit Goal Overlay */}
      {editingGoal && (
        <div className="fixed inset-0 z-100 bg-card/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setEditingGoal(null)}>
            <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-foreground mb-2 text-center capitalize">Update {editLabel}{editingGoal === 'trainingOffset' ? '' : ' Goal'}</h3>
                <p className="text-faint text-sm text-center mb-6">
                  {editingGoal === 'trainingOffset' ? 'Extra calories added on training days' : 'Enter your new daily target'}
                </p>

                <div className="flex gap-3">
                    <label className="sr-only" htmlFor="goal-input">Enter {editLabel} goal</label>
                    <input
                        ref={goalCloseRef}
                        id="goal-input"
                        type="number"
                        value={tempGoalValue}
                        onChange={e => setTempGoalValue(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-2xl border-2 border-training-soft-border text-2xl font-bold text-center text-foreground focus:border-ring focus:ring-4 focus:ring-ring/20 outline-none transition-all"
                        placeholder="0"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                    />
                </div>
                <div className="flex gap-3 mt-4">
                    <button onClick={() => setEditingGoal(null)} className="flex-1 py-3 bg-muted text-muted-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSaveGoal} disabled={Number.isNaN(parseInt(tempGoalValue))} className={`flex-1 py-3 font-bold rounded-xl transition-colors ${Number.isNaN(parseInt(tempGoalValue)) ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-40' : 'bg-training text-background hover:bg-training/90'}`}>
                        Save
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Memoized: the ring is the heaviest static subtree on Today; stable props
// mean action-sheet/toast state changes no longer re-render it.
export default React.memo(DailyProgress);
