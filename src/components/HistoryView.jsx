'use client';

import React, { useMemo } from 'react';
import { Calendar, Utensils, Image as ImageIcon, Trash2, Edit2 } from 'lucide-react';
import { deleteLog } from '@/lib/api';

export default function HistoryView({ logs, user, onLogDeleted, onEditLog }) {
  const handleDeleteLog = async (logId) => {
    if(!user) return;
    if(confirm('Delete this entry?')) {
      try {
        await deleteLog(logId, user.id);
        if (onLogDeleted) onLogDeleted();
      } catch (e) {
        console.error("Error deleting", e);
      }
    }
  };

  // Group by date and sort descending
  const groupedLogs = useMemo(() => {
    const groups = {};
    logs.forEach(log => {
      const dateObj = new Date(log.date);
      const dateKey = dateObj.toLocaleDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateObj,
          logs: []
        };
      }
      groups[dateKey].logs.push(log);
    });

    return Object.values(groups)
      .sort((a, b) => b.date - a.date)
      .map(group => {
        const isToday = new Date().toLocaleDateString() === group.date.toLocaleDateString();
        const label = isToday ? 'Today' : group.date.toLocaleDateString(undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        return { label, logs: group.logs };
      });
  }, [logs]);

  return (
    <div className="p-6 md:p-0 min-h-full pb-20 md:pb-0">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 md:mb-8">History</h2>
      
      {logs.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-3xl border border-slate-100">
           <Utensils className="w-12 h-12 mb-2 opacity-20" />
           <p>No meals logged yet</p>
         </div>
      ) : (
        <div className="space-y-6">
          {groupedLogs.map(({ label, logs: dayLogs }) => (
            <div key={label}>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 sticky top-0 bg-slate-50 py-2 z-10 backdrop-blur-sm">
                {label}
              </h3>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {dayLogs.map((log, idx) => (
                  <div 
                    key={log.id} 
                    className={`p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors ${
                      idx !== dayLogs.length - 1 ? 'border-b border-slate-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${log.method === 'ai-scan' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                         {log.method === 'ai-scan' ? <ImageIcon className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                       </div>
                       <div>
                         <p className="font-medium text-slate-800">{log.food_item}</p>
                         <p className="text-xs text-slate-400 flex flex-wrap gap-2">
                           <span>{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           {(log.protein || log.carbs || log.fats) && (
                             <>
                               <span className="text-slate-300 hidden sm:inline">•</span>
                               <span className="text-slate-500 text-[10px] flex gap-1">
                                 {log.protein > 0 && <span className="text-blue-600 font-medium">P:{log.protein}</span>}
                                 {log.carbs > 0 && <span className="text-amber-600 font-medium">C:{log.carbs}</span>}
                                 {log.fats > 0 && <span className="text-rose-600 font-medium">F:{log.fats}</span>}
                               </span>
                             </>
                           )}
                         </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 whitespace-nowrap">{log.calories} cal</span>
                      
                      <button 
                        onClick={() => onEditLog(log)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button 
                         onClick={() => handleDeleteLog(log.id)}
                         className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="bg-slate-50 px-4 py-2 flex justify-between items-center text-xs font-medium text-slate-500">
                   <span>Total</span>
                   <span>{dayLogs.reduce((sum, item) => sum + (parseInt(item.calories)||0), 0)} cal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
