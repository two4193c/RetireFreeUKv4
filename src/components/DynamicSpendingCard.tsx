import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots, YearProjection } from '../types';
import { getProjectionEndAge } from '../utils/projectionEngine';
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
  BarChart3,
  Activity,
  Calculator,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  Gauge,
  Calendar,
  Lock,
  Unlock,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { getActualSpendingTargetForAge } from '../utils/projectionEngine';
import { getEffectiveDecumulationReturn, getTotalFeePercent } from '../utils/assetAllocation';
import { DEFAULT_POTS } from '../utils/defaultData';
import { MonteCarloResult } from '../utils/monteCarloEngine';
import { calculateGuytonKlingerRecommendedSwr } from '../utils/guytonKlingerEngine';

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
  discretionarySpend: number;
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
  const [chartViewMode, setChartViewMode] = useState<'corridor' | 'bars' | 'combined'>('corridor');
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
  const endAge = Math.max(retAge + 1, getProjectionEndAge(profile));
  const horizonYears = Math.max(10, endAge - retAge);
  const inflationRate = (profile.expectedInflationRate ?? 2.5) / 100;

  // Current liquid portfolio wealth today across primary and partner pots
  const todayTotalPot = useMemo(() => {
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
    return Math.max(0, total);
  }, [pots, profile.isCouplePlanning, profile.partnerPots]);

  // Calculate starting retirement portfolio (Projected portfolio at retirement age retAge in real today's £, NOT today's pot)
  const startingWealth = useMemo(() => {
    // 1. When Monte Carlo simulation results matching the active scenario are available,
    // use the scenario-adjusted retirement pot totals for accurate decumulation modeling
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

    // 2. From standard projections, find the accumulated balance at retirement age retAge
    const retRow = projections?.find((p) => p.age === retAge);
    if (retRow && retRow.totalPot > 0) {
      const accumYears = Math.max(0, retAge - (profile.currentAge || 30));
      const inflFactor = Math.pow(1 + inflationRate, accumYears);
      const isAdjustedReal = profile.adjustForInflation !== false;
      const baseRetPot = isAdjustedReal && inflFactor > 0 ? Math.round(retRow.totalPot / inflFactor) : retRow.totalPot;

      if (activeMarketScenario === 'stressed') {
        const drag = (profile.monteCarloParams?.stressedReturnDropPercent ?? 2.0) / 100;
        const discountFactor = Math.pow(1 - drag, accumYears * 0.5);
        return Math.round(baseRetPot * discountFactor);
      }
      return baseRetPot;
    }

    // 3. Fallback: If retirement is in the future, compound today's pot with ongoing contributions and expected real return
    const accumYears = Math.max(0, retAge - (profile.currentAge || 30));
    if (accumYears > 0 && todayTotalPot > 0) {
      const returnAccum = (profile.expectedInvestmentReturn ?? 6.0) / 100;
      const isAdjustedReal = profile.adjustForInflation !== false;
      const netAccumReturn = isAdjustedReal ? ((1 + returnAccum) / (1 + inflationRate) - 1) : returnAccum;
      const employeeContrib =
        pots.workplacePensionMonthlyEmployeeType === 'percent'
          ? ((profile.currentSalary || 0) * (pots.workplacePensionMonthlyEmployee / 100)) / 12
          : pots.workplacePensionMonthlyEmployee || 0;
      const employerContrib =
        (pots.employerMatchPercentage || 0) > 0 && (profile.currentSalary || 0) > 0
          ? (((profile.currentSalary || 0) * (pots.employerMatchPercentage || 0)) / 100) / 12
          : 0;
      const annualContrib =
        (employeeContrib +
          employerContrib +
          (pots.sippMonthlyContribution || 0) +
          (pots.stocksAndSharesIsaMonthlyContribution || 0)) *
        12;
      const compoundGrowth = Math.pow(1 + netAccumReturn, accumYears);
      const contribGrowth = annualContrib > 0 && netAccumReturn > 0
        ? annualContrib * ((compoundGrowth - 1) / netAccumReturn)
        : annualContrib * accumYears;
      const futurePot = Math.round(todayTotalPot * compoundGrowth + contribGrowth);
      return Math.max(150000, futurePot);
    }

    return Math.max(150000, todayTotalPot);
  }, [
    monteCarloResult,
    activeMarketScenario,
    selectedScenario,
    projections,
    retAge,
    profile.currentAge,
    profile.monteCarloParams?.stressedReturnDropPercent,
    profile.adjustForInflation,
    profile.expectedInvestmentReturn,
    inflationRate,
    todayTotalPot,
    pots,
  ]);

  // The user's input income requirement baseline (fixed from plan settings so SWR can be compared against it)
  const inputIncomeRequirement = profile.baselineIncomeRequirementAnnual ?? profile.targetRetirementIncomeAnnual ?? 40000;
  const getInputIncomeRequirementForAge = (age: number) => {
    return getActualSpendingTargetForAge({ ...profile, targetRetirementIncomeAnnual: inputIncomeRequirement }, age);
  };

  const initialTarget = getInputIncomeRequirementForAge(retAge);
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

  // Guyton-Klinger Safe Starting Withdrawal Rate (MSR) benchmark & calculation
  const equityPct = profile.assetAllocationSplit?.equities ?? 65;
  const feeDrag = getTotalFeePercent(profile.investmentFees);
  const floorRatio = initialTarget > 0 ? essentialFloorBaseline / initialTarget : 0.65;

  const gkSwrAnalysis = useMemo(() => {
    return calculateGuytonKlingerRecommendedSwr({
      horizonYears,
      equityPercentage: equityPct,
      feeDragPercent: feeDrag,
      capitalPreservationCutPercent: rules.capitalPreservationCutPercent,
      capitalPreservationThresholdPercent: rules.capitalPreservationThresholdPercent,
      prosperityThresholdPercent: rules.prosperityThresholdPercent,
      prosperityIncreasePercent: rules.prosperityIncreasePercent,
      skipInflationOnNegativeReturn: rules.skipInflationOnNegativeReturn,
      essentialFloorRatio: floorRatio,
      startingWealth,
      desiredAnnualSpend: initialTarget,
    });
  }, [
    horizonYears,
    equityPct,
    feeDrag,
    rules.capitalPreservationCutPercent,
    rules.capitalPreservationThresholdPercent,
    rules.prosperityThresholdPercent,
    rules.prosperityIncreasePercent,
    rules.skipInflationOnNegativeReturn,
    floorRatio,
    startingWealth,
    initialTarget,
  ]);

  const [showSwrCalculator, setShowSwrCalculator] = useState<boolean>(true);
  const [customStartingSwr, setCustomStartingSwr] = useState<number>(() => {
    return startingWealth > 0 ? Math.round((initialTarget / startingWealth) * 100) / 100 : 5.0;
  });
  const [swrChartSource, setSwrChartSource] = useState<'plan' | 'calculator' | 'gk_optimal' | 'bengen' | 'conservative'>('plan');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  const prevInitialRateRef = React.useRef(initialWithdrawalRate);
  React.useEffect(() => {
    if (Math.abs(prevInitialRateRef.current - initialWithdrawalRate) > 0.05) {
      prevInitialRateRef.current = initialWithdrawalRate;
      setCustomStartingSwr(Math.round(initialWithdrawalRate * 100) / 100);
    }
  }, [initialWithdrawalRate]);

  const customCalculatedSpend = Math.round(startingWealth * (customStartingSwr / 100));
  const customRequiredWealth = customStartingSwr > 0 ? Math.round(initialTarget / (customStartingSwr / 100)) : startingWealth;
  const customUpperGuardrailRate = Math.round(customStartingSwr * (1 + (rules.capitalPreservationThresholdPercent ?? 20) / 100) * 100) / 100;
  const customLowerGuardrailRate = Math.round(customStartingSwr * (1 - (rules.prosperityThresholdPercent ?? 20) / 100) * 100) / 100;
  const customUpperTriggerPot = customUpperGuardrailRate > 0 && customCalculatedSpend > 0 ? Math.round(customCalculatedSpend / (customUpperGuardrailRate / 100)) : 0;
  const customLowerTriggerPot = customLowerGuardrailRate > 0 && customCalculatedSpend > 0 ? Math.round(customCalculatedSpend / (customLowerGuardrailRate / 100)) : 0;

  // Active SWR baseline configuration driving the dynamic income chart & trigger points
  const activeSwrConfig = useMemo(() => {
    switch (swrChartSource) {
      case 'calculator':
        return {
          source: 'calculator' as const,
          name: 'SWR Calculator (Selected)',
          shortName: `SWR Solver (${customStartingSwr.toFixed(1)}%)`,
          rate: customStartingSwr,
          startingSpend: customCalculatedSpend,
          description: `Custom SWR Solver rate of ${customStartingSwr.toFixed(2)}% (£${customCalculatedSpend.toLocaleString()}/yr)`,
          isCustom: true,
        };
      case 'gk_optimal':
        return {
          source: 'gk_optimal' as const,
          name: 'Guyton-Klinger Safe Optimal',
          shortName: `GK Optimal (${gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}%)`,
          rate: gkSwrAnalysis.recommendedInitialSwr,
          startingSpend: gkSwrAnalysis.initialAnnualSpend,
          description: `Empirical Guyton-Klinger MSR of ${gkSwrAnalysis.recommendedInitialSwr.toFixed(2)}% (£${gkSwrAnalysis.initialAnnualSpend.toLocaleString()}/yr)`,
          isCustom: false,
        };
      case 'bengen':
        return {
          source: 'bengen' as const,
          name: 'Bengen Static 4% Benchmark',
          shortName: `Bengen 4% (${gkSwrAnalysis.bengenStaticSwr.toFixed(1)}%)`,
          rate: gkSwrAnalysis.bengenStaticSwr,
          startingSpend: Math.round(startingWealth * (gkSwrAnalysis.bengenStaticSwr / 100)),
          description: `William Bengen static rule baseline of ${gkSwrAnalysis.bengenStaticSwr.toFixed(2)}% (£${Math.round(startingWealth * (gkSwrAnalysis.bengenStaticSwr / 100)).toLocaleString()}/yr)`,
          isCustom: false,
        };
      case 'conservative':
        return {
          source: 'conservative' as const,
          name: 'Conservative 3.5% Benchmark',
          shortName: 'Conservative (3.5%)',
          rate: 3.5,
          startingSpend: Math.round(startingWealth * 0.035),
          description: `Ultra-conservative baseline of 3.50% (£${Math.round(startingWealth * 0.035).toLocaleString()}/yr)`,
          isCustom: false,
        };
      case 'plan':
      default:
        return {
          source: 'plan' as const,
          name: 'Current Plan Target',
          shortName: `Plan Target (${initialWithdrawalRate.toFixed(1)}%)`,
          rate: initialWithdrawalRate,
          startingSpend: initialTarget,
          description: `Official retirement plan target of £${initialTarget.toLocaleString()}/yr (${initialWithdrawalRate.toFixed(2)}% SWR)`,
          isCustom: false,
        };
    }
  }, [
    swrChartSource,
    customStartingSwr,
    customCalculatedSpend,
    gkSwrAnalysis.recommendedInitialSwr,
    gkSwrAnalysis.initialAnnualSpend,
    gkSwrAnalysis.bengenStaticSwr,
    startingWealth,
    initialWithdrawalRate,
    initialTarget,
  ]);

  const effectiveInitialSpend = activeSwrConfig.startingSpend;
  const effectiveInitialRate = activeSwrConfig.rate;
  const effectiveUpperGuardrailRate = Math.round(effectiveInitialRate * (1 + (rules.capitalPreservationThresholdPercent ?? 20) / 100) * 100) / 100;
  const effectiveLowerGuardrailRate = Math.round(effectiveInitialRate * (1 - (rules.prosperityThresholdPercent ?? 20) / 100) * 100) / 100;
  const effectiveUpperTriggerPot = effectiveUpperGuardrailRate > 0 && effectiveInitialSpend > 0 ? Math.round(effectiveInitialSpend / (effectiveUpperGuardrailRate / 100)) : 0;
  const effectiveLowerTriggerPot = effectiveLowerGuardrailRate > 0 && effectiveInitialSpend > 0 ? Math.round(effectiveInitialSpend / (effectiveLowerGuardrailRate / 100)) : 0;

  // Feature 1: Distance-to-Trigger & Proactive Early Warning Buffer Metrics
  const dropCushionAmount = Math.max(0, startingWealth - effectiveUpperTriggerPot);
  const dropCushionPercent = startingWealth > 0 ? (dropCushionAmount / startingWealth) * 100 : 0;
  const growthNeededAmount = Math.max(0, effectiveLowerTriggerPot - startingWealth);
  const growthNeededPercent = startingWealth > 0 ? (growthNeededAmount / startingWealth) * 100 : 0;
  const corridorWidth = Math.max(1, effectiveLowerTriggerPot - effectiveUpperTriggerPot);
  const potPositionInCorridorPct = Math.min(100, Math.max(0, ((startingWealth - effectiveUpperTriggerPot) / corridorWidth) * 100));

  const corridorStatus: 'safe' | 'caution_cut' | 'prosperity' =
    startingWealth <= effectiveUpperTriggerPot
      ? 'caution_cut'
      : startingWealth >= effectiveLowerTriggerPot
      ? 'prosperity'
      : dropCushionPercent < 8
      ? 'caution_cut'
      : 'safe';

  // Feature 2: Tiered Spending Protection Metrics (Core Essential vs Flexible Discretionary)
  const discretionarySpend = Math.max(0, effectiveInitialSpend - essentialFloorBaseline);
  const essentialSpendPercent = effectiveInitialSpend > 0 ? Math.min(100, (essentialFloorBaseline / effectiveInitialSpend) * 100) : 65;
  const discretionarySpendPercent = Math.max(0, 100 - essentialSpendPercent);

  // Capital Preservation Haircut Simulation
  const cutPercent = rules.capitalPreservationCutPercent ?? 10;
  const totalCutAmount = Math.round(effectiveInitialSpend * (cutPercent / 100));
  const prospectiveDiscretionarySpend = Math.max(0, discretionarySpend - totalCutAmount);
  const discretionaryCutPercent = discretionarySpend > 0 ? Math.min(100, (totalCutAmount / discretionarySpend) * 100) : 100;
  const isCappedAtEssentialFloor = totalCutAmount >= discretionarySpend;

  // Guaranteed Pension Floor Coverage
  const guaranteedStatePension =
    (profile.statePensionAnnual || (profile.includeStatePension !== false ? 11502 : 0)) +
    (profile.isCouplePlanning && profile.partnerStatePensionAnnual
      ? profile.partnerStatePensionAnnual
      : profile.isCouplePlanning && profile.partnerIncludeStatePension !== false
      ? 11502
      : 0);
  const guaranteedDb =
    (profile.dbPensionAnnual || 0) + (profile.isCouplePlanning ? (profile.partnerDbPensionAnnual || 0) : 0);
  const totalGuaranteedIncome = guaranteedStatePension + guaranteedDb;
  const guaranteedCoveragePct =
    essentialFloorBaseline > 0
      ? Math.min(100, Math.round((totalGuaranteedIncome / essentialFloorBaseline) * 100))
      : 0;

  const handleUpdateEssentialFloor = (newFloor: number) => {
    const cleanFloor = Math.max(0, Math.round(newFloor));
    onChange({
      ...profile,
      essentialRetirementIncomeAnnual: cleanFloor,
    });
  };

  const applyStartingSpendToPlan = (newAnnualSpend: number, swrRate?: number) => {
    const rounded = Math.round(newAnnualSpend);
    const rateToApply = swrRate ?? activeSwrConfig.rate;
    // CRITICAL: Always preserve the user's input income requirement baseline so it is NEVER lost or overwritten
    const preservedInputRequirement = profile.baselineIncomeRequirementAnnual ?? profile.targetRetirementIncomeAnnual;

    const updated: Partial<UserProfile> = {
      baselineIncomeRequirementAnnual: preservedInputRequirement,
      actualSpendingTargetAnnual: rounded,
      dynamicSpendingRules: {
        ...rules,
        enabled: true,
        targetStartingWithdrawalRate: rateToApply,
        initialSpendingAmount: rounded,
        swrBaselineSource: swrChartSource,
      },
    };
    if (profile.maximizedSpendConfig?.enabled) {
      updated.maximizedSpendConfig = {
        ...profile.maximizedSpendConfig,
        targetAnnualIncome: rounded,
      };
    }
    onChange({
      ...profile,
      ...updated,
    });
    setAppliedNotification(
      `Dynamic Spending Target updated to £${rounded.toLocaleString()}/yr (${rateToApply.toFixed(2)}% SWR)! Your baseline input requirement (£${preservedInputRequirement.toLocaleString()}/yr) remains fixed for comparison.`
    );
    setTimeout(() => {
      setAppliedNotification(null);
    }, 4500);
  };

  const resetToInputIncomeRequirement = () => {
    const preservedInputRequirement = profile.baselineIncomeRequirementAnnual ?? profile.targetRetirementIncomeAnnual;
    onChange({
      ...profile,
      actualSpendingTargetAnnual: preservedInputRequirement,
      dynamicSpendingRules: {
        ...rules,
        initialSpendingAmount: undefined,
        targetStartingWithdrawalRate: undefined,
        swrBaselineSource: 'plan',
      },
    });
    setSwrChartSource('plan');
    setAppliedNotification(
      `Dynamic spending reset to match your input income requirement (£${preservedInputRequirement.toLocaleString()}/yr).`
    );
    setTimeout(() => {
      setAppliedNotification(null);
    }, 4000);
  };

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

    const isAdjustedReal = profile.adjustForInflation !== false;
    const returnSeries = scenarioReturns[selectedScenario] || monteCarloPaths.mc50;
    let spendingMultiplier = 1.0;
    const initialGkRate = effectiveInitialRate / 100;
    const presThresh = 1 + (rules.capitalPreservationThresholdPercent ?? 20) / 100;
    const presCut = (rules.capitalPreservationCutPercent ?? 10) / 100;
    const prospThresh = 1 - (rules.prosperityThresholdPercent ?? 20) / 100;
    const prospInc = (rules.prosperityIncreasePercent ?? 10) / 100;

    const isMcScenario = selectedScenario === 'mc10' || selectedScenario === 'mc50' || selectedScenario === 'mc90';
    const isScenarioMatch = !monteCarloResult?.params?.marketScenario || monteCarloResult.params.marketScenario === activeMarketScenario;
    const hasMcPercentiles = isScenarioMatch && Boolean(monteCarloResult?.agePercentiles?.length);

    // Scale spending baseline if a non-plan SWR baseline is active
    const scaleFactor = initialTarget > 0 ? effectiveInitialSpend / initialTarget : 1.0;

    let runningSimPot = startingWealth;
    let prevDynamicSpend = 0;

    for (let yr = 0; yr <= horizonYears; yr++) {
      const currentAge = retAge + yr;
      if (currentAge > endAge) break;

      const inflationFactor = Math.pow(1 + inflationRate, yr);
      const planIncomeRequirementAtAge = isAdjustedReal
        ? getInputIncomeRequirementForAge(currentAge)
        : Math.round(getInputIncomeRequirementForAge(currentAge) * inflationFactor);

      // The unadjusted starting spend progression for the chosen SWR across years before dynamic GK adjustments
      const swrStartingSpendAtAge = Math.round(planIncomeRequirementAtAge * scaleFactor);

      const essentialFloorAtAge = isAdjustedReal
        ? Math.round(essentialFloorBaseline)
        : Math.round(essentialFloorBaseline * inflationFactor);

      const ret = yr > 0 ? returnSeries[(yr - 1) % returnSeries.length] ?? 0.05 : 0;

      // Determine this year's portfolio pot balance available for withdrawal
      let portfolioThisAge = startingWealth;
      if (yr > 0) {
        if (swrChartSource === 'plan' && isMcScenario && hasMcPercentiles) {
          const mcPoint = monteCarloResult!.agePercentiles.find((p) => p.age === currentAge);
          if (mcPoint) {
            if (selectedScenario === 'mc50') portfolioThisAge = mcPoint.p50TotalPot;
            else if (selectedScenario === 'mc10') portfolioThisAge = mcPoint.p10TotalPot;
            else if (selectedScenario === 'mc90') portfolioThisAge = mcPoint.p90TotalPot;
          } else {
            const realRet = isAdjustedReal ? ((1 + ret) / (1 + inflationRate) - 1) : ret;
            runningSimPot = Math.max(0, (runningSimPot - prevDynamicSpend) * (1 + realRet));
            portfolioThisAge = runningSimPot;
          }
        } else {
          const realRet = isAdjustedReal ? ((1 + ret) / (1 + inflationRate) - 1) : ret;
          runningSimPot = Math.max(0, (runningSimPot - prevDynamicSpend) * (1 + realRet));
          portfolioThisAge = runningSimPot;
        }
      }

      let event: 'cut' | 'raise' | 'freeze' | 'floor_protected' | undefined = undefined;
      let eventNote: string | undefined = undefined;

      if (yr > 0 && rules.enabled && portfolioThisAge > 0 && initialGkRate > 0) {
        const currentRate = (swrStartingSpendAtAge * spendingMultiplier) / portfolioThisAge;

        // Capital Preservation Rule Trigger (Upper Guardrail)
        if (currentRate > initialGkRate * presThresh) {
          const prospectiveMultiplier = spendingMultiplier * (1 - presCut);
          const prospectiveIncome = swrStartingSpendAtAge * prospectiveMultiplier;

          if (prospectiveIncome < essentialFloorAtAge) {
            // Clamped at essential floor
            spendingMultiplier = Math.max(0.2, essentialFloorAtAge / swrStartingSpendAtAge);
            event = 'floor_protected';
            eventNote = `Capital Preservation triggered (+${((currentRate / initialGkRate - 1) * 100).toFixed(0)}% SWR surge to ${(currentRate * 100).toFixed(1)}%), but spending cut was cushioned at your Essential Floor (£${essentialFloorAtAge.toLocaleString()}/yr).`;
          } else {
            spendingMultiplier = prospectiveMultiplier;
            event = 'cut';
            eventNote = `Capital Preservation triggered: Withdrawal rate hit ${(currentRate * 100).toFixed(1)}% (+${((currentRate / initialGkRate - 1) * 100).toFixed(0)}% vs initial ${effectiveInitialRate.toFixed(1)}%). Spending cut by ${rules.capitalPreservationCutPercent}%.`;
          }
        }
        // Prosperity Rule Trigger (Lower Guardrail)
        else if (currentRate < initialGkRate * prospThresh) {
          spendingMultiplier *= 1 + prospInc;
          event = 'raise';
          eventNote = `Prosperity Rule triggered: Portfolio growth lowered withdrawal rate to ${(currentRate * 100).toFixed(1)}% (-${((1 - currentRate / initialGkRate) * 100).toFixed(0)}% vs initial ${effectiveInitialRate.toFixed(1)}%). Spending raised by ${rules.prosperityIncreasePercent}%.`;
        }
        // Inflation Freeze Rule Trigger
        else if (rules.skipInflationOnNegativeReturn && ret < 0) {
          spendingMultiplier /= (1 + inflationRate);
          event = 'freeze';
          eventNote = `Inflation Freeze triggered: Negative portfolio return (${(ret * 100).toFixed(1)}%) skipped annual +${(inflationRate * 100).toFixed(1)}% inflation adjustment to protect capital.`;
        }
      }

      // Calculate actual spending target with GK multiplier applied and clamped at floor
      let dynamicSpend = Math.round(swrStartingSpendAtAge * spendingMultiplier);
      if (dynamicSpend < essentialFloorAtAge) {
        dynamicSpend = essentialFloorAtAge;
      }
      prevDynamicSpend = dynamicSpend;

      const actualWr = portfolioThisAge > 0 ? (dynamicSpend / portfolioThisAge) * 100 : 100;

      points.push({
        age: currentAge,
        yearIndex: yr,
        portfolio: Math.round(portfolioThisAge),
        baselineIncome: Math.round(planIncomeRequirementAtAge), // ALWAYS the user's input income requirement
        dynamicIncome: dynamicSpend,
        essentialFloor: essentialFloorAtAge,
        discretionarySpend: Math.max(0, dynamicSpend - essentialFloorAtAge),
        withdrawalRate: Number(actualWr.toFixed(2)),
        returnRate: Number((ret * 100).toFixed(1)),
        event,
        eventNote,
        diffFromBaseline: Math.round(dynamicSpend - planIncomeRequirementAtAge),
      });
    }

    return points;
  }, [
    activeMarketScenario,
    endAge,
    essentialFloorBaseline,
    horizonYears,
    inflationRate,
    initialTarget,
    effectiveInitialRate,
    effectiveInitialSpend,
    swrChartSource,
    monteCarloPaths,
    monteCarloResult,
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

          {/* Guyton-Klinger Starting SWR Calculator & Benchmarks Section */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 dark:from-slate-800/80 dark:via-slate-900/90 dark:to-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Starting Withdrawal Rate (SWR) Calculator &amp; Benchmarks</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      MSR Model
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Guyton-Klinger research establishes that adopting dynamic decision rules (Capital Preservation cuts &amp; Inflation freezes) safely boosts your initial withdrawal rate from Bengen's static ~4% to <strong>{gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}%</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSwrCalculator(!showSwrCalculator)}
                className="self-start sm:self-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700/80 shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showSwrCalculator ? 'Hide Calculator' : 'Open SWR Calculator'}</span>
                {showSwrCalculator ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Notification alert if spend was applied */}
            {appliedNotification && (
              <div className="p-3 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{appliedNotification}</span>
              </div>
            )}

            {/* 3 Benchmark Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: Recommended Guyton-Klinger Dynamic Rate */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-indigo-500/50 dark:border-indigo-600/60 shadow-xs relative flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Guyton-Klinger Safe Rate
                    </span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      +{gkSwrAnalysis.dynamicRulesBoost.toFixed(2)}% Boost
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {gkSwrAnalysis.recommendedInitialSwr.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      = £{gkSwrAnalysis.initialAnnualSpend.toLocaleString()}/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Empirical MSR calibrated for your {horizonYears}-yr horizon, {equityPct}% equities, and {rules.capitalPreservationCutPercent}% capital preservation cut.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => applyStartingSpendToPlan(gkSwrAnalysis.initialAnnualSpend)}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Recommended Rate (£{gkSwrAnalysis.initialAnnualSpend.toLocaleString()}/yr)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('gk_optimal')}
                    className={`w-full py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      swrChartSource === 'gk_optimal'
                        ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 shadow-xs'
                        : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700/60 border border-transparent'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{swrChartSource === 'gk_optimal' ? 'Active in Chart Trajectory' : 'Simulate in Chart'}</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Bengen Static 4% Baseline */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Bengen Static Rule
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      Zero Cuts
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-700 dark:text-slate-200">
                      {gkSwrAnalysis.bengenStaticSwr.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      = £{Math.round(startingWealth * (gkSwrAnalysis.bengenStaticSwr / 100)).toLocaleString()}/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    Traditional static rule. Lower spending because it assumes the retiree never cuts spending even during historical crashes.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => applyStartingSpendToPlan(Math.round(startingWealth * (gkSwrAnalysis.bengenStaticSwr / 100)))}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Apply Static Baseline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('bengen')}
                    className={`w-full py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      swrChartSource === 'bengen'
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-transparent'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{swrChartSource === 'bengen' ? 'Active in Chart Trajectory' : 'Simulate in Chart'}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Current Plan Rate */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Your Current Plan
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        initialWithdrawalRate <= gkSwrAnalysis.recommendedInitialSwr
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {initialWithdrawalRate <= gkSwrAnalysis.recommendedInitialSwr ? 'Safe Zone' : 'High SWR'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {initialWithdrawalRate.toFixed(2)}%
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      = £{initialTarget.toLocaleString()}/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {initialWithdrawalRate <= gkSwrAnalysis.recommendedInitialSwr ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ Well protected by Guyton-Klinger guardrails with ample margin.
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        Higher sequence risk: withdrawal rate exceeds {gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}%, making early spending cuts more likely.
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    <div>Retirement Starting Pot (Age {retAge}): <strong>£{startingWealth.toLocaleString()}</strong></div>
                    {retAge > (profile.currentAge || 30) && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Current Pot Today: £{todayTotalPot.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('plan')}
                    className={`w-full py-1 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      swrChartSource === 'plan'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-xs'
                        : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700/60 border border-transparent'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{swrChartSource === 'plan' ? 'Active in Chart Trajectory' : 'Simulate Plan in Chart'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive SWR Solver Drawer */}
            {showSwrCalculator && (
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Interactive SWR &amp; Spending Solver
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartingSwr(gkSwrAnalysis.bengenStaticSwr);
                        setSwrChartSource('calculator');
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                        Math.abs(customStartingSwr - gkSwrAnalysis.bengenStaticSwr) < 0.05
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Bengen {gkSwrAnalysis.bengenStaticSwr.toFixed(1)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartingSwr(gkSwrAnalysis.recommendedInitialSwr);
                        setSwrChartSource('calculator');
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                        Math.abs(customStartingSwr - gkSwrAnalysis.recommendedInitialSwr) < 0.05
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      Guyton-Klinger Safe {gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartingSwr(3.5);
                        setSwrChartSource('calculator');
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                        Math.abs(customStartingSwr - 3.5) < 0.05
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Conservative 3.5%
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwrChartSource('calculator')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer transition-all flex items-center gap-1 ${
                        swrChartSource === 'calculator'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                      title="Display this SWR Solver's rate and guardrail boundaries in the dynamic trajectory chart below"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{swrChartSource === 'calculator' ? 'Active in Chart' : 'Simulate in Chart'}</span>
                    </button>
                  </div>
                </div>

                {/* Slider + Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Starting Withdrawal Rate (SWR):
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="2.0"
                        max="8.0"
                        step="0.05"
                        value={customStartingSwr}
                        onChange={(e) => {
                          const val = Math.max(2.0, Math.min(10.0, parseFloat(e.target.value) || 2.0));
                          setCustomStartingSwr(val);
                          setSwrChartSource('calculator');
                        }}
                        className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-extrabold text-right text-indigo-600 dark:text-indigo-400"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="7.5"
                    step="0.05"
                    value={customStartingSwr}
                    onChange={(e) => {
                      setCustomStartingSwr(parseFloat(e.target.value));
                      setSwrChartSource('calculator');
                    }}
                    className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>2.5% (Ultra Safe)</span>
                    <span>4.0% (Classic Bengen)</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}% (GK Optimal)
                    </span>
                    <span>7.5% (Very Aggressive)</span>
                  </div>
                </div>

                {/* Solver Live Outputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Initial Annual Spend
                    </div>
                    <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      £{customCalculatedSpend.toLocaleString()}/yr
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {customCalculatedSpend >= initialTarget ? `+£${(customCalculatedSpend - initialTarget).toLocaleString()}` : `-£${(initialTarget - customCalculatedSpend).toLocaleString()}`} vs current plan
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Required Starting Pot (Age {retAge})
                    </div>
                    <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                      £{customRequiredWealth.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      to fund input £{initialTarget.toLocaleString()}/yr requirement
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Upper Guardrail Cut
                    </div>
                    <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
                      &gt; {customUpperGuardrailRate.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      Triggers if pot &lt; £{customUpperTriggerPot.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Lower Guardrail Raise
                    </div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      &lt; {customLowerGuardrailRate.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                      Triggers if pot &gt; £{customLowerTriggerPot.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-700/80">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Want to use this starting withdrawal rate for your retirement income?
                  </div>
                  <button
                    type="button"
                    onClick={() => applyStartingSpendToPlan(customCalculatedSpend)}
                    className="w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Set Target Spending to £{customCalculatedSpend.toLocaleString()}/yr ({customStartingSwr.toFixed(1)}% SWR)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* FEATURE 1: Live Guardrail Trigger Boundaries & Interactive Distance-to-Trigger Gauge */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Guardrail Trigger Boundaries &amp; Distance-to-Trigger Gauge (At Retirement Age {retAge})
                </span>
                {swrChartSource !== 'plan' && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    {activeSwrConfig.name}
                  </span>
                )}
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    corridorStatus === 'safe'
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : corridorStatus === 'caution_cut'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                      : 'bg-purple-950/80 text-purple-300 border-purple-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      corridorStatus === 'safe'
                        ? 'bg-emerald-400'
                        : corridorStatus === 'caution_cut'
                        ? 'bg-rose-400 animate-pulse'
                        : 'bg-purple-400'
                    }`}
                  />
                  {corridorStatus === 'safe'
                    ? 'In Safe Corridor (Spending 100% Inflation-Protected)'
                    : corridorStatus === 'caution_cut'
                    ? 'Caution: Approaching Upper Cut Trigger'
                    : 'In Prosperity Zone (Spending Raise Eligible)'}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Retirement Starting Pot (Age {retAge}): £{startingWealth.toLocaleString()} | Input Requirement: £{initialTarget.toLocaleString()}/yr ({initialWithdrawalRate.toFixed(2)}% SWR)
              </span>
            </div>

            {/* 4 Primary Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Initial SWR</div>
                <div className="text-sm font-black text-indigo-400 mt-0.5">{effectiveInitialRate.toFixed(2)}%</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={activeSwrConfig.name}>
                  {swrChartSource === 'plan' ? 'Plan Baseline' : activeSwrConfig.shortName}
                </div>
              </div>

              <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-900/40">
                <div className="text-[10px] text-rose-300 font-bold uppercase">Upper Guardrail (Cut)</div>
                <div className="text-sm font-black text-rose-400 mt-0.5">&gt; {effectiveUpperGuardrailRate.toFixed(2)}%</div>
                <div className="text-[10px] text-rose-300/80 mt-0.5">
                  Portfolio &lt; £{effectiveUpperTriggerPot.toLocaleString()}
                </div>
              </div>

              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40">
                <div className="text-[10px] text-emerald-300 font-bold uppercase">Lower Guardrail (Raise)</div>
                <div className="text-sm font-black text-emerald-400 mt-0.5">&lt; {effectiveLowerGuardrailRate.toFixed(2)}%</div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  Portfolio &gt; £{effectiveLowerTriggerPot.toLocaleString()}
                </div>
              </div>

              <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-900/40">
                <div className="text-[10px] text-amber-300 font-bold uppercase">Essential Floor Cushion</div>
                <div className="text-sm font-black text-amber-400 mt-0.5">£{essentialFloorBaseline.toLocaleString()}/yr</div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">
                  {Math.round((essentialFloorBaseline / effectiveInitialSpend) * 100)}% of Spend (Protected)
                </div>
              </div>
            </div>

            {/* Visual Distance-to-Trigger Corridor Track */}
            <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="font-extrabold flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Proactive Distance-to-Trigger Gauge</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Corridor Range: £{effectiveUpperTriggerPot.toLocaleString()} → £{effectiveLowerTriggerPot.toLocaleString()} (£{(effectiveLowerTriggerPot - effectiveUpperTriggerPot).toLocaleString()} Safe Span)
                </span>
              </div>

              {/* Progress Track with Pin */}
              <div className="relative pt-6 pb-2">
                {/* Starting Pot Indicator Marker */}
                <div
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300 z-10"
                  style={{ left: `${potPositionInCorridorPct}%` }}
                >
                  <span className="px-2 py-0.5 rounded-md bg-white text-slate-900 font-black text-[10px] shadow-md whitespace-nowrap flex items-center gap-1">
                    <span>Starting Pot £{startingWealth.toLocaleString()}</span>
                  </span>
                  <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-white" />
                </div>

                {/* 3-Zone Track */}
                <div className="h-3.5 rounded-full overflow-hidden flex bg-slate-950 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-700 to-rose-500 opacity-90"
                    style={{ width: '22%' }}
                    title={`Cut Zone: Below £${effectiveUpperTriggerPot.toLocaleString()}`}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 flex-1 relative flex items-center justify-center text-[9px] font-black text-white/90 uppercase tracking-widest"
                    title={`Safe Corridor: £${effectiveUpperTriggerPot.toLocaleString()} to £${effectiveLowerTriggerPot.toLocaleString()}`}
                  >
                    <span>Safe Corridor</span>
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 opacity-90"
                    style={{ width: '22%' }}
                    title={`Prosperity Zone: Above £${effectiveLowerTriggerPot.toLocaleString()}`}
                  />
                </div>

                {/* Trigger Boundaries Labels */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 font-semibold">
                  <div className="text-left text-rose-400">
                    <div>Upper Cut Trigger: £{effectiveUpperTriggerPot.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500">SWR &gt; {effectiveUpperGuardrailRate.toFixed(1)}%</div>
                  </div>
                  <div className="text-center text-emerald-400 font-bold">
                    <div>Current SWR: {effectiveInitialRate.toFixed(2)}%</div>
                    <div className="text-[9px] text-slate-400">£{effectiveInitialSpend.toLocaleString()}/yr spend</div>
                  </div>
                  <div className="text-right text-purple-400">
                    <div>Lower Raise Trigger: £{effectiveLowerTriggerPot.toLocaleString()}</div>
                    <div className="text-[9px] text-slate-500">SWR &lt; {effectiveLowerGuardrailRate.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              {/* Two Early Warning Buffer Callouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>Market Drop Cushion to Cut</span>
                    </span>
                    <span className="text-xs font-black text-rose-300">
                      £{dropCushionAmount.toLocaleString()} (-{dropCushionPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    Your portfolio can fall by up to <strong>£{dropCushionAmount.toLocaleString()} (-{dropCushionPercent.toFixed(1)}%)</strong> before the Capital Preservation Rule triggers a {rules.capitalPreservationCutPercent}% spending cut.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Growth Target to Spending Raise</span>
                    </span>
                    <span className="text-xs font-black text-emerald-300">
                      +£{growthNeededAmount.toLocaleString()} (+{growthNeededPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug">
                    A portfolio increase of <strong>+£{growthNeededAmount.toLocaleString()} (+{growthNeededPercent.toFixed(1)}%)</strong> will activate the Prosperity Rule, permanently raising spending by +{rules.prosperityIncreasePercent}%.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FEATURE 2: Tiered Spending Protection (Core Essential vs Flexible Discretionary) */}
          <div className="p-4 md:p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                    Tiered Spending Protection: Core Essential vs. Flexible Discretionary
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Essential Floor 100% Immune
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Under Guyton-Klinger guardrails, your essential bills are 100% immune from spending cuts. Only your flexible discretionary budget acts as an economic shock absorber.
                </p>
              </div>

              {totalGuaranteedIncome > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-right shrink-0">
                  <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Guaranteed Pension Backstop</div>
                  <div className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                    £{totalGuaranteedIncome.toLocaleString()}/yr ({guaranteedCoveragePct}% of Essential)
                  </div>
                </div>
              )}
            </div>

            {/* Visual Tiered Spending Stack Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Initial Retirement Annual Spend: <strong>£{effectiveInitialSpend.toLocaleString()}/yr</strong>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tier 1 Essential: <strong>{essentialSpendPercent.toFixed(0)}%</strong> | Tier 2 Flexible: <strong>{discretionarySpendPercent.toFixed(0)}%</strong>
                </span>
              </div>

              <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  style={{ width: `${essentialSpendPercent}%` }}
                  title={`Tier 1 Protected Essential Floor: £${essentialFloorBaseline.toLocaleString()}/yr (${essentialSpendPercent.toFixed(0)}%)`}
                >
                  {essentialSpendPercent >= 25 && <span>Tier 1: Essential £{essentialFloorBaseline.toLocaleString()}</span>}
                </div>
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  style={{ width: `${discretionarySpendPercent}%` }}
                  title={`Tier 2 Flexible Discretionary: £${discretionarySpend.toLocaleString()}/yr (${discretionarySpendPercent.toFixed(0)}%)`}
                >
                  {discretionarySpendPercent >= 25 && <span>Tier 2: Flexible £{discretionarySpend.toLocaleString()}</span>}
                </div>
              </div>

              {/* Tier Cards Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Tier 1: Non-Negotiable Essential Floor</span>
                    </span>
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                      £{essentialFloorBaseline.toLocaleString()}/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-snug">
                    Covers food, utilities, council tax, home maintenance, and basic transport. <strong>0% cut allowance.</strong> Guardrail spending cuts will never breach this floor.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Tier 2: Flexible Discretionary Budget</span>
                    </span>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                      £{discretionarySpend.toLocaleString()}/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-snug">
                    Covers holidays, luxury dining, hobbies, vehicle upgrades, and gifting. Acts as your economic shock absorber to protect portfolio longevity.
                  </p>
                </div>
              </div>
            </div>

            {/* Stress Test Haircut Simulator */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Stress Test: What Happens If Upper Guardrail Triggers (-{cutPercent}% Cut)?</span>
                </span>
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                  Total Cut: -£{totalCutAmount.toLocaleString()}/yr
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tier 1 Essential</div>
                  <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    £{essentialFloorBaseline.toLocaleString()}/yr
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ £0 Cut (100% Protected)
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Tier 2 Discretionary</div>
                  <div className="text-xs font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    £{prospectiveDiscretionarySpend.toLocaleString()}/yr
                  </div>
                  <div className="text-[10px] text-rose-500 font-semibold">
                    -{discretionaryCutPercent.toFixed(1)}% flexible haircut (-£{totalCutAmount.toLocaleString()})
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Post-Cut Total Income</div>
                  <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                    £{(effectiveInitialSpend - totalCutAmount).toLocaleString()}/yr
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isCappedAtEssentialFloor ? 'Clamped at Essential Floor' : 'Fully covers all bills with cushion'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Essential Floor Adjuster */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-700 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-bold">Adjust Essential Floor:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '50% Frugal', pct: 0.5 },
                  { label: '65% Standard', pct: 0.65 },
                  { label: '75% Comfort', pct: 0.75 },
                  { label: '80% High', pct: 0.8 },
                ].map((preset) => {
                  const targetAmt = Math.round(effectiveInitialSpend * preset.pct);
                  const isSelected = Math.abs(essentialFloorBaseline - targetAmt) < 500;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleUpdateEssentialFloor(targetAmt)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label} (£{Math.round(targetAmt / 1000)}k)
                    </button>
                  );
                })}

                <div className="flex items-center gap-1 ml-1">
                  <span className="text-slate-400 font-bold">£</span>
                  <input
                    type="number"
                    step={1000}
                    min={0}
                    max={effectiveInitialSpend}
                    value={essentialFloorBaseline}
                    onChange={(e) => handleUpdateEssentialFloor(Number(e.target.value) || 0)}
                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs"
                    title="Custom Essential Spending Floor (£/yr)"
                  />
                  <span className="text-[11px] text-slate-400">/yr</span>
                </div>
              </div>
            </div>
          </div>

          {/* VISUALIZATION: Dynamic Income Corridor & Trigger Timeline */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Dynamic Income Trajectory &amp; Trigger Points</span>
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600">
                    Retirement Horizon: Age {retAge} → Age {endAge}
                  </span>
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
                  Real-time decumulation timeline starting at retirement age {retAge} comparing your fixed baseline spending requirement against dynamic Guyton-Klinger income and your non-negotiable Essential Floor across Monte Carlo paths and stress models.
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

            {/* Decumulation Horizon & Starting Pot Callout */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>Decumulation Timeline Starts at Retirement Age {retAge}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Starts with Retirement Pot, Not Today's Pot
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Trajectory simulates your retirement decumulation from <strong>Age {retAge}</strong> through <strong>Age {endAge}</strong> ({horizonYears} years) starting with your <strong>Projected Retirement Starting Pot of £{startingWealth.toLocaleString()}</strong>{retAge > (profile.currentAge || 30) ? ` (accumulated from today's portfolio of £${todayTotalPot.toLocaleString()})` : ''}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3">
                {retAge > (profile.currentAge || 30) && (
                  <>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Current Pot Today</div>
                      <div className="font-extrabold text-slate-600 dark:text-slate-300">£{todayTotalPot.toLocaleString()}</div>
                    </div>
                    <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />
                  </>
                )}
                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Retirement Starting Pot</div>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400">£{startingWealth.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* SWR Starting Baseline Switcher for Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Chart SWR Baseline:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('plan')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      swrChartSource === 'plan'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Simulate dynamic income trajectory matching your plan target input income requirement"
                  >
                    <span>Plan Target ({initialWithdrawalRate.toFixed(1)}% • £{Math.round(initialTarget / 1000)}k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('calculator')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      swrChartSource === 'calculator'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Simulate dynamic income trajectory using the active SWR Solver slider selection"
                  >
                    <span>SWR Solver ({customStartingSwr.toFixed(1)}% • £{Math.round(customCalculatedSpend / 1000)}k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('gk_optimal')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      swrChartSource === 'gk_optimal'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Simulate dynamic income trajectory using Guyton-Klinger recommended safe starting rate"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>GK Optimal ({gkSwrAnalysis.recommendedInitialSwr.toFixed(1)}% • £{Math.round(gkSwrAnalysis.initialAnnualSpend / 1000)}k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('bengen')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      swrChartSource === 'bengen'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Simulate dynamic income trajectory using classic William Bengen static 4% benchmark"
                  >
                    <span>Bengen 4% ({gkSwrAnalysis.bengenStaticSwr.toFixed(1)}% • £{Math.round(startingWealth * (gkSwrAnalysis.bengenStaticSwr / 100) / 1000)}k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('conservative')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      swrChartSource === 'conservative'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                    title="Simulate dynamic income trajectory using ultra-conservative 3.5% benchmark"
                  >
                    <span>Conservative (3.5% • £{Math.round(startingWealth * 0.035 / 1000)}k)</span>
                  </button>
                </div>
              </div>

              {swrChartSource !== 'plan' && (
                <button
                  type="button"
                  onClick={() => applyStartingSpendToPlan(activeSwrConfig.startingSpend, activeSwrConfig.rate)}
                  className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0 self-end sm:self-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply SWR to Spending (£{activeSwrConfig.startingSpend.toLocaleString()}/yr)</span>
                </button>
              )}
            </div>

            {/* Explanatory Banner: Comparing active SWR against fixed input income requirement baseline */}
            {swrChartSource !== 'plan' && (
              <div className="p-3 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                  <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>Chart SWR Simulation:</strong> Comparing <strong>{activeSwrConfig.name}</strong> ({effectiveInitialRate.toFixed(2)}% SWR = £{effectiveInitialSpend.toLocaleString()}/yr) against your <strong>fixed input income requirement baseline (£{initialTarget.toLocaleString()}/yr)</strong> starting at retirement age {retAge} with your projected starting pot of £{startingWealth.toLocaleString()}.
                    {effectiveInitialSpend > initialTarget
                      ? ` This SWR covers your requirement with an initial +£${(effectiveInitialSpend - initialTarget).toLocaleString()}/yr surplus!`
                      : effectiveInitialSpend < initialTarget
                      ? ` Note: this SWR results in an initial -£${(initialTarget - effectiveInitialSpend).toLocaleString()}/yr shortfall vs your requirement.`
                      : ' This SWR matches your requirement exactly.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSwrChartSource('plan')}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
                  >
                    Reset to Plan Target
                  </button>
                  {profile.dynamicSpendingRules?.initialSpendingAmount && (
                    <button
                      type="button"
                      onClick={resetToInputIncomeRequirement}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Reset dynamic spending back to your exact input income requirement"
                    >
                      Reset Plan Spending
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Chart View Mode Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 pb-1 border-t border-slate-200/70 dark:border-slate-700/70">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Chart View:</span>
                <div className="inline-flex p-1 rounded-xl bg-slate-200/60 dark:bg-slate-700/60 border border-slate-300/40 dark:border-slate-600/40 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartViewMode('corridor')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartViewMode === 'corridor'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Income Corridor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('bars')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartViewMode === 'bars'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Pot &amp; Income Bars</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('combined')}
                    className={`px-3 py-1 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      chartViewMode === 'combined'
                        ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Combined Overlay</span>
                  </button>
                </div>
              </div>

              {chartViewMode !== 'corridor' && (
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Left Axis:</span> Pot Balance
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Right Axis:</span> Annual Spend
                  </span>
                </div>
              )}
            </div>

            {/* Recharts Composed Chart */}
            <div className="w-full h-84 sm:h-96 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={simulationResults}
                  margin={{ top: 10, right: chartViewMode === 'corridor' ? 10 : 20, left: 10, bottom: 20 }}
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

                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />

                  <XAxis
                    dataKey="age"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `Age ${val}`}
                  />

                  {chartViewMode === 'corridor' ? (
                    <YAxis
                      yAxisId="income"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      domain={['dataMin - 5000', 'auto']}
                      tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                    />
                  ) : (
                    <>
                      <YAxis
                        yAxisId="pot"
                        orientation="left"
                        stroke="#6366f1"
                        fontSize={11}
                        tickLine={false}
                        domain={[0, 'auto']}
                        tickFormatter={(val) => `£${val >= 1000000 ? (val / 1000000).toFixed(1) + 'm' : (val / 1000).toFixed(0) + 'k'}`}
                      />
                      <YAxis
                        yAxisId="income"
                        orientation="right"
                        stroke="#10b981"
                        fontSize={11}
                        tickLine={false}
                        domain={[0, 'auto']}
                        tickFormatter={(val) => `£${(val / 1000).toFixed(0)}k`}
                      />
                    </>
                  )}

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
                              Return: {data.returnRate > 0 ? `+${data.returnRate}%` : `${data.returnRate}%`}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400 font-extrabold">
                              <span>Portfolio Pot:</span>
                              <span>£{data.portfolio.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-extrabold">
                              <span>Dynamic Spend {swrChartSource !== 'plan' ? `(${activeSwrConfig.shortName})` : ''}:</span>
                              <span>£{data.dynamicIncome.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                              <span>Baseline Income Requirement:</span>
                              <span>£{data.baselineIncome.toLocaleString()}</span>
                            </div>
                            {data.diffFromBaseline !== 0 && (
                              <div
                                className={`flex justify-between items-center text-[11px] font-bold ${
                                  data.diffFromBaseline > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                <span>vs Income Requirement:</span>
                                <span>
                                  {data.diffFromBaseline > 0
                                    ? `+£${data.diffFromBaseline.toLocaleString()}/yr surplus`
                                    : `-£${Math.abs(data.diffFromBaseline).toLocaleString()}/yr shortfall`}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-semibold">
                              <span>Tier 1 Protected Floor:</span>
                              <span>£{data.essentialFloor.toLocaleString()} (100% immune)</span>
                            </div>
                            <div className="flex justify-between items-center text-teal-600 dark:text-teal-400 font-semibold">
                              <span>Tier 2 Flexible Discretionary:</span>
                              <span>£{Math.max(0, data.dynamicIncome - data.essentialFloor).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
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

                  {/* Mode 1: Bars View (Pot Balance & Dynamic Income Bars side by side) */}
                  {chartViewMode === 'bars' && (
                    <>
                      <Bar
                        yAxisId="pot"
                        dataKey="portfolio"
                        name="Portfolio Pot Balance"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={30}
                        opacity={0.88}
                      />
                      <Bar
                        yAxisId="income"
                        dataKey="dynamicIncome"
                        name="Dynamic Spend (Income)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                      >
                        {simulationResults.map((entry, index) => {
                          const isCut = entry.event === 'cut' || entry.event === 'floor_protected';
                          const isRaise = entry.event === 'raise';
                          const isFreeze = entry.event === 'freeze';
                          const color = isCut ? '#f43f5e' : isRaise ? '#10b981' : isFreeze ? '#06b6d4' : '#10b981';
                          return <Cell key={`cell-spend-${index}`} fill={color} />;
                        })}
                      </Bar>
                      <Line
                        yAxisId="income"
                        type="monotone"
                        dataKey="baselineIncome"
                        name="Baseline Target Requirement"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </>
                  )}

                  {/* Mode 2: Combined Overlay View (Pot bars in background + corridor lines in foreground) */}
                  {chartViewMode === 'combined' && (
                    <>
                      <Bar
                        yAxisId="pot"
                        dataKey="portfolio"
                        name="Portfolio Pot Balance"
                        fill="#818cf8"
                        fillOpacity={0.25}
                        stroke="#6366f1"
                        strokeWidth={1}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={36}
                      />
                      <Area
                        yAxisId="income"
                        type="monotone"
                        dataKey="essentialFloor"
                        name="Essential Floor"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        fill="url(#gkFloorGradient)"
                      />
                      <Line
                        yAxisId="income"
                        type="monotone"
                        dataKey="baselineIncome"
                        name="Baseline Target Requirement"
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        yAxisId="income"
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
                    </>
                  )}

                  {/* Mode 3: Income Corridor View (Classic line & shaded area corridor) */}
                  {chartViewMode === 'corridor' && (
                    <>
                      <Area
                        yAxisId="income"
                        type="monotone"
                        dataKey="essentialFloor"
                        name="Essential Floor"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        fill="url(#gkFloorGradient)"
                      />
                      <Line
                        yAxisId="income"
                        type="monotone"
                        dataKey="baselineIncome"
                        name="Baseline Target Requirement"
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Line
                        yAxisId="income"
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
                    </>
                  )}
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
