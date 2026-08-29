import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Map } from 'lucide-react';

interface GuidedTourProps {
  run: boolean;
  onFinish: () => void;
  theme?: 'light' | 'dark';
  onSetTab?: (tab: any) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ run, onFinish, theme = 'dark', onSetTab }) => {
    const [currentStep, setCurrentStep] = useState(0);
  
  // Start near the top-left (e.g. 24px padding)
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number, startY: number, startPosX: number, startPosY: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragRef.current || !modalRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    let newX = dragRef.current.startPosX + dx;
    let newY = dragRef.current.startPosY + dy;

    // Constrain to window bounds
    const rect = modalRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };
  
          const steps = [
    {
      target: 'body',
      tab: 'inputs',
      title: 'Welcome to RetireFree UK!',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      content: 'Let\'s take a quick interactive tour to show you how to build your perfect retirement plan. Click Next to begin.',
    },
    {
      target: 'card-inputs-couple',
      tab: 'inputs',
      title: 'Step 1: Planning Mode',
      titleColor: 'text-violet-600 dark:text-violet-400',
      content: 'Toggle between Single Planning or Couple Planning. In Couple Mode, you can track joint incomes, spousal allowances, and shared pots.',
    },
    {
      target: 'card-inputs-profile',
      tab: 'inputs',
      title: 'Step 2: Your Profile',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      content: 'Enter your age, salary, and target retirement age. These form the foundation of your projection.',
    },
    {
      target: 'card-inputs-pots',
      tab: 'inputs',
      title: 'Step 3: Investment Pots',
      titleColor: 'text-emerald-600 dark:text-emerald-400',
      content: 'Add your current ISA, Pension (SIPP/Workplace), and Cash balances here. You can also edit growth rates.',
    },
    {
      target: 'card-inputs-oneoff',
      tab: 'inputs',
      title: 'Step 4: Contributions',
      titleColor: 'text-teal-600 dark:text-teal-400',
      content: 'Schedule specific one-off contributions into your investment pots over time.',
    },
    {
      target: 'card-inputs-dbpension',
      tab: 'inputs',
      title: 'Step 5: DB Pensions',
      titleColor: 'text-blue-600 dark:text-blue-400',
      content: 'Add any Defined Benefit (Final Salary) pensions you are entitled to, including their payment age and inflation linking.',
    },
    {
      target: 'card-inputs-fixedincome',
      tab: 'inputs',
      title: 'Step 6: Fixed Income',
      titleColor: 'text-cyan-600 dark:text-cyan-400',
      content: 'Include rental properties, annuities, side-hustles, or any other fixed income streams you anticipate in retirement.',
    },
    {
      target: 'card-strat-phases',
      tab: 'strategy',
      title: 'Step 7: Income Requirements',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      content: 'Model variable spending needs over time by setting up specific spending phases like "Go-Go", "Slow-Go", and "No-Go" years.',
    },
    {
      target: 'card-strat-planner',
      tab: 'strategy',
      title: 'Step 8: Strategy & Drawdown',
      titleColor: 'text-indigo-600 dark:text-indigo-400',
      content: 'Choose how your wealth is drawn down (e.g., Tax-Free Bracket fill), and configure your state pension rules.',
    },
    {
      target: 'card-proj-chart',
      tab: 'projections',
      title: 'Step 9: The Projection',
      titleColor: 'text-amber-600 dark:text-amber-400',
      content: 'Watch your wealth grow! See exactly when you might run out of money, or how large your estate will be at age 100.',
    }
  ];

      useEffect(() => {
    if (!run) {
      setCurrentStep(0);
      return;
    }

    const step = steps[currentStep];

    // Change tab if needed (and available)
    if (step.tab && onSetTab) {
      onSetTab(step.tab);
    }

    // Scroll to the current target after a short delay to allow tab render
    const currentTarget = step.target;
    if (currentTarget !== 'body') {
      const timerId = setTimeout(() => {
        const element = document.getElementById(currentTarget);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-100', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
        }
      }, 100);

      return () => {
        clearTimeout(timerId);
        const element = document.getElementById(currentTarget);
        if (element) {
          element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-4', 'ring-offset-slate-100', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
        }
      };
    }
  }, [run, currentStep, onSetTab]);

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
            <div 
        ref={modalRef}
        className="fixed w-[90%] max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[9999] animate-in slide-in-from-top-8 fade-in duration-300 flex flex-col overflow-hidden"
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      >
        
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
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
