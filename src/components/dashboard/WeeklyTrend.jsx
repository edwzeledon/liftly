import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

export default function WeeklyTrend({ weeklyData, dailyGoal }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          Weekly Trend
        </h3>
      </div>
      <div className="flex items-stretch justify-between h-48 gap-4 relative">
        {/* Goal Line */}
        <div 
          className="absolute left-0 right-0 border-t-2 border-dashed border-slate-300 z-20 pointer-events-none flex items-end justify-end"
          style={{ bottom: '80%' }}
        >
          <span className="text-[10px] text-slate-400 bg-white px-1 -mb-2.5">Goal</span>
        </div>

        {weeklyData.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1 group z-10">
            <div className="w-full relative flex-1 flex flex-col justify-end items-center bg-slate-50 rounded-lg overflow-hidden" title={`${day.calories} calories`}>
              <span className="text-[10px] font-bold text-slate-500 mb-1">
                {day.calories}
              </span>
              <div 
                className={`w-full rounded-t-lg transition-all duration-700 ${
                  day.height > 100 ? 'bg-red-400' : 'bg-indigo-400 group-hover:bg-indigo-500'
                }`}
                style={{ height: isMounted ? `${Math.min(Math.max(day.height * 0.8, 5), 100)}%` : '5%' }}
              ></div>
            </div>
            <span className="text-xs font-medium text-slate-400">{day.dayName}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
