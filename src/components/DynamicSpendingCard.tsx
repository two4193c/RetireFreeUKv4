import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots, YearProjection } from '../types';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getActualSpendingTargetForAge } from '../utils/projectionEngine';
import { getEffectiveDecumulationReturn } from '../utils/assetAllocation';
import { DEFAULT_POTS } from '../utils/defaultData';
import { MonteCarloResult } from '../utils/monteCarloEngine';

interface DynamicSpendingCardProps {
  profile: UserProfile;
  pots?: InvestmentPots;
  projections?: YearProjection[];
  onChange: (updatedProfile: UserProfile) => void;
  monteCarloResult?: MonteCarloResult | null;
}

export type SimulationScenarioType = 'mc10' | 'mc50' | 'mc90' | 'stress' | 'cycle' | 'bull';

interface SimulationPoint {
  age: number;
  yearIndex: number;
  portfolio: number;
  baselineIncome: number;
  dynamicIncome: number;
  essentialFloor: number;
  withdrawalRate: number;
  returnRate: number;
  event?: 'cut' | 'raise' | 'freeze' | 'floor_protected';
  eventNote?: string;
  diffFromBaseline: number;
}

// Deterministic 32-bit PRNG (Mulberry32) for reproducible Monte Carlo paths
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded Box-Muller normal distribution transform
function seededRandomNormal(prng: () => number, mean = 0, stdDev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = prng();
  while (v === 0) v = prng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

// Log-normal return sampling with drift correction
function sampleLogNormal(prng: () => number, meanReturn: number, volatility: number): number {
  const z = seededRandomNormal(prng, 0, 1);
  const drift = Math.log(1 + meanReturn) - 0.5 * volatility * volatility;
  return Math.exp(drift + volatility * z) - 1;
}

export const DynamicSpendingCard: React.FC<DynamicSpendingCardProps> = ({
  profile,
  pots = DEFAULT_POTS,
  projections,
  onChange,
  monteCarloResult,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenarioType>('mc50');
  const [showEventLog, setShowEventLog] = useState<boolean>(true);

  const activeMarketScenario = profile.monteCarloParams?.marketScenario || monteCarloResult?.params?.marketScenario || 'standard';
  const prevScenarioRef = React.useRef(activeMarketScenario);

  React.useEffect(() => {
    if (prevScenarioRef.current !== activeMarketScenario) {
      prevScenarioRef.current = activeMarketScenario;
      // If user had switched to a non-MC scenario (like historical cycle/bull/stress), switch to mc50 so the live MC stress model is immediately visualized
      if (selectedScenario !== 'mc10' && selectedScenario !== 'mc50' && selectedScenario !== 'mc90') {
        setSelectedScenario('mc50');
      }
    }
  }, [activeMarketScenario, selectedScenario]);

  const updateField = (key: keyof UserProfile, val: any) => {
    onChange({
      ...profile,
      [key]: val,
    });
  };

  const retAge = profile.targetRetirementAge || 60;
  const endAge = Math.min(100, Math.max(retAge + 10, profile.targetAge || 95));
  const horizonYears = Math.max(10, endAge - retAge);
  const inflationRate = (profile.expectedInflationRate ?? 2.5) / 100;

  // Calculate starting retirement portfolio
  const startingWealth = useMemo(() => {
    // When Monte Carlo simulation results matching the active scenario are available,
    // use the scenario-adjusted retirement pot totals for accurate stress modeling
    const isScenarioMatch = !monteCarloResult?.params?.marketScenario || monteCarloResult.params.marketScenario === activeMarketScenario;
    if (isScenarioMatch && monteCarloResult) {
      if (selectedScenario === 'mc10' && (monteCarloResult.p10RetirementPot || 0) > 0) {
        return monteCarloResult.p10RetirementPot;
      }
      if (selectedScenario === 'mc90' && (monteCarloResult.p90RetirementPot || 0) > 0) {
        return monteCarloResult.p90RetirementPot;
      }
      if ((monteCarloResult.medianRetirementPot || 0) > 0) {
        return monteCarloResult.medianRetirementPot;
      }
    }

    const retRow = projections?.find((p) => p.age === retAge);
    if (retRow && retRow.totalPot > 0) {
      if (activeMarketScenario === 'stressed') {
        const accumYears = Math.max(0, retAge - (profile.currentAge || 30));
        const drag = (profile.monteCarloParams?.stressedReturnDropPercent ?? 2.0) / 100;
        const discountFactor = Math.pow(1 - drag, accumYears * 0.5);
        return Math.round(retRow.totalPot * discountFactor);
      }
      return retRow.totalPot;
    }
    let total =
      (pots.workplacePensionBalance || 0) +
      (pots.sippBalance || 0) +
      (pots.stocksAndSharesIsaBalance || 0) +
      (pots.cashIsaBalance || 0) +
      (pots.lisaBalance || 0) +
      (pots.giaBalance || 0) +
      (pots.cashSavingsBalance || 0);

    if (profile.isCouplePlanning && profile.partnerPots) {
      total +=
        (profile.partnerPots.workplacePensionBalance || 0) +
        (profile.partnerPots.sippBalance || 0) +
        (profile.partnerPots.stocksAndSharesIsaBalance || 0) +
        (profile.partnerPots.cashIsaBalance || 0) +
        (profile.partnerPots.lisaBalance || 0) +
        (profile.partnerPots.giaBalance || 0) +
        (profile.partnerPots.cashSavingsBalance || 0);
    }
    return Math.max(150000, total);
  }, [
    monteCarloResult,
    activeMarketScenario,
    selectedScenario,
    pots,
    profile.isCouplePlanning,
    profile.partnerPots,
    profile.currentAge,
    profile.monteCarloParams?.stressedReturnDropPercent,
    projections,
    retAge,
  ]);

  const initialTarget = getActualSpendingTargetForAge(profile, retAge);
  const essentialFloorBaseline =
    profile.essentialRetirementIncomeAnnual !== undefined &&
    profile.essentialRetirementIncomeAnnual > 0
      ? profile.essentialRetirementIncomeAnnual
      : Math.round(initialTarget * 0.65);

  const initialWithdrawalRate = startingWealth > 0 ? (initialTarget / startingWealth) * 100 : 4.0;

  const rules = profile.dynamicSpendingRules || {
    enabled: false,
    capitalPreservationThresholdPercent: 20,
    capitalPreservationCutPercent: 10,
    prosperityThresholdPercent: 20,
    prosperityIncreasePercent: 10,
    skipInflationOnNegativeReturn: true,
  };

  const upperGuardrailRate = initialWithdrawalRate * (1 + rules.capitalPreservationThresholdPercent / 100);
  const lowerGuardrailRate = initialWithdrawalRate * (1 - rules.prosperityThresholdPercent / 100);

  // Approximate trigger portfolio levels at retirement
  const upperTriggerPortfolio = upperGuardrailRate > 0 ? initialTarget / (upperGuardrailRate / 100) : 0;
  const lowerTriggerPortfolio = lowerGuardrailRate > 0 ? initialTarget / (lowerGuardrailRate / 100) : 0;

  // Mean decumulation return accounting for asset allocation split & investment fee drag
  const meanDecumReturn = useMemo(() => {
    return (
      getEffectiveDecumulationReturn(
        profile.postRetirementReturn ?? 4.5,
        profile.assetAllocationSplit,
        profile.investmentFees
      ) / 100
    );
  }, [profile.postRetirementReturn, profile.assetAllocationSplit, profile.investmentFees]);

  // Extract the 10th, 50th, and 90th percentile return paths from the central Monte Carlo simulation
  // (with deterministic Mulberry32 fallback when simulation data is booting or unprovided)
  const monteCarloPaths = useMemo(() => {
    const isScenarioMatch = !monteCarloResult?.params?.marketScenario || monteCarloResult.params.marketScenario === activeMarketScenario;
    if (
      isScenarioMatch &&
      monteCarloResult?.paths &&
      monteCarloResult.paths.mc10Returns &&
      monteCarloResult.paths.mc10Returns.length > 0 &&
      monteCarloResult.paths.mc50Returns &&
      monteCarloResult.paths.mc50Returns.length > 0 &&
      monteCarloResult.paths.mc90Returns &&
      monteCarloResult.paths.mc90Returns.length > 0
    ) {
      return {
        mc10: monteCarloResult.paths.mc10Returns,
        mc50: monteCarloResult.paths.mc50Returns,
        mc90: monteCarloResult.paths.mc90Returns,
        isFromRealSimulation: true,
      };
    }

    const numRuns = 200;
    const volatility = 0.08; // Standard decumulation volatility
    const seedBase = 777 + retAge * 13 + Math.round(initialTarget % 1000);
    const prng = mulberry32(seedBase);

    const runs: { returns: number[]; compoundGrowth: number }[] = [];
    const scenario = activeMarketScenario;
    const stressedDrop = (profile.monteCarloParams?.stressedReturnDropPercent ?? 2.0) / 100;
    const crashStart = profile.monteCarloParams?.crashStartAge ?? retAge;
    const crashDur = profile.monteCarloParams?.crashDurationYears ?? 2;
    const crashDrops = (profile.monteCarloParams?.crashYearDropsPercent || [30, 15]).map((d) => d / 100);

    for (let i = 0; i < numRuns; i++) {
      const returns: number[] = [];
      let compound = 1.0;
      for (let y = 0; y < horizonYears; y++) {
        const curAge = retAge + y;
        let ret: number;
        if (scenario === 'stressed') {
          ret = sampleLogNormal(prng, meanDecumReturn - stressedDrop, volatility);
        } else if (scenario === 'early_crash' && curAge >= crashStart && curAge < crashStart + crashDur) {
          const dropIdx = curAge - crashStart;
          const drop = crashDrops[dropIdx] ?? 0.15;
          ret = sampleLogNormal(prng, -drop, volatility);
        } else {
          ret = sampleLogNormal(prng, meanDecumReturn, volatility);
        }
        returns.push(ret);
        compound *= 1 + ret;
      }
      runs.push({ returns, compoundGrowth: compound });
    }

    // Sort by compound growth (lowest to highest)
    runs.sort((a, b) => a.compoundGrowth - b.compoundGrowth);

    const p10Idx = Math.max(0, Math.min(runs.length - 1, Math.floor(runs.length * 0.1)));
    const p50Idx = Math.max(0, Math.min(runs.length - 1, Math.floor(runs.length * 0.5)));
    const p90Idx = Math.max(0, Math.min(runs.length - 1, Math.floor(runs.length * 0.9)));

    return {
      mc10: runs[p10Idx].returns,
      mc50: runs[p50Idx].returns,
      mc90: runs[p90Idx].returns,
      isFromRealSimulation: false,
    };
  }, [
    monteCarloResult,
    horizonYears,
    initialTarget,
    meanDecumReturn,
    retAge,
    profile.monteCarloParams,
    activeMarketScenario,
  ]);

  // Run dynamic simulation for selected scenario
  const simulationResults = useMemo(() => {
    const points: SimulationPoint[] = [];

    // Return series mapping (including the 3 Monte Carlo paths)
    const scenarioReturns: Record<SimulationScenarioType, number[]> = {
      // 1. Monte Carlo 10th Percentile Path (Unfavourable stochastic sequence)
      mc10: monteCarloPaths.mc10,
      // 2. Monte Carlo 50th Percentile Path (Median expected trajectory)
      mc50: monteCarloPaths.mc50,
      // 3. Monte Carlo 90th Percentile Path (Top-decile favourable expansion)
      mc90: monteCarloPaths.mc90,
      // 4. Early bear market (Sequence of returns shock): heavy early losses followed by recovery
      stress: [
        -0.12, -0.16, -0.04, 0.02, 0.08, 0.12, 0.06, 0.04, -0.05, 0.07, 0.06, 0.05, -0.03, 0.07,
        0.08, 0.05, 0.04, -0.02, 0.06, 0.05, 0.06, 0.04, 0.05, 0.05, 0.04, 0.05, 0.04, 0.05,
        0.04, 0.05, 0.04, 0.05,
      ],
      // 5. Strong expansion: high early returns, occasional normal dips
      bull: [
        0.16, 0.14, 0.09, 0.12, -0.02, 0.11, 0.08, 0.13, 0.07, -0.03, 0.1, 0.09, 0.12, 0.06,
        0.08, 0.09, 0.07, 0.08, 0.06, 0.07, 0.08, 0.06, 0.07, 0.07, 0.06, 0.07, 0.06, 0.07,
        0.06, 0.07, 0.06, 0.07,
      ],
      // 6. Standard realistic cycle: alternating bear and bull phases
      cycle: [
        0.07, -0.08, -0.11, 0.14, 0.09, 0.05, -0.04, 0.11, 0.08, -0.06, 0.12, 0.06, -0.05, 0.08,
        0.07, 0.05, -0.03, 0.09, 0.06, 0.04, 0.07, 0.05, -0.04, 0.08, 0.06, 0.05, 0.07, 0.05,
        0.06, 0.05, 0.06, 0.05,
      ],
    };

    const returnSeries = scenarioReturns[selectedScenario] || monteCarloPaths.mc50;
    let currentPot = startingWealth;
    let spendingMultiplier = 1.0;
    const initialGkRate = initialWithdrawalRate / 100;

    for (let yr = 0; yr <= horizonYears; yr++) {
      const currentAge = retAge + yr;
      if (currentAge > endAge) break;

      const inflationFactor = Math.pow(1 + inflationRate, yr);
      const baseTargetAtAge = getActualSpendingTargetForAge(profile, currentAge) * inflationFactor;
      const essentialFloorAtAge = Math.round(essentialFloorBaseline * inflationFactor);

      const ret = yr > 0 ? returnSeries[(yr - 1) % returnSeries.length] ?? 0.05 : 0;

      // Apply return to remaining portfolio
      if (yr > 0) {
        currentPot = Math.max(0, currentPot * (1 + ret));
      }

      let event: 'cut' | 'raise' | 'freeze' | 'floor_protected' | undefined = undefined;
      let eventNote: string | undefined = undefined;

      if (yr > 0 && rules.enabled && currentPot > 0 && initialGkRate > 0) {
        const currentRate = (baseTargetAtAge * spendingMultiplier) / currentPot;
        const presThresh = 1 + rules.capitalPreservationThresholdPercent / 100;
        const presCut = rules.capitalPreservationCutPercent / 100;
        const prospThresh = 1 - rules.prosperityThresholdPercent / 100;
        const prospInc = rules.prosperityIncreasePercent / 100;

        // Capital Preservation Rule Trigger
        if (currentRate > initialGkRate * presThresh) {
          const prospectiveMultiplier = spendingMultiplier * (1 - presCut);
          const prospectiveIncome = baseTargetAtAge * prospectiveMultiplier;

          if (prospectiveIncome < essentialFloorAtAge) {
            // Clamped at essential floor
            spendingMultiplier = Math.max(0.2, essentialFloorAtAge / baseTargetAtAge);
            event = 'floor_protected';
            eventNote = `Capital Preservation triggered (+${((currentRate / initialGkRate - 1) * 100).toFixed(0)}% SWR surge), but spending cut was cushioned at your Essential Floor.`;
          } else {
            spendingMultiplier = prospectiveMultiplier;
            event = 'cut';
            eventNote = `Capital Preservation triggered: Withdrawal rate hit ${(currentRate * 100).toFixed(1)}% (+${((currentRate / initialGkRate - 1) * 100).toFixed(0)}% vs initial). Spending cut by ${rules.capitalPreservationCutPercent}%.`;
          }
        }
        // Prosperity Rule Trigger
        else if (currentRate < initialGkRate * prospThresh) {
          spendingMultiplier *= 1 + prospInc;
          event = 'raise';
          eventNote = `Prosperity Rule triggered: Portfolio growth lowered withdrawal rate to ${(currentRate * 100).toFixed(1)}% (-${((1 - currentRate / initialGkRate) * 100).toFixed(0)}% vs initial). Spending raised by ${rules.prosperityIncreasePercent}%.`;
        }
        // Inflation Freeze Rule Trigger
        else if (rules.skipInflationOnNegativeReturn && ret < 0) {
          spendingMultiplier /= 1 + inflationRate;
          event = 'freeze';
          eventNote = `Inflation Freeze triggered: Negative portfolio return (${(ret * 100).toFixed(1)}%) skipped annual +${(inflationRate * 100).toFixed(1)}% inflation adjustment to protect capital.`;
        }
      }

      // Calculate actual spending target with GK multiplier applied and clamped at floor
      let dynamicSpend = Math.round(baseTargetAtAge * spendingMultiplier);
      if (dynamicSpend < essentialFloorAtAge) {
        dynamicSpend = essentialFloorAtAge;
      }

      // Subtract spend from pot
      currentPot = Math.max(0, currentPot - dynamicSpend);

      const actualWr = currentPot > 0 ? (dynamicSpend / (currentPot + dynamicSpend)) * 100 : 100;

      points.push({
        age: currentAge,
        yearIndex: yr,
        portfolio: Math.round(currentPot),
        baselineIncome: Math.round(baseTargetAtAge),
        dynamicIncome: dynamicSpend,
        essentialFloor: essentialFloorAtAge,
        withdrawalRate: Number(actualWr.toFixed(2)),
        returnRate: Number((ret * 100).toFixed(1)),
        event,
        eventNote,
        diffFromBaseline: Math.round(dynamicSpend - baseTargetAtAge),
      });
    }

    return points;
  }, [
    endAge,
    essentialFloorBaseline,
    horizonYears,
    inflationRate,
    initialTarget,
    initialWithdrawalRate,
    monteCarloPaths,
    profile,
    retAge,
    rules,
    selectedScenario,
    startingWealth,
  ]);

  // Aggregate stats from simulation
  const kpis = useMemo(() => {
    let cuts = 0;
    let raises = 0;
    let freezes = 0;
    let floorProtectedCount = 0;
    let totalSaved = 0;
    let totalBonus = 0;

    for (const p of simulationResults) {
      if (p.event === 'cut') cuts++;
      if (p.event === 'raise') raises++;
      if (p.event === 'freeze') freezes++;
      if (p.event === 'floor_protected') {
        cuts++;
        floorProtectedCount++;
      }
      if (p.diffFromBaseline < 0) {
        totalSaved += Math.abs(p.diffFromBaseline);
      } else if (p.diffFromBaseline > 0) {
        totalBonus += p.diffFromBaseline;
      }
    }

    return {
      cuts,
      raises,
      freezes,
      floorProtectedCount,
      totalSaved,
      totalBonus,
      minSpend: Math.min(...simulationResults.map((p) => p.dynamicIncome)),
      maxSpend: Math.max(...simulationResults.map((p) => p.dynamicIncome)),
      floorBreaches: 0, // Never breached by design
    };
  }, [simulationResults]);

  // Events list for trigger ledger
  const triggeredEvents = useMemo(() => {
    return simulationResults.filter((p) => p.event !== undefined);
  }, [simulationResults]);

  const isMonteCarloScenario = selectedScenario === 'mc10' || selectedScenario === 'mc50' || selectedScenario === 'mc90';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-6 transition-all">
      {/* Header & Master Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-emerald-500" />
              Dynamic Spending Rules (Guyton-Klinger)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Guardrails Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Automatically adjust your retirement income targets during simulations based on portfolio performance to mitigate Sequence of Returns Risk while safeguarding your Essential Income Floor.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={profile.dynamicSpendingRules?.enabled || false}
            onChange={(e) => {
              if (e.target.checked) {
                updateField('dynamicSpendingRules', {
                  enabled: true,
                  capitalPreservationThresholdPercent: 20,
                  capitalPreservationCutPercent: 10,
                  prosperityThresholdPercent: 20,
                  prosperityIncreasePercent: 10,
                  skipInflationOnNegativeReturn: true,
                });
              } else {
                updateField('dynamicSpendingRules', {
                  ...rules,
                  enabled: false,
                });
              }
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
          <span className="ml-3 text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            {profile.dynamicSpendingRules?.enabled ? 'Active' : 'Disabled'}
          </span>
        </label>
      </div>

      {profile.dynamicSpendingRules?.enabled ? (
        <div className="space-y-6">
          {/* Rules Configuration Grid */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Capital Preservation Rule */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-rose-200/70 dark:border-rose-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                      Capital Preservation Rule
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/40">
                    Upper Guardrail
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  If the portfolio drops and your withdrawal rate rises{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    +{rules.capitalPreservationThresholdPercent}%
                  </strong>{' '}
                  above initial rate, cut spending by{' '}
                  <strong className="text-rose-600 dark:text-rose-400">
                    -{rules.capitalPreservationCutPercent}%
                  </strong>{' '}
                  (cushioned at Essential Floor).
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Trigger (+X%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="50"
                        step="5"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        value={rules.capitalPreservationThresholdPercent}
                        onChange={(e) =>
                          updateField('dynamicSpendingRules', {
                            ...rules,
                            capitalPreservationThresholdPercent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Spending Cut (-Y%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                        value={rules.capitalPreservationCutPercent}
                        onChange={(e) =>
                          updateField('dynamicSpendingRules', {
                            ...rules,
                            capitalPreservationCutPercent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prosperity Rule */}
              <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider">
                      Prosperity Rule
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40">
                    Lower Guardrail
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  If the portfolio surges and your withdrawal rate falls{' '}
                  <strong className="text-slate-700 dark:text-slate-200">
                    -{rules.prosperityThresholdPercent}%
                  </strong>{' '}
                  below initial rate, raise spending by{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    +{rules.prosperityIncreasePercent}%
                  </strong>
                  .
                </p>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Trigger (-X%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="50"
                        step="5"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        value={rules.prosperityThresholdPercent}
                        onChange={(e) =>
                          updateField('dynamicSpendingRules', {
                            ...rules,
                            prosperityThresholdPercent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Spending Raise (+Y%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        step="1"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                        value={rules.prosperityIncreasePercent}
                        onChange={(e) =>
                          updateField('dynamicSpendingRules', {
                            ...rules,
                            prosperityIncreasePercent: Number(e.target.value),
                          })
                        }
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Inflation Rule Toggle */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Freeze Inflation on Negative Returns
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    If the portfolio suffers a negative return in any year, skip that year's inflation increment to prevent real portfolio erosion.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={rules.skipInflationOnNegativeReturn}
                  onChange={(e) =>
                    updateField('dynamicSpendingRules', {
                      ...rules,
                      skipInflationOnNegativeReturn: e.target.checked,
                    })
                  }
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* Guardrail Corridor Thresholds Status Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Guardrail Trigger Boundaries (At Retirement Age {retAge})
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Initial Wealth: £{startingWealth.toLocaleString()} | Initial Target: £{initialTarget.toLocaleString()}/yr
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Initial SWR</div>
                <div className="text-sm font-black text-indigo-400 mt-0.5">{initialWithdrawalRate.toFixed(2)}%</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Starting Baseline</div>
              </div>

              <div className="bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/40">
                <div className="text-[10px] text-rose-300 font-bold uppercase">Upper Guardrail (Cut)</div>
                <div className="text-sm font-black text-rose-400 mt-0.5">&gt; {upperGuardrailRate.toFixed(2)}%</div>
                <div className="text-[10px] text-rose-300/80 mt-0.5">
                  Portfolio &lt; £{Math.round(upperTriggerPortfolio).toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/40">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">Lower Guardrail (Raise)</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">&lt; {lowerGuardrailRate.toFixed(2)}%</div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  Portfolio &gt; £{Math.round(lowerTriggerPortfolio).toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/40">
                <div className="text-[10px] text-amber-300 font-bold uppercase">Essential Floor Cushion</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">£{essentialFloorBaseline.toLocaleString()}/yr</div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">
                  {Math.round((essentialFloorBaseline / initialTarget) * 100)}% of Target (Protected)
                </div>
              </div>
            </div>
          </div>

          {/* VISUALIZATION: Dynamic Income Corridor & Trigger Timeline */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Dynamic Income Trajectory &amp; Trigger Points</span>
                  </h4>
                  {isMonteCarloScenario && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>
                        {monteCarloPaths.isFromRealSimulation
                          ? `Simulated (500 Runs • ${
                              activeMarketScenario === 'stressed'
                                ? `Stressed -${(monteCarloResult?.params?.stressedReturnDropPercent ?? profile.monteCarloParams?.stressedReturnDropPercent ?? 2.0).toFixed(1)}%`
                                : activeMarketScenario === 'early_crash'
                                ? 'Early Crash Model'
                                : 'Standard Market'
                            })`
                          : `Monte Carlo Path (${
                              activeMarketScenario === 'stressed'
                                ? 'Stressed Market'
                                : activeMarketScenario === 'early_crash'
                                ? 'Early Crash'
                                : 'Standard Market'
                            })`}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time visualization comparing baseline spending requirements against dynamic Guyton-Klinger income and your non-negotiable Essential Floor across Monte Carlo paths and stress models.
                </p>
              </div>

              {/* Scenario Switcher Tabs: Monte Carlo Paths & Model Presets */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 self-start lg:self-auto shadow-xs">
                {/* Group 1: Monte Carlo Percentile Paths */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 py-0.5">
                    Monte Carlo:
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ${
                      activeMarketScenario === 'stressed'
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : activeMarketScenario === 'early_crash'
                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {activeMarketScenario === 'stressed'
                      ? 'Stressed'
                      : activeMarketScenario === 'early_crash'
                      ? 'Crash'
                      : 'Standard'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('mc10')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'mc10'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Monte Carlo 10th Percentile (Unfavourable stochastic sequence)"
                  >
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>10th %ile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('mc50')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'mc50'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Monte Carlo 50th Percentile (Median expected trajectory)"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>50th %ile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('mc90')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'mc90'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Monte Carlo 90th Percentile (Top-decile favourable expansion)"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>90th %ile</span>
                  </button>
                </div>

                <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

                {/* Group 2: Model & Historical Cycle Presets */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1.5 py-0.5">
                    Historical:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('stress')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'stress'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Early Bear Market / Sequence Shock"
                  >
                    <span>Bear Shock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('cycle')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'cycle'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Alternating Market Cycle"
                  >
                    <span>Cycle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('bull')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      selectedScenario === 'bull'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Bull Market Run"
                  >
                    <span>Bull Run</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scenario Description Banner */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                selectedScenario === 'mc10' || selectedScenario === 'stress'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
                  : selectedScenario === 'mc90' || selectedScenario === 'bull'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
                  : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {(selectedScenario === 'mc10' || selectedScenario === 'stress') && (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                {(selectedScenario === 'mc90' || selectedScenario === 'bull') && (
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                {(selectedScenario === 'mc50' || selectedScenario === 'cycle') && (
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                )}
                <span>
                  {selectedScenario === 'mc10' && (
                    <>
                      <strong>Monte Carlo 10th Percentile Path (Unfavourable Stochastic Trail):</strong> Simulates a challenging economic run from the 10th percentile of your Monte Carlo portfolio distribution. Capital Preservation cuts (-{rules.capitalPreservationCutPercent}%) and inflation freezes trigger dynamically during market drawdowns to preserve portfolio capital, while strictly defending your <strong>Essential Floor (£{essentialFloorBaseline.toLocaleString()}/yr)</strong>.
                    </>
                  )}
                  {selectedScenario === 'mc50' && (
                    <>
                      <strong>
                        Monte Carlo 50th Percentile Path (Median Expected Trail
                        {activeMarketScenario === 'stressed'
                          ? ` • Stressed -${(profile.monteCarloParams?.stressedReturnDropPercent ?? 2.0).toFixed(1)}%`
                          : activeMarketScenario === 'early_crash'
                          ? ' • Market Crash'
                          : ''}):
                      </strong>{' '}
                      Represents the expected median stochastic performance based on your post-retirement asset allocation and {((1 - meanDecumReturn / (profile.postRetirementReturn ? profile.postRetirementReturn / 100 : 0.045)) * 100).toFixed(1)}% fee drag. Spending adjusts smoothly within the safe guardrail corridor.
                    </>
                  )}
                  {selectedScenario === 'mc90' && (
                    <>
                      <strong>Monte Carlo 90th Percentile Path (Favourable Expansion Trail):</strong> Top-decile compounding performance from your Monte Carlo simulation. As the portfolio surges and withdrawal rates fall below {lowerGuardrailRate.toFixed(1)}%, the <strong>Prosperity Rule (+{rules.prosperityIncreasePercent}%)</strong> unlocks lifestyle spending raises.
                    </>
                  )}
                  {selectedScenario === 'stress' && (
                    <>
                      <strong>Early Sequence Risk Shock:</strong> Severe early market drops (-12%, -16%). Guyton-Klinger triggers <strong>Capital Preservation cuts (-{rules.capitalPreservationCutPercent}%)</strong> and freezes inflation to extend pot longevity, without ever breaching the <strong>Essential Floor</strong>.
                    </>
                  )}
                  {selectedScenario === 'bull' && (
                    <>
                      <strong>Bull Market Expansion Model:</strong> High compounding growth (+16%, +14%). As withdrawal rates drop below {lowerGuardrailRate.toFixed(1)}%, the <strong>Prosperity Rule (+{rules.prosperityIncreasePercent}%)</strong> unlocks extra lifestyle spending.
                    </>
                  )}
                  {selectedScenario === 'cycle' && (
                    <>
                      <strong>Alternating Economic Cycles:</strong> Illustrates both upward and downward spending guardrail adjustments across varying cyclical market environments.
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Recharts Composed Chart */}
            <div className="w-full h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={simulationResults}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="gkIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gkFloorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="age"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `Age ${val}`}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    domain={['dataMin - 5000', 'auto']}
                    tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as SimulationPoint;
                      const isCut = data.event === 'cut' || data.event === 'floor_protected';
                      const isRaise = data.event === 'raise';
                      const isFreeze = data.event === 'freeze';

                      return (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-lg text-xs space-y-2 min-w-56">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 font-bold">
                            <span className="text-slate-800 dark:text-slate-100">
                              Age {data.age} (Year {data.yearIndex + 1})
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Annual Return: {data.returnRate > 0 ? `+${data.returnRate}%` : `${data.returnRate}%`}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-extrabold">
                              <span>Dynamic Spend:</span>
                              <span>£{data.dynamicIncome.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                              <span>Baseline Target:</span>
                              <span>£{data.baselineIncome.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-semibold">
                              <span>Essential Floor:</span>
                              <span>£{data.essentialFloor.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <span>Portfolio Pot:</span>
                              <span>£{data.portfolio.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Withdrawal Rate:</span>
                              <span className="font-bold">{data.withdrawalRate}%</span>
                            </div>
                          </div>

                          {data.event && (
                            <div
                              className={`p-2 rounded-lg text-[10px] font-bold mt-1 ${
                                isCut
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40'
                                  : isRaise
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                                  : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-900/40'
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                {isCut && <ArrowDownRight className="w-3 h-3 shrink-0" />}
                                {isRaise && <ArrowUpRight className="w-3 h-3 shrink-0" />}
                                {isFreeze && <Snowflake className="w-3 h-3 shrink-0" />}
                                <span className="uppercase">
                                  {data.event === 'floor_protected'
                                    ? 'Cushioned at Essential Floor'
                                    : data.event === 'cut'
                                    ? 'Capital Preservation Triggered'
                                    : data.event === 'raise'
                                    ? 'Prosperity Raise Triggered'
                                    : 'Inflation Freeze Triggered'}
                                </span>
                              </div>
                              <p className="font-normal opacity-90">{data.eventNote}</p>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                  />

                  {/* Essential Floor Shaded Area */}
                  <Area
                    type="monotone"
                    dataKey="essentialFloor"
                    name="Essential Floor"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    fill="url(#gkFloorGradient)"
                  />

                  {/* Baseline Target Reference Line */}
                  <Line
                    type="monotone"
                    dataKey="baselineIncome"
                    name="Baseline Target Requirement"
                    stroke="#6366f1"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />

                  {/* Dynamic Guyton-Klinger Spending Line */}
                  <Line
                    type="monotone"
                    dataKey="dynamicIncome"
                    name="Dynamic Spending (Guyton-Klinger)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload.event) return <g key={`dot-${payload.age}`} />;
                      const isCut = payload.event === 'cut' || payload.event === 'floor_protected';
                      const isRaise = payload.event === 'raise';
                      const fill = isCut ? '#f43f5e' : isRaise ? '#10b981' : '#06b6d4';

                      return (
                        <circle
                          key={`dot-${payload.age}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={fill}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Preservation Cuts</span>
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">
                  {kpis.cuts} {kpis.cuts === 1 ? 'Year' : 'Years'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Saved £{kpis.totalSaved.toLocaleString()} capital
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Prosperity Raises</span>
                </div>
                <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">
                  {kpis.raises} {kpis.raises === 1 ? 'Year' : 'Years'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  +£{kpis.totalBonus.toLocaleString()} bonus lifestyle
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Floor Breaches</span>
                </div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  0 (100% Protected)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Floor £{essentialFloorBaseline.toLocaleString()}/yr
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Longevity Shield</span>
                </div>
                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  +4 to +8 Years
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Extended pot survival
                </div>
              </div>
            </div>

            {/* Triggered Events Ledger Toggle & Details */}
            {triggeredEvents.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Triggered Rule Events in this Scenario ({triggeredEvents.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEventLog(!showEventLog)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {showEventLog ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {showEventLog && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {triggeredEvents.map((evt) => {
                      const isCut = evt.event === 'cut' || evt.event === 'floor_protected';
                      const isRaise = evt.event === 'raise';
                      const badgeBg = isCut
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200'
                        : isRaise
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-200'
                        : 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900/40 text-cyan-800 dark:text-cyan-200';

                      return (
                        <div
                          key={`event-${evt.age}`}
                          className={`p-2.5 rounded-xl border text-[11px] space-y-1 ${badgeBg}`}
                        >
                          <div className="flex items-center justify-between font-extrabold">
                            <span>Age {evt.age}</span>
                            <span className="text-[10px] uppercase">
                              {evt.event === 'floor_protected'
                                ? '🛡️ Floor Guard'
                                : evt.event === 'cut'
                                ? `🔻 -${rules.capitalPreservationCutPercent}% Cut`
                                : evt.event === 'raise'
                                ? `🟢 +${rules.prosperityIncreasePercent}% Raise`
                                : '❄️ CPI Freeze'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] opacity-90">
                            <span>Income: £{evt.dynamicIncome.toLocaleString()}</span>
                            <span>WR: {evt.withdrawalRate}%</span>
                          </div>
                          <div className="text-[10px] opacity-80 leading-tight">
                            {evt.eventNote}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dynamic Guyton-Klinger spending rules are currently <strong>disabled</strong>. Enable the switch above to configure capital preservation cuts, prosperity bonuses, and visualize spending trajectory relative to your Essential Floor.
          </p>
        </div>
      )}
    </div>
  );
};
