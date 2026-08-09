import React, { useState } from 'react';
import { Scale, CheckCircle2, ShieldCheck, AlertTriangle, RefreshCw, DollarSign, Wallet } from 'lucide-react';
import { UserProfile, InvestmentPots } from '../types';

interface EssentialFloorSplitCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
}

export const EssentialFloorSplitCard: React.FC<EssentialFloorSplitCardProps> = ({ profile, pots }) => {
  const [essentialPct, setEssentialPct] = useState<number>(65);

  const targetIncome = profile.targetRetirementIncomeAnnual || 30000;
  
  // --- Correct UserProfile field names per types.ts ---
  const statePensionAnnual = profile.includeStatePension ? (profile.statePensionAmountAnnual || 0) : 0;
  const partnerStatePensionAnnual =
    profile.isCouplePlanning && profile.partnerIncludeStatePension
      ? (profile.partnerStatePensionAmountAnnual || 0)
      : 0;
  // DbPension uses annualIncome not annualAmount
  const dbAnnual =
    profile.dbPensions
      ?.filter((p) => p.enabled)
      .reduce((sum, p) => sum + (p.annualIncome || 0), 0) ?? 0;

  const totalGuaranteedIncome = statePensionAnnual + partnerStatePensionAnnual + dbAnnual;

  // Spending phase context labels
  const spendingPhases = profile.spendingPhases;
  const hasSpendingPhases = spendingPhases?.enabled;

  const essentialAmount = Math.round((targetIncome * essentialPct) / 100);
  const discretionaryAmount = Math.max(0, targetIncome - essentialAmount);

  const guaranteedCoveragePct = essentialAmount > 0
    ? Math.min(100, Math.round((totalGuaranteedIncome / essentialAmount) * 100))
    : 100;

  return (
    <div id="card-essential-floor-split" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-200/60 dark:border-teal-800/60">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Essential Floor vs. Discretionary Spending Split</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                Crash Protection
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Decomposing annual income needs into guaranteed essential floor vs flexible discretionary top-up
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Slider */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
        <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white">
          <span>Essential Spending Ratio</span>
          <span className="text-teal-600 dark:text-teal-400 font-black text-sm">{essentialPct}% Essential / {100 - essentialPct}% Discretionary</span>
        </div>
        <input
          type="range"
          min="40"
          max="90"
          step="5"
          value={essentialPct}
          onChange={(e) => setEssentialPct(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
          <span>40% (Flexible Lifestyle)</span>
          <span>65% (Standard Baseline)</span>
          <span>90% (High Fixed Costs)</span>
        </div>
      </div>

      {/* 2 Tiers Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Tier 1: Essential Floor */}
        <div className="p-6 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-teal-900 dark:text-teal-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Tier 1: Essential Needs Floor</span>
            </h4>
            <span className="text-lg font-black text-teal-900 dark:text-teal-300">£{essentialAmount.toLocaleString()}/yr</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Covers non-negotiable living costs (housing, council tax, utilities, food, healthcare).
          </p>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-teal-200/60 dark:border-teal-900/60 space-y-1 text-xs">
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Guaranteed Income Coverage:</span>
              <span className={guaranteedCoveragePct >= 100 ? 'text-emerald-600' : 'text-amber-600'}>
                {guaranteedCoveragePct}% Covered (£{totalGuaranteedIncome.toLocaleString()}/yr)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              State Pension + Defined Benefit Pensions cover {guaranteedCoveragePct}% of your essential budget!
            </p>
          </div>
        </div>

        {/* Tier 2: Discretionary Ceiling */}
        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-500" />
              <span>Tier 2: Discretionary Lifestyle</span>
            </h4>
            <span className="text-lg font-black text-slate-900 dark:text-white">£{discretionaryAmount.toLocaleString()}/yr</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Covers flexible extras (travel, holidays, dining out, entertainment, gifting).
          </p>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Market Crash Buffer:</span>
              <span className="text-emerald-600 dark:text-emerald-400">100% Flex Protection</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              During severe equity bear markets, pausing this £{discretionaryAmount.toLocaleString()}/yr spending eliminates sequence risk!
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
