import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from './ukTaxEngine';

export interface PlanScorecard {
  runwayYears: number;
  isFullyFunded: boolean;
  depletionAge?: number;
  finalPotBalance: number;
  initialSwr: number;
  swrStatus: 'conservative' | 'moderate' | 'elevated' | 'high';
  guaranteedFloorAmount: number;
  guaranteedFloorCoveragePct: number;
  floorStatus: 'robust' | 'adequate' | 'low';
  effectiveTaxRate: number;
  taxEfficiencyStatus: 'optimal' | 'moderate' | 'high_drag';
  monteCarloEstimatedSuccess: number;
}

export interface PlanMilestoneInsight {
  type: 'bridge' | 'state_pension' | 'crystallisation' | 'spending_phases' | 'mortgage_clearance';
  title: string;
  age: number;
  summary: string;
  detail: string;
  badge: string;
  badgeColor: 'indigo' | 'emerald' | 'amber' | 'purple' | 'blue';
}

export interface ActionableOpportunity {
  id: string;
  category: 'Tax Efficiency' | 'Decumulation & SWR' | 'Allowances & Reliefs' | 'Cash Buffer & Risk' | 'Estate & IHT';
  title: string;
  impactLevel: 'High Impact' | 'Medium Impact' | 'Strategic Value';
  status: 'recommended' | 'already_optimised' | 'review_suggested';
  observation: string;
  actionableStep: string;
  projectedBenefit: string;
}

export interface ComprehensivePlanInsights {
  scorecard: PlanScorecard;
  milestones: PlanMilestoneInsight[];
  opportunities: ActionableOpportunity[];
  executiveSummary: string;
}

