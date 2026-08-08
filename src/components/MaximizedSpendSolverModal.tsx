import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UserProfile, InvestmentPots, AnnuityType, AnnuityDurationOption, CoupleMaxSpendScope } from '../types';
import { solveMaximizedSpend, SolveMaximizedSpendResult, createCandidateProfile, AnnuityFloorMode, getScopeEvaluationInputs } from '../utils/maximizedSpendSolver';
import { generateProjections } from '../utils/projectionEngine';
import {
  X,
  Sparkles,
  TrendingUp,
  Check,
  Zap,
  HelpCircle,
  Sliders,
  DollarSign,
  ShieldCheck,
  Flame,
  ArrowRight,
  Info,
  Layers,
  Calendar,
  AlertCircle,
  RefreshCw,
  Loader2,
  Users,
  User,
} from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MaximizedSpendSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  pots: InvestmentPots;
  onApplyMaximizedSpend: (updatedProfile: UserProfile) => void;
}

export const MaximizedSpendSolverModal: React.FC<MaximizedSpendSolverModalProps> = ({
  isOpen,
  onClose,
  profile,
  pots,
  onApplyMaximizedSpend,
}) => {
  if (!isOpen) return null;

  const currentRetirementAge = profile.targetRetirementAge || 60;
  const initialEndAge = profile.lifeExpectancyAge || 95;
  const pensionAccessAge = profile.protectedPensionAccessAge || 57;

  const cfg = profile.maximizedSpendConfig;

  const [coupleScope, setCoupleScope] = useState<CoupleMaxSpendScope>(
    cfg?.coupleScope ?? 'couple'
  );

  const [targetEndAge, setTargetEndAge] = useState<number>(
    cfg?.targetEndAge ?? Math.max(currentRetirementAge + 5, initialEndAge)
  );
  const [targetLegacyBuffer, setTargetLegacyBuffer] = useState<number>(
    cfg?.targetLegacyBuffer ?? 0
  );
  const [spendingPattern, setSpendingPattern] = useState<'uniform' | 'proportional_phases' | 'front_loaded'>(() => {
    if (cfg?.spendingPattern) {
      return cfg.spendingPattern;
    }
    if (profile.spendingPhases?.customRanges && profile.spendingPhases.customRanges.length > 0) {
      return 'proportional_phases';
    }
    if (profile.spendingPhases?.enabled) {
      return 'proportional_phases';
    }
    return 'uniform';
  });

  // Annuity Floor Options State
  const [annuityFloorMode, setAnnuityFloorMode] = useState<AnnuityFloorMode>(
    cfg?.annuityFloorMode ?? 'none'
  );
  const [annuityFloorIncomeTarget, setAnnuityFloorIncomeTarget] = useState<number>(
    cfg?.annuityFloorIncomeTarget ?? 15000
  );
  const [annuityFloorPercent, setAnnuityFloorPercent] = useState<number>(
    cfg?.annuityFloorPercent ?? 40
  );
  const [annuityFloorAge, setAnnuityFloorAge] = useState<number>(
    cfg?.annuityFloorAge ?? profile.annuityPurchaseAge ?? profile.targetRetirementAge ?? 60
  );
  const [annuityRatePercent, setAnnuityRatePercent] = useState<number>(
    cfg?.annuityRatePercent ?? profile.annuityRatePercent ?? 6.0
  );
  const [annuityType, setAnnuityType] = useState<AnnuityType>(
    cfg?.annuityType ?? profile.annuityType ?? 'inflation_linked_single'
  );
  const [annuityDurationOption, setAnnuityDurationOption] = useState<AnnuityDurationOption>(
    cfg?.annuityDurationOption ?? profile.annuityDurationOption ?? 'lifetime'
  );
  const [annuityDurationUntilAge, setAnnuityDurationUntilAge] = useState<number>(
    cfg?.annuityDurationUntilAge ?? profile.annuityDurationUntilAge ?? 75
  );

  // Excess Drawdown Reinvestment State
  const [reinvestExcessDrawdown, setReinvestExcessDrawdown] = useState<boolean>(
    Boolean(profile.reinvestExcessDrawdown || profile.maximizedSpendConfig?.reinvestExcessDrawdown)
  );
  const [actualSpendingTargetAnnual, setActualSpendingTargetAnnual] = useState<number>(
    profile.actualSpendingTargetAnnual ??
    profile.maximizedSpendConfig?.actualSpendingTargetAnnual ??
    profile.targetRetirementIncomeAnnual ??
    25000
  );
  const [reinvestDestinationPot, setReinvestDestinationPot] = useState<'isa' | 'gia' | 'cash'>(
    profile.maximizedSpendConfig?.reinvestDestinationPot ||
    (profile.annuityExcessReinvestOption === 'gia' ? 'gia' : profile.annuityExcessReinvestOption === 'cash' ? 'cash' : 'isa')
  );

  // State for user custom adjusted target income spend (£/yr)
  const [customAdjustedTargetIncome, setCustomAdjustedTargetIncome] = useState<number | null>(null);

  const [solverResult, setSolverResult] = useState<SolveMaximizedSpendResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/solverWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'SOLVE_MAX_SPEND_SUCCESS') {
        setSolverResult(e.data.payload);
        setIsCalculating(false);
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    setIsCalculating(true);
    workerRef.current.postMessage({
      id: Date.now(),
      type: 'SOLVE_MAX_SPEND',
      payload: {
        profile,
        pots,
        coupleScope,
        targetEndAge,
        targetLegacyBuffer,
        spendingPattern,
        annuityFloorMode,
        annuityFloorIncomeTarget,
        annuityFloorPercent,
        annuityFloorAge,
        annuityRatePercent,
        annuityType,
        annuityDurationOption,
        annuityDurationUntilAge,
        reinvestExcessDrawdown,
        actualSpendingTargetAnnual,
        reinvestDestinationPot,
      }
    });
  }, [
    profile,
    pots,
    coupleScope,
    targetEndAge,
    targetLegacyBuffer,
    spendingPattern,
    annuityFloorMode,
    annuityFloorIncomeTarget,
    annuityFloorPercent,
    annuityFloorAge,
    annuityRatePercent,
    annuityType,
    annuityDurationOption,
    annuityDurationUntilAge,
    reinvestExcessDrawdown,
    actualSpendingTargetAnnual,
    reinvestDestinationPot,
  ]);

  const {
    maxAnnualIncome = 0,
    bridgeAnnualIncome,
    originalAnnualIncome = 0,
    extraAnnualSpend = 0,
    extraLifetimeSpend = 0,
    boostPercentage = 0,
    finalPotAtTargetAge = 0,
    bestCandidateProfile = profile,
    projectionsWithMaxSpend = [],
    phaseIncomes = [],
    annuityFloorDetails,
    reinvestExcessDetails,
  } = solverResult || {};

  // Format currency helpers
  const fmt = (v: number) => `£${Math.round(v).toLocaleString()}`;

  // Effective adjusted target income (defaults to maxAnnualIncome if not explicitly overridden)
  const effectiveAdjustedIncome = customAdjustedTargetIncome !== null ? customAdjustedTargetIncome : maxAnnualIncome;

  // Candidate profile for adjusted max target income
  const adjustedCandidateProfile = useMemo(() => {
    if (!solverResult) return profile;
    return createCandidateProfile(
      profile,
      effectiveAdjustedIncome,
      spendingPattern,
      pots,
      {
        annuityFloorMode,
        annuityFloorIncomeTarget,
        annuityFloorPercent,
        annuityFloorAge,
        annuityRatePercent,
        annuityType,
        annuityDurationOption,
        annuityDurationUntilAge,
      },
      {
        reinvestExcessDrawdown,
        actualSpendingTargetAnnual,
        reinvestDestinationPot,
      },
      targetEndAge,
      targetLegacyBuffer,
      coupleScope
    );
  }, [
    solverResult,
    effectiveAdjustedIncome,
    profile,
    spendingPattern,
    pots,
    annuityFloorMode,
    annuityFloorIncomeTarget,
    annuityFloorPercent,
    annuityFloorAge,
    annuityRatePercent,
    annuityType,
    annuityDurationOption,
    annuityDurationUntilAge,
    reinvestExcessDrawdown,
    actualSpendingTargetAnnual,
    reinvestDestinationPot,
    targetEndAge,
    targetLegacyBuffer,
    coupleScope,
  ]);

  // Generate projections for adjusted target income
  const adjustedProjections = useMemo(() => {
    if (!adjustedCandidateProfile) return [];
    const isCouple = adjustedCandidateProfile.isCouplePlanning;
    const { evalProfile, evalPots } = getScopeEvaluationInputs(adjustedCandidateProfile, pots, coupleScope);
    return generateProjections(
      evalProfile,
      evalPots,
      isCouple && coupleScope === 'couple' ? evalProfile.partnerPots : undefined,
      isCouple && coupleScope === 'couple'
    );
  }, [adjustedCandidateProfile, pots, coupleScope]);

  // Prepare chart comparison data (Solved Max vs Adjusted Target)
  const chartData = useMemo(() => {
    const maxMap = new Map((projectionsWithMaxSpend || []).map((p) => [p.age, p]));
    const adjustedMap = new Map((adjustedProjections || []).map((p) => [p.age, p]));

    // Collect all unique ages >= currentRetirementAge and <= 100
    const agesSet = new Set<number>();
    (projectionsWithMaxSpend || []).forEach((p) => {
      if (p.age >= currentRetirementAge && p.age <= 100) agesSet.add(p.age);
    });
    (adjustedProjections || []).forEach((p) => {
      if (p.age >= currentRetirementAge && p.age <= 100) agesSet.add(p.age);
    });

    if (agesSet.size === 0) {
      for (let a = currentRetirementAge; a <= Math.min(100, targetEndAge); a++) {
        agesSet.add(a);
      }
    }

    const sortedAges = Array.from(agesSet).sort((a, b) => a - b);

    return sortedAges.map((age) => {
      const maxP = maxMap.get(age);
      const adjP = adjustedMap.get(age);
      const year = maxP?.year || adjP?.year || (2024 + (age - currentRetirementAge));

      return {
        age,
        year,
        maximizedPot: maxP ? Math.round(maxP.totalPot || 0) : 0,
        maxNetIncome: maxP ? Math.round(maxP.netRetirementIncome || 0) : 0,
        maxTargetIncome: maxP ? Math.round(maxP.targetRetirementIncome || maxP.netRetirementIncome || 0) : 0,
        adjustedPot: adjP ? Math.round(adjP.totalPot || 0) : maxP ? Math.round(maxP.totalPot || 0) : 0,
        adjustedNetIncome: adjP ? Math.round(adjP.netRetirementIncome || 0) : maxP ? Math.round(maxP.netRetirementIncome || 0) : 0,
        adjustedTargetIncome: adjP ? Math.round(adjP.targetRetirementIncome || adjP.netRetirementIncome || 0) : maxP ? Math.round(maxP.targetRetirementIncome || maxP.netRetirementIncome || 0) : 0,
      };
    });
  }, [projectionsWithMaxSpend, adjustedProjections, currentRetirementAge, targetEndAge]);

  const maxPlottedAge = chartData.length > 0 ? chartData[chartData.length - 1].age : targetEndAge;

  const handleApply = () => {
    onApplyMaximizedSpend(adjustedCandidateProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-amber-950/40 dark:via-indigo-950/40 dark:to-emerald-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Zap className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Maximized Spend Solver</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800/80 whitespace-nowrap">
                    Die With Zero Engine
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Calculates the highest sustainable drawdown budget that depletes your wealth exactly by target age without running out early.
              </p>
            </div>
            {isCalculating && (
              <div className="ml-4 flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Optimizing...</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className={`p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 transition-opacity duration-300 ${isCalculating ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          {/* TOP KPI HIGHLIGHT GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: MAXIMIZED ANNUAL SPEND */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 space-y-1 relative overflow-hidden shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>
                  {bridgeAnnualIncome !== undefined
                    ? 'Post-Access Target Income'
                    : profile.isCouplePlanning
                    ? `Max Target (${coupleScope === 'couple' ? 'Couple' : coupleScope === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary')})`
                    : 'Maximized Target Income'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {fmt(maxAnnualIncome)}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/yr</span>
              </div>
              {annuityFloorDetails ? (
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1 flex-wrap">
                  <span className="text-emerald-700 dark:text-emerald-300">🛡️ {fmt(annuityFloorDetails.guaranteedAnnualIncome)}/yr Floor</span>
                  <span>+</span>
                  <span>{fmt(annuityFloorDetails.flexiDrawdownAnnualIncome)}/yr Flexi</span>
                </div>
              ) : (
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  {bridgeAnnualIncome !== undefined
                    ? `Bridge (Ages ${currentRetirementAge}-${pensionAccessAge - 1}): ${fmt(bridgeAnnualIncome)}/yr`
                    : `${fmt(Math.round(maxAnnualIncome / 12))}/mo spendable`}
                </div>
              )}
            </div>

            {/* KPI 2: ANNUAL BOOST */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Annual Income Boost</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {extraAnnualSpend >= 0 ? `+${fmt(extraAnnualSpend)}` : fmt(extraAnnualSpend)}
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">/yr</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                {boostPercentage >= 0 ? `+${boostPercentage}%` : `${boostPercentage}%`} vs Current ({fmt(originalAnnualIncome)}/yr)
              </div>
            </div>

            {/* KPI 3: LIFETIME EXTRA CASH */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                <span>Lifetime Extra Cash Unlocked</span>
                <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
                +{fmt(extraLifetimeSpend)}
              </div>
              <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Across {targetEndAge - currentRetirementAge} retirement years
              </div>
            </div>

            {/* KPI 4: FINAL POT BALANCE */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Remainder @ Age {targetEndAge}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {fmt(finalPotAtTargetAge)}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {targetLegacyBuffer > 0 ? `Matches £${targetLegacyBuffer.toLocaleString()} legacy buffer` : 'True Die With Zero (£0)'}
              </div>
            </div>
          </div>

          {/* PARAMETER CONTROLS GRID */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            {currentRetirementAge < pensionAccessAge && (
              <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Early Retirement Bridge Constraint (Ages {currentRetirementAge} to {pensionAccessAge})
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    You plan to retire at age <strong>{currentRetirementAge}</strong>, but private pensions are locked until age <strong>{pensionAccessAge}</strong>. Spending during these bridge years is funded solely from ISA/cash.
                    {spendingPattern === 'uniform' && finalPotAtTargetAge > 50000 && (
                      <span className="block font-medium mt-1 text-amber-700 dark:text-amber-300">
                        Flat spend is capped at <strong>{fmt(maxAnnualIncome)}/yr</strong> to avoid running out of ISA/cash before age {pensionAccessAge}. Switch to <strong>"Scale Active Spending Phases"</strong> to allow higher spending once pensions unlock!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Solver Optimization Parameters</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Live Dynamic Calculation
              </span>
            </div>

            {/* COUPLE MODE OPTIMIZATION SCOPE */}
            {profile.isCouplePlanning && (
              <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Apply Max Spend Solver To</span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200">
                    Couple Planning Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Select whether to calculate the max spend budget for joint household wealth, or isolate individual partner assets:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setCoupleScope('couple')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      coupleScope === 'couple'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        As a Couple
                      </span>
                      {coupleScope === 'couple' && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-[10px] mt-1.5 ${coupleScope === 'couple' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Combined Joint Household
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoupleScope('primary')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      coupleScope === 'primary'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{profile.name || 'Primary Partner'}</span>
                      </span>
                      {coupleScope === 'primary' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <span className={`text-[10px] mt-1.5 ${coupleScope === 'primary' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Primary Wealth & Pensions Only
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCoupleScope('partner')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      coupleScope === 'partner'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{profile.partnerName || 'Partner'}</span>
                      </span>
                      {coupleScope === 'partner' && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </div>
                    <span className={`text-[10px] mt-1.5 ${coupleScope === 'partner' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      Partner Wealth & Pensions Only
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CONTROL 1: TARGET PLAN END AGE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Target Plan End Age</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">Age {targetEndAge}</span>
                </label>
                <input
                  type="range"
                  min={currentRetirementAge + 1}
                  max={100}
                  step={1}
                  value={targetEndAge}
                  onChange={(e) => setTargetEndAge(parseInt(e.target.value) || 95)}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Age {currentRetirementAge + 1}</span>
                  <div className="flex gap-1">
                    {[85, 90, 95, 100].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setTargetEndAge(Math.max(currentRetirementAge + 1, age))}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          targetEndAge === age
                            ? 'bg-indigo-600 text-white font-black'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                  <span>Age 100</span>
                </div>
              </div>

              {/* CONTROL 2: TARGET LEGACY BUFFER */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Target Legacy Buffer</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{fmt(targetLegacyBuffer)}</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: '£0 (Zero)', val: 0 },
                    { label: '£25k', val: 25000 },
                    { label: '£50k', val: 50000 },
                    { label: '£100k', val: 100000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setTargetLegacyBuffer(preset.val)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        targetLegacyBuffer === preset.val
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Amount retained in pots at Age {targetEndAge} for heirs or emergency buffer.
                </p>
              </div>

              {/* CONTROL 3: SPENDING PATTERN */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Drawdown Spending Pattern</span>
                </label>
                <select
                  value={spendingPattern}
                  onChange={(e) => setSpendingPattern(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="uniform">🎯 Uniform Flat Real Spend (Equal every year)</option>
                  <option value="front_loaded">🚀 Front-Loaded Go-Go Heavy (+20% early, -20% late)</option>
                  <option value="proportional_phases">📊 Scale Active Spending Phases Proportionally</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {spendingPattern === 'front_loaded' && phaseIncomes && (
                    <span>Go-Go: {fmt(phaseIncomes.goGoIncome)}/yr • Slow-Go: {fmt(phaseIncomes.slowGoIncome)}/yr • No-Go: {fmt(phaseIncomes.noGoIncome)}/yr</span>
                  )}
                  {spendingPattern === 'uniform' && 'Maintains consistent real purchasing power throughout retirement.'}
                  {spendingPattern === 'proportional_phases' && 'Scales your existing custom spending phase targets upwards.'}
                </p>
              </div>
            </div>

            {/* CONTROL 4: ANNUITY FLOOR & GUARANTEED INCOME */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                      Guaranteed Annuity Floor
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Secure a baseline income floor with an annuity purchase, maximizing drawdown for the rest.
                    </p>
                  </div>
                </div>
                {annuityFloorDetails && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Floor: {fmt(annuityFloorDetails.guaranteedAnnualIncome)}/yr Guaranteed
                  </span>
                )}
              </div>

              {/* Floor Mode Switcher */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAnnuityFloorMode('none')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all text-left border cursor-pointer ${
                    annuityFloorMode === 'none'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold">Pure Flexi-Drawdown</div>
                  <div className="text-[10px] opacity-80 font-normal">0% Annuity • Pure Market Growth</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAnnuityFloorMode('target_floor')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all text-left border cursor-pointer ${
                    annuityFloorMode === 'target_floor'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold">Target Income Floor (£/yr)</div>
                  <div className="text-[10px] opacity-80 font-normal">Secure £15k+ guaranteed income</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAnnuityFloorMode('custom_percent')}
                  className={`p-2.5 rounded-xl text-xs font-bold transition-all text-left border cursor-pointer ${
                    annuityFloorMode === 'custom_percent'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-extrabold">Fixed Pension Alloc (%)</div>
                  <div className="text-[10px] opacity-80 font-normal">Convert % of pension to annuity</div>
                </button>
              </div>

              {/* Active Floor Parameters */}
              {annuityFloorMode === 'target_floor' && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Guaranteed Annuity Floor Target</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{fmt(annuityFloorIncomeTarget)}/yr</span>
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={60000}
                    step={1000}
                    value={annuityFloorIncomeTarget}
                    onChange={(e) => setAnnuityFloorIncomeTarget(parseInt(e.target.value) || 15000)}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>£5,000/yr</span>
                    <div className="flex gap-1">
                      {[10000, 15000, 20000, 25000, 30000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAnnuityFloorIncomeTarget(preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            annuityFloorIncomeTarget === preset
                              ? 'bg-indigo-600 text-white font-black'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          £{preset / 1000}k
                        </button>
                      ))}
                    </div>
                    <span>£60,000/yr</span>
                  </div>
                </div>
              )}

              {annuityFloorMode === 'custom_percent' && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">Pension Pot Converted to Annuity</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{annuityFloorPercent}% of Pension</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={annuityFloorPercent}
                    onChange={(e) => setAnnuityFloorPercent(parseInt(e.target.value) || 40)}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>10%</span>
                    <div className="flex gap-1">
                      {[25, 33, 50, 75, 100].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAnnuityFloorPercent(preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            annuityFloorPercent === preset
                              ? 'bg-indigo-600 text-white font-black'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                    <span>100%</span>
                  </div>
                </div>
              )}

              {annuityFloorMode !== 'none' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Annuity Purchase Age</label>
                      <input
                        type="number"
                        min={pensionAccessAge}
                        max={85}
                        value={annuityFloorAge}
                        onChange={(e) => setAnnuityFloorAge(parseInt(e.target.value) || currentRetirementAge)}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Est. Annuity Rate (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={2.0}
                        max={12.0}
                        value={annuityRatePercent}
                        onChange={(e) => setAnnuityRatePercent(parseFloat(e.target.value) || 6.0)}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Annuity Type</label>
                      <select
                        value={annuityType}
                        onChange={(e) => setAnnuityType(e.target.value as AnnuityType)}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <optgroup label="Inflation-Linked (CPI/RPI)">
                          <option value="inflation_linked_single">Inflation-Linked Single Life</option>
                          <option value="inflation_linked_joint">Inflation-Linked Joint Life</option>
                        </optgroup>
                        <optgroup label="Fixed Escalating (3% / 5% Annual Rise)">
                          <option value="fixed_increase_single_3">3% Escalating Single Life</option>
                          <option value="fixed_increase_joint_3">3% Escalating Joint Life</option>
                          <option value="fixed_increase_single_5">5% Escalating Single Life</option>
                          <option value="fixed_increase_joint_5">5% Escalating Joint Life</option>
                        </optgroup>
                        <optgroup label="Level / Fixed Income">
                          <option value="level_single">Level Single Life</option>
                          <option value="level_joint">Level Joint Life</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Annuity Term / Duration Section */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2.5 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Annuity Duration / Term Guarantee</span>
                      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAnnuityDurationOption('lifetime')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                            annuityDurationOption === 'lifetime'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          Lifetime Guaranteed
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnnuityDurationOption('until_age')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                            annuityDurationOption === 'until_age'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                          }`}
                        >
                          Fixed-Term / Temporary
                        </button>
                      </div>
                    </div>

                    {annuityDurationOption === 'until_age' && (
                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">Fixed-Term Duration Target</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-black">Until Age {annuityDurationUntilAge}</span>
                        </div>
                        <input
                          type="range"
                          min={Math.max(pensionAccessAge + 1, annuityFloorAge + 1)}
                          max={90}
                          step={1}
                          value={annuityDurationUntilAge}
                          onChange={(e) => setAnnuityDurationUntilAge(parseInt(e.target.value) || 75)}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Age {annuityFloorAge + 1}</span>
                          <div className="flex gap-1">
                            {[67, 75, 80, 85].filter((a) => a > annuityFloorAge).map((presetAge) => (
                              <button
                                key={presetAge}
                                type="button"
                                onClick={() => setAnnuityDurationUntilAge(presetAge)}
                                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                                  annuityDurationUntilAge === presetAge
                                    ? 'bg-indigo-600 text-white font-black'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                                }`}
                              >
                                {presetAge === 67 ? 'SPA 67' : `Age ${presetAge}`}
                              </button>
                            ))}
                          </div>
                          <span>Age 90</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {annuityFloorDetails && (
                <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Annuity Safety Floor Active
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      At age <strong>{annuityFloorDetails.annuityPurchaseAge}</strong>, ~<strong>{annuityFloorDetails.allocationPercent}%</strong> of pension pot ({fmt(annuityFloorDetails.pensionPotAllocated)}) is converted into a guaranteed annuity floor yielding <strong className="font-extrabold">{fmt(annuityFloorDetails.guaranteedAnnualIncome)}/yr</strong> {annuityDurationOption === 'until_age' ? `until age ${annuityDurationUntilAge}` : 'for life'} ({annuityType.replace(/_/g, ' ')}). The remaining flexi-drawdown funds generate <strong className="font-extrabold">{fmt(annuityFloorDetails.flexiDrawdownAnnualIncome)}/yr</strong> for a total spend target of <strong>{fmt(maxAnnualIncome)}/yr</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* CONTROL 5: MAX DRAWDOWN WITH EXCESS REINVESTMENT */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span>Max Drawdown & Reinvest Surplus</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                        Tax & Pot Optimizer
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Maximize tax-free & low-tax pension drawdowns up to {fmt(maxAnnualIncome)}/yr, keeping lifestyle spending at {fmt(actualSpendingTargetAnnual)}/yr and automatically reinvesting the surplus into another pot.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReinvestExcessDrawdown(!reinvestExcessDrawdown)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all border flex items-center gap-1.5 ${
                    reinvestExcessDrawdown
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{reinvestExcessDrawdown ? '✓ Active' : 'Enable Option'}</span>
                </button>
              </div>

              {reinvestExcessDrawdown && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Actual Annual Spending Target</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">{fmt(actualSpendingTargetAnnual)}/yr</span>
                      </label>
                      <input
                        type="number"
                        step={1000}
                        min={5000}
                        max={maxAnnualIncome}
                        value={actualSpendingTargetAnnual}
                        onChange={(e) => setActualSpendingTargetAnnual(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Amount needed for lifestyle expenses. Surplus drawdown of <strong className="text-emerald-600 dark:text-emerald-400">{fmt(Math.max(0, maxAnnualIncome - actualSpendingTargetAnnual))}/yr</strong> will be reinvested.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Reinvestment Destination Pot
                      </label>
                      <select
                        value={reinvestDestinationPot}
                        onChange={(e) => setReinvestDestinationPot(e.target.value as 'isa' | 'gia' | 'cash')}
                        className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="isa">ISA / Stocks & Shares ISA (Tax-Free Growth)</option>
                        <option value="cash">Cash Savings Pot (Liquid Reserve)</option>
                        <option value="gia">General Investment Account (GIA)</option>
                      </select>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Surplus income above spending requirement will accumulate in this pot annually.
                      </p>
                    </div>
                  </div>

                  {reinvestExcessDetails && (
                    <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Reinvestment Strategy Active
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Drawing down maximum <strong>{fmt(maxAnnualIncome)}/yr</strong> from pensions & pots. Spending <strong>{fmt(actualSpendingTargetAnnual)}/yr</strong> on lifestyle requirements. Reinvesting <strong>{fmt(reinvestExcessDetails.annualSurplusReinvested)}/yr</strong> surplus into your <strong>{reinvestDestinationPot.toUpperCase()} pot</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* VISUAL WEALTH TRAJECTORY CHART */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Maximized Portfolio Trajectory (Retirement Age {currentRetirementAge} to {maxPlottedAge})</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {maxPlottedAge >= 100 ? 'Plotting capped at Age 100' : `Pots glide down to ${fmt(targetLegacyBuffer)} @ Age ${targetEndAge}`}
              </span>
            </div>

            {/* ADJUST TARGET INCOME BUDGET CONTROL */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Adjust Target Income Spending Budget</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Calculated Solved Max: <strong className="text-amber-600 dark:text-amber-400">{fmt(maxAnnualIncome)}/yr</strong>. Adjusting this will display the adjusted trajectory below and apply it to your plan.
                  </p>
                </div>
                {customAdjustedTargetIncome !== null && customAdjustedTargetIncome !== maxAnnualIncome && (
                  <button
                    type="button"
                    onClick={() => setCustomAdjustedTargetIncome(null)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold border border-amber-300 dark:border-amber-800 hover:bg-amber-200 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    ↺ Reset to Max ({fmt(maxAnnualIncome)}/yr)
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full flex-1 space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-400">Adjusted Spending Target:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">{fmt(effectiveAdjustedIncome)}/yr</span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(5000, Math.round((maxAnnualIncome || 30000) * 0.3))}
                    max={Math.max(50000, Math.round((maxAnnualIncome || 30000) * 1.4))}
                    step={500}
                    value={effectiveAdjustedIncome}
                    onChange={(e) => setCustomAdjustedTargetIncome(parseInt(e.target.value) || maxAnnualIncome)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div className="w-full sm:w-44 shrink-0">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">£</span>
                    <input
                      type="number"
                      step={500}
                      value={effectiveAdjustedIncome}
                      onChange={(e) => setCustomAdjustedTargetIncome(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full pl-7 pr-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-64 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMaxPot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `£${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const isAdjustedDifferent = data.adjustedTargetIncome !== data.maxTargetIncome;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-48 text-slate-100">
                          <div className="font-extrabold border-b border-slate-800 pb-1 flex items-center justify-between text-amber-400">
                            <span>Age {label} ({data.year})</span>
                          </div>
                          
                          <div className="space-y-0.5 pb-1 border-b border-slate-800">
                            <div className="text-[10px] font-black uppercase text-amber-400">Solved Max Spend ({fmt(maxAnnualIncome)}/yr)</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Wealth Pot:</span>
                              <span className="font-bold text-amber-300">£{Math.round(data.maximizedPot || 0).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="space-y-0.5 pt-0.5">
                            <div className="text-[10px] font-black uppercase text-emerald-400">
                              {isAdjustedDifferent ? `Adjusted Target Spend (${fmt(effectiveAdjustedIncome)}/yr)` : 'Applied Target Income'}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Wealth Pot:</span>
                              <span className="font-bold text-emerald-300">£{Math.round(data.adjustedPot || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Target Income Req:</span>
                              <span className="font-bold text-indigo-300">£{Math.round(data.adjustedTargetIncome || 0).toLocaleString()}/yr</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Net Income Received:</span>
                              <span className="font-bold text-teal-300">£{Math.round(data.adjustedNetIncome || 0).toLocaleString()}/yr</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="maximizedPot"
                    name={`Solved Max Wealth (${fmt(maxAnnualIncome)}/yr)`}
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMaxPot)"
                  />
                  <Line
                    type="monotone"
                    dataKey="adjustedPot"
                    name={`Adjusted Target Wealth (${fmt(effectiveAdjustedIncome)}/yr)`}
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Applying this solver will set your plan target annual retirement spend to <strong className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(effectiveAdjustedIncome)}/yr</strong>.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Apply Maximized Spend ({fmt(effectiveAdjustedIncome)}/yr)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
