import React from 'react';
import { Home, CheckCircle2, ArrowRight, ShieldCheck, Heart, AlertTriangle, Building2, DollarSign } from 'lucide-react';

export const CareCostsGuideCard: React.FC = () => {
  return (
    <div id="card-doc-careguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-200/60 dark:border-rose-800/60">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>UK Social Care Costs, Equity Release & Later-Life Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                Later Life Planning
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Navigating UK care means-testing thresholds, home inclusion rules, downsizing, and lifetime mortgages
            </p>
          </div>
        </div>
      </div>

      {/* UK Social Care Means-Testing Thresholds */}
      <div className="p-6 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-900 dark:text-rose-300 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span>UK Social Care Capital Thresholds (England 2024/25)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-rose-900 dark:text-rose-300">Over £23,250 Capital</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Full Self-Funder. You must pay 100% of residential and nursing care fees. Average UK care home costs run £40,000–£60,000/year.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-rose-900 dark:text-rose-300">£14,250 – £23,250 Capital</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Partial Local Authority Funding. Council contributes to care costs, but charges a tariff income of £1/week per £250 of capital.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-rose-900 dark:text-rose-300">Under £14,250 Capital</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Maximum State Support. Council pays baseline care costs, though you must contribute your income minus Personal Expenses Allowance.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Residence Rules & Deferred Payment Agreements */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-rose-500" />
          <span>Is Your Home Included in the Care Means Test?</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Your main home is <strong>EXCLUDED</strong> from the financial assessment if your spouse, partner, or a dependent relative over 60 lives in it, or if you receive care in your own home (domiciliary care). If entering permanent residential care as a single person, the home is included after 12 weeks. Local Authorities offer a <strong>Deferred Payment Agreement (DPA)</strong> to secure care costs against the home so you are not forced to sell during your lifetime.
        </p>
      </div>

      {/* Downsizing vs Lifetime Mortgages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Home className="w-4 h-4 text-emerald-500" />
            <span>Downsizing to Release Equity</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Moving to a smaller home releases <strong>100% tax-free capital</strong> into your ISA or SIPP wrappers, reducing property maintenance costs without compound interest debt drag.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>Equity Release (Lifetime Mortgage)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Unlocks tax-free cash from your property while staying in your home. Interest rolls up exponentially (e.g. 6% interest doubles debt in 12 years), significantly eroding inheritance passed to heirs.
          </p>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Life Events in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Navigate to the <strong>Life Events & Care Costs</strong> card (under Baseline Inputs) to model explicit care cost spikes, property downsizing events, or capital injections at specified milestone ages.
          </p>
        </div>
      </div>

    </div>
  );
};
