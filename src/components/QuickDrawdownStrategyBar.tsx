import React, { useMemo, useState } from 'react';
import { UserProfile, InvestmentPots, DrawdownStrategy, PlannerScenario } from '../types';
import { calculateUKTax } from '../utils/ukTaxEngine';
import { generateProjections } from '../utils/projectionEngine';
import { solveMaximizedSpend, disableMaximizedSpend } from '../utils/maximizedSpendSolver';
import {
  Zap,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  User,
  Heart,
  Users,
  CheckCircle2,
  ArrowRightLeft,
  Info,
  TrendingUp,
  AlertCircle,
  Copy
} from 'lucide-react';

interface QuickDrawdownStrategyBarProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChangeProfile: (updatedProfile: UserProfile) => void;
  onSelectPerson?: (person: 'primary' | 'partner') => void;
  scenarios?: PlannerScenario[];
  activeScenarioId?: string;
  onCreateStrategyVariants?: (baseScenarioId: string, strategiesToCreate: DrawdownStrategy[]) => void;
  onNavigateToCompare?: () => void;
  onOpenMaximizedSpendModal?: () => void;
  className?: string;
  compact?: boolean;
}

export interface StrategyDefinition {
  id: DrawdownStrategy;
  title: string;
  shortLabel: string;
  tagline: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  activeBorderColor: string;
  activeBg: string;
  description: string;
}

export const STRATEGY_DEFINITIONS: StrategyDefinition[] = [
  {
    id: 'tax_free_bracket',
    title: 'Tax-Free Allowance Fill',
    shortLabel: '0% Tax-Free Fill',
    tagline: '0% Income Tax Cap',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    activeBorderColor: 'border-emerald-500 dark:border-emerald-500',
    activeBg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
    description: 'Draw pension up to £12,570 Personal Allowance (0% tax), filling remainder from ISAs.',
  },
  {
    id: 'basic_rate_bracket',
    title: 'Basic Rate Band Fill',
    shortLabel: '20% Basic Rate Fill',
    tagline: 'Max 20% Tax Cap',
    badgeBg: 'bg-teal-100 dark:bg-teal-950/80',
    badgeText: 'text-teal-800 dark:text-teal-300',
    borderColor: 'border-teal-200 dark:border-teal-800/60',
    activeBorderColor: 'border-teal-500 dark:border-teal-500',
    activeBg: 'bg-teal-500/10 dark:bg-teal-950/40',
    description: 'Draw pension up to £50,270 Basic Rate band (max 20% tax), filling remainder from ISAs.',
  },
  {
    id: 'higher_rate_bracket',
    title: 'Higher Rate Band Fill',
    shortLabel: '40% Higher Rate Fill',
    tagline: 'Max 40% Tax Cap',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    activeBorderColor: 'border-amber-500 dark:border-amber-500',
    activeBg: 'bg-amber-500/10 dark:bg-amber-950/40',
    description: 'Draw pension up to £125,140 Higher Rate threshold, preventing 45% tax and PA taper.',
  },
  {
    id: 'isa_first',
    title: 'ISA & Cash First',
    shortLabel: 'ISA & Cash First',
    tagline: 'Defer Pension & Preserve IHT',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950/80',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    borderColor: 'border-indigo-200 dark:border-indigo-800/60',
    activeBorderColor: 'border-indigo-500 dark:border-indigo-500',
    activeBg: 'bg-indigo-500/10 dark:bg-indigo-950/40',
    description: 'Deplete ISAs and Cash first before drawing pension. Preserves pension tax shelter.',
  },
  {
    id: 'cash_first',
    title: 'Cash Buffer First',
    shortLabel: 'Cash Savings First',
    tagline: 'Clear Taxable Cash First',
    badgeBg: 'bg-sky-100 dark:bg-sky-950/80',
    badgeText: 'text-sky-800 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800/60',
    activeBorderColor: 'border-sky-500 dark:border-sky-500',
    activeBg: 'bg-sky-500/10 dark:bg-sky-950/40',
    description: 'Spend down non-tax-sheltered Cash and GIA holdings first before touching ISAs or Pensions.',
  },
  {
    id: 'pension_first',
    title: 'Pension First',
    shortLabel: 'Pension First',
    tagline: 'Deplete Pension First',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/80',
    badgeText: 'text-purple-800 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800/60',
    activeBorderColor: 'border-purple-500 dark:border-purple-500',
    activeBg: 'bg-purple-500/10 dark:bg-purple-950/40',
    description: 'Draw required income directly from pension first, saving ISAs for later years or estate.',
  },
  {
    id: 'pro_rata',
    title: 'Pro Rata Balanced',
    shortLabel: 'Pro Rata Balanced',
    tagline: 'Equal Asset Depletion',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
    activeBorderColor: 'border-slate-500 dark:border-slate-400',
    activeBg: 'bg-slate-500/10 dark:bg-slate-800/60',
    description: 'Withdraw proportionally across Pension, ISA, and Cash each year to maintain asset balance.',
  },
  {
    id: 'annuity',
    title: 'Buy an Annuity',
    shortLabel: 'Full Annuity Buy',
    tagline: 'Guaranteed Lifetime Floor',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/80',
    badgeText: 'text-blue-800 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800/60',
    activeBorderColor: 'border-blue-500 dark:border-blue-500',
    activeBg: 'bg-blue-500/10 dark:bg-blue-950/40',
    description: 'Convert 100% of pension pot into guaranteed annual income, eliminating investment risk.',
  },
  {
    id: 'hybrid_annuity',
    title: 'Hybrid / Tranche Annuity',
    shortLabel: 'Hybrid / Tranche',
    tagline: 'Partial Annuity & Drawdown',
    badgeBg: 'bg-violet-100 dark:bg-violet-950/80',
    badgeText: 'text-violet-800 dark:text-violet-300',
    borderColor: 'border-violet-200 dark:border-violet-800/60',
    activeBorderColor: 'border-violet-500 dark:border-violet-500',
    activeBg: 'bg-violet-500/10 dark:bg-violet-950/40',
    description: 'Combine guaranteed annuity income for essential expenses with flexible drawdown.',
  },
];

