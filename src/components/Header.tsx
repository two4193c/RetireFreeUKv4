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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-30 shadow-xs min-h-[3.5rem] h-auto py-1.5 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
        
        {/* Active Plan Title Bar */}
        <div className="flex items-center gap-2.5 py-1 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-white dark:text-emerald-400 shadow-xs shrink-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 dark:bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 shrink-0 bg-emerald-100 dark:bg-emerald-950/80 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Active Plan
            </span>
            <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight break-words min-w-0">
              {activeScenario ? activeScenario.name : 'No Active Plan'}
            </h1>
          </div>
        </div>

      </div>
    </header>
  );
};



