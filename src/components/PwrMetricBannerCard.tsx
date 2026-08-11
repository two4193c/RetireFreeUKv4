import React, { useState } from 'react';
import { Percent, ShieldCheck, Calendar } from 'lucide-react';
import { UserProfile, InvestmentPots, YearProjection } from '../types';
import { getPensionAccessAge, getActualSpendingTargetForAge } from '../utils/projectionEngine';

interface PwrMetricBannerCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections?: YearProjection[];
}

export const PwrMetricBannerCard: React.FC<PwrMetricBannerCardProps> = ({ profile, pots, projections }) => {
  const [basis, setBasis] = useState<'retirement_start' | 'today' | 'private_pension_start' | 'state_pension_start'>('retirement_start');

  const baseTargetIncome = getActualSpendingTargetForAge(profile, profile.targetRetirementAge);
  
  const pensionAccessAge = getPensionAccessAge(profile);
  const statePensionAge = profile.statePensionAge || 67;

  // --- Correct InvestmentPots field names per types.ts ---
  let todayAssets =
    (pots.workplacePensionBalance || 0) +
    (pots.sippBalance || 0) +
    (pots.stocksAndSharesIsaBalance || 0) +
    (pots.cashIsaBalance || 0) +
    (pots.lisaBalance || 0) +
    (pots.giaBalance || 0) +
    (pots.cashSavingsBalance || 0);

  if (profile.isCouplePlanning && profile.partnerPots) {
    todayAssets +=
      (profile.partnerPots.workplacePensionBalance || 0) +
      (profile.partnerPots.sippBalance || 0) +
      (profile.partnerPots.stocksAndSharesIsaBalance || 0) +
      (profile.partnerPots.cashIsaBalance || 0) +
      (profile.partnerPots.lisaBalance || 0) +
      (profile.partnerPots.giaBalance || 0) +
      (profile.partnerPots.cashSavingsBalance || 0);
  }

  // Projected portfolios at various milestones (end of year prior)
  const preRetirementYearRow = projections?.find((p) => p.age === (profile.targetRetirementAge - 1));
  const prePrivatePensionYearRow = projections?.find((p) => p.age === (pensionAccessAge - 1));
  const preStatePensionYearRow = projections?.find((p) => p.age === (statePensionAge - 1));

  const retirementStartAssets = preRetirementYearRow?.totalPot ?? todayAssets;
  const privatePensionStartAssets = prePrivatePensionYearRow?.totalPot ?? todayAssets;
  const statePensionStartAssets = preStatePensionYearRow?.totalPot ?? todayAssets;

  let totalInvestedAssets = todayAssets;
  let calculationAge = profile.currentAge;
  let calculationYearRow: YearProjection | undefined = undefined;

  if (basis === 'retirement_start') {
    totalInvestedAssets = retirementStartAssets;
    calculationAge = profile.targetRetirementAge;
    calculationYearRow = projections?.find((p) => p.age === profile.targetRetirementAge);
  } else if (basis === 'private_pension_start') {
    totalInvestedAssets = privatePensionStartAssets;
    calculationAge = pensionAccessAge;
    calculationYearRow = projections?.find((p) => p.age === pensionAccessAge);
  } else if (basis === 'state_pension_start') {
    totalInvestedAssets = statePensionStartAssets;
    calculationAge = statePensionAge;
    calculationYearRow = projections?.find((p) => p.age === statePensionAge);
  }

  const targetIncome = basis !== 'today' && calculationYearRow && calculationYearRow.targetRetirementIncome > 0 
    ? calculationYearRow.targetRetirementIncome 
    : baseTargetIncome;

  // --- Theoretical vs Actual Drawdown ---
  const staticStatePension = profile.includeStatePension ? (profile.statePensionAmountAnnual || 0) : 0;
  const staticPartnerStatePension =
    profile.isCouplePlanning && profile.partnerIncludeStatePension
      ? (profile.partnerStatePensionAmountAnnual || 0)
      : 0;
  const staticDbPension =
    profile.dbPensions
      ?.filter((p) => p.enabled && (profile.isCouplePlanning || p.owner !== 'partner'))
      .reduce((sum, p) => sum + (p.annualIncome || 0), 0) ?? 0;

  const staticGuaranteedIncome = staticStatePension + staticPartnerStatePension + staticDbPension;

  const yearGuaranteedIncome = calculationYearRow
    ? (calculationYearRow.statePensionReceived + (calculationYearRow.dbPensionIncomeReceived || 0) + (calculationYearRow.annuityIncomeReceived || 0))
    : staticGuaranteedIncome;

  const guaranteedIncome = basis !== 'today' ? yearGuaranteedIncome : staticGuaranteedIncome;

  const netDrawdownNeeded = basis !== 'today' && calculationYearRow
    ? calculationYearRow.totalWithdrawalAmount
    : Math.max(0, targetIncome - guaranteedIncome);

  // PWR — guard against zero capital
  const pwrPct = totalInvestedAssets > 0 ? (netDrawdownNeeded / totalInvestedAssets) * 100 : 0;

  // UK-aligned risk categorization (3.2-3.5% standard, not US 4%)
  let badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
  let label = 'Safe (Standard UK SWR)';
  if (pwrPct === 0) {
    badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    label = 'No Portfolio Drawdown Needed';
  } else if (pwrPct < 2.8) {
    badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300';
    label = 'Ultra Safe (< 2.8% UK FIRE)';
  } else if (pwrPct <= 3.5) {
    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300';
    label = 'Safe (2.8% – 3.5% UK Standard)';
  } else if (pwrPct <= 4.5) {
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
    label = 'Moderate Risk (3.5% – 4.5% — Use Guardrails)';
  } else {
    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
    label = 'High Sequence Risk (> 4.5%)';
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
              Net portfolio withdrawal rate after deducting guaranteed State and DB pension income — UK benchmarks: 2.8%–3.5%
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-2xl text-xs font-extrabold border ${badgeColor} self-start sm:self-auto shadow-2xs`}>
          {label}
        </div>
      </div>

      {/* Basis Selector */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 whitespace-nowrap">
          <Calendar className="w-4 h-4 text-emerald-500" />
          <span>Capital Basis:</span>
        </span>
        <div className="flex flex-wrap rounded-xl bg-slate-200 dark:bg-slate-700 p-1 gap-1">
          <button
            type="button"
            onClick={() => setBasis('retirement_start')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              basis === 'retirement_start'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Retirement Start (Age {profile.targetRetirementAge}) — £{Math.round(retirementStartAssets).toLocaleString()}
          </button>
          <button
            type="button"
            onClick={() => setBasis('private_pension_start')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              basis === 'private_pension_start'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Private Pension (Age {pensionAccessAge}) — £{Math.round(privatePensionStartAssets).toLocaleString()}
          </button>
          <button
            type="button"
            onClick={() => setBasis('state_pension_start')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              basis === 'state_pension_start'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            State Pension (Age {statePensionAge}) — £{Math.round(statePensionStartAssets).toLocaleString()}
          </button>
          <button
            type="button"
            onClick={() => setBasis('today')}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              basis === 'today'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Today's Pots — £{Math.round(todayAssets).toLocaleString()}
          </button>
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
            £{Math.round(guaranteedIncome).toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1">
          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
            {basis === 'today' ? "PWR on Today's Pots" : `PWR at Age ${calculationAge}`}
          </span>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {pwrPct.toFixed(2)}% <span className="text-xs font-normal text-slate-500 dark:text-slate-400">SWR</span>
          </div>
        </div>
      </div>

      {/* Analytical Guidance */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PWR Formula & UK Benchmark Context:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Your PWR = <strong>(Net Drawdown Needed £{Math.round(netDrawdownNeeded).toLocaleString()}) ÷ (Portfolio Capital £{Math.round(totalInvestedAssets).toLocaleString()}) = {pwrPct.toFixed(2)}%</strong>.
          UK Safe Withdrawal benchmarks: <strong>FIRE 40+ yrs: 2.8%–3.2%</strong> · <strong>Standard 30 yr: 3.2%–3.5%</strong> · <strong>Guardrail Dynamic: 3.5%–4.5%</strong>. The US Trinity Study 4% rule is not directly applicable due to UK fee drag (0.5%–0.75%), higher inflation volatility, and income tax on pension drawdown.
        </p>
      </div>

    </div>
  );
};
