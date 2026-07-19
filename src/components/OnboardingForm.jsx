import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Activity, Ruler, Weight, Calendar, Target, Check, X } from 'lucide-react';

const ACTIVITY_LEVELS = [
    { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', factor: 1.2 },
    { id: 'light', label: 'Lightly Active', description: 'Exercise 1-3 times/week', factor: 1.375 },
    { id: 'moderate', label: 'Moderately Active', description: 'Exercise 4-5 times/week', factor: 1.55 },
    { id: 'active', label: 'Very Active', description: 'Intense exercise 6-7 times/week', factor: 1.725 },
    { id: 'extra', label: 'Extra Active', description: 'Very intense exercise daily, or physical job', factor: 1.9 }
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
        goalWeight: '',
        targetDate: '',
        customCalories: '',
        customProteinPercent: '',
        customCarbsPercent: '',
        customFatsPercent: ''
    });

    const handleNext = () => {
        if (step === 3 && formData.goal === 'maintain') {
            handleSubmit();
        } else {
            setStep(prev => prev + 1);
        }
    };
    const handleBack = () => setStep(prev => prev - 1);

    const getMinTargetDate = () => {
        if (!formData.weight || !formData.goalWeight) return new Date().toLocaleDateString('en-CA');
        
        const current = parseFloat(formData.weight);
        const target = parseFloat(formData.goalWeight);
        
        if (isNaN(current) || isNaN(target)) return new Date().toLocaleDateString('en-CA');

        const diff = Math.abs(current - target);
        if (diff === 0) return new Date().toLocaleDateString('en-CA');

        // Max safe rate: 2 lbs/week for loss, 1 lb/week for gain
        let maxRatePerWeek = 2; 
        if (formData.goal === 'gain') maxRatePerWeek = 1;
        
        if (formData.weightUnit === 'kg') {
             maxRatePerWeek = formData.goal === 'gain' ? 0.5 : 1;
        }

        const weeksNeeded = diff / maxRatePerWeek;
        const daysNeeded = Math.ceil(weeksNeeded * 7);
        
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + daysNeeded);
        
        return minDate.toLocaleDateString('en-CA');
    };

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

        // Pass goal weight and target date if lose/gain/custom
        if (formData.goal === 'lose' || formData.goal === 'gain' || formData.goal === 'custom') {
            let goalWeightKg = parseFloat(formData.goalWeight);
            if (formData.weightUnit === 'lbs') {
                goalWeightKg = goalWeightKg * 0.453592;
            }
            data.goalWeight = goalWeightKg;
            data.targetDate = formData.targetDate;
        }

        onComplete(data);
    };

    return (
        <div className="fixed inset-0 z-50 bg-card overflow-y-auto">
            {isEditing && (
                <button
                    onClick={onCancel}
                    className="fixed top-6 right-6 p-2 bg-muted rounded-full text-muted-foreground hover:bg-muted/80 transition-colors z-50"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
            <div className="flex min-h-full flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="w-full max-w-md">
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-training' : 'bg-muted'} ${i === 4 && formData.goal === 'maintain' ? 'hidden' : ''}`} />
                        ))}
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            {step === 1 && (isEditing ? "Update your details" : "Tell us about yourself")}
                            {step === 2 && "How active are you?"}
                            {step === 3 && (formData.goal === 'custom' ? "Set your custom targets" : "What is your goal?")}
                            {step === 4 && "Set your timeline"}
                        </h1>
                        <p className="text-muted-foreground">
                            {step === 1 && "We'll use this to calculate your personalized plan."}
                            {step === 2 && "Be honest! This helps us estimate your daily burn."}
                            {step === 3 && (formData.goal === 'custom' ? "Enter your preferred daily targets." : "We'll adjust your calorie target based on this.")}
                            {step === 4 && "When do you want to reach your goal?"}
                        </p>
                    </div>

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {/* Gender */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'male', label: 'Male' },
                                    { value: 'female', label: 'Female' },
                                    { value: 'unspecified', label: 'Prefer not to say' }
                                ].map(g => (
                                    <button
                                        key={g.value}
                                        onClick={() => setFormData({ ...formData, gender: g.value })}
                                        className={`p-4 rounded-2xl border-2 font-bold transition-all ${formData.gender === g.value
                                                ? 'border-training bg-training-soft text-training'
                                                : 'border-border text-muted-foreground hover:border-training/20'
                                            }`}
                                    >
                                        {g.label}
                                    </button>
                                ))}
                            </div>

                            {/* Age */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">Age</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
                                    <input
                                        type="number"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground"
                                        placeholder="Years"
                                    />
                                </div>
                            </div>

                            {/* Weight */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">Weight (lbs)</label>
                                <div className="relative">
                                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
                                    <input
                                        type="number"
                                        value={formData.weight}
                                        onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground"
                                        placeholder="lbs"
                                    />
                                </div>
                            </div>

                            {/* Height */}
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">Height</label>
                                <div className="flex gap-4">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={formData.heightFt}
                                            onChange={e => setFormData({ ...formData, heightFt: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground text-center"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-faint font-medium">ft</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={formData.heightIn}
                                            onChange={e => setFormData({ ...formData, heightIn: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground text-center"
                                            placeholder="0"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-faint font-medium">in</span>
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
                                            ? 'border-training bg-training-soft'
                                            : 'border-border hover:border-training/20'
                                        }`}
                                >
                                    <div className={`font-bold ${formData.activity === level.id ? 'text-training' : 'text-foreground'}`}>
                                        {level.label}
                                    </div>
                                    <div className={`text-sm ${formData.activity === level.id ? 'text-training' : 'text-muted-foreground'}`}>
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
                                            ? 'border-training bg-training-soft'
                                            : 'border-border hover:border-training/20'
                                        }`}
                                >
                                    <div className={`font-bold ${formData.goal === goal.id ? 'text-training' : 'text-foreground'}`}>
                                        {goal.label}
                                    </div>
                                    <div className={`text-sm ${formData.goal === goal.id ? 'text-training' : 'text-muted-foreground'}`}>
                                        {goal.description}
                                    </div>
                                </button>
                            ))}

                            {/* Custom Inputs */}
                            {formData.goal === 'custom' && (
                                <div className="mt-6 space-y-4 animate-in slide-in-from-top-4 fade-in">
                                    <div>
                                        <label className="block text-sm font-bold text-foreground mb-1">Daily Calories</label>
                                        <input
                                            type="number"
                                            value={formData.customCalories}
                                            onChange={e => setFormData({ ...formData, customCalories: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground"
                                            placeholder="e.g. 2500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1">Protein (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customProteinPercent}
                                                onChange={e => setFormData({ ...formData, customProteinPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-ring outline-none font-bold text-foreground text-sm"
                                                placeholder="30"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1">Carbs (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customCarbsPercent}
                                                onChange={e => setFormData({ ...formData, customCarbsPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-ring outline-none font-bold text-foreground text-sm"
                                                placeholder="35"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1">Fats (%)</label>
                                            <input
                                                type="number"
                                                value={formData.customFatsPercent}
                                                onChange={e => setFormData({ ...formData, customFatsPercent: e.target.value })}
                                                className="w-full px-3 py-2 rounded-xl border-2 border-border focus:border-ring outline-none font-bold text-foreground text-sm"
                                                placeholder="35"
                                            />
                                        </div>
                                    </div>
                                    {/* Total Percentage Indicator */}
                                    <div className={`text-center text-xs font-medium transition-colors ${
                                        (parseInt(formData.customProteinPercent || 0) + 
                                         parseInt(formData.customCarbsPercent || 0) + 
                                         parseInt(formData.customFatsPercent || 0)) === 100 
                                            ? 'text-protein-text' 
                                            : 'text-destructive-text'
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

                    {/* Step 4: Timeline (Lose/Gain/Custom) */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 fade-in">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">Goal Weight ({formData.weightUnit})</label>
                                <div className="relative">
                                    <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
                                    <input
                                        type="number"
                                        value={formData.goalWeight}
                                        onChange={e => setFormData({ ...formData, goalWeight: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground"
                                        placeholder={formData.goal === 'lose' ? "e.g. 180" : "e.g. 160"}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">Target Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
                                    <input
                                        type="date"
                                        value={formData.targetDate}
                                        min={getMinTargetDate()}
                                        onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-border focus:border-ring focus:ring-4 focus:ring-ring/10 outline-none font-bold text-foreground"
                                    />
                                </div>
                                {formData.goalWeight && (
                                    <p className="text-xs text-faint mt-2 ml-1">
                                        Minimum date based on safe {formData.goal === 'gain' ? 'gain' : 'loss'} of {formData.goal === 'gain' ? '1' : '2'} {formData.weightUnit}/week
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="mt-8 flex gap-4">
                        {step > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3.5 rounded-xl font-bold text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={step === 4 || (step === 3 && formData.goal === 'maintain') ? handleSubmit : handleNext}
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
                                )) ||
                                (step === 4 && (!formData.goalWeight || !formData.targetDate))
                            }
                            className={`flex-1 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${(step === 1 && (!formData.age || !formData.weight || !formData.heightFt)) ||
                                    (step === 3 && formData.goal === 'custom' && (
                                        !formData.customCalories || 
                                        !formData.customProteinPercent || 
                                        !formData.customCarbsPercent || 
                                        !formData.customFatsPercent ||
                                        (parseInt(formData.customProteinPercent || 0) + 
                                         parseInt(formData.customCarbsPercent || 0) + 
                                         parseInt(formData.customFatsPercent || 0)) !== 100
                                    )) ||
                                    (step === 4 && (!formData.goalWeight || !formData.targetDate))
                                    ? 'bg-muted text-white cursor-not-allowed'
                                    : 'bg-training text-background hover:bg-training/90'
                                }`}
                        >
                            {step === 4 || (step === 3 && formData.goal === 'maintain') ? (
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
