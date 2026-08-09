import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, TrendingUp, RefreshCw, ArrowRight } from 'lucide-react';
import { UserProfile, InvestmentPots } from '../types';

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
  // Compute initial target income vs invested capital
  const targetIncome = profile.targetRetirementIncomeAnnual || 30000;
  
  // Total invested capital
  const totalAssets = (pots.workplacePensionBalance || 0) +
    (pots.sippBalance || 0) +
    (pots.stocksAndSharesIsaBalance || 0) +
    (pots.cashBufferBalance || 0) +
    (pots.taxableGiaBalance || 0);

  const initialSwr = totalAssets > 0 ? (targetIncome / totalAssets) * 100 : 4.0;
  
  // Dynamic Lower and Upper Guardrails adjusted by Horizon Length (Guyton-Klinger baseline +/- 20%)
  // For longer horizons (>30 yrs), upper guardrail tightens slightly to protect long term capital.
  const horizonAdjustment = (horizonYears - 30) * 0.03;
  const lowerGuardrail = Math.max(2.0, Math.round((initialSwr * 0.8 - horizonAdjustment) * 10) / 10);
  const upperGuardrail = Math.min(7.0, Math.round((initialSwr * 1.2 - horizonAdjustment) * 10) / 10);

  // Status calculation
  let status: 'safe' | 'warning_high' | 'warning_low' = 'safe';
  if (initialSwr > upperGuardrail) status = 'warning_high';
  if (initialSwr < lowerGuardrail) status = 'warning_low';

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
              Live monitoring corridor for your effective withdrawal rate relative to capital preservation thresholds
            </p>
          </div>
        </div>
      </div>

      {/* Main Speedometer / Corridor Display */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-5">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Current Target SWR</span>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {initialSwr.toFixed(2)}% <span className="text-xs font-normal text-slate-500 dark:text-slate-400">/ year</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status === 'safe' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Corridor Safe (Within Guardrails)</span>
              </div>
            )}
            {status === 'warning_high' && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-extrabold border border-rose-200 dark:border-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Upper Guardrail Breached — Cut Spend 10%</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Track */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-indigo-600 dark:text-indigo-400">Lower Guardrail: {lowerGuardrail.toFixed(1)}%</span>
            <span className="text-slate-900 dark:text-white font-extrabold">Target: {initialSwr.toFixed(2)}%</span>
            <span className="text-rose-600 dark:text-rose-400">Upper Guardrail: {upperGuardrail.toFixed(1)}%</span>
          </div>

          <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div className="w-[30%] bg-indigo-300 dark:bg-indigo-900/60" />
            <div className="w-[40%] bg-emerald-500/80" />
            <div className="w-[30%] bg-rose-400 dark:bg-rose-900/60" />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold pt-1">
            <span>Prosperity Trigger (Raise Spend +10%)</span>
            <span>Optimal Safe Corridor</span>
            <span>Capital Preservation (Cut Spend -10%)</span>
          </div>
        </div>

      </div>

      {/* Actionable Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-1.5">
          <h4 className="font-bold text-purple-900 dark:text-purple-300">Capital Preservation Rule (Upper Guardrail)</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            If market drops cause your effective SWR to rise above <strong>{upperGuardrail.toFixed(1)}%</strong>, reduce your spending target by 10% next year to preserve portfolio longevity.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-1.5">
          <h4 className="font-bold text-indigo-900 dark:text-indigo-300">Prosperity Rule (Lower Guardrail)</h4>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            If market gains drop your effective SWR below <strong>{lowerGuardrail.toFixed(1)}%</strong>, increase your annual spending target by 10% to enjoy your capital!
          </p>
        </div>
      </div>

    </div>
  );
};
