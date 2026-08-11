import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { UserProfile, InvestmentPots } from '../types';
import { getActualSpendingTargetForAge } from '../utils/projectionEngine';

interface WithdrawalGuardrailGaugeCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  horizonYears?: number;
  equityPct?: number;
}

export const WithdrawalGuardrailGaugeCard: React.FC<WithdrawalGuardrailGaugeCardProps> = ({
  profile,
  pots,
  horizonYears = 30,
  equityPct = 60,
}) => {
  const targetIncome = getActualSpendingTargetForAge(profile, profile.targetRetirementAge);

  // --- Correct InvestmentPots field names per types.ts ---
  let totalAssets =
    (pots.workplacePensionBalance || 0) +
    (pots.sippBalance || 0) +
    (pots.stocksAndSharesIsaBalance || 0) +
    (pots.cashIsaBalance || 0) +
    (pots.lisaBalance || 0) +
    (pots.giaBalance || 0) +
    (pots.cashSavingsBalance || 0);

  if (profile.isCouplePlanning && profile.partnerPots) {
    totalAssets +=
      (profile.partnerPots.workplacePensionBalance || 0) +
      (profile.partnerPots.sippBalance || 0) +
      (profile.partnerPots.stocksAndSharesIsaBalance || 0) +
      (profile.partnerPots.cashIsaBalance || 0) +
      (profile.partnerPots.lisaBalance || 0) +
      (profile.partnerPots.giaBalance || 0) +
      (profile.partnerPots.cashSavingsBalance || 0);
  }

  const retAge = profile.targetRetirementAge || 60;
  
  let guaranteedIncomeAtRetirement = 0;
  
  // State Pension
  if ((profile.includeStatePension ?? true) && retAge >= (profile.statePensionAge || 67)) {
    const yrs = Math.min(35, profile.qualifyingYears ?? 35);
    if (yrs >= 10) {
      guaranteedIncomeAtRetirement += profile.statePensionAmountAnnual ?? (Math.round((yrs / 35) * (profile.fullStatePensionAmount ?? 12547.6) * 100) / 100);
    }
  }
  if (profile.isCouplePlanning && (profile.partnerIncludeStatePension ?? true)) {
    const pRetAge = profile.partnerTargetRetirementAge || retAge;
    if (pRetAge >= (profile.partnerStatePensionAge || 67)) {
      const yrs = Math.min(35, profile.partnerQualifyingYears ?? 35);
      if (yrs >= 10) {
        guaranteedIncomeAtRetirement += profile.partnerStatePensionAmountAnnual ?? (Math.round((yrs / 35) * (profile.partnerFullStatePensionAmount ?? 12547.6) * 100) / 100);
      }
    }
  }

  // DB Pensions
  (profile.dbPensions || []).filter(p => p.enabled && (profile.isCouplePlanning || p.owner !== 'partner')).forEach(p => {
    const evalAge = p.owner === 'partner' ? (profile.partnerTargetRetirementAge || retAge) : retAge;
    if (evalAge >= p.startAge) guaranteedIncomeAtRetirement += p.annualIncome;
  });

  // Fixed Income
  (profile.fixedIncomeStreams || []).filter(s => s.enabled && (profile.isCouplePlanning || s.owner !== 'partner')).forEach(s => {
    const evalAge = s.owner === 'partner' ? (profile.partnerTargetRetirementAge || retAge) : retAge;
    if (evalAge >= s.startAge && (!s.endAge || evalAge <= s.endAge)) guaranteedIncomeAtRetirement += s.annualAmount;
  });

  const withdrawalNeeded = Math.max(0, targetIncome - guaranteedIncomeAtRetirement);
  
  // Initial SWR — guard against zero
  const initialSwr = totalAssets > 0 ? (withdrawalNeeded / totalAssets) * 100 : 3.5;
  // Pure Guyton-Klinger ±20% corridor around initial SWR
  // Horizon adjustment: for horizons longer than 30 years, tighten upper guardrail slightly
  const horizonAdjustment = Math.max(0, (horizonYears - 30) * 0.03);
  const lowerGuardrail = Math.max(1.5, Math.round((initialSwr * 0.8) * 10) / 10);
  const upperGuardrail = Math.min(8.0, Math.round((initialSwr * 1.2 - horizonAdjustment) * 10) / 10);

  // Status
  let status: 'prosperity' | 'safe' | 'capital_preservation' = 'safe';
  if (initialSwr < lowerGuardrail) status = 'prosperity';
  if (initialSwr > upperGuardrail) status = 'capital_preservation';

  // Progress bar: position indicator (clamp to 0-100%)
  const corridorWidth = upperGuardrail - lowerGuardrail;
  const positionPct = corridorWidth > 0
    ? Math.min(100, Math.max(0, ((initialSwr - lowerGuardrail) / corridorWidth) * 100))
    : 50;

  return (
    <div id="card-guardrail-gauge" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200/60 dark:border-purple-800/60">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Dynamic Guardrail Threshold Gauge (Guyton-Klinger)</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                Corridor ({horizonYears}y Horizon)
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Guyton-Klinger ±20% corridor around your initial withdrawal rate. Linked to SWR Heatmap horizon and equity settings.
            </p>
          </div>
        </div>
      </div>

      {/* Main Corridor Display */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-5">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Initial SWR (Current Pots)</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {initialSwr.toFixed(2)}% <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ year</span>
            </div>
          </div>

          {status === 'safe' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Within Safe Guardrail Corridor</span>
            </div>
          )}
          {status === 'capital_preservation' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-extrabold border border-rose-200 dark:border-rose-800">
              <AlertTriangle className="w-4 h-4" />
              <span>Upper Guardrail Breached — Capital Preservation Rule: Cut Spend 10%</span>
            </div>
          )}
          {status === 'prosperity' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-extrabold border border-indigo-200 dark:border-indigo-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Below Lower Guardrail — Prosperity Rule: Increase Spend 10%</span>
            </div>
          )}
        </div>

        {/* Visual Corridor Track */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-indigo-600 dark:text-indigo-400">Lower: {lowerGuardrail.toFixed(1)}%</span>
            <span className="text-slate-900 dark:text-white font-extrabold">Current: {initialSwr.toFixed(2)}%</span>
            <span className="text-rose-600 dark:text-rose-400">Upper: {upperGuardrail.toFixed(1)}%</span>
          </div>

          <div className="relative h-5 rounded-full overflow-hidden flex shadow-inner">
            <div className="w-[25%] bg-indigo-300/70 dark:bg-indigo-900/60" />
            <div className="w-[50%] bg-emerald-500/80" />
            <div className="w-[25%] bg-rose-400/80 dark:bg-rose-900/60" />
            {/* Pointer */}
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-slate-900 dark:bg-white rounded-full shadow-lg transition-all duration-500"
              style={{ left: `calc(${positionPct}% - 3px)` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>Prosperity (↑ +10% spend)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Safe Corridor</span>
            <span>Capital Preservation (↓ −10% spend)</span>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1.5">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Prosperity Rule (Lower Guardrail: {lowerGuardrail.toFixed(1)}%)</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            If portfolio growth drops your effective SWR below <strong>{lowerGuardrail.toFixed(1)}%</strong>, increase annual spending by <strong>10%</strong> to enjoy more of your capital.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/80 space-y-1.5">
          <h4 className="font-bold text-rose-900 dark:text-rose-300">Capital Preservation Rule (Upper: {upperGuardrail.toFixed(1)}%)</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            If market falls push your effective SWR above <strong>{upperGuardrail.toFixed(1)}%</strong>, cut annual spending by <strong>10%</strong> to protect long-term capital.
          </p>
        </div>
      </div>

      {/* Note on calculation basis */}
      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        <span>Guardrails are calculated from <strong>today's pot balances</strong>. At retirement start, the effective SWR will differ based on accumulated growth. For your projected initial SWR, see the PWR Metric card above.</span>
      </div>

    </div>
  );
};
