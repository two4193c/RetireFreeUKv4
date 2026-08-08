import React from 'react';
import { Landmark, CheckCircle2, ArrowRight, ShieldCheck, AlertTriangle, FileText, Lock, DollarSign, Scale } from 'lucide-react';

export const DbPensionGuideCard: React.FC = () => {
  return (
    <div id="card-doc-dbguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-200/60 dark:border-teal-800/60">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Defined Benefit (DB) & Final Salary Pension Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                UK Pensions
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluating guaranteed lifetime DB pensions vs Cash Equivalent Transfer Values (CETVs)
            </p>
          </div>
        </div>
      </div>

      {/* DB Scheme Features vs DC Flexi-Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-teal-900 dark:text-teal-300 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Guaranteed Defined Benefit (DB) Scheme</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
            <li><strong>Zero Market Risk</strong>: Income guaranteed for life by employer scheme (backed by Pension Protection Fund PPF).</li>
            <li><strong>Inflation Protection</strong>: Statutory CPI escalation (typically capped at 2.5% or 5% per year).</li>
            <li><strong>Spousal Survivor Benefits</strong>: 50%–67% continuation pension paid automatically to surviving partner.</li>
            <li><strong>No Investment Drag</strong>: Scheme bears all investment risk and longevity risk.</li>
          </ul>
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
            <DollarSign className="w-5 h-5 text-indigo-500" />
            <span>Transferred Defined Contribution (DC) SIPP</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc pl-4">
            <li><strong>Flexi-Access Drawdown</strong>: Variable annual income matching early retirement spending needs.</li>
            <li><strong>100% Tax-Free Inheritance</strong>: Remaining pot passes to heirs free of IHT (and tax-free if death before 75).</li>
            <li><strong>PCLS Lump Sum</strong>: Extract 25% tax-free lump sum up to £268,275 LSA cap.</li>
            <li><strong>Market Risk</strong>: Subject to sequence-of-returns risk and investment volatility.</li>
          </ul>
        </div>
      </div>

      {/* CETV Rules & £30k Advice Threshold */}
      <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Statutory £30,000 Advice Threshold & CETV Multiple Check</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Under UK FCA regulations, transferring a Defined Benefit pension worth <strong>over £30,000 legally requires regulated financial advice</strong> from a qualified Pension Transfer Specialist (PTS). Historically, CETV multiples ranged from 20x to 30x annual pension (e.g. £10,000/yr pension = £250,000 CETV), though higher interest rates have reduced average CETV multiples.
        </p>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling DB Pensions in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>Defined Benefit Pensions Manager</strong> card (under Baseline Inputs) to enter annual income, start age, escalation rates, and survivor continuation percentages. The engine integrates DB income directly into your guaranteed income floor!
          </p>
        </div>
      </div>

    </div>
  );
};
