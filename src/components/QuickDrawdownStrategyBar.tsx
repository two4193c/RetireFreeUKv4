import React, { useMemo, useState } from 'react';
import { UserProfile, InvestmentPots, DrawdownStrategy, PlannerScenario, AppMode } from '../types';
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
  Copy,
  X,
  Check,
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
  appMode?: AppMode;
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

export const MAX_SOLVER_DEF = {
  id: 'max_spend_solver' as const,
  title: 'Max Spend Solver',
  shortLabel: 'Die With Zero',
  tagline: 'Die With Zero Solver',
  badgeBg: 'bg-amber-100 dark:bg-amber-950/80',
  badgeText: 'text-amber-800 dark:text-amber-300',
  borderColor: 'border-amber-300 dark:border-amber-700',
  activeBorderColor: 'border-amber-500 dark:border-amber-500',
  activeBg: 'bg-amber-500/10 dark:bg-amber-950/40',
  description: 'Calculate max sustainable annual income to target life expectancy age without running out early.',
};

export interface StrategyDetails {
  howItWorks: string;
  keyBenefits: string[];
  considerations: string[];
  drawdownSequence: string;
}

export const DETAILED_STRATEGY_INFO: Record<string, StrategyDetails> = {
  tax_free_bracket: {
    howItWorks: 'Draws pension income each tax year up to your annual Personal Allowance threshold (£12,570 for 2025/26). Because this is within your 0% tax bracket, zero UK income tax is paid on pension withdrawals. Any additional income required for your spending target is automatically drawn from tax-free ISAs or Cash savings.',
    keyBenefits: [
      '100% Tax-Free income extraction from your pension pot up to Personal Allowance.',
      'Eliminates income tax drag in early retirement years.',
      'Allows remaining pension to compound tax-free while staying within the 0% envelope.'
    ],
    considerations: [
      'If your annual spending requirement is high, ISAs will deplete faster to cover the remaining balance.',
      'Once ISAs run out, future withdrawals will exceed £12,570 and trigger 20% Basic Rate tax.'
    ],
    drawdownSequence: 'Pension (up to £12.57k/yr @ 0% tax) ➔ ISAs ➔ Cash / Taxable ➔ Pension (Excess)'
  },
  basic_rate_bracket: {
    howItWorks: 'Draws pension taxable income up to the top of the UK Basic Rate Tax threshold (£50,270 for 2025/26). The first £12,570 is tax-free, and amounts between £12,570 and £50,270 are taxed at 20%. Any spending requirement above £50,270 is funded from ISAs or Cash.',
    keyBenefits: [
      'Maximizes annual pension income while capping tax strictly at the 20% Basic Rate.',
      'Prevents pushing pension withdrawals into the 40% Higher Rate tax bracket.',
      'Preserves the £125,140 Personal Allowance taper threshold.'
    ],
    considerations: [
      'Incurs moderate 20% income tax annually.',
      'Requires active monitoring of taxable income if receiving State Pension or DB pensions.'
    ],
    drawdownSequence: 'Pension (up to £50.27k/yr @ max 20% tax) ➔ ISAs ➔ Cash / Taxable ➔ Pension (Excess)'
  },
  higher_rate_bracket: {
    howItWorks: 'Withdraws pension income up to the £125,140 Higher Rate cap, utilizing the 20% and 40% tax bands while avoiding the 45% Additional Rate tax and the Personal Allowance taper.',
    keyBenefits: [
      'Allows rapid extraction of large pension balances without incurring top 45% rate tax.',
      'Prevents entering the 45% Additional Rate band.',
      'Useful for retirees with substantial pension assets looking to spend or gift earlier in life.'
    ],
    considerations: [
      'Incurs significant 40% Higher Rate income tax on withdrawals above £50,270.',
      'Tapers down your Personal Allowance between £100,000 and £125,140.'
    ],
    drawdownSequence: 'Pension (up to £125.14k/yr @ max 40% tax) ➔ ISAs ➔ Cash / Taxable ➔ Pension (Excess)'
  },
  isa_first: {
    howItWorks: 'Draws 100% of required retirement income from ISAs and Cash reserves first. Pensions are left completely untouched to grow tax-free until ISAs are exhausted.',
    keyBenefits: [
      '0% Income Tax payable on all retirement withdrawals while ISAs are active.',
      'Preserves pension assets inside a tax-sheltered environment for inheritance tax (IHT) planning.',
      'Gives maximum compounding time to your invested pension fund.'
    ],
    considerations: [
      'Exhausts your ISA tax-free buffer earlier in retirement.',
      'Later pension withdrawals will be subject to income tax rules when ISAs run out.'
    ],
    drawdownSequence: 'ISAs (100% Tax-Free) ➔ Cash / GIA ➔ Pension (Flexi-Access Drawdown)'
  },
  cash_first: {
    howItWorks: 'Withdraws non-tax-sheltered Cash savings and General Investment Accounts (GIAs) first, preserving both ISAs and Pensions in their tax-sheltered environments.',
    keyBenefits: [
      'Clears un-sheltered assets that may generate taxable savings interest or capital gains tax.',
      'Protects both ISA tax-free growth and Pension tax-deferred growth as long as possible.',
      'Ideal if holding significant cash balances earning low interest.'
    ],
    considerations: [
      'Reduces immediate liquid cash safety buffer.',
      'Once cash is exhausted, strategy reverts to ISA and Pension drawdown.'
    ],
    drawdownSequence: 'Cash / GIA ➔ ISAs ➔ Pension (Flexi-Access Drawdown)'
  },
  pension_first: {
    howItWorks: 'Withdraws required annual income directly from your flexi-access pension first, reserving ISAs for later retirement years or legacy planning.',
    keyBenefits: [
      'Protects ISAs so they can continue to grow completely tax-free.',
      'ISAs remain available as an emergency tax-free cash cushion in later life.',
      'Allows predictable income tax management year by year.'
    ],
    considerations: [
      'Triggers income tax on pension withdrawals above your Personal Allowance early on.',
      'May reduce pension pot growth faster due to early tax payments.'
    ],
    drawdownSequence: 'Pension (Flexi-Access) ➔ ISAs ➔ Cash / Taxable Accounts'
  },
  pro_rata: {
    howItWorks: 'Withdraws funds proportionally from Pension, ISA, and Cash each year based on their current relative account balances.',
    keyBenefits: [
      'Maintains a steady asset allocation across your total wealth portfolio.',
      'Avoids cliff-edge tax changes caused by complete depletion of a single asset class.',
      'Provides predictable tax exposure over time.'
    ],
    considerations: [
      'Requires minor annual rebalancing calculations.',
      'Does not optimize for absolute minimum income tax in any single year.'
    ],
    drawdownSequence: 'Balanced Pro-Rata split across Pension, ISA, and Cash each year'
  },
  annuity: {
    howItWorks: 'Converts 100% of your pension pot into a guaranteed lifetime annuity contract with an insurance provider, paying a fixed or inflation-linked annual income for life.',
    keyBenefits: [
      'Eliminates longevity risk — guaranteed income for life, no matter how long you live.',
      'Zero investment market risk or volatility during retirement.',
      'Provides complete peace of mind and simplified cash flow.'
    ],
    considerations: [
      'Irreversible decision once annuity policy is issued.',
      'Loss of capital flexibility for unexpected lump-sum spending.',
      'Pot value cannot be passed on as an investment inheritance upon death (unless joint-life option).'
    ],
    drawdownSequence: 'Guaranteed Lifetime Annuity Payments (Pension Pot converted)'
  },
  hybrid_annuity: {
    howItWorks: 'Splits your pension strategy: purchases an annuity tranche to cover baseline essential living expenses, while leaving the remaining pension in flexible drawdown for discretionary lifestyle spending.',
    keyBenefits: [
      'Combines guaranteed financial security for bills with flexible growth for lifestyle.',
      'Reduces overall portfolio risk while maintaining upside growth potential.',
      'Flexibility to adjust drawdown amounts based on market conditions.'
    ],
    considerations: [
      'Requires managing two distinct retirement income streams.',
      'Annuity portion remains irreversible once executed.'
    ],
    drawdownSequence: 'Guaranteed Annuity Floor + Flexible Drawdown from Remaining Pension'
  },
  max_spend_solver: {
    howItWorks: 'Runs an automated numerical optimization algorithm ("Die With Zero") that calculates the maximum sustainable income you can spend every single year of retirement to leave precisely £0 at your target life expectancy age (e.g. 95).',
    keyBenefits: [
      'Ensures you enjoy the maximum possible lifestyle without under-spending in early retirement.',
      'Takes into account all your pensions, ISAs, tax brackets, state pensions, and investment growth.',
      'Provides a scientifically optimal target spending benchmark.'
    ],
    considerations: [
      'Assumes market return assumptions remain consistent.',
      'Leaves minimal capital buffer at target life expectancy age unless legacy goals are specified.'
    ],
    drawdownSequence: 'Algorithmic Optimization balancing all pots for maximum sustainable spending'
  }
};

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
  appMode = 'basic',
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [targetPerson, setTargetPerson] = useState<'primary' | 'partner' | 'both'>('primary');
  const [showCloneSuccess, setShowCloneSuccess] = useState(false);
  const [infoModalData, setInfoModalData] = useState<{
    def: StrategyDefinition | typeof MAX_SOLVER_DEF;
    person?: 'primary' | 'partner';
    metrics?: { finalPot: number; totalTaxPaid: number; hasShortfall: boolean; depletedAge?: number };
  } | null>(null);

  const availableStrategyDefinitions = useMemo(() => {
    return STRATEGY_DEFINITIONS;
  }, []);

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
                Strategy Selector
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {availableStrategyDefinitions.map((def) => {
              const isActive = activePrimaryStrategy === def.id;
              const metrics = strategyMetrics[def.id];

              return (
                <div
                  key={def.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectStrategyForPerson('primary', def.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectStrategyForPerson('primary', def.id);
                    }
                  }}
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoModalData({
                              def,
                              person: 'primary',
                              metrics,
                            });
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors"
                          title="View detailed strategy info"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {isActive && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                        )}
                      </div>
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
                </div>
              );
            })}

            {/* 8th Strategy Card: Max Spend Solver */}
            {onOpenMaximizedSpendModal && (() => {
              const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
              const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
              return (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={onOpenMaximizedSpendModal}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenMaximizedSpendModal();
                    }
                  }}
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
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInfoModalData({
                              def: MAX_SOLVER_DEF,
                              person: 'primary',
                            });
                          }}
                          className="p-1 rounded-md text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors"
                          title="View Max Spend Solver details"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {isMaxSpendActive ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                        )}
                      </div>
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
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {availableStrategyDefinitions.map((def) => {
                const isActive = activePrimaryStrategy === def.id;
                const metrics = primaryStrategyMetrics[def.id];

                return (
                  <div
                    key={`primary-${def.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectStrategyForPerson('primary', def.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectStrategyForPerson('primary', def.id);
                      }
                    }}
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
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoModalData({
                                def,
                                person: 'primary',
                                metrics,
                              });
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors"
                            title="View detailed strategy info"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
                          )}
                        </div>
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
                  </div>
                );
              })}

              {/* 8th Strategy Card: Max Spend Solver */}
              {onOpenMaximizedSpendModal && (() => {
                const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
                const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={onOpenMaximizedSpendModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenMaximizedSpendModal();
                      }
                    }}
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
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoModalData({
                                def: MAX_SOLVER_DEF,
                                person: 'primary',
                              });
                            }}
                            className="p-1 rounded-md text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors"
                            title="View Max Spend Solver details"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          {isMaxSpendActive ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                          )}
                        </div>
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
                  </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {availableStrategyDefinitions.map((def) => {
                const isActive = activePartnerStrategy === def.id;
                const metrics = partnerStrategyMetrics[def.id];

                return (
                  <div
                    key={`partner-${def.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectStrategyForPerson('partner', def.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectStrategyForPerson('partner', def.id);
                      }
                    }}
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
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoModalData({
                                def,
                                person: 'partner',
                                metrics,
                              });
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors"
                            title="View detailed strategy info"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          )}
                        </div>
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
                  </div>
                );
              })}

              {/* 8th Strategy Card: Max Spend Solver */}
              {onOpenMaximizedSpendModal && (() => {
                const isMaxSpendActive = Boolean(profile.maximizedSpendConfig?.enabled);
                const maxIncome = profile.maximizedSpendConfig?.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={onOpenMaximizedSpendModal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenMaximizedSpendModal();
                      }
                    }}
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
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoModalData({
                                def: MAX_SOLVER_DEF,
                                person: 'partner',
                              });
                            }}
                            className="p-1 rounded-md text-amber-800 dark:text-amber-200 hover:bg-amber-200/60 dark:hover:bg-amber-900/60 transition-colors"
                            title="View Max Spend Solver details"
                          >
                            <Info className="w-3 h-3" />
                          </button>
                          {isMaxSpendActive ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          ) : (
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                          )}
                        </div>
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
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Strategy Info Popup Modal */}
      {infoModalData && (() => {
        const { def, person, metrics } = infoModalData;
        const details = DETAILED_STRATEGY_INFO[def.id] || DETAILED_STRATEGY_INFO.tax_free_bracket;
        const personName = person === 'partner' ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');
        const isSelected = def.id === 'max_spend_solver'
          ? Boolean(profile.maximizedSpendConfig?.enabled)
          : (person === 'partner' ? activePartnerStrategy === def.id : activePrimaryStrategy === def.id);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${def.badgeBg} ${def.badgeText} shrink-0`}>
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {def.title}
                      </h3>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${def.badgeBg} ${def.badgeText}`}>
                        {def.tagline}
                      </span>
                    </div>
                    {isCouple && person && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        Target Person: <strong className="text-slate-700 dark:text-slate-200">{personName}</strong>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInfoModalData(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawdown Sequence Badge */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Drawdown Execution Order
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {details.drawdownSequence}
                </p>
              </div>

              {/* How it Works */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  How This Strategy Works
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {details.howItWorks}
                </p>
              </div>

              {/* Key Benefits */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Key Advantages & Benefits
                </h4>
                <ul className="space-y-1.5">
                  {details.keyBenefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Considerations */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Important Considerations & Trade-offs
                </h4>
                <ul className="space-y-1.5">
                  {details.considerations.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Metrics Preview if available */}
              {metrics && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Live Plan Projection for {personName}
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Projected Pot @ Age 90</span>
                      <span className={`font-black text-sm ${metrics.hasShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatShortCurrency(metrics.finalPot)}
                      </span>
                      {metrics.hasShortfall && (
                        <span className="block text-[9px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                          Shortfall at Age {metrics.depletedAge}
                        </span>
                      )}
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">Est. Income Tax Paid</span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {metrics.totalTaxPaid === 0 ? '£0 (Tax-Free)' : formatShortCurrency(metrics.totalTaxPaid)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInfoModalData(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
                {def.id === 'max_spend_solver' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInfoModalData(null);
                      if (onOpenMaximizedSpendModal) onOpenMaximizedSpendModal();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Open Max Spend Solver</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectStrategyForPerson(person || 'primary', def.id as DrawdownStrategy);
                      setInfoModalData(null);
                    }}
                    disabled={isSelected}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      isSelected
                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Currently Selected' : `Apply Strategy for ${personName}`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
