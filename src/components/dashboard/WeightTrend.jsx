'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Scale, TrendingDown, TrendingUp, Minus, ChevronDown, Plus, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getWeightHistory, updateDailyStats } from '@/lib/api';

export default function WeightTrend({ user }) {
  const [range, setRange] = useState('month'); // 'week', 'month', '90days'
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayWeight, setTodayWeight] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, range]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getWeightHistory(range);
      
      // Generate full date range
      const days = range === 'week' ? 7 : range === 'month' ? 30 : 90;
      const fullHistory = [];
      const today = new Date();
      const dataMap = new Map(data.map(d => [d.date, d.weight]));

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        fullHistory.push({
          date: dateStr,
          weight: dataMap.get(dateStr) || null
        });
      }

      setHistory(fullHistory);
      
      // Check if we have today's weight
      const todayStr = today.toISOString().split('T')[0];
      const todayEntry = data.find(d => d.date === todayStr);
      if (todayEntry) {
        setTodayWeight(todayEntry.weight);
      }
    } catch (error) {
      console.error("Error fetching weight history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeight = async () => {
    if (!todayWeight || !user) return;
    
    const weightVal = parseFloat(todayWeight);
    const todayDate = new Date().toISOString().split('T')[0];

    // Optimistic Update
    setHistory(prev => {
        return prev.map(d => d.date === todayDate ? { ...d, weight: weightVal } : d);
    });
    setIsLogging(false);

    try {
      await updateDailyStats({
        date: todayDate,
        weight: weightVal
      });
      // No refetch needed
    } catch (error) {
      console.error("Error saving weight:", error);
      fetchHistory(); // Revert/Refetch on error
    }
  };

  // Calculate Trend
  const trend = useMemo(() => {
    const validWeights = history.filter(d => d.weight !== null);
    if (validWeights.length < 2) return null;
    
    const first = validWeights[0].weight;
    const last = validWeights[validWeights.length - 1].weight;
    const diff = last - first;
    
    return {
      diff: diff.toFixed(1),
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
      percent: ((diff / first) * 100).toFixed(1)
    };
  }, [history]);

  // Calculate Domain for Recharts
  const yDomain = useMemo(() => {
    const weights = history.filter(d => d.weight !== null).map(d => d.weight);
    if (weights.length === 0) return [0, 100];
    
    const dataMin = Math.min(...weights);
    const dataMax = Math.max(...weights);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const padding = Math.max(avgWeight * 0.2, 20);
    return [
      Math.max(0, Math.floor(dataMin - padding)),
      Math.ceil(dataMax + padding)
    ];
  }, [history]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-800">Weight Trend</h3>
          </div>
          <p className="text-sm text-slate-500">Track your progress over time</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {['week', 'month', '90days'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === r 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {r === 'week' ? '7D' : r === 'month' ? '30D' : '90D'}
            </button>
          ))}
        </div>
      </div>

      {/* Current Weight & Input */}
      <div className="flex items-end gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-800">
              {(() => {
                const valid = history.filter(d => d.weight !== null);
                return valid.length > 0 ? valid[valid.length - 1].weight : '--';
              })()}
            </span>
            <span className="text-sm font-bold text-slate-400">lbs</span>
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-bold mt-1 ${
              trend.direction === 'down' ? 'text-emerald-500' : 
              trend.direction === 'up' ? 'text-rose-500' : 'text-slate-400'
            }`}>
              {trend.direction === 'down' ? <TrendingDown className="w-4 h-4" /> : 
               trend.direction === 'up' ? <TrendingUp className="w-4 h-4" /> : 
               <Minus className="w-4 h-4" />}
              <span>{Math.abs(trend.diff)} lbs ({Math.abs(trend.percent)}%)</span>
              <span className="text-slate-400 font-normal ml-1">in last {range === 'week' ? '7' : range === 'month' ? '30' : '90'} days</span>
            </div>
          )}
          
          {trend?.direction === 'down' && (
            <p className="text-xs text-emerald-600 font-medium mt-2 bg-emerald-50 inline-block px-2 py-1 rounded-lg">
              🎉 Great job! You're making progress!
            </p>
          )}
        </div>

        <div className="relative">
          {isLogging ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300">
              <input
                type="number"
                value={todayWeight}
                onChange={(e) => setTodayWeight(e.target.value)}
                placeholder="0.0"
                className="w-32 px-3 py-2 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-bold text-slate-800"
                autoFocus
              />
              <button 
                onClick={handleSaveWeight}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                <Check className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsLogging(false)}
                className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLogging(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-4 h-4" />
              Log Weight
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full relative min-w-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis 
                domain={yDomain} 
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ stroke: '#e2e8f0' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [`${value} lbs`, 'Weight']}
                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#4f46e5"
                strokeWidth={2}
                connectNulls={true}
                dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }} 
                activeDot={{ r: 6, fill: '#4f46e5' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-2xl">
            <Scale className="w-8 h-8 mb-2 opacity-50" />
            <p>Not enough data yet</p>
            <p className="text-xs">Log your weight to see trends</p>
          </div>
        )}
      </div>
    </div>
  );
}
