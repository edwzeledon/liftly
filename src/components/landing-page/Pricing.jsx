import React from 'react';
import { Check } from 'lucide-react';

const PricingCard = ({ title, price, features, recommended, onSelect }) => (
  <div className={`relative p-8 bg-card rounded-2xl border ${recommended ? 'border-indigo-600 scale-105 z-10' : 'border-border '} flex flex-col`}>
    {recommended && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">
        Most Popular
      </div>
    )}
    <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
    <div className="mb-6">
      <span className="text-4xl font-bold text-foreground">${price}</span>
      <span className="text-muted-foreground">/month</span>
    </div>
    <ul className="space-y-4 mb-8 flex-1">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
          <Check className="w-5 h-5 text-training-text shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
    <button
      onClick={onSelect}
      className={`w-full py-3 rounded-xl font-bold transition-all ${
        recommended
          ? 'bg-indigo-600 text-white hover:bg-indigo-700 '
          : 'bg-muted text-foreground hover:bg-muted/80'
      }`}
    >
      Get Started
    </button>
  </div>
);

export default function Pricing({ onGetStarted }) {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Start tracking your nutrition journey today. No hidden fees, cancel anytime.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          <PricingCard 
            title="Free" 
            price="0" 
            features={[
              "Manual Food Logging",
              "Basic Calorie Tracking",
              "7-Day History",
              "Community Support"
            ]}
            onSelect={onGetStarted}
          />
          <PricingCard 
            title="Pro" 
            price="9" 
            recommended={true}
            features={[
              "Unlimited AI Food Scans",
              "Macro Tracking (Protein, Carbs, Fats)",
              "Personalized AI Meal Suggestions",
              "Unlimited History",
              "Priority Support"
            ]}
            onSelect={onGetStarted}
          />
          <PricingCard 
            title="Team" 
            price="29" 
            features={[
              "Everything in Pro",
              "Family/Group Sharing",
              "Coach Dashboard",
              "Export Data Reports",
              "API Access"
            ]}
            onSelect={onGetStarted}
          />
        </div>
      </div>
    </section>
  );
}
