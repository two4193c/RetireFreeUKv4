import React, { useState } from 'react';
import { UserProfile, LsaProtectionType, IncomeProductOption, AnnuityType, AnnuityDurationOption, AnnuityTranche, InvestmentPots, YearProjection, LumpSumSplit, PlannerScenario, DrawdownStrategy, AppMode } from '../types';
import { AnnuityPclsTaxAdviceCard } from './AnnuityPclsTaxAdviceCard';
import { QuickDrawdownStrategyBar } from './QuickDrawdownStrategyBar';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from '../utils/defaultData';
import {
  calculateMaxPcls,
  getLsaLimit,
  getPensionAccessAge,
  getLumpSumTakeAge,
  getPartnerPensionAccessAge,
  getPartnerLumpSumTakeAge,
  getPartnerLsaLimit,
  getProjectedPensionAtTakeAge,
  calculateUKTax,
} from '../utils/ukTaxEngine';
import { disableMaximizedSpend } from '../utils/maximizedSpendSolver';
import {
  Layers,
  ShieldCheck,
  DollarSign,
  HelpCircle,
  Award,
  Percent,
  PiggyBank,
  ArrowRight,
  ShieldAlert,
  User,
  Heart,
  Users,
  Plus,
  Trash2,
  Clock,
  Calendar,
  CheckCircle2,
  Split,
  Zap,
  Sparkles,
} from 'lucide-react';

interface LumpSumSplitEditorProps {
  splits: LumpSumSplit[];
  lumpSumAmount: number;
  onChange: (splits: LumpSumSplit[]) => void;
  accentColor?: 'emerald' | 'rose';
}

