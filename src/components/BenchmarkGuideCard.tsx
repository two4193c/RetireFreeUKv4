import React from 'react';
import { ArrowRightLeft, Award, Layers, Scale, CheckCircle2, BarChart2, PieChart, Sparkles } from 'lucide-react';

export const BenchmarkGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Scenario Benchmark & Trade-Off Scorecard Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Institutional Comparer
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Evaluating 4D trade-offs across Longevity, Tax, Estate IHT, and Safety Floor with side-by-side benchmarking
          </p>
        </div>
      </div>

      {/* 4 Dimensions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
          <span className="font-extrabold text-emerald-900 dark:text-emerald-200">1. Capital Longevity (0–100)</span>
          <p className="text-slate-600 dark:text-slate-400">Measures Monte Carlo success rate and ending wealth cushion at Age 95.</p>
        </div>

        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-1">
          <span className="font-extrabold text-indigo-900 dark:text-indigo-200">2. Tax Efficiency (0–100)</span>
          <p className="text-slate-600 dark:text-slate-400">Measures effective lifetime tax rate and HMRC friction avoidance.</p>
        </div>

        <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1">
          <span className="font-extrabold text-purple-900 dark:text-purple-200">3. Estate & IHT Shield (0–100)</span>
          <p className="text-slate-600 dark:text-slate-400">Measures net wealth passed to heirs at Age 85 after 40% IHT.</p>
        </div>

        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1">
          <span className="font-extrabold text-amber-900 dark:text-amber-200">4. Floor Safety (0–100)</span>
          <p className="text-slate-600 dark:text-slate-400">Measures DB, State Pension, and Annuity coverage of target spend.</p>
        </div>
      </div>
    </div>
  );
};
