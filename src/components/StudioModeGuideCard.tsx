import React from 'react';
import {
  Sparkles,
  Layers,
  LayoutDashboard,
  ArrowRightLeft,
  BookOpen,
  Sliders,
  TrendingUp,
  Shield,
  FileText,
  FileSpreadsheet,
  Zap,
  ExternalLink,
  Keyboard,
  CheckCircle2,
  Maximize2,
  Columns,
  Lightbulb,
} from 'lucide-react';
import { AppMode } from '../types';

interface StudioModeGuideCardProps {
  appMode?: AppMode;
  onToggleAppMode?: (mode: AppMode) => void;
}

export const StudioModeGuideCard: React.FC<StudioModeGuideCardProps> = ({
  appMode,
  onToggleAppMode,
}) => {
  return (
    <div
      id="card-doc-studioguide"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-6">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black tracking-wide text-xs uppercase mb-1">
          <Columns className="w-4 h-4" />
          <span>Workspace Architecture &amp; Dual-Pane Workflow</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Studio Mode Workspace Guide
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed mt-1">
              Studio Mode is an adviser-grade, dual-pane financial modeling environment. It combines all parameter inputs and live real-time visual projections into a continuous side-by-side layout with dedicated pop-out analytical windows.
            </p>
          </div>
          {onToggleAppMode && appMode !== 'studio' && (
            <button
              type="button"
              onClick={() => onToggleAppMode('studio')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Switch to Studio Mode ⚡</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Dual-Pane Overview Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-blue-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-4">
        <div className="flex items-center gap-2.5 font-extrabold text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
          <Columns className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>The Dual-Pane Power Workflow</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Unlike tabbed interfaces that force you to click back and forth between inputs and charts, <strong>Studio Mode</strong> keeps your controls and your live analysis perpetually in view. Any change you make in the left pane instantly recalculates the strategy charts, Monte Carlo probability cones, tax brackets, and portfolio runway in the right pane with zero latency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-1.5">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Left Pane &bull; Parameters &amp; Assumptions
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              18 comprehensive modules in a continuous vertical scroll: core pots, target income, State Pensions, DB schemes, phased retirement, cash buffer, partner finances, property downsizing, spending phases, SAYE share schemes, Gilt ladders, dynamic guardrails, economic assumptions, and April 2027 IHT planning.
            </p>
          </div>

          <div className="p-3.5 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-1.5">
            <span className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
              Right Pane &bull; Live Strategy &amp; Analysis
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time KPI Scorecard, Dynamic Withdrawal Optimiser &amp; Maximised Spend Solver, Drawdown Strategy Planner, Interactive Projections Chart (with customizable asset layers), Monte Carlo stress-testing, and 1-click Formula Excel &amp; PDF exporters.
            </p>
          </div>
        </div>
      </div>

      {/* Pop-Out Windows Feature Highlight */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Maximize2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Dedicated Pop-Out Analytical Windows
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          In Studio Mode, complex analytical dashboards and reference guides open in spacious, focused modal windows without losing your active position in the dual-pane workspace.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Executive Summary */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Executive Summary Dashboard
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Full executive report with tabbed sub-views: Plan Insights, Strategy Dashboard, Projections Chart, Stress-Testing, Inheritance Tax, and HMRC regulatory notes.
            </p>
          </div>

          {/* 2. Scenario Comparison */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Scenario &amp; Variant Comparer
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Side-by-side plan comparisons, KPI variance scorecards, longevity diff tables, and stress-test probability overlays across saved retirement plans.
            </p>
          </div>

          {/* 3. Documentation & Guides */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Documentation &amp; 25+ Guides
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Instant searchable reference manual covering UK tax rules, pension tapering, sequence risk, defined benefits, and gilt arbitrage strategies.
            </p>
          </div>

          {/* 4. Mortgage & Debt */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-amber-400 dark:hover:border-amber-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Mortgage &amp; Debt Amortization
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Detailed loan amortization schedules, early repayment simulations, and pension tax-free lump sum payoff modeling.
            </p>
          </div>

          {/* 5. Genetic Max Spend Solver */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-teal-400 dark:hover:border-teal-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Maximized Spend Solver
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Iterative algorithmic solver calculating your maximum sustainable spending budget up to exact target depletion ages ("Die With Zero").
            </p>
          </div>

          {/* 6. AI Tax Advisor */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                Pop-Out
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              AI Tax &amp; Strategy Advisor
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Automated plan audits evaluating allowance utilization, 60% tax trap mitigation, and sequencing optimizations.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation & Productivity Tips */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-emerald-600" />
          Productivity Shortcuts &amp; Navigation Tips
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              1. Sidebar Jump Navigation
            </span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Click any sub-heading in the left sidebar to smoothly scroll directly to that module in either the left parameters pane or right analysis pane.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              2. Pop-Out External Link Icons
            </span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Sidebar items marked with <ExternalLink className="w-3 h-3 inline text-emerald-500" /> open instantly as focused pop-out overlays, keeping your main dual-pane workspace intact.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              3. Escape Key to Dismiss
            </span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-[10px]">Esc</kbd> at any time to instantly close any open pop-out window and return to Studio Mode.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block">
              4. Mode Switcher
            </span>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Toggle between Basic, Advanced, and Studio modes anytime using the 3-way toggle button at the bottom of the sidebar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