export function computePlanInsights(
  profile: UserProfile,
  pots: InvestmentPots,
  projections: YearProjection[] = [],
  taxResult?: TaxCalculationResult
): ComprehensivePlanInsights {
  const isCouple = Boolean(profile.isCouplePlanning);
  const currentAge = profile.currentAge || 40;
  const targetAge = profile.targetRetirementAge || 60;
  const horizonAge = profile.lifeExpectancyAge || 90;
  const targetIncome = profile.targetRetirementIncomeAnnual || 35000;

  const priSpaAge = profile.statePensionAge || 67;

  // 1. Evaluate Projections & Decumulation Horizon
  const retiredProjections = projections.filter((p) => p.isRetired);
  const shortfallYears = retiredProjections.filter((p) => (p.incomeShortfall || 0) > 0);
  const isFullyFunded = shortfallYears.length === 0;
  const firstShortfall = shortfallYears[0];
  const depletionAge = firstShortfall?.age;

  const lastProj = projections[projections.length - 1];
  const finalPotBalance = lastProj ? Math.round(lastProj.totalPot) : 0;
  const runwayYears = isFullyFunded
    ? Math.max(0, horizonAge - currentAge)
    : Math.max(0, (depletionAge || targetAge) - currentAge);

  // 2. Initial SWR & Pot at Retirement
  const retProj = projections.find((p) => p.age === targetAge) || retiredProjections[0];
  const potAtRetirement = retProj ? retProj.totalPot : 0;
  const privateDrawdownAtRet = retProj
    ? (retProj.pensionDrawdown || 0) + (retProj.isaDrawdown || 0) + (retProj.cashDrawdown || 0)
    : targetIncome;

  const initialSwr = potAtRetirement > 0
    ? (privateDrawdownAtRet / potAtRetirement) * 100
    : 0;

  let swrStatus: PlanScorecard['swrStatus'] = 'conservative';
  if (initialSwr > 5.5) swrStatus = 'high';
  else if (initialSwr > 4.2) swrStatus = 'elevated';
  else if (initialSwr > 3.4) swrStatus = 'moderate';
  else swrStatus = 'conservative';

  // 3. Guaranteed Floor & State Pension Coverage
  const statePensionTotalAnnual =
    (profile.includeStatePension ? (profile.fullStatePensionAmount || 12548) : 0) +
    (isCouple && profile.partnerIncludeStatePension !== false ? (profile.partnerFullStatePensionAmount || 12548) : 0);

  const dbPensionTotalAnnual = (profile.dbPensions || []).reduce((sum, db) => sum + (db.annualIncome || 0), 0);
  const fixedIncomeTotalAnnual = (profile.fixedIncomes || []).reduce((sum, fi) => sum + (fi.annualAmount || fi.amount || 0), 0);
  const guaranteedFloorAmount = statePensionTotalAnnual + dbPensionTotalAnnual + fixedIncomeTotalAnnual;

  const essentialSpending = profile.essentialExpenditureAnnual || (targetIncome * 0.7);
  const guaranteedFloorCoveragePct = essentialSpending > 0
    ? Math.min(250, Math.round((guaranteedFloorAmount / essentialSpending) * 100))
    : 100;

  let floorStatus: PlanScorecard['floorStatus'] = 'robust';
  if (guaranteedFloorCoveragePct < 60) floorStatus = 'low';
  else if (guaranteedFloorCoveragePct < 90) floorStatus = 'adequate';
  else floorStatus = 'robust';

  // 4. Lifetime Effective Tax Rate in Decumulation
  const totalDecumGross = retiredProjections.reduce(
    (sum, p) => sum + (p.pensionDrawdown || 0) + (p.statePensionReceived || 0) + (p.dbPensionIncomeReceived || 0) + (p.taxableFixedIncomeReceived || 0) + (p.taxFreeFixedIncomeReceived || 0) + (p.isaDrawdown || 0) + (p.cashDrawdown || 0),
    0
  );
  const totalDecumTax = retiredProjections.reduce((sum, p) => sum + (p.totalTaxPaid || p.taxOnWithdrawal || 0), 0);
  const effectiveTaxRate = totalDecumGross > 0
    ? (totalDecumTax / totalDecumGross) * 100
    : 0;

  let taxEfficiencyStatus: PlanScorecard['taxEfficiencyStatus'] = 'optimal';
  if (effectiveTaxRate > 15) taxEfficiencyStatus = 'high_drag';
  else if (effectiveTaxRate > 8) taxEfficiencyStatus = 'moderate';
  else taxEfficiencyStatus = 'optimal';

  // 5. Estimated Monte Carlo / Stochastic Resilience
  let monteCarloEstimatedSuccess = 95;
  if (!isFullyFunded) {
    const yearsToDepletion = (depletionAge || targetAge) - targetAge;
    monteCarloEstimatedSuccess = Math.max(10, Math.min(75, Math.round((yearsToDepletion / Math.max(1, horizonAge - targetAge)) * 80)));
  } else {
    if (initialSwr <= 3.3) monteCarloEstimatedSuccess = 98;
    else if (initialSwr <= 3.8) monteCarloEstimatedSuccess = 94;
    else if (initialSwr <= 4.5) monteCarloEstimatedSuccess = 85;
    else monteCarloEstimatedSuccess = 72;
  }

  const scorecard: PlanScorecard = {
    runwayYears,
    isFullyFunded,
    depletionAge,
    finalPotBalance,
    initialSwr: Number(initialSwr.toFixed(2)),
    swrStatus,
    guaranteedFloorAmount: Math.round(guaranteedFloorAmount),
    guaranteedFloorCoveragePct,
    floorStatus,
    effectiveTaxRate: Number(effectiveTaxRate.toFixed(1)),
    taxEfficiencyStatus,
    monteCarloEstimatedSuccess,
  };

  // ---------------------------------------------------------------------------
  // 6. KEY STRATEGIC MILESTONES & INFLECTION POINTS
  // ---------------------------------------------------------------------------
  const milestones: PlanMilestoneInsight[] = [];

  // Milestone A: Early Retirement Bridge (if targetAge < State Pension Age)
  if (targetAge < priSpaAge) {
    const bridgeYears = priSpaAge - targetAge;
    const bridgeSpending = bridgeYears * targetIncome;
    milestones.push({
      type: 'bridge',
      title: `Early Retirement Bridge Phase (${bridgeYears} Years)`,
      age: targetAge,
      summary: `Ages ${targetAge} to ${priSpaAge}: Bridge funding required before State Pension commences.`,
      detail: `Your plan requires private capital bridge of ~£${Math.round(bridgeSpending).toLocaleString()} across ${bridgeYears} years. Utilizing Tax-Free Cash (PCLS) and ISAs during this bridge shields withdrawals from higher-rate tax brackets.`,
      badge: `${bridgeYears}-Year Bridge`,
      badgeColor: 'indigo',
    });
  }

  // Milestone B: State Pension Commencement & Drawdown Drop
  if (profile.includeStatePension) {
    const spaProj = projections.find((p) => p.age === priSpaAge);
    const preSpaProj = projections.find((p) => p.age === priSpaAge - 1);
    const drawBefore = preSpaProj ? (preSpaProj.pensionDrawdown || 0) + (preSpaProj.isaDrawdown || 0) + (preSpaProj.cashDrawdown || 0) : targetIncome;
    const drawAfter = spaProj ? (spaProj.pensionDrawdown || 0) + (spaProj.isaDrawdown || 0) + (spaProj.cashDrawdown || 0) : Math.max(0, targetIncome - statePensionTotalAnnual);
    const dropPct = drawBefore > 0 ? Math.max(0, Math.round(((drawBefore - drawAfter) / drawBefore) * 100)) : 0;

    milestones.push({
      type: 'state_pension',
      title: `State Pension Inflection (Age ${priSpaAge})`,
      age: priSpaAge,
      summary: `State Pension injects £${Math.round(statePensionTotalAnnual).toLocaleString()}/yr of guaranteed, index-linked income.`,
      detail: `At age ${priSpaAge}, private pot withdrawal dependency drops by approximately ${dropPct > 0 ? `${dropPct}%` : 'substantial margin'}, dramatically reducing sequence-of-returns vulnerability for remaining retirement.`,
      badge: `+£${Math.round(statePensionTotalAnnual).toLocaleString()}/yr Guaranteed`,
      badgeColor: 'emerald',
    });
  }

  // Milestone C: Crystallisation & Tax-Free Cash Extraction
  const tranches = profile.crystallisationTranches || [];
  const activeTranches = tranches.filter((t) => t.enabled);
  if (activeTranches.length > 0) {
    milestones.push({
      type: 'crystallisation',
      title: `Phased Crystallisation Schedule (${activeTranches.length} Tranches)`,
      age: activeTranches[0]?.age || targetAge,
      summary: `Tax-free cash (PCLS) is accessed systematically in ${activeTranches.length} planned tranches between ages ${activeTranches[0]?.age || targetAge} and ${activeTranches[activeTranches.length - 1]?.age || 75}.`,
      detail: `Phasing crystallisation retains uncrystallised pension assets within tax-sheltered investment growth, taking PCLS only when needed to fund expenditure or fill ISA wrappers.`,
      badge: `${activeTranches.length} Active Tranches`,
      badgeColor: 'purple',
    });
  } else {
    milestones.push({
      type: 'crystallisation',
      title: `Full Crystallisation at Retirement (Age ${targetAge})`,
      age: targetAge,
      summary: `Accessing the standard 25% Tax-Free Lump Sum (PCLS) up to the £268,275 Lump Sum Allowance.`,
      detail: `Extracted tax-free cash can be directed to Stocks & Shares ISA, Cash Reserves, or clearing liabilities to establish a robust multi-pot decumulation buffer.`,
      badge: 'LSA £268,275 Compliant',
      badgeColor: 'purple',
    });
  }

  // Milestone D: Spending Phases / Spending Smile
  const spendingPhasesConfig = profile.spendingPhases;
  if (spendingPhasesConfig?.enabled && spendingPhasesConfig.phases && spendingPhasesConfig.phases.length > 1) {
    milestones.push({
      type: 'spending_phases',
      title: `Dynamic Spending Phases (${spendingPhasesConfig.phases.length} Tiers)`,
      age: targetAge,
      summary: `Expenditure adjusts dynamically across active ("Go-Go"), moderate ("Slow-Go"), and mature ("No-Go") retirement stages.`,
      detail: `Aligns portfolio decumulation with real-world retirement spending behavior, allowing higher lifestyle spend in early active retirement while protecting long-term capital for late-life care.`,
      badge: 'Spending Smile Active',
      badgeColor: 'blue',
    });
  }

  // ---------------------------------------------------------------------------
  // 7. ACTIONABLE TAX OPTIMIZATIONS & WEALTH OPPORTUNITIES
  // ---------------------------------------------------------------------------
  const opportunities: ActionableOpportunity[] = [];

  // Opportunity 1: Spousal Allowance Equalisation (if couple with unequal pension pots or salaries)
  if (isCouple) {
    const priPension = (pots.sippBalance || 0) + (pots.workplacePensionBalance || 0);
    const partnerPots = profile.partnerPots;
    const partPension = partnerPots
      ? (partnerPots.sippBalance || 0) + (partnerPots.workplacePensionBalance || 0)
      : (profile.partnerSippBalance || 0) + (profile.partnerWorkplacePensionBalance || 0);
    const potRatio = priPension > 0 ? (partPension / priPension) : 1;

    if (potRatio < 0.4 || potRatio > 2.5) {
      const lowerMember = potRatio < 0.4 ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');
      opportunities.push({
        id: 'spousal_equalisation',
        category: 'Tax Efficiency',
        title: 'Spousal Pension Equalisation & Personal Allowance Maximisation',
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: `Significant disparity between spousal pension sizes (${profile.name || 'Primary'}: £${Math.round(priPension).toLocaleString()} vs ${profile.partnerName || 'Partner'}: £${Math.round(partPension).toLocaleString()}).`,
        actionableStep: `Direct new pension contributions or spousal SIPP contributions (£2,880 net / £3,600 gross minimum for non-earners) toward ${lowerMember}.`,
        projectedBenefit: `Utilises both spouses' £12,570 Personal Allowances and 20% basic rate bands in retirement, saving up to £2,514/yr in joint income tax.`,
      });
    } else {
      opportunities.push({
        id: 'spousal_balanced',
        category: 'Tax Efficiency',
        title: 'Spousal Allowance Equalisation',
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: `Spousal pension pots are well-balanced, enabling dual personal allowance and basic rate band utilization.`,
        actionableStep: `Continue maintaining proportional decumulation to split taxable income equally across both tax profiles.`,
        projectedBenefit: `Maximises joint tax-free Personal Allowances (£25,140/yr combined) throughout retirement.`,
      });
    }
  }

  // Opportunity 2: High Earner / 60% Marginal Tax Trap (Earnings £100k - £125k)
  const grossSalary = profile.grossAnnualSalary || 0;
  if (grossSalary > 100000 && grossSalary <= 130000) {
    const excess = grossSalary - 100000;
    opportunities.push({
      id: 'tax_trap_mitigation',
      category: 'Allowances & Reliefs',
      title: '60% Marginal Tax Trap Elimination (£100k–£125k Taper)',
      impactLevel: 'High Impact',
      status: 'recommended',
      observation: `Gross earnings of £${grossSalary.toLocaleString()} trigger the Personal Allowance taper (effective 60% marginal tax rate on £${excess.toLocaleString()}).`,
      actionableStep: `Increase salary sacrifice or personal SIPP contributions by £${excess.toLocaleString()}/yr to pull Adjusted Net Income down to £100,000.`,
      projectedBenefit: `Instantly reclaims your full £12,570 Personal Allowance, unlocking an effective 60% tax relief (£${Math.round(excess * 0.6).toLocaleString()}/yr savings).`,
    });
  }

  // Opportunity 3: Cash Buffer & Sequence-of-Returns Protection
  const partnerPots = profile.partnerPots;
  const priCash = (pots.cashSavingsBalance || 0) + (pots.cashIsaBalance || 0);
  const partCash = isCouple
    ? partnerPots
      ? (partnerPots.cashSavingsBalance || 0) + (partnerPots.cashIsaBalance || 0)
      : (profile.partnerCashSavingsBalance || 0) + (profile.partnerCashIsaBalance || 0)
    : 0;
  const cashTotal = priCash + partCash;
  const yearsOfBuffer = targetIncome > 0 ? (cashTotal / targetIncome) : 0;

  if (yearsOfBuffer < 1.5 && potAtRetirement > 200000) {
    opportunities.push({
      id: 'cash_buffer_expansion',
      category: 'Cash Buffer & Risk',
      title: 'Establish a 2-to-3 Year Structural Cash Buffer',
      impactLevel: 'High Impact',
      status: 'recommended',
      observation: `Current liquid cash reserves (£${Math.round(cashTotal).toLocaleString()}) cover ${yearsOfBuffer.toFixed(1)} years of retirement living costs.`,
      actionableStep: `Earmark 2 to 3 years of essential expenditure (~£${Math.round(targetIncome * 2.5).toLocaleString()}) in Cash ISAs / high-yield accounts upon entering decumulation.`,
      projectedBenefit: `Protects equity pots from forced selling during market downturns, mitigating sequence-of-returns risk and increasing Monte Carlo resilience.`,
    });
  } else {
    opportunities.push({
      id: 'cash_buffer_adequate',
      category: 'Cash Buffer & Risk',
      title: 'Decumulation Cash Buffer Reserve',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Current liquid cash assets provide ${yearsOfBuffer.toFixed(1)} years of spending runway, protecting against early decumulation volatility.`,
      actionableStep: `Maintain dynamic cash replenishment from dividends and rebalancing during market growth years.`,
      projectedBenefit: `Insulates the portfolio from selling down equity assets in market drawdowns.`,
    });
  }

  // Opportunity 4: GIA Bed & ISA / CGT Allowance Harvesting
  const priGia = pots.giaBalance || 0;
  const partGia = isCouple
    ? partnerPots
      ? (partnerPots.giaBalance || 0)
      : (profile.partnerGiaBalance || 0)
    : 0;
  const giaTotal = priGia + partGia;

  if (giaTotal > 15000) {
    opportunities.push({
      id: 'gia_bed_and_isa',
      category: 'Tax Efficiency',
      title: 'Annual Bed & ISA Capital Gains Harvesting',
      impactLevel: 'Medium Impact',
      status: 'recommended',
      observation: `Taxable General Investment Accounts (GIA) hold £${Math.round(giaTotal).toLocaleString()} subject to dividend tax and capital gains tax.`,
      actionableStep: `Systematically execute "Bed & ISA" transfers of £20,000 per spouse annually, using the £3,000 annual CGT allowance to crystallise gains tax-free.`,
      projectedBenefit: `Permanently shifts taxable investment capital into the zero-tax ISA wrapper, eliminating ongoing dividend and capital gains tax drag.`,
    });
  }

  // Opportunity 5: Drawdown Strategy Optimization
  const currentStrat = profile.drawdownStrategy || 'tax_optimal';
  if (currentStrat === 'pension_first' && potAtRetirement > 300000) {
    opportunities.push({
      id: 'drawdown_strategy_tuning',
      category: 'Decumulation & SWR',
      title: 'Switch to Tax-Optimised Multi-Pot Waterfall Drawdown',
      impactLevel: 'Medium Impact',
      status: 'review_suggested',
      observation: `Drawing solely from Pension pots first can push annual taxable income into higher-rate (40%) brackets while leaving ISA allowances underutilised.`,
      actionableStep: `Adopt a blended Tax-Optimised strategy: draw Pension up to the Basic Rate threshold (£50,270) and fund the balance with tax-free ISA withdrawals.`,
      projectedBenefit: `Cuts lifetime retirement income tax by smoothing income across 0% (PA) and 20% (Basic Rate) bands.`,
    });
  } else {
    opportunities.push({
      id: 'drawdown_strategy_optimal',
      category: 'Decumulation & SWR',
      title: 'Tax-Optimised Pot Sequencing',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Drawdown strategy is configured to '${(currentStrat).replace(/_/g, ' ').toUpperCase()}', prioritizing tax-sheltered sequencing.`,
      actionableStep: `Review annually against changing personal allowances and income tax thresholds.`,
      projectedBenefit: `Preserves lower tax brackets and extends portfolio longevity.`,
    });
  }

  // Opportunity 6: Inheritance Tax & Post-2027 Estate Planning
  const totalAssetsNow = Object.values(pots).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
  if (totalAssetsNow > 650000 || finalPotBalance > 500000) {
    opportunities.push({
      id: 'iht_estate_planning',
      category: 'Estate & IHT',
      title: 'Post-April 2027 Pension IHT Integration & Estate De-Risking',
      impactLevel: 'Strategic Value',
      status: 'review_suggested',
      observation: `Under Autumn 2024 UK Budget reforms, unspent defined contribution pensions will be brought into the scope of Inheritance Tax (IHT) from April 2027.`,
      actionableStep: `Consider spending pension assets in lifetime alongside ISAs, and explore gifting surplus income out of normal expenditure or spousal transfers.`,
      projectedBenefit: `Mitigates up to 40% IHT on residual wealth passing to non-spousal beneficiaries.`,
    });
  }

  // ---------------------------------------------------------------------------
  // 8. EXECUTIVE SUMMARY TEXT
  // ---------------------------------------------------------------------------
  let executiveSummary = '';
  if (isFullyFunded) {
    executiveSummary = `Your retirement plan is in a strong, sustainable position. Based on a target retirement age of ${targetAge} and a desired net living income of £${targetIncome.toLocaleString()}/yr, your total portfolio supports full expenditure through age ${horizonAge} with an estimated terminal surplus of £${finalPotBalance.toLocaleString()}. Your initial Safe Withdrawal Rate of ${initialSwr.toFixed(1)}% and guaranteed income floor coverage of ${guaranteedFloorCoveragePct}% provide robust protection against market sequence risk.`;
  } else {
    executiveSummary = `Your retirement plan projects a capital shortfall starting at age ${depletionAge || targetAge} (${Math.max(0, (depletionAge || targetAge) - targetAge)} years post-retirement). While early retirement is funded, maintaining your net target of £${targetIncome.toLocaleString()}/yr requires strategic adjustments. Implementing spousal allowance equalisation, optimizing tax-free lump sum phasing, and adjusting discretionary spending can close this gap and secure lifetime longevity.`;
  }

  return {
    scorecard,
    milestones,
    opportunities,
    executiveSummary,
  };
}
