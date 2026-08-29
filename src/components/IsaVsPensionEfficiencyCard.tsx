import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { calculateTaxEfficientSavingsCrossover } from '../utils/taxEfficientSavingsEngine';
import {
  Scale,
  PiggyBank,
  TrendingUp,
  Info,
  Sparkles,
  Unlock,
  Layers,
} from 'lucide-react';

interface IsaVsPensionEfficiencyCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections?: YearProjection[];
  onChange?: (updatedProfile: UserProfile) => void;
}

export const IsaVsPensionEfficiencyCard: React.FC<IsaVsPensionEfficiencyCardProps> = ({
  profile,
  pots,
  taxResult,
  projections,
  onChange,
}) => {
  const [showDetailedMatrix, setShowDetailedMatrix] = useState<boolean>(false);

  // Compute crossover calculations
  const crossoverData = useMemo(() => {
    return calculateTaxEfficientSavingsCrossover(profile, pots, projections);
  }, [profile, pots, projections]);

  const {
    currentMarginalTaxRate,
    contributionMethod,
    pensionAccessAge,
    targetRetirementAge,
    crossoverAge,
    crossoverReason,
    pensionAdvantagePercent,
    isaBridgeYears,
    isaBridgeRequiredTotal,
    isaBridgeProjectedAtRetirement,
    isaBridgeDeficit,
    recommendedMonthlySplit,
    ageBreakdowns,
  } = crossoverData;

  const isEarlyRetirement = isaBridgeYears > 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Tax-Efficient Savings Crossover (ISA vs Pension)
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-0.5 rounded-full">
                Strategy Optimizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Determines the age at which tax-efficient savings shift priority based on upfront tax relief, decumulation tax, and early retirement bridge liquidity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {crossoverAge !== null && (
            <div className="bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/60 text-primary-800 dark:text-primary-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>Optimal Shift Age: Age {crossoverAge}</span>
            </div>
          )}
        </div>
      </div>

      {/* Headline Insight Banner */}
      <div className="bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white rounded-xl p-4 border border-indigo-200 dark:border-indigo-900/60 shadow-md space-y-2 transition-colors">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-lg mt-0.5 border border-indigo-200 dark:border-indigo-500/30">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-indigo-100 flex items-center gap-2">
              <span>Projection Insight &amp; Crossover Age Strategy</span>
            </h4>
            <p className="text-xs text-slate-700 dark:text-indigo-200/90 leading-relaxed">
              {crossoverReason}
            </p>
          </div>
        </div>
      </div>

      {/* Core KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Contribution Tax Relief Advantage */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <PiggyBank className="w-4 h-4 text-primary-500" />
              Upfront Tax Relief Boost
            </span>
            <span className="text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold px-2 py-0.5 rounded-md">
              {currentMarginalTaxRate}% Tax Band
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              +{pensionAdvantagePercent}%
            </span>
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
              Pension Net Advantage
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            For every £1,000 net income sacrificed into pension via {contributionMethod.replace('_', ' ')}, you gain an effective net return of £{(1 + pensionAdvantagePercent / 100).toFixed(2)} vs £1.00 in an ISA.
          </p>
        </div>

        {/* Metric 2: Early Retirement ISA Bridge Status */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Unlock className="w-4 h-4 text-amber-500" />
              ISA Bridge (Age {targetRetirementAge}–{pensionAccessAge})
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              isEarlyRetirement && isaBridgeDeficit > 0
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                : 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
            }`}>
              {isEarlyRetirement ? `${isaBridgeYears} Yrs Gap` : 'No Gap'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              £{isaBridgeRequiredTotal.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Bridge Income Needed
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Projected ISA Balance:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">£{isaBridgeProjectedAtRetirement.toLocaleString()}</span>
            </div>
            {isaBridgeDeficit > 0 ? (
              <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                <span>Bridge Shortfall:</span>
                <span>£{isaBridgeDeficit.toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex justify-between font-bold text-primary-600 dark:text-primary-400">
                <span>Bridge Fully Covered:</span>
                <span>✓ Fully Funded</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric 3: Recommended Monthly Split */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Target Monthly Savings Split
            </span>
            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-md">
              Optimal Allocation
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Pension: {recommendedMonthlySplit.pensionPercent}%</span>
              <span>ISA: {recommendedMonthlySplit.isaPercent}%</span>
            </div>
            {/* Visual Bar */}
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all"
                style={{ width: `${recommendedMonthlySplit.pensionPercent}%` }}
                title={`Pension: ${recommendedMonthlySplit.pensionPercent}%`}
              />
              <div
                className="h-full bg-primary-500 dark:bg-primary-400 transition-all"
                style={{ width: `${recommendedMonthlySplit.isaPercent}%` }}
                title={`ISA: ${recommendedMonthlySplit.isaPercent}%`}
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
            Balances upfront tax relief efficiency with required liquid ISA savings for pre-access retirement years.
          </p>
        </div>
      </div>

      {/* Age-by-Age Crossover Matrix Toggle & Table */}
      <div className="space-y-3 pt-2">
        <button
          onClick={() => setShowDetailedMatrix(!showDetailedMatrix)}
          className="flex items-center justify-between w-full p-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Age-by-Age Tax Efficiency Timeline ({profile.currentAge || 45} to Age {Math.max(75, targetRetirementAge + 10)})</span>
          </span>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 underline">
            {showDetailedMatrix ? 'Hide Age Breakdown' : 'Show Age Breakdown'}
          </span>
        </button>

        {showDetailedMatrix && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2.5">Age</th>
                  <th className="p-2.5">Year</th>
                  <th className="p-2.5">Phase</th>
                  <th className="p-2.5">Upfront Relief</th>
                  <th className="p-2.5">Effective Drawdown Tax</th>
                  <th className="p-2.5">Pension Net Return</th>
                  <th className="p-2.5">Recommended Focus</th>
                  <th className="p-2.5">Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {ageBreakdowns.map((row) => (
                  <tr
                    key={row.age}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      row.age === crossoverAge ? 'bg-primary-50/80 dark:bg-primary-950/40 font-semibold' : ''
                    }`}
                  >
                    <td className="p-2.5 font-bold">{row.age}</td>
                    <td className="p-2.5 text-slate-500 dark:text-slate-400">{row.year}</td>
                    <td className="p-2.5">
                      {row.isRetirementPhase ? (
                        <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                          Decumulation
                        </span>
                      ) : row.isPrePensionAccess ? (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                          Pre-Pension Access
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-bold">
                          Standard Accumulation
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-primary-600 dark:text-primary-400 font-bold">{row.taxReliefPercent}%</td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{row.retirementTaxPercent}%</td>
                    <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      £{(row.pensionNetReturnRatio).toFixed(3)}
                    </td>
                    <td className="p-2.5">
                      {row.recommendedFocus === 'pension' && (
                        <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                          Pension Priority
                        </span>
                      )}
                      {row.recommendedFocus === 'isa' && (
                        <span className="text-[10px] font-bold uppercase bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-800">
                          ISA Bridge Priority
                        </span>
                      )}
                      {row.recommendedFocus === 'balanced' && (
                        <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded">
                          Balanced Split
                        </span>
                      )}
                      {row.recommendedFocus === 'drawdown' && (
                        <span className="text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                          Tax-Free Drawdown
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
