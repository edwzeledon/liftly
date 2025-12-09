import React, { useState } from 'react';
import { ChevronLeft, Search, Plus, Loader2 } from 'lucide-react';

export default function PickerView({ onBack, onAddExercise, exercises = [] }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use passed exercises or empty array
  const loading = exercises.length === 0;

  const categories = ['All', ...new Set(exercises.map(ex => ex.category))];

  const filteredExercises = () => {
    let filtered = exercises;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(ex => ex.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-slate-800">Add Exercise</h2>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none font-medium text-slate-800"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pb-4">
            {filteredExercises().map((ex) => (
              <button
                key={ex.id || ex.name}
                onClick={() => onAddExercise(ex)}
                className="w-full p-4 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:border-indigo-200 hover:shadow-sm transition-all group text-left"
              >
                <div>
                  <h4 className="font-bold text-slate-700">{ex.name}</h4>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ex.category}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
