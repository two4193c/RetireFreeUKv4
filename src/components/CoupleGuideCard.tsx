import React from 'react';
import { Users, Heart, Scale, ShieldCheck, CheckCircle2, DollarSign, Percent, ArrowRight } from 'lucide-react';

export const CoupleGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Couple & Joint Household Planning Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Dual Member Optimization
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Doubling tax-free allowances (£25,140 Personal Allowance, £40,000 ISA), survivor benefits, and joint drawdown
          </p>
        </div>
      </div>

      {/* Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 font-black flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Dual Personal Allowances</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Utilize both spouses' £12,570 tax-free Personal Allowances to receive up to £25,140/yr of taxable pension drawdown completely free of HMRC income tax.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Combined Allowances</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Combine two ISA allowances (£40,000/yr), two PCLS/LSA limits (£536,550), and two State Pensions (£25,096/yr).
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Survivor Protection</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Model Defined Benefit spouse survivor pensions (50% or 66%) and joint-life annuity payout continuity.
          </p>
        </div>
      </div>

      {/* Cash Flow Sankey Couple View & 50% Floor Split */}
      <div className="p-5 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/60 dark:border-teal-800/60 space-y-3">
        <h3 className="font-bold text-teal-950 dark:text-teal-200 text-sm flex items-center gap-2">
          <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>Cash Flow Sankey: Combined vs. Individual Views & 50% Floor Share</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          When <strong>Couple / Joint Planning</strong> is enabled, the <strong>Interactive Cash Flow Sankey Diagram</strong> supports multi-member view switching:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-600" />
              Household View
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Aggregates all income sources and pots across both partners, comparing household net take-home against the total combined Essential Floor.
            </p>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              Individual Partner Views (½ Share)
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              Switches to an individual partner's view and automatically adjusts the essential floor to an equal <strong>50% share</strong> (with a <span className="font-bold text-teal-600">½ share</span> badge). Changing the individual input synchronizes back to the total combined floor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
