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

  const adjustInflation = profile.adjustForInflation !== false;
  const expectedInflationRate = profile.expectedInflationRate ?? 2.5;

  const baseTargetIncome = getActualSpendingTargetForAge(profile, profile.targetRetirementAge);
  
  const pensionAccessAge = getPensionAccessAge(profile);
  const statePensionAge = (profile.statePensionAge || 67) + (profile.statePensionDeferralYears || 0);

  // --- Total Invested Assets Today ---
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

  // Guaranteed income streams currently active today (if currentAge >= SPA or DB start)
  const currentAge = profile.currentAge;
  let todayGuaranteedIncome = 0;
  if (profile.includeStatePension && currentAge >= statePensionAge) {
    todayGuaranteedIncome += profile.statePensionAmountAnnual || 0;
  }
  if (profile.isCouplePlanning && profile.partnerIncludeStatePension) {
    const partSpa = (profile.partnerStatePensionAge || 67) + (profile.partnerStatePensionDeferralYears || 0);
    const partAge = profile.partnerCurrentAge || currentAge;
    if (partAge >= partSpa) {
      todayGuaranteedIncome += profile.partnerStatePensionAmountAnnual || 0;
    }
  }
  (profile.dbPensions || []).filter((p) => p.enabled && (profile.isCouplePlanning || p.owner !== 'partner')).forEach((p) => {
    const evalAge = p.owner === 'partner' ? (profile.partnerCurrentAge || currentAge) : currentAge;
    if (evalAge >= p.startAge) todayGuaranteedIncome += p.annualIncome || 0;
  });

  // Helper to compute milestone capital and income metrics
  const getMilestoneData = (targetAge: number, isTodayBasis: boolean = false) => {
    const yearOffset = Math.max(0, targetAge - currentAge);
    const inflFactor = Math.pow(1 + expectedInflationRate / 100, yearOffset);
    const scale = adjustInflation && inflFactor > 0 ? 1 / inflFactor : 1;

    if (isTodayBasis || targetAge === currentAge) {
      const targetInc = baseTargetIncome;
      const guaranteed = todayGuaranteedIncome;
      const netDrawdown = Math.max(0, targetInc - guaranteed);
      const startingCapital = todayAssets;
      const endCapital = todayAssets;
      const pwr = startingCapital > 0 ? (netDrawdown / startingCapital) * 100 : 0;
      return {
        age: currentAge,
        startingCapital,
        endCapital,
        displayStartingCapital: Math.round(startingCapital),
        displayEndCapital: Math.round(endCapital),
        displayTargetIncome: Math.round(targetInc),
        displayGuaranteedIncome: Math.round(guaranteed),
        displayNetDrawdown: Math.round(netDrawdown),
        pwrPct: pwr,
        calculationRow: undefined,
      };
    }

    const row = projections?.find((p) => p.age === targetAge);
    let nominalStartingCapital = todayAssets;
    let nominalEndCapital = todayAssets;
    let nominalTargetIncome = baseTargetIncome * inflFactor;
    let nominalGuaranteed = 0;
    let nominalNetDrawdown = 0;

    if (row) {
      nominalEndCapital = row.totalPot || 0;
      nominalStartingCapital = row.isRetired
        ? (row.totalPot || 0) + (row.totalWithdrawalAmount || 0)
        : (row.totalPot || 0);

      nominalTargetIncome = row.targetRetirementIncome > 0
        ? row.targetRetirementIncome
        : (getActualSpendingTargetForAge(profile, targetAge) * inflFactor);

      nominalGuaranteed =
        (row.statePensionReceived || 0) +
        (row.dbPensionIncomeReceived || 0) +
        (row.annuityIncomeReceived || 0);

      if (row.isRetired && (row.totalWithdrawalAmount || 0) > 0) {
        nominalNetDrawdown = row.totalWithdrawalAmount;
      } else {
        nominalNetDrawdown = Math.max(0, nominalTargetIncome - nominalGuaranteed);
      }
    } else {
      nominalNetDrawdown = Math.max(0, nominalTargetIncome - nominalGuaranteed);
    }

    const displayStartingCapital = Math.round(nominalStartingCapital * scale);
    const displayEndCapital = Math.round(nominalEndCapital * scale);
    const displayTargetIncome = Math.round(nominalTargetIncome * scale);
    const displayGuaranteedIncome = Math.round(nominalGuaranteed * scale);
    const displayNetDrawdown = Math.round(nominalNetDrawdown * scale);
    const pwr = displayStartingCapital > 0 ? (displayNetDrawdown / displayStartingCapital) * 100 : 0;

    return {
      age: targetAge,
      startingCapital: nominalStartingCapital,
      endCapital: nominalEndCapital,
      displayStartingCapital,
      displayEndCapital,
      displayTargetIncome,
      displayGuaranteedIncome,
      displayNetDrawdown,
      pwrPct: pwr,
      calculationRow: row,
    };
  };

  const retirementStartData = getMilestoneData(profile.targetRetirementAge);
  const statePensionData = getMilestoneData(statePensionAge);
  const privatePensionData = getMilestoneData(pensionAccessAge);
  const todayData = getMilestoneData(currentAge, true);

  // Active basis selection
  let activeData = retirementStartData;
  let calculationAge = profile.targetRetirementAge;

  if (basis === 'state_pension_start') {
    activeData = statePensionData;
    calculationAge = statePensionAge;
  } else if (basis === 'private_pension_start') {
    activeData = privatePensionData;
    calculationAge = pensionAccessAge;
  } else if (basis === 'today') {
    activeData = todayData;
    calculationAge = currentAge;
  }

  const {
    displayStartingCapital,
    displayEndCapital,
    displayTargetIncome,
    displayGuaranteedIncome,
    displayNetDrawdown,
    pwrPct,
  } = activeData;

  // Available milestone tabs (filter out past milestones)
  const availableMilestones: Array<{
    id: 'retirement_start' | 'private_pension_start' | 'state_pension_start' | 'today';
    label: string;
    capital: number;
    show: boolean;
  }> = [
    {
      id: 'retirement_start',
      label: `Retirement Start (Age ${profile.targetRetirementAge})`,
      capital: retirementStartData.displayStartingCapital,
      show: true,
    },
    {
      id: 'state_pension_start',
      label: `State Pension (Age ${statePensionAge})`,
      capital: statePensionData.displayStartingCapital,
      show: statePensionAge >= currentAge && statePensionAge !== profile.targetRetirementAge,
    },
    {
      id: 'private_pension_start',
      label: `Private Pension (Age ${pensionAccessAge})`,
      capital: privatePensionData.displayStartingCapital,
      show: pensionAccessAge >= currentAge && pensionAccessAge !== profile.targetRetirementAge,
    },
    {
      id: 'today',
      label: `Today's Pots (Age ${currentAge})`,
      capital: todayData.displayStartingCapital,
      show: true,
    },
  ];

  // UK-aligned risk categorization (3.2-3.5% standard, not US 4%)
  let badgeColor = 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 border-primary-300';
  let label = 'Safe (Standard UK SWR)';
  if (pwrPct === 0) {
    badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
    label = 'No Portfolio Drawdown Needed';
  } else if (pwrPct < 2.8) {
    badgeColor = 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300';
    label = 'Ultra Safe (< 2.8% UK FIRE)';
  } else if (pwrPct <= 3.5) {
    badgeColor = 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-300 border-primary-300';
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
          <div className="p-3 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-2xl border border-primary-200/60 dark:border-primary-800/60">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Personalized Withdrawal Rate (PWR) Metric</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 px-2.5 py-1 rounded-full border border-primary-200 dark:border-primary-800">
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 whitespace-nowrap">
            <Calendar className="w-4 h-4 text-primary-500" />
            <span>Capital Basis:</span>
          </span>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-600">
            {adjustInflation ? "Real Terms (Today's £)" : "Nominal £"}
          </span>
        </div>
        <div className="flex flex-wrap rounded-xl bg-slate-200 dark:bg-slate-700 p-1 gap-1">
          {availableMilestones.filter((m) => m.show).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setBasis(m.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                basis === m.id
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m.label} — £{m.capital.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Metric Summary Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Target Spending</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            £{displayTargetIncome.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Guaranteed Income (SP + DB + Annuity)</span>
          <div className="text-2xl font-black text-primary-600 dark:text-primary-400">
            £{displayGuaranteedIncome.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ yr</span>
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
          <ShieldCheck className="w-4 h-4 text-primary-500" />
          <span>PWR Formula & UK Benchmark Context:</span>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Your PWR = <strong>(Net Drawdown Needed £{displayNetDrawdown.toLocaleString()}) ÷ (Portfolio Capital £{displayStartingCapital.toLocaleString()}) = {pwrPct.toFixed(2)}%</strong>.
          {displayEndCapital !== displayStartingCapital && (
            <span className="text-slate-500 dark:text-slate-400 block mt-1">
              Starting portfolio capital is £{displayStartingCapital.toLocaleString()} at the beginning of Age {calculationAge}; after the £{displayNetDrawdown.toLocaleString()} drawdown, remaining portfolio balance is projected at £{displayEndCapital.toLocaleString()}.
            </span>
          )}
          UK Safe Withdrawal benchmarks: <strong>FIRE 40+ yrs: 2.8%–3.2%</strong> · <strong>Standard 30 yr: 3.2%–3.5%</strong> · <strong>Guardrail Dynamic: 3.5%–4.5%</strong>. The US Trinity Study 4% rule is not directly applicable due to UK fee drag (0.5%–0.75%), higher inflation volatility, and income tax on pension drawdown.
        </p>
      </div>

    </div>
  );
};
