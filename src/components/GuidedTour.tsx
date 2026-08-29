import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  theme?: 'light' | 'dark';
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ run, onFinish, theme = 'dark' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
      const steps = [
    {
      target: 'body',
      title: 'Welcome to RetireFree UK!',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      content: 'Let\'s take a quick interactive tour to show you how to build your perfect retirement plan. Click Next to begin.',
    },
    {
      target: 'card-inputs-couple',
      title: 'Step 1: Planning Mode',
      titleColor: 'text-violet-600 dark:text-violet-400',
      content: 'Toggle between Single Planning or Couple Planning. In Couple Mode, you can track joint incomes, spousal allowances, and shared pots.',
    },
    {
      target: 'card-inputs-profile',
      title: 'Step 2: Your Profile',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      content: 'Enter your age, salary, and target retirement age. These form the foundation of your projection.',
    },
    {
      target: 'card-inputs-pots',
      title: 'Step 3: Investment Pots',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      content: 'Add your current ISA, Pension (SIPP/Workplace), and Cash balances here. You can also edit growth rates.',
    },
    {
      target: 'card-strat-planner',
      title: 'Step 4: Strategy & Income',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      content: 'Set your desired retirement income target, choose a drawdown strategy (e.g., Tax-Free Bracket fill), and model state pensions.',
    },
    {
      target: 'card-proj-chart',
      title: 'Step 5: The Projection',
      titleColor: 'text-amber-600 dark:text-amber-400',
      content: 'Watch your wealth grow! See exactly when you might run out of money, or how large your estate will be at age 100.',
    }
  ];

  useEffect(() => {
    if (!run) {
      setCurrentStep(0);
      return;
    }

    // Scroll to the current target
    const currentTarget = steps[currentStep].target;
    if (currentTarget !== 'body') {
      const element = document.getElementById(currentTarget);
      if (element) {
        // Add a temporary highlight class
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-100', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
        
        return () => {
          element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-100', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
        };
      }
    }
  }, [run, currentStep]);

  if (!run) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <>
      {/* Dim Overlay Removed to allow interaction */}
      
      {/* Floating Tour Modal */}
      <div className="fixed bottom-6 right-6 sm:bottom-12 sm:right-12 w-[90%] max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] animate-in slide-in-from-bottom-8 fade-in duration-300 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Map className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Guided Tour ({currentStep + 1}/{steps.length})
            </span>
          </div>
          <button 
            onClick={onFinish}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <h3 className={`text-lg font-extrabold ${step.titleColor}`}>
            {step.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.content}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onFinish}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1"
          >
            Skip Tour
          </button>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md transition-all"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
