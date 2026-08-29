import React, { useState, useRef, useEffect } from 'react';
import { DashboardTab, PlannerScenario } from '../types';
import { ChevronDown, Check, Plus, FolderKanban, Save } from 'lucide-react';

interface HeaderProps {
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  activeTab?: DashboardTab;
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
  onStartTour?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onNewScenario,
  onSaveScenario,
  onOpenManagePlans,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-30 shadow-xs min-h-[3.5rem] h-auto py-1.5 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
        
        {/* Active Plan Selector Dropdown with Save Action */}
        <div className="relative py-1 min-w-0 flex-1 max-w-xl flex items-center gap-2" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all text-left w-full sm:w-auto cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-emerald-600 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center text-white dark:text-emerald-400 shadow-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 shrink-0 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Active Plan
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold">•</span>
              <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
                {activeScenario ? activeScenario.name : 'Select a Plan'}
              </span>
            </div>

            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Save Action Icon Button */}
          {onSaveScenario && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSaveScenario();
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 transition-all shadow-2xs hover:shadow-xs cursor-pointer group shrink-0"
              title={`Save Plan ("${activeScenario ? activeScenario.name : 'Active Plan'}")`}
              aria-label="Save active plan"
            >
              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline text-xs font-bold">Save</span>
            </button>
          )}

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Switch Active Plan ({scenarios.length})
                </span>
                {onOpenManagePlans && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenManagePlans();
                    }}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FolderKanban className="w-3 h-3" />
                    Manage All
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                {scenarios.map((s) => {
                  const isActive = s.id === activeScenarioId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        if (onSelectScenario) {
                          onSelectScenario(s.id);
                        }
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800/60'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-medium'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold text-xs">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>Retire Age: {s.profile?.targetRetirementAge ?? 65}</span>
                          <span>•</span>
                          <span>Pots: {s.pots?.length || 0}</span>
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {onNewScenario && (
                <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onNewScenario();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Plan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};



