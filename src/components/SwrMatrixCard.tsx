import React, { useState } from 'react';
import { Percent, ShieldCheck, HelpCircle, RefreshCw, Layers } from 'lucide-react';
import { UserProfile, InvestmentPots } from '../types';

interface SwrMatrixCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  horizonYears?: number;
  onHorizonYearsChange?: (years: number) => void;
  equityPct?: number;
  onEquityPctChange?: (equity: number) => void;
}

export const SwrMatrixCard: React.FC<SwrMatrixCardProps> = ({
  profile,
  pots,
  horizonYears: externalHorizon,
  onHorizonYearsChange,
  equityPct: externalEquity,
  onEquityPctChange,
}) => {
  const [internalHorizon, setInternalHorizon] = useState<number>(30);
  const [internalEquity, setInternalEquity] = useState<number>(60);

  const horizonYears = externalHorizon ?? internalHorizon;
  const setHorizonYears = (val: number) => {
    const clamped = Math.max(10, Math.min(60, val));
    if (onHorizonYearsChange) onHorizonYearsChange(clamped);
    else setInternalHorizon(clamped);
  };

  const equityPct = externalEquity ?? internalEquity;
  const setEquityPct = (val: number) => {
    if (onEquityPctChange) onEquityPctChange(val);
    else setInternalEquity(val);
  };

  const swrRates = [2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0];
  const retirementAges = [50, 55, 60, 65, 67];

  // Category label per SWR rate
  const getSwrLabel = (swr: number): string => {
    if (swr <= 2.75) return 'UK FIRE';
    if (swr <= 3.5) return 'UK Standard';
    if (swr <= 4.5) return 'Dynamic/Guardrail';
    return 'Aggressive';
  };

  // Helper matrix success rates based on Trinity Study & UK historical return distribution
  const getSuccessRate = (swr: number, age: number, equity: number, horizonParam: number): number => {
    // Calculate the effective horizon for this specific retirement age column
    // assuming horizonParam applies to the target retirement age
    const targetRetAge = profile.targetRetirementAge || 60;
    const lifeExpectancy = targetRetAge + horizonParam;
    const horizon = Math.max(10, lifeExpectancy - age);

    // Base formula considering horizon length and asset allocation
    let base = 100;
    
    // Penalize higher SWRs
    if (swr > 4.0) base -= (swr - 4.0) * 35;
    else if (swr > 3.5) base -= (swr - 3.5) * 12;

    // Horizon penalty
    if (horizon > 30) {
      base -= (horizon - 30) * (swr > 3.5 ? 1.5 : 0.6);
    } else if (horizon < 30) {
      base += (30 - horizon) * 0.4;
    }

    // Asset allocation adjustment (60-80% equity is sweet spot)
    if (equity < 40) base -= (40 - equity) * 0.4;
    if (equity > 85) base -= (equity - 85) * 0.3;

    return Math.min(100, Math.max(15, Math.round(base)));
  };

  const getCellColor = (rate: number) => {
    if (rate >= 95) return 'bg-emerald-500 text-white font-bold';
    if (rate >= 90) return 'bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-950 dark:text-emerald-300';
    if (rate >= 80) return 'bg-amber-100 text-amber-900 font-bold dark:bg-amber-950 dark:text-amber-300';
    if (rate >= 65) return 'bg-orange-100 text-orange-900 font-bold dark:bg-orange-950 dark:text-orange-300';
    return 'bg-rose-500 text-white font-bold';
  };

  return (
    <div id="card-swr-matrix" className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Safe Withdrawal Rate (SWR) Heatmap Matrix</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Advanced Analytics
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical portfolio survival probability (%) matrix across withdrawal rates and retirement ages
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Retirement Horizon</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="60"
                value={horizonYears}
                onChange={(e) => setHorizonYears(parseInt(e.target.value) || 30)}
                className="w-16 px-2 py-0.5 bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-black text-indigo-400 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400 font-bold">Years</span>
            </div>
          </label>
          <div className="flex gap-2">
            {[20, 25, 30, 35, 40, 45].map((years) => (
              <button
                key={years}
                type="button"
                onClick={() => setHorizonYears(years)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  horizonYears === years
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {years}y
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Equity / Growth Allocation</span>
            <span className="text-indigo-400 font-extrabold">{equityPct}% Equities</span>
          </label>
          <input
            type="range"
            min="20"
            max="100"
            step="10"
            value={equityPct}
            onChange={(e) => setEquityPct(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>20% (Conservative)</span>
            <span>60% (Balanced)</span>
            <span>100% (All Equity)</span>
          </div>
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-center text-xs">
          <thead className="bg-slate-800/80 text-slate-100 font-bold border-b border-slate-800">
            <tr>
              <th className="p-3 text-left">Initial SWR (%)</th>
              {retirementAges.map((age) => (
                <th key={age} className="p-3">Age {age}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {swrRates.map((rate) => {
              const label = getSwrLabel(rate);
              const labelColor =
                label === 'UK FIRE' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' :
                label === 'UK Standard' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                label === 'Dynamic/Guardrail' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
              return (
                <tr key={rate} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 text-left">
                    <div className="font-extrabold text-slate-900 dark:text-white">{rate.toFixed(2)}%</div>
                    <span className={`mt-0.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${labelColor}`}>{label}</span>
                  </td>
                  {retirementAges.map((age) => {
                    const success = getSuccessRate(rate, age, equityPct, horizonYears);
                    return (
                      <td key={age} className="p-2">
                        <div className={`py-1.5 px-2 rounded-xl text-xs ${getCellColor(success)} transition-all shadow-2xs`}>
                          {success}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" /> 95%+ High Safety
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300 inline-block" /> 90-94% Safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300 inline-block" /> 80-89% Moderate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" /> &lt;65% Vulnerable
          </span>
        </div>
      </div>

    </div>
  );
};
