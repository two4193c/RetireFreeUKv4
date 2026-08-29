import React from 'react';
import { 
  TrendingDown, 
  AlertTriangle, 
  Calculator, 
  Percent, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Layers,
  Award
} from 'lucide-react';

export const TaperedAllowanceGuideCard: React.FC = () => {
  return (
    <div id="card-doc-taperedallowanceguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-800/60">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Tapered Annual Allowance (TAA) Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                High Earner Pension Rules
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Navigating Threshold Income (£200k) and Adjusted Income (£260k) tapering, calculating your reduced pension allowance, and using Carry Forward.
            </p>
          </div>
        </div>
      </div>

      {/* Threshold vs Adjusted Income Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        
        {/* Test 1: Threshold Income */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-500" />
              Test 1: Threshold Income
            </span>
            <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
              £200,000 Gateway
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Threshold Income is your total taxable income (salary, bonuses, dividends, rental income) <strong>minus personal pension contributions</strong> made under Relief at Source.
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
            If Threshold Income is <strong>£200,000 or lower</strong>, the Tapered Annual Allowance does NOT apply, and your allowance remains £60,000!
          </div>
        </div>

        {/* Test 2: Adjusted Income */}
        <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-rose-950 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Test 2: Adjusted Income
            </span>
            <span className="text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded">
              £260,000 Trigger
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            If Threshold Income exceeds £200k, you must test Adjusted Income (taxable income <strong>plus all employer pension contributions</strong>).
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 font-medium text-rose-900 dark:text-rose-300">
            Taper Formula: Allowance reduces by <strong>£1 for every £2</strong> of Adjusted Income over £260,000 down to a minimum floor of <strong>£10,000</strong>.
          </div>
        </div>

      </div>

      {/* Tapering Scale Table / Visual */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-rose-500" />
          <span>Tapered Annual Allowance Breakdown (Tax Year 2024/25)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <th className="py-2 px-3">Adjusted Income Level</th>
                <th className="py-2 px-3">Reduction Amount</th>
                <th className="py-2 px-3">Effective Annual Allowance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">Up to £260,000</td>
                <td className="py-2.5 px-3">£0</td>
                <td className="py-2.5 px-3 font-bold text-primary-600 dark:text-primary-400">£60,000 (Full)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">£280,000</td>
                <td className="py-2.5 px-3">£10,000</td>
                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">£50,000</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">£310,000</td>
                <td className="py-2.5 px-3">£25,000</td>
                <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">£35,000</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">£360,000 or higher</td>
                <td className="py-2.5 px-3">£50,000 (Maximum Taper)</td>
                <td className="py-2.5 px-3 font-bold text-rose-600 dark:text-rose-400">£10,000 (Minimum Floor)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Mitigation Strategies: Carry Forward */}
      <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Mitigating TAA Impact: Carry Forward Rules</span>
        </h3>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          If your current year's tapered annual allowance is restricted, you can utilization <strong>Carry Forward</strong> to carry over unused pension annual allowances from up to the <strong>3 previous tax years</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">Requirement 1: Registered Scheme Member</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">You must have been a member of a registered UK pension scheme during the prior tax years being carried forward (even if zero contributions were made).</p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">Requirement 2: Current Year First</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">You must fully utilize your current year's tapered annual allowance before tapping into unused carry forward allowances starting from the oldest year.</p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-rose-900 dark:text-rose-300">Modelling Contributions in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the <strong>Investment Contributions Manager</strong>, you can specify maximum annual pension contribution limits for high-earning profiles to ensure accumulation models reflect true tapered allowances accurately.
          </p>
        </div>
      </div>

    </div>
  );
};
