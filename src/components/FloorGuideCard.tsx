import React from 'react';
import { ShieldCheck, Percent, Layers, Lock, CheckCircle2, AlertTriangle, ArrowRight, DollarSign } from 'lucide-react';

export const FloorGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Guaranteed Income Safety Floor & Annuity Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Essential Coverage & Hybrid Strategy
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Securing baseline spending with State Pension, DB pensions, and phased annuity purchasing
          </p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Essential Spending Floor</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Separate non-negotiable living costs (bills, food, utilities) from discretionary spending (hobbies, travel).
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Guaranteed Payout Sources</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            State Pension + Defined Benefit (DB) pensions + Lifetime Annuity payouts form your guaranteed safety floor.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-black flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Phased Annuity Tranches</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Purchasing annuity tranches at different ages (e.g. 65, 75, 80) locks in higher annuity rates as mortality drag increases.
          </p>
        </div>
      </div>

      {/* Hybrid Explanation */}
      <div className="p-5 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 space-y-3">
        <h3 className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>The Hybrid Strategy: Drawdown + Annuity Floor</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          A pure flexi-access drawdown strategy carries market volatility risk, while a pure 100% annuity strategy lacks flexibility and inflation upside. A <strong>Hybrid Strategy</strong> allocates a portion of your pension capital to guarantee essential income, leaving remaining capital invested in S&S ISAs and pensions for growth.
        </p>
      </div>

      {/* Cash Flow Sankey & Numerical Floor Integration */}
      <div className="p-5 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-800/60 space-y-3">
        <h3 className="font-bold text-teal-950 dark:text-teal-200 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Interactive Cash Flow Sankey & Numerical Floor Settings</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          On the <strong>Projections / Annual Breakdown</strong> page, the <strong>Interactive Cash Flow Sankey Diagram</strong> allows you to specify your exact essential spending floor in <strong>numerical currency (£/yr)</strong>:
        </p>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
          <li><strong>Direct Value Setting:</strong> Enter an exact figure (e.g. £24,000/yr) with stepper buttons (<code className="font-bold text-teal-700 dark:text-teal-300">-</code> / <code className="font-bold text-teal-700 dark:text-teal-300">+</code>) rather than a rigid percentage.</li>
          <li><strong>Essential vs. Discretionary Allocation:</strong> Net income first prioritizes filling the essential floor (bills, housing, council tax, groceries). Any surplus income flows directly to Discretionary Lifestyle Spending.</li>
          <li><strong>Coverage Status:</strong> The diagram dynamically tracks whether your total net income covers 100% of your target essential floor or indicates the percentage covered.</li>
        </ul>
      </div>
    </div>
  );
};
