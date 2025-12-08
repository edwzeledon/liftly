import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Activity, Ruler, Weight, Calendar, Target, Check, X } from 'lucide-react';

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', factor: 1.2 },
    { id: 'light', label: 'Lightly Active', description: 'Exercise 1-3 times/week', factor: 1.375 },
    { id: 'moderate', label: 'Moderately Active', description: 'Exercise 4-5 times/week', factor: 1.55 },
    { id: 'active', label: 'Very Active', description: 'Daily exercise or intense exercise 3-4 times/week', factor: 1.725 },
    { id: 'extra', label: 'Extra Active', description: 'Intense exercise daily or physical job', factor: 1.9 }
];

const GOALS = [
    { id: 'lose', label: 'Lose Weight', description: 'Deficit of ~500 calories', adjustment: -500 },
    { id: 'maintain', label: 'Maintain Weight', description: 'Keep current weight', adjustment: 0 },
    { id: 'gain', label: 'Gain Muscle', description: 'Surplus of ~300 calories', adjustment: 300 },
    { id: 'custom', label: 'Custom', description: 'Set your own targets', adjustment: 0 }
];

export default function OnboardingForm({ onComplete, onCancel, isEditing = false }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        gender: 'male',
        age: '',
        height: '', // in cm
        weight: '',
        weightUnit: 'lbs',
        heightUnit: 'ft', // ft/in
        heightFt: '',
        heightIn: '',
        activity: 'sedentary',
        goal: 'maintain',
        customCalories: '',
        customProteinPercent: '',
        customCarbsPercent: '',
        customFatsPercent: ''
    });

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const handleSubmit = () => {
        // Normalize to Metric before sending
        let weightKg = parseFloat(formData.weight);
        if (formData.weightUnit === 'lbs') {
            weightKg = weightKg * 0.453592;
        }

        let heightCm = 0;
        if (formData.heightUnit === 'ft') {
            heightCm = (parseInt(formData.heightFt || 0) * 30.48) + (parseInt(formData.heightIn || 0) * 2.54);
        } else {
            heightCm = parseFloat(formData.height);
        }

        const data = {
            ...formData,
            weight: weightKg,
            height: heightCm,
            originalWeight: parseFloat(formData.weight)
        };

        // Calculate grams from percentages if custom
        if (formData.goal === 'custom') {
            const cals = parseInt(formData.customCalories);
            const p = parseInt(formData.customProteinPercent);
            const c = parseInt(formData.customCarbsPercent);
            const f = parseInt(formData.customFatsPercent);

            data.customProtein = Math.round((cals * (p / 100)) / 4);
            data.customCarbs = Math.round((cals * (c / 100)) / 4);
            data.customFats = Math.round((cals * (f / 100)) / 9);
        }

        onComplete(data);
    };

    return (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
            {isEditing && (
                <button 
                    onClick={onCancel}
                    className="fixed top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors z-50"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
            <div className="flex min-h-full flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="w-full max-w-md">
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-indigo-600' : 'bg-slate-100'}`} />
                        ))}
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">
                            {step === 1 && (isEditing ? "Update your details" : "Tell us about yourself")}
                            {step === 2 && "How active are you?"}
                            {step === 3 && (formData.goal === 'custom' ? "Set your custom targets" : "What is your goal?")}
                        </h1>
                        <p className="text-slate-500">
                            {step === 1 && "We'll use this to calculate your personalized plan."}
                            {step === 2 && "Be honest! This helps us estimate your daily burn."}
                            {step === 3 && (formData.goal === 'custom' ? "Enter your preferred daily targets." : "We'll adjust your calorie target based on this.")}
                        </p>
                    </div>

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Gender */}
                            <div className="grid grid-cols-2 gap-4">
                                {['male', 'female'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                        className={`p-4 rounded-2xl border-2 font-bold capitalize transition-all ${formData.gender === g
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-100 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            {/* Age */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Age</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800"
                                        placeholder="Years"
                                    />
                                </div>
                            </div>

                            {/* Weight */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Weight (lbs)</label>
                                <div className="relative">
                                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="number"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800"
                                        placeholder="lbs"
                                    />
                                </div>
                            </div>

                            {/* Height */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Height</label>
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={formData.heightFt}
                                            onChange={e => setFormData({ ...formData, heightFt: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 text-center"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">ft</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={formData.heightIn}
                                            onChange={e => setFormData({ ...formData, heightIn: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800 text-center"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">in</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Activity */}
                    {step === 2 && (
                        <div className="space-y-3">
                            {ACTIVITY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    onClick={() => setFormData({ ...formData, activity: level.id })}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formData.activity === level.id
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`font-bold ${formData.activity === level.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {level.label}
                                    </div>
                                    <div className={`text-sm ${formData.activity === level.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {level.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Goal */}
                    {step === 3 && (
                        <div className="space-y-3">
                            {GOALS.map(goal => (
                                <button
                                    key={goal.id}
                                    onClick={() => setFormData({ ...formData, goal: goal.id })}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${formData.goal === goal.id
                                            ? 'border-indigo-600 bg-indigo-50'
                                            : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                >
                                    <div className={`font-bold ${formData.goal === goal.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                                        {goal.label}
                                    </div>
                                    <div className={`text-sm ${formData.goal === goal.id ? 'text-indigo-600' : 'text-slate-500'}`}>
                                        {goal.description}
                                    </div>
                                </button>
                            ))}

                            {/* Custom Inputs */}
                            {formData.goal === 'custom' && (
                                <div className="mt-6 space-y-4 animate-in slide-in-from-top-4 fade-in">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Daily Calories</label>
                                        <input
                                            type="number"
                                            value={formData.customCalories}
                                            onChange={e => setFormData({ ...formData, customCalories: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-slate-800"
                                            placeholder="e.g. 2500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Protein (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customProteinPercent}
                                                onChange={e => setFormData({ ...formData, customProteinPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm"
                                                placeholder="30"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Carbs (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customCarbsPercent}
                                                onChange={e => setFormData({ ...formData, customCarbsPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm"
                                                placeholder="35"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Fats (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customFatsPercent}
                                                onChange={e => setFormData({ ...formData, customFatsPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm"
                                                placeholder="35"
                                            />
                                        </div>
                                    </div>
                                    {/* Total Percentage Indicator */}
                                    <div className={`text-center text-xs font-medium transition-colors ${
                                        (parseInt(formData.customProteinPercent || 0) + 
                                         parseInt(formData.customCarbsPercent || 0) + 
                                         parseInt(formData.customFatsPercent || 0)) === 100 
                                            ? 'text-green-600' 
                                            : 'text-red-500'
                                    }`}>
                                        Total: {
                                            (parseInt(formData.customProteinPercent || 0) + 
                                             parseInt(formData.customCarbsPercent || 0) + 
                                             parseInt(formData.customFatsPercent || 0))
                                        }%
                                        {(parseInt(formData.customProteinPercent || 0) + 
                                          parseInt(formData.customCarbsPercent || 0) + 
                                          parseInt(formData.customFatsPercent || 0)) !== 100 && " (Must equal 100%)"}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="mt-8 flex gap-4">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={step === 3 ? handleSubmit : handleNext}
                            disabled={
                                (step === 1 && (!formData.age || !formData.weight || !formData.heightFt)) ||
                                (step === 3 && formData.goal === 'custom' && (
                                    !formData.customCalories || 
                                    !formData.customProteinPercent || 
                                    !formData.customCarbsPercent || 
                                    !formData.customFatsPercent ||
                                    (parseInt(formData.customProteinPercent || 0) + 
                                     parseInt(formData.customCarbsPercent || 0) + 
                                     parseInt(formData.customFatsPercent || 0)) !== 100
                                ))
                            }
                            className={`flex-1 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 ${(step === 1 && (!formData.age || !formData.weight || !formData.heightFt)) ||
                                    (step === 3 && formData.goal === 'custom' && (
                                        !formData.customCalories || 
                                        !formData.customProteinPercent || 
                                        !formData.customCarbsPercent || 
                                        !formData.customFatsPercent ||
                                        (parseInt(formData.customProteinPercent || 0) + 
                                         parseInt(formData.customCarbsPercent || 0) + 
                                         parseInt(formData.customFatsPercent || 0)) !== 100
                                    ))
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                }`}
                        >
                            {step === 3 ? (
                                <>
                                    {isEditing ? "Update Plan" : "Complete Setup"} <Check className="w-5 h-5" />
                                </>
                            ) : (
                                <>
                                    Next Step <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
