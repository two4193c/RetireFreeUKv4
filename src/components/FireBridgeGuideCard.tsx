import React from 'react';
import { Flame, CheckCircle2, ArrowRight, ShieldCheck, Wallet, Lock, TrendingUp, DollarSign } from 'lucide-react';

export const FireBridgeGuideCard: React.FC = () => {
  return (
    <div id="card-doc-firebridgeguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-2xl border border-orange-200/60 dark:border-orange-800/60">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>FIRE (Financial Independence, Retire Early) Bridge Strategy Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                Pre-57 Access
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculating ISA bridge capital requirements for retiring at ages 40–54 before private pension access age (57)
            </p>
          </div>
        </div>
      </div>

      {/* The Two-Phase FIRE Framework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Phase 1: ISA Bridge */}
        <div className="p-6 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-orange-900 dark:text-orange-300 font-bold text-sm">
            <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span>Phase 1: ISA / GIA Bridge (Early Retirement Age to 57)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Pensions are legally locked until age 57 (NMPA from 2028). To retire at age 45, you must build enough liquid capital in <strong>Stocks & Shares ISAs and GIAs</strong> to fund 100% of your annual living expenses for the 12 bridge years (ages 45–57).
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-orange-200/60 dark:border-orange-900/60 text-xs font-bold text-orange-900 dark:text-orange-300">
            Bridge Capital Formula = Annual Spend × Bridge Years (e.g. £30k × 12 yrs = £360k ISA Target)
          </div>
        </div>

        {/* Phase 2: Pension Decumulation */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
            <Lock className="w-5 h-5 text-indigo-500" />
            <span>Phase 2: Pension Unlocking (Age 57 Onward)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            At age 57, private pensions (SIPP & Workplace) unlock. You switch decumulation from your ISA to your pension wrapper, extracting 25% Tax-Free Cash (PCLS) and utilizing Personal Tax Allowances to minimize lifetime tax.
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-indigo-900 dark:text-indigo-300">
            Pensions continue compounding tax-free during Phase 1!
          </div>
        </div>
      </div>

      {/* FIRE Definitions & Targets */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span>The 3 FIRE Tiers</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">Lean FIRE</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Targeting £15,000–£22,000/yr annual budget. Requires smaller ISA bridge (~£200k) but requires strict spending discipline.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">Standard FIRE</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Targeting £31,000–£43,000/yr (matching PLSA Moderate/Comfortable living standards). Balanced ISA and SIPP targets.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white">Coast FIRE</h4>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Front-loading pension contributions early in your 20s/30s until investment growth alone will reach retirement targets, allowing you to work low-stress part-time jobs.
            </p>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-200/60 dark:border-primary-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-primary-900 dark:text-primary-300">Modelling FIRE Scenarios in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Set your <strong>Planned Retirement Age</strong> to 45 or 50 on the Baseline Inputs tab. The projection engine automatically models ISA depletion during pre-57 bridge years and switches to pension drawdown at age 57!
          </p>
        </div>
      </div>

    </div>
  );
};
