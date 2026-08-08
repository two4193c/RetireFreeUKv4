import React from 'react';
import { Home, Percent, TrendingDown, DollarSign, CheckCircle2, AlertTriangle, ShieldCheck, Zap, ArrowRight, BookOpen, Layers } from 'lucide-react';

export const MortgageGuideCard: React.FC = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Header Banner */}
      <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
          <Home className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
              Mortgage & Property Debt Strategy Guide
            </h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              Liabilities & Payoff
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Optimizing mortgage overpayments, early payoff using 25% PCLS tax-free cash, and interest savings vs pension investment returns
          </p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center text-xs">
            1
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Overpayment vs Investing</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Compare guaranteed interest savings from overpaying your mortgage against expected net returns in pensions or ISAs.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-xs">
            2
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Early Payoff via PCLS</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Model using 25% Tax-Free Pension Cash (PCLS) at Age 55/57 to clear remaining mortgage balances right at retirement.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-xs">
            3
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">Loan-to-Value (LTV)</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Track debt reduction to cross key LTV threshold bands (80%, 75%, 60%) to unlock lower remortgage interest rates.
          </p>
        </div>
      </div>

      {/* Strategy Section 1: Overpaying vs Investing */}
      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 space-y-3">
        <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>The Math: Overpaying Mortgage vs. Pension Salary Sacrifice</span>
        </h3>
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
          <p>
            When deciding whether to overpay your mortgage or contribute more into your pension:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Mortgage Overpayments:</strong> Provide a <em>guaranteed tax-free return</em> equal to your mortgage interest rate (e.g. 5.0% APR). Paying off debt early also eliminates monthly required outflows in retirement.
            </li>
            <li>
              <strong>Pension Salary Sacrifice:</strong> Provides immediate relief from Income Tax (20%, 40%, or 45%) and National Insurance (2%), plus employer match contributions. Higher-rate tax payers often gain an effective 40%+ immediate return on pension contributions.
            </li>
          </ul>
        </div>
      </div>

      {/* Strategy Section 2: PCLS Lump Sum Payoff */}
      <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 space-y-3">
        <h3 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Clearing Mortgage Debt at Retirement with PCLS Tax-Free Cash</span>
        </h3>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Under UK pension rules, you can extract up to 25% of your total pension value tax-free (up to the £268,275 Lump Sum Allowance limit). Many UK retirees use this one-off tax-free lump sum to extinguish remaining mortgage balances on their target retirement date, ensuring zero debt liabilities during decumulation.
        </p>
      </div>

      {/* Key Takeaways */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
          Best Practice Guidelines for Mortgage Debt
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Target debt-free status by or before your primary target retirement age.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>Use the Mortgage Debt tab to model regular monthly overpayments vs lump sums.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
