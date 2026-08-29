import React, { useEffect, useRef } from 'react';
import {
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { PlannerScenario } from '../types';
import { ScenarioComparer } from './ScenarioComparer';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  scenarioAId?: string;
  scenarioBId?: string;
  onSelectScenarioA?: (id: string) => void;
  onSelectScenarioB?: (id: string) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenarioId,
  scenarioAId,
  scenarioBId,
  onSelectScenarioA,
  onSelectScenarioB,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Trap body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-popout-title"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-7xl h-[94vh] max-h-[94vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 rounded-2xl border border-primary-100 dark:border-primary-800/60 shrink-0">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="compare-popout-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Scenario Comparison &amp; Strategy Scorecard
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-primary-100/70 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2.5 py-0.5 rounded-full border border-primary-200/50 dark:border-primary-800/50 shrink-0">
                  Studio Pop-Out
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Side-by-side plan comparisons, KPI variance tables, pension longevity analysis &amp; stress-test overlays
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div
          ref={contentContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
        >
          <ScenarioComparer
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            scenarioAId={scenarioAId}
            scenarioBId={scenarioBId}
            onSelectScenarioA={onSelectScenarioA}
            onSelectScenarioB={onSelectScenarioB}
            onClose={onClose}
          />
        </div>

        {/* Modal Footer Quick Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">Esc</kbd> to return to Studio mode</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