const POT_OPTIONS = [
  { value: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA' },
  { value: 'cash_isa', label: 'Cash ISA' },
  { value: 'cash_savings', label: 'Cash Savings Account' },
  { value: 'gia', label: 'General Investment Account (GIA)' },
  { value: 'spend_clear_debt', label: 'Spend / Clear Debt (Debt payoff & expenses)' },
];

const LumpSumSplitEditor: React.FC<LumpSumSplitEditorProps> = ({
  splits = [],
  lumpSumAmount,
  onChange,
  accentColor = 'emerald',
}) => {
  const isEmerald = accentColor === 'emerald';

  const handleAddSplit = () => {
    const newSplit: LumpSumSplit = {
      id: `split_${Date.now()}`,
      pot: 'stocks_and_shares_isa',
      mode: 'percentage',
      value: 50,
    };
    onChange([...splits, newSplit]);
  };

  const handleUpdateSplit = (id: string, updates: Partial<LumpSumSplit>) => {
    onChange(splits.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleRemoveSplit = (id: string) => {
    onChange(splits.filter((s) => s.id !== id));
  };

  let totalAllocated = 0;
  const computedSplits = splits.map((s) => {
    const amt = s.mode === 'percentage'
      ? Math.round((s.value / 100) * lumpSumAmount)
      : Math.max(0, s.value);
    totalAllocated += amt;
    return { ...s, calculatedAmount: amt };
  });

  const remaining = Math.max(0, lumpSumAmount - totalAllocated);

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Split className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
          Multi-Pot Allocation Distribution
        </span>
        <button
          type="button"
          onClick={handleAddSplit}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all text-white ${
            isEmerald
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          <Plus className="w-3 h-3" />
          Add Destination Pot
        </button>
      </div>

      {splits.length === 0 ? (
        <div className="text-center py-3 text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          No split rules added yet. Click &quot;Add Destination Pot&quot; to distribute tax-free cash across ISAs, Cash, and Debt payoff.
        </div>
      ) : (
        <div className="space-y-2">
          {computedSplits.map((s) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs"
            >
              {/* Pot Selector */}
              <div className="flex-1 min-w-[180px]">
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5 sm:hidden">Destination Pot</label>
                <select
                  value={s.pot}
                  onChange={(e) => handleUpdateSplit(s.id, { pot: e.target.value as any })}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 text-xs"
                >
                  {POT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount / Percentage Input Group - Spacious and easy to type */}
              <div className="flex items-center gap-1.5 min-w-[170px] sm:w-56">
                <select
                  value={s.mode}
                  onChange={(e) => handleUpdateSplit(s.id, { mode: e.target.value as any })}
                  className="px-2 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0"
                >
                  <option value="percentage">% Share</option>
                  <option value="amount">£ Amount</option>
                </select>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max={s.mode === 'percentage' ? 100 : lumpSumAmount}
                    value={s.value === 0 ? '' : s.value}
                    onChange={(e) => handleUpdateSplit(s.id, { value: Number(e.target.value) })}
                    className="w-full pl-2.5 pr-6 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-900 dark:text-slate-100 text-xs text-right"
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                    {s.mode === 'percentage' ? '%' : '£'}
                  </span>
                </div>
              </div>

              {/* Calculated Amount Display & Delete */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:min-w-[120px] text-right">
                <div className="font-black text-slate-800 dark:text-slate-200 text-xs">
                  £{s.calculatedAmount.toLocaleString()}
                  <span className="text-[10px] text-slate-400 font-normal block">
                    ({Math.round((s.calculatedAmount / (lumpSumAmount || 1)) * 100)}%)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSplit(s.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                  title="Remove Split"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] font-bold pt-1 text-slate-600 dark:text-slate-400">
        <span>
          Total Allocated: <span className="text-slate-900 dark:text-slate-100">£{totalAllocated.toLocaleString()}</span> ({Math.round((totalAllocated / (lumpSumAmount || 1)) * 100)}%)
        </span>
        {remaining > 0 && (
          <span className="text-amber-600 dark:text-amber-400">
            Unallocated: £{remaining.toLocaleString()} (Auto-placed in Cash Buffer)
          </span>
        )}
      </div>
    </div>
  );
};

interface DrawdownPlannerProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
  pots?: InvestmentPots;
  projections?: YearProjection[];
  onOpenMaximizedSpendModal?: () => void;
  scenarios?: PlannerScenario[];
  activeScenarioId?: string;
  onCreateStrategyVariants?: (baseScenarioId: string, strategiesToCreate: DrawdownStrategy[]) => void;
  onNavigateToCompare?: () => void;
  appMode?: AppMode;
}

export const DrawdownPlanner: React.FC<DrawdownPlannerProps> = ({
  profile,
  onChange,
  pots,
  projections,
  onOpenMaximizedSpendModal,
  scenarios = [],
  activeScenarioId,
  onCreateStrategyVariants,
  onNavigateToCompare,
  appMode = 'basic',
}) => {
  const [activeLumpSumPerson, setActiveLumpSumPerson] = useState<'primary' | 'partner'>('primary');
  const [activeIncomePerson, setActiveIncomePerson] = useState<'primary' | 'partner'>('primary');

  const primaryTaxResult = calculateUKTax(profile, pots || DEFAULT_POTS);

  const getPensionPotForAge = (targetAge: number, isPartnerPerson: boolean): number => {
    if (projections && projections.length > 0) {
      if (isPartnerPerson) {
        const partnerAgeOffset = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
        const targetPrimaryAge = targetAge - partnerAgeOffset;
        const found = projections.find((p) => p.age === targetPrimaryAge);
        if (found) {
          const val = found.partnerPensionPotBeforePcls ?? (found.partnerPensionPotBeforeAnnuity ?? found.partnerPensionPot);
          if (val !== undefined && val >= 0) return val;
        }
      } else {
        const found = projections.find((p) => p.age === targetAge);
        if (found) {
          const val = found.primaryPensionPotBeforePcls ?? (found.primaryPensionPotBeforeAnnuity ?? found.primaryPensionPot);
          if (val !== undefined && val >= 0) return val;
        }
      }
    }
    const activePotsObj = isPartnerPerson ? partnerPotsObj : primaryPotsObj;
    return getProjectedPensionAtTakeAge(profile, activePotsObj, targetAge, isPartnerPerson);
  };

  const updateField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    onChange({
      ...profile,
      [key]: value,
    });
  };

  const isCouple = Boolean(profile.isCouplePlanning);

  const activeSpa = activeIncomePerson === 'partner' ? (profile.partnerStatePensionAge || 67) : (profile.statePensionAge || 67);
  const activeRetireAge = activeIncomePerson === 'partner' ? (profile.partnerTargetRetirementAge || profile.targetRetirementAge) : profile.targetRetirementAge;
  const bridgeYears = Math.max(0, activeSpa - activeRetireAge);

  const primaryLsaLimit = getLsaLimit(profile);
  const primaryPensionAccessAge = getPensionAccessAge(profile);
  const primaryLumpSumTakeAge = getLumpSumTakeAge(profile);

  const partnerLsaLimit = getPartnerLsaLimit(profile);
  const partnerPensionAccessAge = getPartnerPensionAccessAge(profile);
  const partnerLumpSumTakeAge = getPartnerLumpSumTakeAge(profile);

  // Compute Primary & Partner Pots (Current & Projected at Lump Sum Access Age)
  const primaryPotsObj: InvestmentPots = sanitizePots(pots, DEFAULT_POTS);

  const primaryCurrentPot = primaryPotsObj.workplacePensionBalance + primaryPotsObj.sippBalance;
  const primaryProjectedPot = getPensionPotForAge(primaryLumpSumTakeAge, false);

  const primaryPclsPct = profile.pclsLumpSumPercent ?? 25;
  const primaryRawLumpSum = primaryProjectedPot * (primaryPclsPct / 100);
  const primaryActualLumpSum = Math.min(primaryRawLumpSum, primaryLsaLimit);

  const primaryCurrentRawLumpSum = primaryCurrentPot * (primaryPclsPct / 100);
  const primaryCurrentActualLumpSum = Math.min(primaryCurrentRawLumpSum, primaryLsaLimit);

  // Partner calculations
  const partnerPotsObj: InvestmentPots = sanitizePots(
    profile.partnerPots,
    {
      ...DEFAULT_PARTNER_POTS,
      workplacePensionBalance: profile.partnerWorkplacePensionBalance || DEFAULT_PARTNER_POTS.workplacePensionBalance,
      sippBalance: profile.partnerSippBalance || DEFAULT_PARTNER_POTS.sippBalance,
      stocksAndSharesIsaBalance: profile.partnerIsaBalance || DEFAULT_PARTNER_POTS.stocksAndSharesIsaBalance,
    }
  );

  const partnerCurrentPot = partnerPotsObj.workplacePensionBalance + partnerPotsObj.sippBalance;
  const partnerProjectedPot = getPensionPotForAge(partnerLumpSumTakeAge, true);

  const partnerPclsPct = profile.partnerPclsLumpSumPercent ?? 25;
  const partnerRawLumpSum = partnerProjectedPot * (partnerPclsPct / 100);
  const partnerActualLumpSum = Math.min(partnerRawLumpSum, partnerLsaLimit);

  const partnerCurrentRawLumpSum = partnerCurrentPot * (partnerPclsPct / 100);
  const partnerCurrentActualLumpSum = Math.min(partnerCurrentRawLumpSum, partnerLsaLimit);

  // Active Income Person Options & Helper getters/setters
  const activeIncomeOption: IncomeProductOption = activeIncomePerson === 'partner'
    ? (profile.partnerIncomeProductOption || profile.incomeProductOption || 'flexi_drawdown')
    : (profile.incomeProductOption || 'flexi_drawdown');

  const setIncomeProductOption = (opt: IncomeProductOption) => {
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerIncomeProductOption: opt });
    } else {
      onChange({ ...profile, incomeProductOption: opt });
    }
  };

  const activeAllocPercent = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityAllocationPercent ?? 50)
    : (profile.annuityAllocationPercent ?? 50);

  const setAllocPercent = (val: number) => {
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityAllocationPercent: val });
    } else {
      onChange({ ...profile, annuityAllocationPercent: val });
    }
  };

  const activeAnnuityType: AnnuityType = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityType || 'inflation_linked_single')
    : (profile.annuityType || 'inflation_linked_single');

  const setAnnuityType = (type: AnnuityType, defaultRate: number) => {
    if (activeIncomePerson === 'partner') {
      onChange({
        ...profile,
        partnerAnnuityType: type,
        partnerAnnuityRatePercent: defaultRate,
      });
    } else {
      onChange({
        ...profile,
        annuityType: type,
        annuityRatePercent: defaultRate,
      });
    }
  };

  const activeAnnuityRate = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityRatePercent ?? 4.2)
    : (profile.annuityRatePercent ?? 4.2);

  const setAnnuityRate = (rate: number) => {
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityRatePercent: rate });
    } else {
      onChange({ ...profile, annuityRatePercent: rate });
    }
  };

  const activeDurationOption: AnnuityDurationOption = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityDurationOption || 'lifetime')
    : (profile.annuityDurationOption || 'lifetime');

  const setDurationOption = (opt: AnnuityDurationOption) => {
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityDurationOption: opt });
    } else {
      onChange({ ...profile, annuityDurationOption: opt });
    }
  };

  const activeDurationUntilAge = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityDurationUntilAge || 75)
    : (profile.annuityDurationUntilAge || 75);

  const setDurationUntilAge = (val: number) => {
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityDurationUntilAge: val });
    } else {
      onChange({ ...profile, annuityDurationUntilAge: val });
    }
  };

  const activePensionAccessAge = activeIncomePerson === 'partner'
    ? partnerPensionAccessAge
    : primaryPensionAccessAge;

  const rawActivePurchaseAge = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || profile.targetRetirementAge))
    : (profile.annuityPurchaseAge || profile.targetRetirementAge);
  const activePurchaseAge = Math.max(activePensionAccessAge, rawActivePurchaseAge);

  // Earliest age for annuity operations — used as min constraint for tranche purchase age and duration inputs
  const activeTakeAge = activeIncomePerson === 'partner'
    ? partnerLumpSumTakeAge
    : primaryLumpSumTakeAge;

  const setPurchaseAge = (val: number) => {
    const safeAge = Math.max(activePensionAccessAge, val);
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityPurchaseAge: safeAge });
    } else {
      onChange({ ...profile, annuityPurchaseAge: safeAge });
    }
  };

  // Tranches helpers
  const activeTranches: AnnuityTranche[] = activeIncomePerson === 'partner'
    ? (profile.partnerAnnuityTranches || [])
    : (profile.annuityTranches || []);

  const addTranche = () => {
    const defaultAge = (activeIncomePerson === 'partner' ? partnerLumpSumTakeAge : primaryLumpSumTakeAge) + 5;
    const newTranche: AnnuityTranche = {
      id: Date.now().toString(),
      name: `Annuity Purchase (Age ${defaultAge})`,
      owner: activeIncomePerson,
      purchaseAge: defaultAge,
      allocationPercent: 25,
      annuityRatePercent: 5.5,
      annuityType: 'inflation_linked_single',
      durationOption: 'lifetime',
      durationUntilAge: 75,
      enabled: true,
    };

    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityTranches: [...activeTranches, newTranche] });
    } else {
      onChange({ ...profile, annuityTranches: [...activeTranches, newTranche] });
    }
  };

  const updateTranche = (id: string, updated: Partial<AnnuityTranche>) => {
    const list = activeTranches.map((t) => (t.id === id ? { ...t, ...updated } : t));
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityTranches: list });
    } else {
      onChange({ ...profile, annuityTranches: list });
    }
  };

  const deleteTranche = (id: string) => {
    const list = activeTranches.filter((t) => t.id !== id);
    if (activeIncomePerson === 'partner') {
      onChange({ ...profile, partnerAnnuityTranches: list });
    } else {
      onChange({ ...profile, annuityTranches: list });
    }
  };

  // Compute Starting Annual Annuity Income for Active Person at Configured Annuity Purchase Start Age
  const activePotsObj = activeIncomePerson === 'partner' ? partnerPotsObj : primaryPotsObj;
  const activeProjectedPensionAtPurchase = getPensionPotForAge(activePurchaseAge, activeIncomePerson === 'partner');
  const activePclsPercentage = activeIncomePerson === 'partner' ? partnerPclsPct : primaryPclsPct;
  const activeTakeLumpSum = activeIncomePerson === 'partner' ? profile.partnerTakeLumpSumAtStart : profile.takeLumpSumAtStart;
  const activePclsVal = activeProjectedPensionAtPurchase * (activePclsPercentage / 100);
  const activePostPclsPension = activeTakeLumpSum ? Math.max(0, activeProjectedPensionAtPurchase - activePclsVal) : activeProjectedPensionAtPurchase;

  const singleAlloc = activeIncomeOption === 'annuity' ? 100 : activeAllocPercent;
  const startingAnnuityCapital = activePostPclsPension * (singleAlloc / 100);
  const startingAnnualIncome = startingAnnuityCapital * (activeAnnuityRate / 100);
  const startingMonthlyIncome = startingAnnualIncome / 12;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Quick Strategy Switcher Bar */}
      <QuickDrawdownStrategyBar
        profile={profile}
        pots={pots || DEFAULT_POTS}
        onChangeProfile={onChange}
        onSelectPerson={(person) => {
          setActiveIncomePerson(person);
        }}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onCreateStrategyVariants={onCreateStrategyVariants}
        onNavigateToCompare={onNavigateToCompare}
        onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
        appMode={appMode}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Tax Free Lump Sum and Excess Income Destination</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Flexi-access drawdown, annuity options, and maximum tax-free cash (PCLS)</p>
          </div>
        </div>

        {bridgeYears > 0 && (
          <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-300 dark:border-amber-800/80">
            {bridgeYears}-Year Bridge Before State Pension
          </span>
        )}
      </div>

      {/* SECTION 1: Retirement Income Product Strategy */}
      {(activeIncomeOption === 'annuity' || activeIncomeOption === 'hybrid') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>1. Retirement Income Product Configuration</span>
            </h3>

            {/* Couple Person Switcher Tabs */}
            {isCouple && (
              <div role="tablist" aria-label="Select person for drawdown strategy" className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <button
                  role="tab"
                  aria-selected={activeIncomePerson === 'primary'}
                  onClick={() => {
                    setActiveIncomePerson('primary');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    activeIncomePerson === 'primary'
                      ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{profile.name || 'Primary'}</span>
                </button>
                <button
                  role="tab"
                  aria-selected={activeIncomePerson === 'partner'}
                  onClick={() => {
                    setActiveIncomePerson('partner');
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    activeIncomePerson === 'partner'
                      ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>{profile.partnerName || 'Partner'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Annuity Details Configurator & Starting Annual Income Badge */}
          <div className="bg-indigo-50/60 dark:bg-slate-800/60 p-5 rounded-2xl border border-indigo-200/80 dark:border-slate-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200/60 dark:border-slate-700">
              <span className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{activeIncomePerson === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary')} Annuity Configuration & Rates</span>
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">UK Market Rate Model</span>
            </div>

            {/* Starting Annual Income Metric Card */}
            <div className="bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Starting Annual Annuity Income ({activeIncomePerson === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary')})</span>
                </span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  From <strong>£{Math.round((startingAnnuityCapital) || 0).toLocaleString()}</strong> projected pension capital at Purchase Age {activePurchaseAge} ({singleAlloc}% of pension pot)
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 block">
                  £{Math.round((startingAnnualIncome) || 0).toLocaleString()} <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">/ yr</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  £{Math.round((startingMonthlyIncome) || 0).toLocaleString()} / month
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Allocation Percent (if Hybrid) */}
              {activeIncomeOption === 'hybrid' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Initial Annuity Allocation</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-bold">{activeAllocPercent}%</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={activeAllocPercent}
                    onChange={(e) => setAllocPercent(Number(e.target.value))}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeAllocPercent}% Annuity / {100 - activeAllocPercent}% Drawdown
                  </p>
                </div>
              )}

              {/* Annuity Escalation & Type */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Annuity Type & Inflation Link</label>
                <select
                  value={activeAnnuityType}
                  onChange={(e) => {
                    const type = e.target.value as AnnuityType;
                    let defaultRate = 6.0;
                    if (type === 'inflation_linked_single') defaultRate = 4.2;
                    else if (type === 'level_joint') defaultRate = 5.2;
                    else if (type === 'inflation_linked_joint') defaultRate = 3.6;
                    setAnnuityType(type, defaultRate);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="inflation_linked_single">Single Life - Inflation-Linked (CPI/RPI)</option>
                  <option value="level_single">Single Life - Fixed Level Nominal</option>
                  <option value="inflation_linked_joint">Joint Life (50% Spouse) - Inflation-Linked</option>
                  <option value="level_joint">Joint Life (50% Spouse) - Level Nominal</option>
                </select>
              </div>

              {/* Annuity Purchase Start Age */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Annuity Purchase Start Age</span>
                  <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">Age {activePurchaseAge}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={activePensionAccessAge}
                    max={95}
                    value={activePurchaseAge}
                    onChange={(e) => setPurchaseAge(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                  <span className="absolute right-3 top-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold">yrs</span>
                </div>
              </div>

              {/* Annuity Payout Rate */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Annuity Rate (%)</span>
                  <span className="text-indigo-700 dark:text-indigo-400 font-extrabold">{activeAnnuityRate}%</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="15.0"
                    value={activeAnnuityRate}
                    onChange={(e) => setAnnuityRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                  <span className="absolute right-3 top-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold">% p.a.</span>
                </div>
              </div>

            </div>

            {/* Level Annuity Duration Option (Lifetime vs Until Age X) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Annuity Duration / Term</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Choose lifetime vs fixed term payout</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  activeDurationOption === 'lifetime'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name={`duration-${activeIncomePerson}`}
                    checked={activeDurationOption === 'lifetime'}
                    onChange={() => setDurationOption('lifetime')}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="text-xs">♾️ Lifetime (Guaranteed Income For Life)</span>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  activeDurationOption === 'until_age'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <input
                    type="radio"
                    name={`duration-${activeIncomePerson}`}
                    checked={activeDurationOption === 'until_age'}
                    onChange={() => setDurationOption('until_age')}
                    className="accent-indigo-600 w-4 h-4"
                  />
                  <span className="text-xs">⏱️ Fixed Term (Until Target Age X)</span>
                </label>
              </div>

              {activeDurationOption === 'until_age' && (
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Annuity Payout Ends at Age:</span>
                  <input
                    type="number"
                    min={activeTakeAge + 1}
                    max={100}
                    value={activeDurationUntilAge}
                    onChange={(e) => setDurationUntilAge(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-[11px] text-slate-400">e.g. Age 67 (State Pension Age) or Age 75</span>
                </div>
              )}
            </div>

            {/* MULTI-TRANCHE HYBRID ANNUITIES SECTION */}
            {activeIncomeOption === 'hybrid' && (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Multiple / Staggered Annuity Purchases at Different Ages</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Add additional annuity purchases at future ages (e.g. Age 65, Age 70, Age 75) to lock in higher annuity rates as you age.
                    </p>
                  </div>

                  <button
                    onClick={addTranche}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Annuity Tranche</span>
                  </button>
                </div>

                {activeTranches.length === 0 ? (
                  <div className="text-center py-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl border border-dashed border-purple-200 dark:border-purple-800 text-xs text-purple-700 dark:text-purple-300">
                    No extra annuity tranches configured. Click <strong>Add Annuity Tranche</strong> above to schedule staggered annuity purchases.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTranches.map((t, idx) => {
                      const projectedPotAtTrancheAge = getPensionPotForAge(
                        t.purchaseAge,
                        activeIncomePerson === 'partner'
                      );
                      const allocPct = t.allocationPercent ?? 25;
                      const potAllocated = projectedPotAtTrancheAge * (allocPct / 100);
                      const annualIncomeGenerated = potAllocated * ((t.annuityRatePercent ?? 5.5) / 100);
                      const monthlyIncomeGenerated = annualIncomeGenerated / 12;

                      return (
                        <div
                          key={t.id}
                          className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700 pb-2.5">
                            <div>
                              <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                  #{idx + 1}
                                </span>
                                <span>Tranche #{idx + 1}: Purchase at Age {t.purchaseAge}</span>
                              </span>

                              {/* Projected Available Pension Pot & Payout Badge */}
                              <div className="text-[11px] text-purple-900 dark:text-purple-300 mt-1 font-semibold flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span>Available Pension at Age {t.purchaseAge}: <strong>£{Math.round((projectedPotAtTrancheAge) || 0).toLocaleString()}</strong></span>
                                <span>•</span>
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  Est. Payout: £{Math.round((annualIncomeGenerated) || 0).toLocaleString()}/yr (£{Math.round((monthlyIncomeGenerated) || 0).toLocaleString()}/mo)
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => deleteTranche(t.id)}
                              className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                              title="Delete Tranche"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                            {/* Purchase Age */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Purchase Age</label>
                              <input
                                type="number"
                                min={activeTakeAge}
                                max={90}
                                value={t.purchaseAge}
                                onChange={(e) => updateTranche(t.id, { purchaseAge: Number(e.target.value) })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                              />
                            </div>

                            {/* Pot Allocation Range Slider */}
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold text-slate-500">Pot Allocation</label>
                                <span className="text-[11px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                                  {allocPct}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={100}
                                step={1}
                                value={allocPct}
                                onChange={(e) => updateTranche(t.id, { allocationPercent: Number(e.target.value) })}
                                className="w-full accent-purple-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer mt-1"
                              />
                            </div>

                            {/* Annuity Rate (%) */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Annuity Rate (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                min={1.0}
                                max={15.0}
                                value={t.annuityRatePercent}
                                onChange={(e) => updateTranche(t.id, { annuityRatePercent: Number(e.target.value) })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-purple-600 dark:text-purple-400"
                              />
                            </div>

                            {/* Annuity Type Dropdown */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Annuity Type</label>
                              <select
                                value={t.annuityType || 'inflation_linked_single'}
                                onChange={(e) => updateTranche(t.id, { annuityType: e.target.value as AnnuityType })}
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                              >
                                <option value="inflation_linked_single">Inflation-Linked Single</option>
                                <option value="level_single">Level / Fixed Single</option>
                                <option value="inflation_linked_joint">Inflation-Linked Joint</option>
                                <option value="level_joint">Level / Fixed Joint</option>
                              </select>
                            </div>

                            {/* Term Duration */}
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Term Duration</label>
                              <select
                                value={t.durationOption || 'lifetime'}
                                onChange={(e) => updateTranche(t.id, { durationOption: e.target.value as AnnuityDurationOption })}
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
                              >
                                <option value="lifetime">For Life</option>
                                <option value="until_age">Until Age X</option>
                              </select>
                            </div>
                          </div>

                          {t.durationOption === 'until_age' && (
                            <div className="flex items-center gap-2 text-xs pt-1">
                              <span className="font-semibold text-slate-600 dark:text-slate-400">Duration Ends at Age:</span>
                              <input
                                type="number"
                                min={t.purchaseAge + 1}
                                max={100}
                                value={t.durationUntilAge || 75}
                                onChange={(e) => updateTranche(t.id, { durationUntilAge: Number(e.target.value) })}
                                className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ANNUITY & 25% TAX-FREE CASH (PCLS) INCOME TAX ADVICE & OPTIMIZER */}
            <AnnuityPclsTaxAdviceCard
              profile={profile}
              person={activeIncomePerson}
              projectedPot={activeProjectedPensionAtPurchase}
              purchaseAge={activePurchaseAge}
              annuityRate={activeAnnuityRate}
              pclsPercent={activeIncomePerson === 'partner' ? partnerPclsPct : primaryPclsPct}
              takeLumpSumAtStart={activeIncomePerson === 'partner' ? profile.partnerTakeLumpSumAtStart : profile.takeLumpSumAtStart}
              onToggleTakeLumpSum={(takeLumpSum) => {
                if (activeIncomePerson === 'partner') {
                  updateField('partnerTakeLumpSumAtStart', takeLumpSum);
                } else {
                  updateField('takeLumpSumAtStart', takeLumpSum);
                }
              }}
            />

          </div>
        </div>
      )}

      {/* SECTION 2: Drawdown Order & PCLS Maximum Tax-Free Cash */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
        
        {/* 25% Tax-Free Pension Lump Sum (PCLS & LSA Protections) */}
        <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Tax-Free Lump Sum (PCLS & LSA)</span>
              {isCouple && (
                <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                  Couple LSA Combined: £{(primaryLsaLimit + (partnerLsaLimit) || 0).toLocaleString()}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50 self-start sm:self-auto">
              {isCouple
                ? activeLumpSumPerson === 'primary'
                  ? `${profile.name || 'Primary'} Cap: £${(primaryLsaLimit || 0).toLocaleString()}`
                  : `${profile.partnerName || 'Partner'} Cap: £${(partnerLsaLimit || 0).toLocaleString()}`
                : `LSA Cap: £${(primaryLsaLimit || 0).toLocaleString()}`}
            </span>
          </div>

          {/* Person Selector Tabs for Couple Planning */}
          {isCouple && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 sm:p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs">
              <span className="text-slate-500 dark:text-slate-400 px-2 sm:px-3 text-[11px] uppercase tracking-wider font-extrabold">Configure For:</span>
              <div className="flex items-center gap-1 w-full sm:w-auto">
                <button
                  onClick={() => setActiveLumpSumPerson('primary')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeLumpSumPerson === 'primary'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span className="truncate">{profile.name || 'Primary'}</span>
                </button>
                <button
                  onClick={() => setActiveLumpSumPerson('partner')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    activeLumpSumPerson === 'partner'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-200 fill-rose-200 shrink-0" />
                  <span className="truncate">{profile.partnerName || 'Partner'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Person Controls */}
          {(!isCouple || activeLumpSumPerson === 'primary') && (
            <div className="space-y-3">
              {/* Max Tax-Free Lump Sum Badge & Cash Summary */}
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-xs text-emerald-950 dark:text-emerald-200 block uppercase tracking-wider">
                      {profile.name || 'Primary'} Max Tax-Free Lump Sum (PCLS)
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold leading-tight block">
                      At Access Age {primaryLumpSumTakeAge}: Projected Pension Pot £{Math.round(primaryProjectedPot || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-300 block">
                      £{Math.round(primaryActualLumpSum || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">
                      {primaryPclsPct}% of Projected Pension Pot
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                  <span>Based on Current Pension Pot Today (£{(primaryCurrentPot || 0).toLocaleString()}): <strong>£{Math.round(primaryCurrentActualLumpSum || 0).toLocaleString()}</strong></span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/70 dark:bg-emerald-900 px-2 py-0.5 rounded-md self-start sm:self-auto">LSA Limit: £{(primaryLsaLimit || 0).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 italic">
                  *Calculated strictly on Pension Pot value (Workplace Pension + SIPP) — excludes ISAs, LISA, GIA & Cash Savings.
                </p>
              </div>

              {/* LSA Protection Selector and Editable Cap Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Lump Sum Allowance Protection</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">2024/25 Preset</span>
                  </label>
                  <select
                    value={profile.lsaProtectionType || 'standard'}
                    onChange={(e) => {
                      const prot = e.target.value as LsaProtectionType;
                      let cap = 268275;
                      if (prot === 'fixed_2014') cap = 375000;
                      else if (prot === 'fixed_2016') cap = 312500;
                      else if (prot === 'individual_2014') cap = 300000;
                      else if (prot === 'individual_2016') cap = 280000;
                      else if (prot === 'custom') cap = profile.customLsaAllowance ?? 268275;

                      onChange({
                        ...profile,
                        lsaProtectionType: prot,
                        customLsaAllowance: cap,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="standard">Standard Limit (£268,275 LSA)</option>
                    <option value="fixed_2014">Fixed Protection 2014 (£375,000 LSA)</option>
                    <option value="fixed_2016">Fixed Protection 2016 (£312,500 LSA)</option>
                    <option value="individual_2014">Individual Protection 2014 (£300,000 Protected LSA)</option>
                    <option value="individual_2016">Individual Protection 2016 (£280,000 Protected LSA)</option>
                    <option value="custom">Custom / Scheme Protection Override</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>LSA Allowance Cap (£)</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">Amendable</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-bold text-xs">£</span>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      max="2000000"
                      value={primaryLsaLimit}
                      onChange={(e) => {
                        const cap = Math.max(0, Number(e.target.value));
                        onChange({
                          ...profile,
                          customLsaAllowance: cap,
                          lsaProtectionType: 'custom',
                        });
                      }}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={!!profile.takeLumpSumAtStart}
                  onChange={(e) => updateField('takeLumpSumAtStart', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Take Upfront Tax-Free Lump Sum (PCLS)</span>
              </label>

              {/* HMRC PCLS Recycling Warning Banner */}
              {profile.takeLumpSumAtStart && primaryTaxResult?.isPclsRecyclingRisk && (
                <div className="bg-rose-900/90 dark:bg-rose-950 text-white p-3.5 rounded-2xl border border-rose-700 space-y-1.5 shadow-sm my-2">
                  <div className="flex items-center gap-2 font-extrabold text-xs text-amber-300">
                    <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>HMRC PCLS Recycling Rule Active Risk (Schedule 29)</span>
                  </div>
                  <p className="text-[11px] text-rose-100 leading-relaxed">
                    You are routing or re-contributing tax-free PCLS cash back into a pension scheme. Under <strong>Schedule 29 Finance Act 2004 (PTM133800)</strong>, re-contributing more than 30% of your PCLS (or &gt;£7,500) into a pension triggers unauthorised payment charges up to <strong>55%</strong>. Standard routine workplace pension contributions maintain baseline levels and are exempt.
                  </p>
                </div>
              )}

              {profile.takeLumpSumAtStart && (
                <div className="space-y-3 pl-6 pt-1 border-l-2 border-emerald-500/30 ml-1">
                  {/* Timing selector & Destination Pot for tax-free lump sum */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Lump Sum Access Timing
                      </label>
                      <select
                        value={profile.lumpSumTiming || 'access_age'}
                        onChange={(e) => updateField('lumpSumTiming', e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="access_age">
                          When Private Pension is Accessed (Age {primaryPensionAccessAge})
                        </option>
                        <option value="custom">Custom Age</option>
                      </select>
                    </div>

                    {/* Destination Pot Option */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Destination Pot for Lump Sum Cash
                      </label>
                      <select
                        value={profile.lumpSumTargetPot || 'stocks_and_shares_isa'}
                        onChange={(e) => updateField('lumpSumTargetPot', e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="stocks_and_shares_isa">Stocks &amp; Shares ISA (Tax-Free Shelter)</option>
                        <option value="cash_isa">Cash ISA (Tax-Free Shelter)</option>
                        <option value="cash_savings">Cash Savings Account</option>
                        <option value="gia">General Investment Account (GIA)</option>
                        <option value="spend_clear_debt">Spend / Clear Debt (Mortgage payoff &amp; expenses)</option>
                        <option value="split">Split across Multiple Destination Pots...</option>
                      </select>
                    </div>

                    {profile.lumpSumTiming === 'custom' && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Custom Lump Sum Age
                        </label>
                        <input
                          type="number"
                          min={primaryPensionAccessAge}
                          max={80}
                          value={profile.lumpSumCustomAge || primaryPensionAccessAge}
                          onChange={(e) => updateField('lumpSumCustomAge', Math.max(primaryPensionAccessAge, Number(e.target.value)))}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Multi-Pot Allocation Split Editor */}
                  {profile.lumpSumTargetPot === 'split' && (
                    <LumpSumSplitEditor
                      splits={profile.lumpSumSplits || []}
                      lumpSumAmount={primaryActualLumpSum || 0}
                      onChange={(splits) => updateField('lumpSumSplits', splits)}
                      accentColor="emerald"
                    />
                  )}

                  {/* Percentage Slider with Cash Value */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 font-bold">
                      <span>PCLS Percentage & Cash Value:</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                        {primaryPclsPct}% = £{Math.round((primaryRawLumpSum) || 0).toLocaleString()}
                        {primaryRawLumpSum > primaryLsaLimit && (
                          <span className="text-rose-600 dark:text-rose-400 ml-1 text-[11px] font-bold">
                            (Capped at £{(primaryLsaLimit || 0).toLocaleString()} LSA)
                          </span>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      step="5"
                      value={primaryPclsPct}
                      onChange={(e) => updateField('pclsLumpSumPercent', Number(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                {profile.takeLumpSumAtStart ? (
                  <span>
                    <strong>Upfront PCLS ({profile.name || 'Primary'}):</strong> Takes {primaryPclsPct}% tax-free cash (<strong>£{Math.round(primaryActualLumpSum || 0).toLocaleString()}</strong>) at <strong>Age {primaryLumpSumTakeAge}</strong> {
                      profile.lumpSumTargetPot === 'spend_clear_debt' ? 'used to Spend / Clear Debt' :
                      profile.lumpSumTargetPot === 'split' ? 'split across multiple destination pots' :
                      `added into ${
                        profile.lumpSumTargetPot === 'cash_savings' ? 'Cash Savings' :
                        profile.lumpSumTargetPot === 'cash_isa' ? 'Cash ISA' :
                        profile.lumpSumTargetPot === 'gia' ? 'GIA' :
                        'Stocks & Shares ISA'
                      }`
                    } {profile.lumpSumTiming === 'access_age' || !profile.lumpSumTiming ? `(when private pension is first accessed at age ${primaryPensionAccessAge})` : `(age ${primaryLumpSumTakeAge})`}.
                  </span>
                ) : (
                  <span>
                    <strong>UFPLS Drip-Feed ({profile.name || 'Primary'}):</strong> 25% of each withdrawal is tax-free up to £{(primaryLsaLimit || 0).toLocaleString()} total, leaving 75% taxable. Keeps capital compounding tax-sheltered inside pension until drawn!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Partner Person Controls */}
          {isCouple && activeLumpSumPerson === 'partner' && (
            <div className="space-y-3">
              {/* Max Tax-Free Lump Sum Badge & Cash Summary */}
              <div className="bg-rose-50/80 dark:bg-rose-950/40 p-3.5 sm:p-4 rounded-2xl border border-rose-200/80 dark:border-rose-800/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-black text-xs text-rose-950 dark:text-rose-200 block uppercase tracking-wider">
                      {profile.partnerName || 'Partner'} Max Tax-Free Lump Sum (PCLS)
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-400 font-semibold leading-tight block">
                      At Partner Access Age {partnerLumpSumTakeAge}: Projected Pension Pot £{Math.round(partnerProjectedPot || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-lg sm:text-xl font-black text-rose-700 dark:text-rose-300 block">
                      £{Math.round(partnerActualLumpSum || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">
                      {partnerPclsPct}% of Projected Pension Pot
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-rose-800 dark:text-rose-300 font-medium">
                  <span>Based on Current Pension Pot Today (£{(partnerCurrentPot || 0).toLocaleString()}): <strong>£{Math.round(partnerCurrentActualLumpSum || 0).toLocaleString()}</strong></span>
                  <span className="text-[10px] font-extrabold bg-rose-200/70 dark:bg-rose-900 px-2 py-0.5 rounded-md self-start sm:self-auto">LSA Limit: £{(partnerLsaLimit || 0).toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 italic">
                  *Calculated strictly on Partner Pension Pot value (Workplace Pension + SIPP) — excludes ISAs, LISA, GIA & Cash Savings.
                </p>
              </div>

              {/* LSA Protection Selector and Editable Cap Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Partner Lump Sum Protection</span>
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">2024/25 Preset</span>
                  </label>
                  <select
                    value={profile.partnerLsaProtectionType || 'standard'}
                    onChange={(e) => {
                      const prot = e.target.value as LsaProtectionType;
                      let cap = 268275;
                      if (prot === 'fixed_2014') cap = 375000;
                      else if (prot === 'fixed_2016') cap = 312500;
                      else if (prot === 'individual_2014') cap = 300000;
                      else if (prot === 'individual_2016') cap = 280000;
                      else if (prot === 'custom') cap = profile.partnerCustomLsaAllowance ?? 268275;

                      onChange({
                        ...profile,
                        partnerLsaProtectionType: prot,
                        partnerCustomLsaAllowance: cap,
                      });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="standard">Standard Limit (£268,275 LSA)</option>
                    <option value="fixed_2014">Fixed Protection 2014 (£375,000 LSA)</option>
                    <option value="fixed_2016">Fixed Protection 2016 (£312,500 LSA)</option>
                    <option value="individual_2014">Individual Protection 2014 (£300,000 Protected LSA)</option>
                    <option value="individual_2016">Individual Protection 2016 (£280,000 Protected LSA)</option>
                    <option value="custom">Custom / Scheme Protection Override</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Partner LSA Cap (£)</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold">Amendable</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-bold text-xs">£</span>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      max="2000000"
                      value={partnerLsaLimit}
                      onChange={(e) => {
                        const cap = Math.max(0, Number(e.target.value));
                        onChange({
                          ...profile,
                          partnerCustomLsaAllowance: cap,
                          partnerLsaProtectionType: 'custom',
                        });
                      }}
                      className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={!!profile.partnerTakeLumpSumAtStart}
                  onChange={(e) => updateField('partnerTakeLumpSumAtStart', e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 dark:border-slate-700 focus:ring-rose-500 cursor-pointer"
                />
                <span>Take Partner Upfront Tax-Free Lump Sum (PCLS)</span>
              </label>

              {profile.partnerTakeLumpSumAtStart && (
                <div className="space-y-3 pl-6 pt-1 border-l-2 border-rose-500/30 ml-1">
                  {/* Timing & Destination Pot selector for partner tax-free lump sum */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Partner Lump Sum Access Timing
                      </label>
                      <select
                        value={profile.partnerLumpSumTiming || 'access_age'}
                        onChange={(e) => updateField('partnerLumpSumTiming', e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                      >
                        <option value="access_age">
                          When Private Pension is Accessed (Age {partnerPensionAccessAge})
                        </option>
                        <option value="custom">Custom Age</option>
                      </select>
                    </div>

                    {/* Partner Destination Pot Option */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Destination Pot for Partner Lump Sum Cash
                      </label>
                      <select
                        value={profile.partnerLumpSumTargetPot || 'stocks_and_shares_isa'}
                        onChange={(e) => updateField('partnerLumpSumTargetPot', e.target.value as any)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 cursor-pointer"
                      >
                        <option value="stocks_and_shares_isa">Stocks &amp; Shares ISA (Tax-Free Shelter)</option>
                        <option value="cash_isa">Cash ISA (Tax-Free Shelter)</option>
                        <option value="cash_savings">Cash Savings Account</option>
                        <option value="gia">General Investment Account (GIA)</option>
                        <option value="spend_clear_debt">Spend / Clear Debt (Debt payoff &amp; expenses)</option>
                        <option value="split">Split across Multiple Destination Pots...</option>
                      </select>
                    </div>

                    {profile.partnerLumpSumTiming === 'custom' && (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Partner Custom Lump Sum Age
                        </label>
                        <input
                          type="number"
                          min={partnerPensionAccessAge}
                          max={80}
                          value={profile.partnerLumpSumCustomAge || partnerPensionAccessAge}
                          onChange={(e) => updateField('partnerLumpSumCustomAge', Math.max(partnerPensionAccessAge, Number(e.target.value)))}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Partner Multi-Pot Allocation Split Editor */}
                  {profile.partnerLumpSumTargetPot === 'split' && (
                    <LumpSumSplitEditor
                      splits={profile.partnerLumpSumSplits || []}
                      lumpSumAmount={partnerActualLumpSum || 0}
                      onChange={(splits) => updateField('partnerLumpSumSplits', splits)}
                      accentColor="rose"
                    />
                  )}

                  {/* Percentage Slider with Cash Value */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 font-bold">
                      <span>Partner PCLS Percentage & Cash Value:</span>
                      <span className="font-extrabold text-rose-700 dark:text-rose-400">
                        {partnerPclsPct}% = £{Math.round((partnerRawLumpSum) || 0).toLocaleString()}
                        {partnerRawLumpSum > partnerLsaLimit && (
                          <span className="text-rose-600 dark:text-rose-400 ml-1 text-[11px] font-bold">
                            (Capped at £{(partnerLsaLimit || 0).toLocaleString()} LSA)
                          </span>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="25"
                      step="5"
                      value={partnerPclsPct}
                      onChange={(e) => updateField('partnerPclsLumpSumPercent', Number(e.target.value))}
                      className="w-full accent-rose-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                {profile.partnerTakeLumpSumAtStart ? (
                  <span>
                    <strong>Partner Upfront PCLS ({profile.partnerName || 'Partner'}):</strong> Takes {partnerPclsPct}% tax-free cash (<strong>£{Math.round(partnerActualLumpSum || 0).toLocaleString()}</strong>) at <strong>Partner Age {partnerLumpSumTakeAge}</strong> {
                      profile.partnerLumpSumTargetPot === 'spend_clear_debt' ? 'used to Spend / Clear Debt' :
                      profile.partnerLumpSumTargetPot === 'split' ? 'split across multiple destination pots' :
                      `added into ${
                        profile.partnerLumpSumTargetPot === 'cash_savings' ? 'Cash Savings' :
                        profile.partnerLumpSumTargetPot === 'cash_isa' ? 'Cash ISA' :
                        profile.partnerLumpSumTargetPot === 'gia' ? 'GIA' :
                        'Stocks & Shares ISA'
                      }`
                    } {profile.partnerLumpSumTiming === 'access_age' || !profile.partnerLumpSumTiming ? `(when partner's private pension is first accessed at age ${partnerPensionAccessAge})` : `(age ${partnerLumpSumTakeAge})`}.
                  </span>
                ) : (
                  <span>
                    <strong>Partner UFPLS Drip-Feed ({profile.partnerName || 'Partner'}):</strong> 25% of each partner withdrawal is tax-free up to £{(partnerLsaLimit || 0).toLocaleString()} total, leaving 75% taxable.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Excess Income Reinvestment Destination (Advanced Mode Only) */}
        {appMode === 'advanced' && (
          <div className="p-5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            {/* EXCESS ANNUITY & RETIREMENT INCOME DESTINATION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Excess Income Destination</span>
              </label>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Surplus Pot Deposit
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              When guaranteed annuity or retirement income exceeds your target income requirement, select which non-pension pot your annual surplus cash should be deposited into:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {[
                { id: 'stocks_and_shares_isa', label: '📈 S&S ISA', desc: 'Tax-Free Equity Growth' },
                { id: 'cash_isa', label: '🏦 Cash ISA', desc: 'Tax-Free Cash Interest' },
                { id: 'gia', label: '📊 GIA Account', desc: 'Taxable Growth' },
                { id: 'cash_savings', label: '💰 Cash Savings', desc: 'Interest & PSA Tax' },
                { id: 'none', label: '💸 Spend Surplus', desc: 'Do Not Reinvest' },
              ].map((opt) => {
                const currentOpt = profile.annuityExcessReinvestOption || 'cash';
                const isSelected = currentOpt === opt.id || (opt.id === 'cash_savings' && currentOpt === 'cash') || (opt.id === 'stocks_and_shares_isa' && currentOpt === 'isa');
                return (
                  <label
                    key={opt.id}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 font-bold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <input
                        type="radio"
                        name="excessReinvest"
                        checked={isSelected}
                        onChange={() => updateField('annuityExcessReinvestOption', opt.id as any)}
                        className="accent-teal-600 w-3.5 h-3.5"
                      />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 block pl-5">{opt.desc}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

