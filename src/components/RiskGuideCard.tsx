import React from 'react';
import { Shield, TrendingDown, Activity, BarChart2, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, LineChart } from 'lucide-react';

export const RiskGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Sequence of Returns & Stress Testing Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
              Stochastic & Historic Backtest
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Understanding sequence risk, Monte Carlo percentile fan charts (1950–2024 data), and buffer strategies
          </p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sequence of Returns Risk</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Why bad market years in early retirement accelerate capital depletion much faster than in accumulation.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Monte Carlo Simulations</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Generating 300 to 500 randomized return pathways to evaluate success rate percentages to Age 95/100.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-black flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">75-Year Historic Backtest</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Backtesting your exact plan against every 75 historical sequence start year from 1950 through 2024.
          </p>
        </div>
      </div>

      {/* Deep Dive Section */}
      <div className="p-5 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200/60 dark:border-rose-800/60 space-y-3">
        <h3 className="font-bold text-rose-950 dark:text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Why Average Return Figures Are Misleading in Retirement</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          In a deterministic model with a constant 5% p.a. growth rate, the order of annual market returns does not matter. However, in decumulation—when you are actively withdrawing money every month—a 20% market crash during your first two years of retirement forces you to sell shares at depressed prices, permanently reducing your capital base.
        </p>
      </div>

      {/* Percentiles Explanation */}
      <div className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Interpreting Monte Carlo Percentile Fan Charts</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-rose-100/60 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800">
            <span className="font-bold text-rose-900 dark:text-rose-200">10th Percentile (Stress)</span>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Represents severe bear market conditions (the worst 10% of simulated outcomes).</p>
          </div>
          <div className="p-3 bg-teal-100/60 dark:bg-teal-950/50 rounded-xl border border-teal-200 dark:border-teal-800">
            <span className="font-bold text-teal-900 dark:text-teal-200">50th Percentile (Median)</span>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Represents the expected middle outcome across all randomized return series.</p>
          </div>
          <div className="p-3 bg-primary-100/60 dark:bg-primary-950/50 rounded-xl border border-primary-200 dark:border-primary-800">
            <span className="font-bold text-primary-900 dark:text-primary-200">90th Percentile (Growth)</span>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Represents favorable bull market conditions (the top 10% of outcomes).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
