import React from 'react';
import { AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Percent, Scale, Lock, DollarSign } from 'lucide-react';

export const PensionRecyclingGuideCard: React.FC = () => {
  return (
    <div id="card-doc-recyclingguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-800/60">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>HMRC Pension Recycling & Tapered Allowance Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                UK Tax Traps
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Avoiding 40% unauthorized payment penalties and understanding Tapered Annual Allowance rules
            </p>
          </div>
        </div>
      </div>

      {/* HMRC Pension Recycling Rules */}
      <div className="p-6 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-900 dark:text-rose-300 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>HMRC Pension Recycling Rules (Unauthorized Payment Warning)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Taking Tax-Free Cash (PCLS) from your pension and using it to significantly boost your pension contributions can trigger HMRC's <strong>Pension Recycling Rules</strong>. If HMRC deems recycling has occurred, the lump sum is treated as an <strong>unauthorized payment subject to a 40%–55% tax charge</strong>.
        </p>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-2 text-xs">
          <h4 className="font-bold text-rose-900 dark:text-rose-300">The 4 HMRC Recycling Criteria (All Must Apply):</h4>
          <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc pl-4">
            <li>The Tax-Free Cash (PCLS) extracted exceeds <strong>£7,500</strong> over a 12-month period.</li>
            <li>Subsequent pension contributions increase by more than <strong>30%</strong> compared to expected normal levels.</li>
            <li>The recycling was pre-planned or intended.</li>
            <li>The total cumulative PCLS taken exceeds 1% of the Lifetime Allowance cap.</li>
          </ul>
        </div>
      </div>

      {/* Tapered Annual Allowance for High Earners */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
          <Percent className="w-5 h-5 text-amber-500" />
          <span>Tapered Annual Allowance (£260,000 Threshold Income)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          High earners face a reduced Annual Allowance (down from £60,000 to a minimum of £10,000). The taper applies if both thresholds are exceeded:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">1. Threshold Income &gt; £260,000</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Net income before employer pension contributions. If under £260k, tapering does NOT apply regardless of total employer contributions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">2. Adjusted Income &gt; £360,000</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Net income plus employer pension contributions. Allowance is reduced by £1 for every £2 of Adjusted Income over £260k, tapering down to a £10,000 floor at £360k+.
            </p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Tax Limits in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>Tax & Tapered Allowance Safety Checker</strong> on the Baseline Inputs tab to verify your annual contributions comply with UK statutory limits.
          </p>
        </div>
      </div>

    </div>
  );
};
