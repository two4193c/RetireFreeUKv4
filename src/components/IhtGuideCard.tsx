import React from 'react';
import { Landmark, Scale, ShieldCheck, Heart, AlertTriangle, CheckCircle2, DollarSign, PieChart } from 'lucide-react';

export const IhtGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              April 2027 Inheritance Tax (IHT) & Estate Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              Autumn Budget 2024 Reform
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            NRB allowances (£325k/£650k), RNRB property exemptions (£175k/£350k), £2M tapering, and April 2027 pension rules
          </p>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-black flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Nil Rate Band (NRB)</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Standard £325,000 tax-free inheritance threshold per individual (£650,000 transferable for married couples/civil partners).
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Residence NRB (RNRB)</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Additional £175,000 (£350,000 couple) allowance when passing a main residence to direct descendants (children/grandchildren).
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-black flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">April 2027 Pension Rule</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Unused pension pots will be included in your gross taxable estate for 40% IHT starting April 6, 2027.
          </p>
        </div>
      </div>

      {/* April 2027 Reform Box */}
      <div className="p-5 bg-purple-50/60 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-3">
        <h3 className="font-bold text-purple-950 dark:text-purple-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Major Change: Pensions Included in Estate from April 2027</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Historically, UK pensions were held under discretionary trust and excluded from your estate for Inheritance Tax. Under the UK Autumn Budget 2024 reforms, from <strong>April 6, 2027</strong>, unspent pension pots will be subject to 40% Inheritance Tax upon death. The software allows you to toggle this rule in the <strong>Estate Planning</strong> tab to see the exact impact on net wealth passed to your heirs.
        </p>
      </div>

      {/* Gifting & Allowances */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
          Estate Mitigation Strategies
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>£3,000 Annual Exemption:</strong> Gift up to £3,000 per tax year tax-free without 7-year rules.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span><strong>7-Year PET Rule:</strong> Outright gifts become 100% exempt from IHT if you survive 7 full years.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
