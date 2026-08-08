import React from 'react';
import { Layers, ShieldAlert, CheckCircle2, ArrowRight, DollarSign, FileText, AlertTriangle, RefreshCw, HelpCircle, Lock } from 'lucide-react';

export const SippConsolidationGuideCard: React.FC = () => {
  return (
    <div id="card-doc-sippconsolidation" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>SIPP Consolidation & Pension Transfer Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                UK Pensions
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strategic guide to combining legacy workplace pensions into a Self-Invested Personal Pension (SIPP)
            </p>
          </div>
        </div>
      </div>

      {/* Key Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            <DollarSign className="w-4 h-4" />
            <span>Lower Platform Fees</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Consolidating multiple small pots can significantly reduce percentage-based platform fees or unlock tiered fee caps across larger combined balances.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            <RefreshCw className="w-4 h-4" />
            <span>Simplified Management</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Managing a single SIPP portfolio makes asset allocation rebalancing, drawdown planning, and tracking retirement targets vastly more straightforward.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
            <FileText className="w-4 h-4" />
            <span>Clear Expression of Wish</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            A single consolidated pension streamlines beneficiary nominations (Expression of Wish) for seamless, tax-efficient estate transfer to heirs.
          </p>
        </div>
      </div>

      {/* Critical Pre-Transfer Safeguard Checklist */}
      <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-base">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Critical Checks Before Transferring Legacy Pensions</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>1. Safeguarded Benefits & Guaranteed Annuity Rates (GARs)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Older schemes may include guaranteed annuity rates (e.g. 9%–11% return guarantees) or Defined Benefit (DB) final salary rights. Transferring safeguarded benefits worth over £30,000 legally requires regulated IFA advice.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>2. Protected Pension Age (PPA)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If your legacy scheme allows access at age 50 or 55 (Protected Pension Age), consolidating into a standard SIPP may strip this right, forcing your access age to 57 (NMPA from 2028).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <span>3. Current Employer Pension Matching</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Never close your active workplace pension into which your current employer makes contributions. Instead, keep the active scheme open and perform partial transfers to your SIPP periodically.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>4. Exit Fees & Commercial Penalties</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Most modern workplace schemes charge zero exit fees, but older policy-based pensions (with insurers like Prudential or Aviva) may impose early encashment penalties or market value adjustments (MVAs).
            </p>
          </div>
        </div>
      </div>

      {/* Transfer Methods comparison */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-emerald-500" />
          <span>Transfer Execution Methods: In-Specie vs Cash Transfer</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Cash Transfer</h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">Fastest (2–4 Weeks)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Your legacy provider sells your investments and transfers liquid cash to your new SIPP provider.
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Clean reset of portfolio investments</li>
              <li>Out-of-market risk during the 2–4 week cash transfer window</li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">In-Specie Transfer</h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">Zero Market Risk</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Existing funds and shares are re-registered directly to your new SIPP without selling assets.
            </p>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Zero out-of-market risk — you remain invested throughout</li>
              <li>Requires both providers to support the exact same fund share classes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* How it relates to RetireFree UK v4 */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Pension Consolidation in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the app, you can use the <strong>Pot Transfer Manager</strong> card (under Baseline Inputs) to model consolidating multiple workplace pension pots into a single SIPP at a specific future age, seeing the exact impact on your projected fee savings and retirement cashflow.
          </p>
        </div>
      </div>

    </div>
  );
};
