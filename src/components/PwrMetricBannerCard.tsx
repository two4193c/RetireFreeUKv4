import React from 'react';
import { Percent, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, DollarSign, TrendingUp } from 'lucide-react';
import { UserProfile, InvestmentPots, CalculationResult } from '../types';

interface PwrMetricBannerCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
}

export const PwrMetricBannerCard: React.FC<PwrMetricBannerCardProps> = ({ profile, pots }) => {
  const targetIncome = profile.targetRetirementIncomeAnnual || 30000;
  
  // Total invested assets
  const totalInvestedAssets = (pots.workplacePensionBalance || 0) +
    (pots.sippBalance || 0) +
    (pots.stocksAndSharesIsaBalance || 0) +
    (pots.cashBufferBalance || 0) +
    (pots.taxableGiaBalance || 0);

  // Guaranteed income (State pension + DB pensions)
  const statePensionAnnual = (profile.statePensionPoundsPerWeek || 221.20) * 52;
  const partnerStatePensionAnnual = profile.includePartner
    ? (profile.partnerStatePensionPoundsPerWeek || 221.20) * 52
    : 0;
  const dbAnnual = profile.definedBenefitPensions?.reduce((sum, p) => sum + (p.annualAmount || 0), 0) || 0;
  const guaranteedIncome = statePensionAnnual + partnerStatePensionAnnual + dbAnnual;

  // Net portfolio drawdown needed
  const netDrawdownNeeded = Math.max(0, targetIncome - guaranteedIncome);

  // PWR calculation
  const pwrPct = totalInvestedAssets > 0 ? (netDrawdownNeeded / totalInvestedAssets) * 100 : 4.0;

  // Risk categorization
  let riskCategory: 'ultra_safe' | 'safe' | 'moderate' | 'high' = 'safe';
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
  let label = 'Safe (Standard SWR)';

  if (pwrPct < 3.25) {
    riskCategory = 'ultra_safe';
    badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300';
    label = 'Ultra Safe (< 3.25%)';
  } else if (pwrPct <= 4.0) {
    riskCategory = 'safe';
    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
    label = 'Safe (3.25% - 4.0%)';
  } else if (pwrPct <= 4.75) {
    riskCategory = 'moderate';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
    label = 'Moderate Risk (4.0% - 4.75%)';
  } else {
    riskCategory = 'high';
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
    label = 'High Sequence Risk (> 4.75%)';
  }

  return (
    <div id="card-pwr-metric" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Personalized Withdrawal Rate (PWR) Metric</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Key Performance Indicator
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Net portfolio withdrawal rate after deducting guaranteed State and DB pension income
            </p>
          </div>
        </div>

        <div className={`px-4 py-2 rounded-2xl text-xs font-extrabold border ${badgeColor} self-start sm:self-auto shadow-2xs`}>
          {label}
        </div>
      </div>

      {/* 3 Metric Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Target Spending</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{targetIncome.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Guaranteed Income (SP + DB)</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            -£{Math.round(guaranteedIncome).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Net Portfolio PWR</span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {pwrPct.toFixed(2)}% <span className="text-xs font-normal text-slate-500 dark:text-slate-400">SWR</span>
          </div>
        </div>
      </div>

      {/* Analytical Guidance */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PWR Formula & Analysis:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Your PWR is calculated as <strong>(Net Required Portfolio Drawdown £{Math.round(netDrawdownNeeded).toLocaleString()}) ÷ (Total Invested Assets £{totalInvestedAssets.toLocaleString()})</strong>. Because your guaranteed State and DB pension income covers a portion of your baseline budget, your effective portfolio withdrawal rate is <strong>{pwrPct.toFixed(2)}%</strong>, offering higher protection against market downturns than gross spending models.
        </p>
      </div>

    </div>
  );
};
