import React, { useState } from 'react';
import { ChevronLeft, Search, Plus, Loader2 } from 'lucide-react';

export default function PickerView({ onBack, onAddExercise, exercises = [], loading = false, error = null, onRetry }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
        <button onClick={onBack} className="p-2 -ml-2 text-faint hover:text-muted-foreground rounded-full hover:bg-muted">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Add Exercise</h2>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl focus:border-ring focus:ring-2 focus:ring-ring outline-none font-medium text-foreground"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-training-text animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-6">
          <p className="text-muted-foreground text-sm">{error}</p>
          <button
            onClick={onRetry}
            className="px-5 py-2.5 bg-training text-white rounded-xl font-bold hover:bg-training/90 active:scale-95 transition-all"
          >
            Retry
          </button>
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
                    ? 'bg-training text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pb-4">
            {filteredExercises().length === 0 ? (
              <p className="text-center text-faint py-8">No exercises match &lsquo;{searchQuery}&rsquo;</p>
            ) : (
              filteredExercises().map((ex) => (
                <button
                  key={ex.id || ex.name}
                  onClick={() => onAddExercise(ex)}
                  className="w-full p-4 bg-card border border-border rounded-xl flex items-center justify-between hover:border-training-soft-border transition-all group text-left"
                >
                  <div>
                    <h4 className="font-bold text-foreground">{ex.name}</h4>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{ex.category}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-training-soft text-training-text flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5" />
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
