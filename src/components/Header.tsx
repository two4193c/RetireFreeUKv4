import React from 'react';
import { ShieldCheck, Sparkles, BookOpen, Layers, Plus, Save, Trash2, ArrowRightLeft, Sun, Moon, Download, Upload, Zap } from 'lucide-react';
import { PlannerScenario } from '../types';

interface HeaderProps {
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onNewScenario: () => void;
  onSaveScenario: () => void;
  onDeleteScenario: (id: string) => void;
  onRequestDeleteScenario?: (id: string, name: string) => void;
  onOpenManagePlans?: () => void;
  onImportScenarios?: (scenarios: PlannerScenario[]) => void;
  onOpenGuide: () => void;
  onOpenAiAdvisor: () => void;
  onOpenMaximizedSpendModal?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onNewScenario,
  onSaveScenario,
  onDeleteScenario,
  onRequestDeleteScenario,
  onOpenManagePlans,
  onImportScenarios,
  onOpenGuide,
  onOpenAiAdvisor,
  onOpenMaximizedSpendModal,
  theme,
  onToggleTheme,
}) => {
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-30 shadow-xs h-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>RetireFree</span>
              <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-4 decoration-2">UK</span>
            </h1>
          </div>
        </div>

        {/* Actions & Scenarios */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
            <span className="hidden xl:inline text-xs font-bold">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* Scenario Picker */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <select
              value={activeScenarioId}
              onChange={(e) => onSelectScenario(e.target.value)}
              aria-label="Select scenario"
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer max-w-[170px] truncate shadow-xs"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={onSaveScenario}
              title="Save current scenario"
              aria-label="Save scenario"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
            </button>

            <button
              onClick={onNewScenario}
              title="Create new scenario"
              aria-label="New scenario"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

            {onOpenManagePlans && (
              <button
                onClick={onOpenManagePlans}
                title="Manage all plans"
                aria-label="Manage plans"
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

            {/* Export JSON Settings */}
            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                  version: 'v2',
                  exportedAt: new Date().toISOString(),
                  scenarios: scenarios
                }, null, 2));
                const downloadAnchor = document.createElement('a');
                const dateStr = new Date().toISOString().split('T')[0];
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `RetireFree_UK_Settings_Backup_${dateStr}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
              }}
              title="Export all settings to JSON file"
              aria-label="Export settings"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Import JSON Settings */}
            <label
              title="Import settings from JSON file"
              aria-label="Import settings"
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const content = evt.target?.result as string;
                      const parsed = JSON.parse(content);
                      let imported: PlannerScenario[] = [];
                      if (Array.isArray(parsed)) {
                        imported = parsed;
                      } else if (parsed && Array.isArray(parsed.scenarios)) {
                        imported = parsed.scenarios;
                      } else if (parsed && parsed.profile && parsed.pots) {
                        imported = [parsed];
                      }
                      if (imported.length > 0 && onImportScenarios) {
                        onImportScenarios(imported);
                      }
                    } catch (err) {
                      console.error('Failed to parse JSON file:', err);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>

            {activeScenario && (
              <button
                onClick={() => {
                  if (onRequestDeleteScenario) {
                    onRequestDeleteScenario(activeScenario.id, activeScenario.name);
                  } else {
                    onDeleteScenario(activeScenario.id);
                  }
                }}
                title="Remove active plan"
                aria-label="Remove active plan"
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tax Rules Guide Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Tax Rules</span>
          </button>

          {/* AI Advisor Button */}
          <button
            onClick={onOpenAiAdvisor}
            className="flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 dark:text-white" />
            <span>AI Tax Advisor</span>
          </button>

        </div>
      </div>
    </header>
  );
};

