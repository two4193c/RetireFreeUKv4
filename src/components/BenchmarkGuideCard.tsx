import React from 'react';
import {
  ArrowRightLeft,
  Award,
  Layers,
  Scale,
  CheckCircle2,
  BarChart2,
  Sparkles,
  MapPin,
  FolderKanban,
  Sliders,
  ShieldCheck,
  TrendingUp,
  FileJson,
  Zap,
  Navigation,
  Compass,
} from 'lucide-react';

export const BenchmarkGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-8 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 shadow-xs">
          <ArrowRightLeft className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Scenario Benchmark & Trade-Off Scorecard Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Institutional Comparer
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Side-by-side plan benchmarking and 4D trade-off evaluation across Longevity, Tax, Estate IHT, and Safety Floor
          </p>
        </div>
      </div>

      {/* SECTION 1: Where to Find These Features in RetireFree UK v4 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Where to Find Scenario Benchmarking & Trade-Off Scorecards in the App</span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Scenario benchmarking and trade-off analysis tools are integrated directly across key areas of RetireFree UK v4. Here is exactly where to access them:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Location 1: Main Compare Tab */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 text-xs sm:text-sm">
                <Navigation className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                1. Main Tab Bar: "Compare" Tab
              </span>
              <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-md">
                Top Navigation
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Click the <strong>Compare</strong> tab in the main header navigation (unlocked in <strong>Advanced Mode</strong>). This opens the full side-by-side <strong>Scenario Comparer</strong> dashboard with 4D radar chart overlays, trajectory comparison curves, and detailed delta tables.
            </p>
            <div className="pt-1 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Route: Header Navigation ➔ "Compare" Tab</span>
            </div>
          </div>

          {/* Location 2: Sidebar Navigation */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-2 text-xs sm:text-sm">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                2. Left Sidebar: "Strategy & Comparison"
              </span>
              <span className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-md">
                Sidebar Category 3
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Open the left sidebar and expand <strong>3. Strategy & Comparison</strong>, then click <strong>Plan Comparison</strong> (<code className="bg-blue-100 dark:bg-blue-950 px-1 py-0.5 rounded text-[10px]">card-compare-scenarios</code>). This instantly scrolls down to the side-by-side benchmark card.
            </p>
            <div className="pt-1 text-[11px] font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>Route: Sidebar ➔ 3. Strategy & Comparison ➔ Plan Comparison</span>
            </div>
          </div>

          {/* Location 3: Strategy Planner Shortcut */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center gap-2 text-xs sm:text-sm">
                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                3. Strategy Tab: Drawdown Planner
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md">
                1-Click Generator
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              On the <strong>Strategy</strong> tab inside the <strong>Drawdown Planner</strong> card, click the green <strong>"Compare Plans / Create Strategy Variants"</strong> button. This auto-generates 3 strategy variations (e.g. Baseline vs Conservative vs Early Retirement) and launches the benchmark view.
            </p>
            <div className="pt-1 text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>Route: Strategy Tab ➔ Drawdown Planner ➔ "Compare Plans" Button</span>
            </div>
          </div>

          {/* Location 4: Plan Management & JSON Backups */}
          <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-2 text-xs sm:text-sm">
                <FolderKanban className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                4. Sidebar: "Plan Management"
              </span>
              <span className="text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-md">
                Save / Import
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Under <strong>Plan Management</strong> in the sidebar, create, rename, or duplicate plan variations, or export/import <code className="bg-purple-100 dark:bg-purple-950 px-1 py-0.5 rounded text-[10px]">.json</code> configuration files to compare plans across different browser sessions or devices.
            </p>
            <div className="pt-1 text-[11px] font-semibold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-500" />
              <span>Route: Sidebar ➔ Plan Management ➔ Plan Overview / JSON Backup</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Understanding the 4D Trade-Off Scorecard */}
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Understanding the 4D Institutional Scorecard Metrics</span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The Trade-Off Scorecard evaluates retirement plans across 4 fundamental institutional dimensions (scored 0–100) to help you weigh competing financial priorities:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1.5">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-200 block">1. Capital Longevity (0–100)</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Measures portfolio survival probability through Age 95, Monte Carlo success rate, and ending liquid wealth buffer.
            </p>
          </div>

          <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-1.5">
            <span className="font-extrabold text-indigo-900 dark:text-indigo-200 block">2. Tax Efficiency (0–100)</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Measures effective lifetime tax rate, tax-free PCLS drawdown optimization, and HMRC personal allowance tax friction avoidance.
            </p>
          </div>

          <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1.5">
            <span className="font-extrabold text-purple-900 dark:text-purple-200 block">3. Estate & IHT Shield (0–100)</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Measures net wealth passed to beneficiaries at Age 85 after 40% Inheritance Tax (incorporating April 2027 UK pension IHT rules).
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1.5">
            <span className="font-extrabold text-amber-900 dark:text-amber-200 block">4. Floor Safety (0–100)</span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Measures the percentage of essential living expenses guaranteed by index-linked, non-market streams (State Pension, DB pensions, Annuities).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: Step-by-Step Scenario Benchmarking Workflow */}
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Step-by-Step Benchmarking Workflow</span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm shrink-0 mt-0.5">Step 1</span>
            <div>
              <strong className="text-slate-900 dark:text-white">Configure Baseline Plan (Plan A):</strong> Ensure your primary profile inputs (ages, retirement spending target, pension pots, ISAs) are entered in the <strong>Inputs</strong> tab.
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm shrink-0 mt-0.5">Step 2</span>
            <div>
              <strong className="text-slate-900 dark:text-white">Create a Comparison Variation (Plan B):</strong> Navigate to <strong>Plan Management</strong> in the sidebar and click <strong>Create New Plan</strong> (or click <strong>Compare Plans</strong> in the Drawdown Planner) to test scenarios like "Retire at 57", "Higher Early Spending", or "Purchase £10k/yr Annuity".
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm shrink-0 mt-0.5">Step 3</span>
            <div>
              <strong className="text-slate-900 dark:text-white">Open Side-by-Side Comparer:</strong> Switch to the <strong>Compare</strong> tab in the main header (or select <strong>Plan Comparison</strong> in the sidebar) and pick Plan A and Plan B from the drop-down selectors to visually compare radar chart overlays, cashflow trajectories, and lifetime tax deltas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

