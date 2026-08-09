import React from 'react';
import { Smile, CheckCircle2, ArrowRight, ShieldCheck, TrendingDown, Sun, Heart, DollarSign } from 'lucide-react';

export const SpendingSmileGuideCard: React.FC = () => {
  return (
    <div id="card-doc-spendingsmileguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200/60 dark:border-amber-800/60">
            <Smile className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>The Retirement Spending Smile (VPW Curves) Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                Spending Lifecycle
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Why real-world retirement spending follows a "smile" curve rather than flat inflation-adjusted amounts
            </p>
          </div>
        </div>
      </div>

      {/* The 3 Phases of the Retirement Spending Smile */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" />
          <span>The 3 Retirement Spending Stages (Blanchett Research)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Phase 1: Go-Go */}
          <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-300">1. "Go-Go" Years</h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">Ages 57 – 73</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Peak activity phase. High discretionary spending on international travel, holidays, golf, home improvements, and helping children.
            </p>
            <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 pt-1">
              100% of Target Budget
            </div>
          </div>

          {/* Phase 2: Slow-Go */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">2. "Slow-Go" Years</h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Ages 74 – 84</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Activity naturally slows. Travel decreases to local trips. Real spending drops by <strong>15%–25% in real terms</strong> as lifestyle simplifies.
            </p>
            <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pt-1">
              75% – 85% of Target Budget
            </div>
          </div>

          {/* Phase 3: No-Go */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">3. "No-Go" Years</h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Ages 85+</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Low discretionary spending, though medical or domiciliary care costs may create a tail uptick (completing the "smile" shape).
            </p>
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-1">
              65% – 75% Budget (plus Care risk)
            </div>
          </div>
        </div>
      </div>

      {/* Why Constant Inflation Assumptions Overestimate Required Savings */}
      <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
        <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
          <TrendingDown className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>Why Flat Inflation Models Force You to Over-Save</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Standard retirement calculators assume your spending increases by inflation every single year until age 95. Empirical UK & US data proves that actual retiree spending declines by approximately <strong>1% per year in real terms</strong> throughout middle retirement. Modeling a Spending Smile allows you to safely enjoy more income in your early "Go-Go" years when you are healthiest!
        </p>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Spending Phases in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Navigate to the <strong>Retirement Income Requirement (Spending Phases)</strong> card under Baseline Inputs / Strategy to configure custom spending amounts for Go-Go, Slow-Go, and No-Go age windows!
          </p>
        </div>
      </div>

    </div>
  );
};
