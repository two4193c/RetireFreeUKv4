import React from 'react';
import { PlannerScenario } from '../types';

interface HeaderProps {
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onOpenGuide?: () => void;
  onOpenAiAdvisor?: () => void;
  // Optional legacy props to keep backwards compatibility
  onSelectScenario?: (id: string) => void;
  onNewScenario?: () => void;
  onSaveScenario?: () => void;
  onDeleteScenario?: (id: string) => void;
  onRequestDeleteScenario?: (id: string, name: string) => void;
  onOpenManagePlans?: () => void;
  onImportScenarios?: (scenarios: PlannerScenario[]) => void;
  onOpenMaximizedSpendModal?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenarios,
  activeScenarioId,
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-30 shadow-xs h-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        
        {/* Brand / Logo & Active Plan */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>RetireFree</span>
              <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-4 decoration-2">UK</span>
            </h1>
          </div>

          {activeScenario && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Active Plan:</span>
              <span className="truncate max-w-[220px] font-extrabold">{activeScenario.name}</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};


