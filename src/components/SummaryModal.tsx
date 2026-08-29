import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  LayoutDashboard,
  Lightbulb,
  FileSpreadsheet,
  TrendingUp,
  Shield,
  Landmark,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection, AppMode } from '../types';
import { PlanInsightsCard } from './PlanInsightsCard';
import { StrategySummaryCard } from './StrategySummaryCard';
import { ProjectionChart } from './ProjectionChart';
import { MonteCarloCard } from './MonteCarloCard';
import { IhtEstatePlanningCard } from './IhtEstatePlanningCard';
import { SummaryCommentsCard } from './SummaryCommentsCard';

export type SummaryModalSubTab =
  | 'all'
  | 'insights'
  | 'strategy_summary'
  | 'projections_chart'
  | 'stress_testing'
  | 'iht_summary'
  | 'comments';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  taxResult: TaxCalculationResult;
  onChange: (updatedProfile: UserProfile) => void;
  onOpenMaximizedSpendModal?: () => void;
  appMode?: AppMode;
  initialSubTab?: SummaryModalSubTab;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({
  isOpen,
  onClose,
  profile,
  pots,
  projections,
  taxResult,
  onChange,
  onOpenMaximizedSpendModal,
  appMode = 'studio',
  initialSubTab = 'all',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SummaryModalSubTab>(initialSubTab);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial sub-tab whenever modal opens or initialSubTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveSubTab(initialSubTab);
    }
  }, [isOpen, initialSubTab]);

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

  // Reset scroll when tab changes
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [activeSubTab]);

  if (!isOpen) return null;

  const tabs: { id: SummaryModalSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'all', label: 'Full Summary', icon: Layers },
    { id: 'insights', label: 'Plan Insights', icon: Lightbulb },
    { id: 'strategy_summary', label: 'Strategy Dashboard', icon: FileSpreadsheet },
    { id: 'projections_chart', label: 'Projections Chart', icon: TrendingUp },
    { id: 'stress_testing', label: 'Stress Testing', icon: Shield },
    { id: 'iht_summary', label: 'IHT Summary', icon: Landmark },
    { id: 'comments', label: 'Guidance Notes', icon: FileText },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-popout-title"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-7xl h-[94vh] max-h-[94vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Modal Header */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary-50 dark:bg-primary-950/80 text-primary-600 dark:text-primary-400 rounded-2xl border border-primary-100 dark:border-primary-800/60 shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="summary-popout-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Executive Summary Dashboard
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-primary-100/70 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2.5 py-0.5 rounded-full border border-primary-200/50 dark:border-primary-800/50 shrink-0">
                  Studio Pop-Out
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Executive summary insights, strategy dashboard, full projections, stress testing &amp; compliance notes
              </p>
            </div>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
              title="Close (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div
          ref={contentContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
        >
          {/* View: All (Complete Executive Suite) */}
          {activeSubTab === 'all' && (
            <div className="space-y-6">
              {/* 1. Plan Insights */}
              <div id="modal-card-plan-insights" className="scroll-mt-4">
                <PlanInsightsCard
                  profile={profile}
                  pots={pots}
                  projections={projections}
                  taxResult={taxResult}
                  onChange={onChange}
                  onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
                />
              </div>

              {/* 2. Strategy Summary */}
              <div id="modal-card-summary-strat" className="scroll-mt-4">
                <StrategySummaryCard
                  profile={profile}
                  pots={pots}
                  taxResult={taxResult}
                  projections={projections}
                  onChange={onChange}
                  onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
                />
              </div>

              {/* 3. Complete Projections Chart */}
              <div id="modal-card-summary-chart" className="scroll-mt-4">
                <ProjectionChart
                  projections={projections}
                  profile={profile}
                  pots={pots}
                  onChange={onChange}
                  showAllCharts={true}
                />
              </div>

              {/* 4. Stress Testing Summary */}
              <div id="modal-card-summary-monte" className="scroll-mt-4">
                <MonteCarloCard
                  profile={profile}
                  pots={pots}
                  taxResult={taxResult}
                  onChange={onChange}
                  showAllScenarios={true}
                  appMode={appMode}
                />
              </div>

              {/* 5. Inheritance Tax Summary */}
              <div id="modal-card-summary-estate" className="scroll-mt-4">
                <IhtEstatePlanningCard
                  profile={profile}
                  projections={projections}
                  onChange={onChange}
                  hideInputs={true}
                />
              </div>

              {/* 6. Summary Comments */}
              <div id="modal-card-summary-comments" className="scroll-mt-4">
                <SummaryCommentsCard profile={profile} taxResult={taxResult} />
              </div>
            </div>
          )}

          {/* View: Plan Insights only */}
          {activeSubTab === 'insights' && (
            <PlanInsightsCard
              profile={profile}
              pots={pots}
              projections={projections}
              taxResult={taxResult}
              onChange={onChange}
              onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
            />
          )}

          {/* View: Strategy Summary Dashboard only */}
          {activeSubTab === 'strategy_summary' && (
            <StrategySummaryCard
              profile={profile}
              pots={pots}
              taxResult={taxResult}
              projections={projections}
              onChange={onChange}
              onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
            />
          )}

          {/* View: Projections Chart only */}
          {activeSubTab === 'projections_chart' && (
            <ProjectionChart
              projections={projections}
              profile={profile}
              pots={pots}
              onChange={onChange}
              showAllCharts={true}
            />
          )}

          {/* View: Stress Testing only */}
          {activeSubTab === 'stress_testing' && (
            <MonteCarloCard
              profile={profile}
              pots={pots}
              taxResult={taxResult}
              onChange={onChange}
              showAllScenarios={true}
              appMode={appMode}
            />
          )}

          {/* View: IHT Summary only */}
          {activeSubTab === 'iht_summary' && (
            <IhtEstatePlanningCard
              profile={profile}
              projections={projections}
              onChange={onChange}
              hideInputs={true}
            />
          )}

          {/* View: Comments & Regulatory Guidance only */}
          {activeSubTab === 'comments' && (
            <SummaryCommentsCard profile={profile} taxResult={taxResult} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 text-xs text-slate-500 dark:text-slate-400">
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
