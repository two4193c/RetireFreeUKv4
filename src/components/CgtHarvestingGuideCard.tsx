import React from 'react';
import { LineChart, CheckCircle2, ArrowRight, ShieldCheck, DollarSign, Percent, RefreshCw, Scale } from 'lucide-react';

export const CgtHarvestingGuideCard: React.FC = () => {
  return (
    <div id="card-doc-cgtharvestingguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Capital Gains Tax (CGT) & GIA Harvesting Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                UK Tax Strategy
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Managing taxable General Investment Accounts (GIAs) under the reduced £3,000 CGT exemption
            </p>
          </div>
        </div>
      </div>

      {/* Reduced £3,000 CGT Exemption Warning */}
      <div className="p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
          <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Reduced £3,000 Annual Exempt Amount (2024/25 Onwards)</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The UK Capital Gains Tax allowance has been slashed from £12,300 to just <strong>£3,000 per person per tax year</strong>. Gains above £3,000 are taxed at 10% (basic rate) or 20% (higher rate) for shares/funds, and 18%/24% for residential property.
        </p>
      </div>

      {/* GIA Harvesting Strategies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <RefreshCw className="w-4 h-4" />
            <span>Bed & ISA Strategy</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Sell up to £3,000 of gains in your GIA each tax year and immediately transfer cash into your Stocks & Shares ISA to purchase equivalent funds, locking in tax-free wrapper status forever.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <Scale className="w-4 h-4" />
            <span>Bed & Spouse Transfer</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Inter-spousal asset transfers are 100% tax-free under UK rules. Transfer ring-fenced GIA assets to your spouse to utilize their separate £3,000 CGT exemption and £20k ISA allowance!
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold">
            <DollarSign className="w-4 h-4" />
            <span>Capital Loss Harvesting</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Realizing capital losses in underperforming GIA holdings offsets taxable capital gains pound-for-pound. Unused capital losses can be registered on your HMRC tax return and carried forward indefinitely.
          </p>
        </div>
      </div>

      {/* RetireFree UK Integration */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling GIA Liquidation in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Use the <strong>Taxable GIA & Unallocated Pot Manager</strong> (under Baseline Inputs) to model liquidating taxable investment pots during drawdown, calculating exact CGT drag based on your personal income band.
          </p>
        </div>
      </div>

    </div>
  );
};