export const QuickDrawdownStrategyBar: React.FC<QuickDrawdownStrategyBarProps> = ({
  profile,
  pots,
  onChangeProfile,
  onSelectPerson,
  scenarios = [],
  activeScenarioId,
  onCreateStrategyVariants,
  onNavigateToCompare,
  onOpenMaximizedSpendModal,
  className = '',
  compact = false,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [targetPerson, setTargetPerson] = useState<'primary' | 'partner' | 'both'>('primary');
  const [showCloneSuccess, setShowCloneSuccess] = useState(false);

  const activePrimaryStrategy = profile.drawdownStrategy || 'isa_first';
  const activePartnerStrategy = profile.partnerDrawdownStrategy || profile.drawdownStrategy || 'isa_first';

  const currentDisplayStrategy =
    targetPerson === 'partner' ? activePartnerStrategy : activePrimaryStrategy;

  // Handle strategy selection for a specific person
  const handleSelectStrategyForPerson = (person: 'primary' | 'partner', strat: DrawdownStrategy) => {
    if (onSelectPerson) {
      onSelectPerson(person);
    }

    let incomeOpt = profile.incomeProductOption;
    let partnerIncomeOpt = profile.partnerIncomeProductOption;

    if (strat === 'annuity') {
      if (person === 'partner') partnerIncomeOpt = 'annuity';
      else incomeOpt = 'annuity';
    } else if (strat === 'hybrid_annuity') {
      if (person === 'partner') partnerIncomeOpt = 'hybrid';
      else incomeOpt = 'hybrid';
    } else {
      if (person === 'partner') partnerIncomeOpt = 'flexi_drawdown';
      else incomeOpt = 'flexi_drawdown';
    }

    if (person === 'partner') {
      onChangeProfile({
        ...profile,
        partnerDrawdownStrategy: strat,
        partnerIncomeProductOption: partnerIncomeOpt,
      });
    } else {
      onChangeProfile({
        ...profile,
        drawdownStrategy: strat,
        incomeProductOption: incomeOpt,
      });
    }
  };

  // Legacy single handle strategy selection
  const handleSelectStrategy = (strat: DrawdownStrategy) => {
    handleSelectStrategyForPerson(targetPerson === 'partner' ? 'partner' : 'primary', strat);
  };

  // Helper function to calculate real-time strategy metrics
  const calculateMetricsForPerson = (person: 'primary' | 'partner') => {
    const results: Record<
      DrawdownStrategy,
      {
        finalPot: number;
        totalTaxPaid: number;
        hasShortfall: boolean;
        depletedAge?: number;
      }
    > = {} as any;

    STRATEGY_DEFINITIONS.forEach((def) => {
      try {
        const isAnnuity = def.id === 'annuity';
        const isHybrid = def.id === 'hybrid_annuity';
        const prodOpt = isAnnuity ? 'annuity' : isHybrid ? 'hybrid' : 'flexi_drawdown';

        const candidateProfile: UserProfile = {
          ...profile,
          drawdownStrategy: person === 'primary' ? def.id : profile.drawdownStrategy,
          partnerDrawdownStrategy: person === 'partner' ? def.id : (profile.partnerDrawdownStrategy || profile.drawdownStrategy),
          incomeProductOption: person === 'primary' ? prodOpt : profile.incomeProductOption,
          partnerIncomeProductOption: person === 'partner' ? prodOpt : (profile.partnerIncomeProductOption || profile.incomeProductOption),
        };

        const taxRes = calculateUKTax(candidateProfile, pots);
        const projs = generateProjections(candidateProfile, pots, taxRes);

        const lastProj = projs[projs.length - 1];
        const finalPot = lastProj?.totalPot || 0;

        const retirementProjs = projs.filter((p) => p.isRetired);
        const totalTaxPaid = retirementProjs.reduce((sum, p) => sum + (p.totalTaxPaid || 0), 0);

        const shortfallYear = projs.find((p) => p.potDepleted || (p.incomeShortfall || 0) > 0);

        results[def.id] = {
          finalPot: Math.round(finalPot),
          totalTaxPaid: Math.round(totalTaxPaid),
          hasShortfall: Boolean(shortfallYear),
          depletedAge: shortfallYear?.age,
        };
      } catch (e) {
        results[def.id] = {
          finalPot: 0,
          totalTaxPaid: 0,
          hasShortfall: false,
        };
      }
    });

    return results;
  };

  // Compute live outcome metrics for Primary strategies
  const primaryStrategyMetrics = useMemo(
    () => calculateMetricsForPerson('primary'),
    [profile, pots]
  );

  // Compute live outcome metrics for Partner strategies
  const partnerStrategyMetrics = useMemo(
    () => calculateMetricsForPerson('partner'),
    [profile, pots]
  );

  // Fallback single strategy metrics
  const strategyMetrics = primaryStrategyMetrics;

  const handleCloneVariants = () => {
    if (onCreateStrategyVariants && activeScenarioId) {
      const topStrategies: DrawdownStrategy[] = [
        'tax_free_bracket',
        'basic_rate_bracket',
        'isa_first',
        'pension_first',
      ];
      onCreateStrategyVariants(activeScenarioId, topStrategies);
      setShowCloneSuccess(true);
      setTimeout(() => setShowCloneSuccess(false), 4000);
    }
  };

  const formatShortCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(2)}M`;
    if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${val}`;
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 transition-all ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Quick Drawdown Strategy Switcher
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Live Plan Strategy
              </span>
              {profile.maximizedSpendConfig?.enabled && (
                <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold animate-fade-in">
                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                  <span>Max Spend Mode: £{(profile.maximizedSpendConfig.targetAnnualIncome || 0).toLocaleString()}/yr</span>
                  <button
                    type="button"
                    onClick={() => {
                      onChangeProfile(disableMaximizedSpend(profile));
                    }}
                    className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded hover:bg-amber-400 font-black cursor-pointer"
                    title="Switch back to baseline target income requirements"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select a strategy to test sequence of withdrawals, tax bracket caps, and tax impact across your active plan
            </p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Clone / Compare Action */}
          {onCreateStrategyVariants && activeScenarioId && (
            <button
              type="button"
              onClick={handleCloneVariants}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Create strategy variation plans (including Max Spender) to compare side-by-side in the Compare tab"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Clone Strategy Variants</span>
            </button>
          )}

          {onNavigateToCompare && (
            <button
              type="button"
              onClick={onNavigateToCompare}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
              <span>Compare Plans</span>
            </button>
          )}
        </div>
      </div>

      {showCloneSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Strategy variation plans created! You can now switch plans in the top header or view them in the Compare tab.</span>
          </div>
          {onNavigateToCompare && (
            <button
              onClick={onNavigateToCompare}
              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-black text-[11px] hover:bg-emerald-700 transition-colors shrink-0"
            >
              Go to Compare Tab →
            </button>
          )}
        </div>
      )}

      {/* Horizontal Strategy Buttons / Cards Grid */}
      {!isCouple ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {STRATEGY_DEFINITIONS.map((def) => {
              const isActive = activePrimaryStrategy === def.id;
              const metrics = strategyMetrics[def.id];

              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => handleSelectStrategyForPerson('primary', def.id)}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                    isActive
                      ? `${def.activeBorderColor} ${def.activeBg} ring-2 ring-indigo-500/30 shadow-xs`
                      : `${def.borderColor} bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800`
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Header Badge */}
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${def.badgeBg} ${def.badgeText}`}
                      >
                        {def.tagline}
                      </span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                      )}
                    </div>

                    {/* Title */}
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                      {def.title}
                    </div>

                    {!compact && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                        {def.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Live Metrics Bar */}
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Pot @ 90:</span>
                      <span
                        className={`font-black ${
                          metrics?.hasShortfall
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatShortCurrency(metrics?.finalPot || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Est. Tax Paid:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {metrics?.totalTaxPaid === 0
                          ? '£0 (Tax-Free)'
                          : formatShortCurrency(metrics?.totalTaxPaid || 0)}
                      </span>
                    </div>

                    {metrics?.hasShortfall && (
                      <div className="text-[9px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-center">
                        Shortfall Age {metrics.depletedAge}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* 8th Strategy Card: Max Spend Solver */}
            {onOpenMaximizedSpendModal && (() => {
              const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
              const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
              return (
                <button
                  type="button"
                  onClick={onOpenMaximizedSpendModal}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group shadow-xs hover:shadow-md ${
                    isMaxSpendActive
                      ? 'border-amber-500 dark:border-amber-400 bg-amber-500/20 dark:bg-amber-950/60 ring-2 ring-amber-500/80 shadow-amber-500/10'
                      : 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-amber-500/20 dark:from-amber-950/40 dark:to-amber-900/30 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider bg-amber-400 dark:bg-amber-500 text-slate-950">
                        {isMaxSpendActive ? 'ACTIVE SOLVER' : 'Die With Zero'}
                      </span>
                      {isMaxSpendActive ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                      )}
                    </div>

                    <div className="font-extrabold text-xs text-amber-950 dark:text-amber-200 leading-tight flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>Max Spend Solver</span>
                    </div>

                    {!compact && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
                        {isMaxSpendActive
                          ? `Max sustainable spend set to £${maxIncome.toLocaleString()}/yr.`
                          : `Calculate max sustainable annual income to age ${profile.lifeExpectancyAge || 95} without running out.`}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/80 flex flex-col gap-1 text-[10px]">
                    <div className="w-full py-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black rounded-lg text-[10px] text-center shadow-xs">
                      {isMaxSpendActive ? `Active: £${maxIncome.toLocaleString()}/yr` : 'Run Max Solver →'}
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      ) : (
        /* Couple Mode: Dedicated Row per Person */
        <div className="space-y-4">
          {/* Primary Person Row */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{profile.name || 'Primary'} Strategy</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                Active: {STRATEGY_DEFINITIONS.find((s) => s.id === activePrimaryStrategy)?.title}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {STRATEGY_DEFINITIONS.map((def) => {
                const isActive = activePrimaryStrategy === def.id;
                const metrics = primaryStrategyMetrics[def.id];

                return (
                  <button
                    key={`primary-${def.id}`}
                    type="button"
                    onClick={() => handleSelectStrategyForPerson('primary', def.id)}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      isActive
                        ? `${def.activeBorderColor} ${def.activeBg} ring-2 ring-indigo-500/40 shadow-xs`
                        : `${def.borderColor} bg-white dark:bg-slate-800/70 hover:bg-indigo-50/60 dark:hover:bg-slate-800`
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${def.badgeBg} ${def.badgeText}`}
                        >
                          {def.tagline}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                        {def.title}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-0.5 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Pot @ 90:</span>
                        <span
                          className={`font-black ${
                            metrics?.hasShortfall
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatShortCurrency(metrics?.finalPot || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Est. Tax:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {metrics?.totalTaxPaid === 0 ? '£0' : formatShortCurrency(metrics?.totalTaxPaid || 0)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 8th Strategy Card: Max Spend Solver */}
              {onOpenMaximizedSpendModal && (() => {
                const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
                const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
                return (
                  <button
                    type="button"
                    onClick={onOpenMaximizedSpendModal}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group shadow-xs hover:shadow-md ${
                      isMaxSpendActive
                        ? 'border-amber-500 dark:border-amber-400 bg-amber-500/20 dark:bg-amber-950/60 ring-2 ring-amber-500/80 shadow-amber-500/10'
                        : 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-amber-500/20 dark:from-amber-950/40 dark:to-amber-900/30 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider bg-amber-400 dark:bg-amber-500 text-slate-950">
                          {isMaxSpendActive ? 'ACTIVE' : 'Die With Zero'}
                        </span>
                        {isMaxSpendActive ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-amber-950 dark:text-amber-200 leading-tight flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        <span>Max Solver</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/80 text-[9px]">
                      <div className="w-full py-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black rounded-lg text-center">
                        {isMaxSpendActive ? `£${maxIncome.toLocaleString()}/yr` : 'Run Solver →'}
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Partner Person Row */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 fill-current" />
                <span>{profile.partnerName || 'Partner'} Strategy</span>
              </div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-full">
                Active: {STRATEGY_DEFINITIONS.find((s) => s.id === activePartnerStrategy)?.title}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              {STRATEGY_DEFINITIONS.map((def) => {
                const isActive = activePartnerStrategy === def.id;
                const metrics = partnerStrategyMetrics[def.id];

                return (
                  <button
                    key={`partner-${def.id}`}
                    type="button"
                    onClick={() => handleSelectStrategyForPerson('partner', def.id)}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      isActive
                        ? `${def.activeBorderColor} ${def.activeBg} ring-2 ring-rose-500/40 shadow-xs`
                        : `${def.borderColor} bg-white dark:bg-slate-800/70 hover:bg-rose-50/60 dark:hover:bg-slate-800`
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider ${def.badgeBg} ${def.badgeText}`}
                        >
                          {def.tagline}
                        </span>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">
                        {def.title}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-0.5 text-[9px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Pot @ 90:</span>
                        <span
                          className={`font-black ${
                            metrics?.hasShortfall
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatShortCurrency(metrics?.finalPot || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 font-semibold">Est. Tax:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {metrics?.totalTaxPaid === 0 ? '£0' : formatShortCurrency(metrics?.totalTaxPaid || 0)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* 8th Strategy Card: Max Spend Solver */}
              {onOpenMaximizedSpendModal && (() => {
                const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
                const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
                return (
                  <button
                    type="button"
                    onClick={onOpenMaximizedSpendModal}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group shadow-xs hover:shadow-md ${
                      isMaxSpendActive
                        ? 'border-amber-500 dark:border-amber-400 bg-amber-500/20 dark:bg-amber-950/60 ring-2 ring-amber-500/80 shadow-amber-500/10'
                        : 'border-amber-300 dark:border-amber-700/80 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-amber-500/20 dark:from-amber-950/40 dark:to-amber-900/30 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-amber-500/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider bg-amber-400 dark:bg-amber-500 text-slate-950">
                          {isMaxSpendActive ? 'ACTIVE' : 'Die With Zero'}
                        </span>
                        {isMaxSpendActive ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                        )}
                      </div>
                      <div className="font-extrabold text-xs text-amber-950 dark:text-amber-200 leading-tight flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                        <span>Max Solver</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-amber-200/80 dark:border-amber-800/80 text-[9px]">
                      <div className="w-full py-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black rounded-lg text-center">
                        {isMaxSpendActive ? `£${maxIncome.toLocaleString()}/yr` : 'Run Solver →'}
                      </div>
                    </div>
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
