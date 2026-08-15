import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from './ukTaxEngine';
import { sanitizePots, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from './defaultData';
import { solveMaximizedSpend } from './maximizedSpendSolver';

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
  const priAccessAge = getPensionAccessAge(profile);

  const cleanPots = sanitizePots(pots, DEFAULT_POTS);
  const cleanPartnerPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

  // ---------------------------------------------------------------------------
  // 1. Evaluate Projections & Decumulation Horizon
  // ---------------------------------------------------------------------------
  const retiredProjections = projections.filter((p) => p.isRetired || p.age >= targetAge);
  const shortfallYears = projections.filter((p) => p.isRetired && (p.incomeShortfall || 0) > 0);
  const isFullyFunded = shortfallYears.length === 0 && projections.length > 0;
  const firstShortfall = shortfallYears[0];
  const depletionAge = firstShortfall?.age;

  const lastProj = projections[projections.length - 1];
  const finalPotBalance = lastProj ? Math.round(lastProj.totalPot) : 0;
  const runwayYears = isFullyFunded
    ? Math.max(0, horizonAge - currentAge)
    : Math.max(0, (depletionAge || targetAge) - currentAge);

  // ---------------------------------------------------------------------------
  // 2. Initial SWR & Pot at Retirement
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 3. Guaranteed Floor & State Pension Coverage
  // ---------------------------------------------------------------------------
  const priStatePension = profile.includeStatePension
    ? (profile.statePensionAmountAnnual || profile.fullStatePensionAmount || 12547.6)
    : 0;
  const partStatePension = isCouple && profile.partnerIncludeStatePension !== false
    ? (profile.partnerStatePensionAmountAnnual || profile.partnerFullStatePensionAmount || 12547.6)
    : 0;
  const statePensionTotalAnnual = priStatePension + partStatePension;

  const dbPensionTotalAnnual = (profile.dbPensions || [])
    .filter((db) => db.enabled !== false)
    .reduce((sum, db) => sum + (db.annualIncome || 0), 0);

  const fixedIncomeTotalAnnual = (profile.fixedIncomeStreams || [])
    .filter((fi) => fi.enabled !== false)
    .reduce((sum, fi) => sum + (fi.annualAmount || 0), 0);

  const guaranteedFloorAmount = statePensionTotalAnnual + dbPensionTotalAnnual + fixedIncomeTotalAnnual;

  const essentialSpending = Math.round(targetIncome * 0.7);
  const guaranteedFloorCoveragePct = essentialSpending > 0
    ? Math.min(250, Math.round((guaranteedFloorAmount / essentialSpending) * 100))
    : 100;

  let floorStatus: PlanScorecard['floorStatus'] = 'robust';
  if (guaranteedFloorCoveragePct < 60) floorStatus = 'low';
  else if (guaranteedFloorCoveragePct < 90) floorStatus = 'adequate';
  else floorStatus = 'robust';

  // ---------------------------------------------------------------------------
  // 4. Lifetime Effective Tax Rate in Decumulation
  // ---------------------------------------------------------------------------
  const totalDecumGross = retiredProjections.reduce(
    (sum, p) =>
      sum +
      (p.pensionDrawdown || 0) +
      (p.statePensionReceived || 0) +
      (p.dbPensionIncomeReceived || 0) +
      (p.taxableFixedIncomeReceived || 0) +
      (p.taxFreeFixedIncomeReceived || 0) +
      (p.isaDrawdown || 0) +
      (p.cashDrawdown || 0),
    0
  );
  const totalDecumTax = retiredProjections.reduce(
    (sum, p) => sum + (p.totalTaxPaid || p.taxOnWithdrawal || 0),
    0
  );
  const effectiveTaxRate = totalDecumGross > 0 ? (totalDecumTax / totalDecumGross) * 100 : 0;

  let taxEfficiencyStatus: PlanScorecard['taxEfficiencyStatus'] = 'optimal';
  if (effectiveTaxRate > 15) taxEfficiencyStatus = 'high_drag';
  else if (effectiveTaxRate > 8) taxEfficiencyStatus = 'moderate';
  else taxEfficiencyStatus = 'optimal';

  // ---------------------------------------------------------------------------
  // 5. Estimated Monte Carlo / Stochastic Resilience
  // ---------------------------------------------------------------------------
  let monteCarloEstimatedSuccess = 95;
  if (!isFullyFunded) {
    const yearsToDepletion = (depletionAge || targetAge) - targetAge;
    monteCarloEstimatedSuccess = Math.max(
      10,
      Math.min(75, Math.round((yearsToDepletion / Math.max(1, horizonAge - targetAge)) * 80))
    );
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
      summary: `Ages ${targetAge} to ${priSpaAge}: Private bridge required before State Pension commences.`,
      detail: `Your plan requires an estimated private capital bridge of £${Math.round(bridgeSpending).toLocaleString()} across ${bridgeYears} years. Utilizing Tax-Free Cash (PCLS) and ISAs during this bridge shields withdrawals from higher-rate tax brackets.`,
      badge: `${bridgeYears}-Year Bridge`,
      badgeColor: 'indigo',
    });
  }

  // Milestone B: State Pension Commencement & Drawdown Drop
  if (profile.includeStatePension) {
    const spaProj = projections.find((p) => p.age === priSpaAge);
    const preSpaProj = projections.find((p) => p.age === priSpaAge - 1);
    const drawBefore = preSpaProj
      ? (preSpaProj.pensionDrawdown || 0) + (preSpaProj.isaDrawdown || 0) + (preSpaProj.cashDrawdown || 0)
      : targetIncome;
    const drawAfter = spaProj
      ? (spaProj.pensionDrawdown || 0) + (spaProj.isaDrawdown || 0) + (spaProj.cashDrawdown || 0)
      : Math.max(0, targetIncome - statePensionTotalAnnual);
    const dropPct =
      drawBefore > 0 ? Math.max(0, Math.round(((drawBefore - drawAfter) / drawBefore) * 100)) : 0;

    milestones.push({
      type: 'state_pension',
      title: `State Pension Inflection (Age ${priSpaAge})`,
      age: priSpaAge,
      summary: `State Pension injects £${Math.round(priStatePension).toLocaleString()}/yr of guaranteed, triple-lock income.`,
      detail: `At age ${priSpaAge}, private pot withdrawal dependency drops by ${dropPct > 0 ? `${dropPct}%` : 'a substantial margin'}, dramatically reducing sequence-of-returns vulnerability for remaining retirement.`,
      badge: `+£${Math.round(priStatePension).toLocaleString()}/yr Guaranteed`,
      badgeColor: 'emerald',
    });
  }

  // Milestone C: Mortgage Clearance / Payoff
  if (profile.mortgage?.enabled && (profile.mortgage.currentBalance || 0) > 0) {
    const termYears = profile.mortgage.remainingTermYears || 20;
    const clearanceAge = currentAge + Math.ceil(termYears);
    const isPayoffAtRetirement = profile.mortgage.payoffAtRetirement;

    if (isPayoffAtRetirement) {
      milestones.push({
        type: 'mortgage_clearance',
        title: `Mortgage Lump Sum Clearance at Retirement (Age ${targetAge})`,
        age: targetAge,
        summary: `Mortgage debt cleared at retirement using ${profile.mortgage.payoffSourcePot ? profile.mortgage.payoffSourcePot.replace(/_/g, ' ') : 'pension lump sum'}.`,
        detail: `Clearing the outstanding balance eliminates monthly debt service from retirement expenditure, lowering annual required income.`,
        badge: 'Debt-Free at Retirement',
        badgeColor: 'amber',
      });
    } else if (clearanceAge <= targetAge) {
      milestones.push({
        type: 'mortgage_clearance',
        title: `Mortgage Freedom Achieved (Age ${clearanceAge})`,
        age: clearanceAge,
        summary: `Mortgage scheduled to be fully repaid ${targetAge - clearanceAge} years before target retirement.`,
        detail: `Monthly mortgage repayments cease at age ${clearanceAge}, unlocking surplus cash flow to supercharge pension and ISA accumulation in the final years before retirement.`,
        badge: `Mortgage-Free @ ${clearanceAge}`,
        badgeColor: 'amber',
      });
    } else {
      milestones.push({
        type: 'mortgage_clearance',
        title: `Mortgage Extends into Retirement (Until Age ${clearanceAge})`,
        age: targetAge,
        summary: `Mortgage continues for ${clearanceAge - targetAge} years into retirement until age ${clearanceAge}.`,
        detail: `Ongoing monthly mortgage repayments are factored into your decumulation expenditure until the loan amortizes in full at age ${clearanceAge}.`,
        badge: `${clearanceAge - targetAge} Yrs in Retirement`,
        badgeColor: 'amber',
      });
    }
  }

  // Milestone D: Crystallisation & Tax-Free Cash Extraction
  const tranches = profile.crystallisationTranches || [];
  const activeTranches = tranches.filter((t) => t.enabled);
  if (activeTranches.length > 0) {
    milestones.push({
      type: 'crystallisation',
      title: `Phased Crystallisation Schedule (${activeTranches.length} Tranches)`,
      age: activeTranches[0]?.age || targetAge,
      summary: `Tax-free cash (PCLS) accessed systematically in ${activeTranches.length} planned tranches between ages ${activeTranches[0]?.age || targetAge} and ${activeTranches[activeTranches.length - 1]?.age || 75}.`,
      detail: `Phasing crystallisation retains uncrystallised pension assets within tax-sheltered investment growth, taking PCLS only when needed to fund expenditure or fill ISA wrappers.`,
      badge: `${activeTranches.length} Active Tranches`,
      badgeColor: 'purple',
    });
  } else {
    milestones.push({
      type: 'crystallisation',
      title: `Standard Tax-Free Lump Sum (PCLS) Access (Age ${Math.max(priAccessAge, targetAge)})`,
      age: Math.max(priAccessAge, targetAge),
      summary: `25% Tax-Free Cash accessed under Lump Sum Allowance (LSA £268,275 cap).`,
      detail: `Extracted tax-free cash can be directed to Stocks & Shares ISA, Cash Reserves, or clearing liabilities to establish a robust multi-pot decumulation buffer.`,
      badge: 'LSA Compliant',
      badgeColor: 'purple',
    });
  }

  // Milestone E: Spending Phases / Spending Smile
  const spendingPhasesConfig = profile.spendingPhases;
  if (spendingPhasesConfig?.enabled) {
    milestones.push({
      type: 'spending_phases',
      title: `Dynamic Spending Phases Active`,
      age: targetAge,
      summary: `Expenditure adjusts dynamically across active, moderate, and mature retirement stages.`,
      detail: `Aligns portfolio decumulation with real-world retirement spending behavior, allowing higher lifestyle spend in early active retirement while protecting long-term capital for late-life care.`,
      badge: 'Spending Smile Active',
      badgeColor: 'blue',
    });
  }

  // ---------------------------------------------------------------------------
  // 7. ACTIONABLE TAX OPTIMIZATIONS & WEALTH OPPORTUNITIES
  // ---------------------------------------------------------------------------
  const opportunities: ActionableOpportunity[] = [];

  // Opportunity 1: 60% Marginal Tax Trap (£100k - £125,140)
  const is60TrapActive = Boolean(taxResult?.is60PercentTaxTrap);
  const trapAmount = taxResult?.taxTrapAmountInBracket || 0;
  const recommendedTrapContrib = taxResult?.recommendedTaxTrapPensionContribution || 0;
  const grossSalary = profile.grossAnnualSalary || 0;
  const adjustedNetIncome = taxResult?.adjustedNetIncome ?? grossSalary;

  if (is60TrapActive && trapAmount > 0) {
    opportunities.push({
      id: 'tax_trap_mitigation',
      category: 'Allowances & Reliefs',
      title: '60% Marginal Tax Trap Elimination (£100k–£125k Taper)',
      impactLevel: 'High Impact',
      status: 'recommended',
      observation: `Your Adjusted Net Income is £${Math.round(adjustedNetIncome).toLocaleString()}, placing £${Math.round(trapAmount).toLocaleString()} in the Personal Allowance taper zone where earnings suffer an effective 60% marginal tax rate.`,
      actionableStep: `Contribute an additional £${Math.round(recommendedTrapContrib).toLocaleString()}/yr into your workplace pension or SIPP to pull Adjusted Net Income down to exactly £100,000.`,
      projectedBenefit: `Reclaims £${Math.round(trapAmount * 0.5).toLocaleString()} of tax-free Personal Allowance, saving £${Math.round(trapAmount * 0.6).toLocaleString()}/yr in income tax (60% effective relief).`,
    });
  } else if (grossSalary > 100000 && !is60TrapActive) {
    opportunities.push({
      id: 'tax_trap_optimised',
      category: 'Allowances & Reliefs',
      title: '60% Tax Trap Successfully Mitigated',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Gross salary of £${grossSalary.toLocaleString()} is above £100,000, but your active pension contributions of £${Math.round(taxResult?.totalPensionContributionsAnnual || 0).toLocaleString()}/yr successfully reduce Adjusted Net Income to £${Math.round(adjustedNetIncome).toLocaleString()}.`,
      actionableStep: `Maintain your current pension contributions to protect your full £12,570 Personal Allowance each tax year.`,
      projectedBenefit: `Successfully avoiding up to £${Math.round(Math.min(25140, (grossSalary - 100000)) * 0.6).toLocaleString()}/yr in 60% marginal tax drag.`,
    });
  }

  // Opportunity 2: Salary Sacrifice vs Relief at Source NI Savings
  const isSalarySacrifice = profile.pensionContributionMethod === 'salary_sacrifice';
  const employeePensionContrib = taxResult?.employeePensionContributionsAnnual || 0;
  if (!isSalarySacrifice && grossSalary > 12570 && employeePensionContrib > 0) {
    const estNicSavings = Math.round(employeePensionContrib * (grossSalary > 50270 ? 0.02 : 0.08));
    opportunities.push({
      id: 'salary_sacrifice_opportunity',
      category: 'Tax Efficiency',
      title: 'Workplace Salary Sacrifice National Insurance Optimisation',
      impactLevel: 'High Impact',
      status: 'recommended',
      observation: `Pension contributions are currently set to '${profile.pensionContributionMethod.replace(/_/g, ' ')}'. You are paying employee National Insurance on £${Math.round(employeePensionContrib).toLocaleString()}/yr of pension contributions.`,
      actionableStep: `Switch pension contributions to workplace Salary Sacrifice (SMART pensions) if offered by your employer.`,
      projectedBenefit: `Immediately saves ~£${estNicSavings.toLocaleString()}/yr in employee National Insurance, plus potential employer NI rebate pass-through.`,
    });
  } else if (isSalarySacrifice && (taxResult?.salarySacrificeNicSavedEmployee || 0) > 0) {
    opportunities.push({
      id: 'salary_sacrifice_active',
      category: 'Tax Efficiency',
      title: 'Salary Sacrifice National Insurance Shield',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Salary Sacrifice is enabled on your workplace pension, shielding £${Math.round(employeePensionContrib).toLocaleString()}/yr from National Insurance.`,
      actionableStep: `Continue channeling all regular salary increments and annual bonuses via salary sacrifice to maximize NI relief.`,
      projectedBenefit: `Saving £${Math.round(taxResult?.salarySacrificeNicSavedEmployee || 0).toLocaleString()}/yr in employee National Insurance.`,
    });
  }

  // Opportunity 3: State Pension NI Qualifying Years Gaps
  if (profile.includeStatePension) {
    const qualifyingYears = profile.qualifyingYears ?? 35;
    if (qualifyingYears < 35) {
      const missingYears = 35 - qualifyingYears;
      const annualStatePensionLoss = Math.round(missingYears * (12547.6 / 35));
      const estClass3Cost = Math.round(missingYears * 907.4);
      opportunities.push({
        id: 'state_pension_gap_fill',
        category: 'Allowances & Reliefs',
        title: 'State Pension Voluntary Class 3 NI Gap Maximisation',
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: `Your profile has ${qualifyingYears} qualifying years (${missingYears} years short of the 35 years required for the full New State Pension).`,
        actionableStep: `Check your National Insurance record on gov.uk and consider purchasing voluntary Class 3 NI contributions (~£${estClass3Cost.toLocaleString()} total).`,
        projectedBenefit: `Boosts guaranteed State Pension by +£${annualStatePensionLoss.toLocaleString()}/yr index-linked for life, typically breaking even in under 3 years of retirement.`,
      });
    } else {
      opportunities.push({
        id: 'state_pension_maxed',
        category: 'Allowances & Reliefs',
        title: 'Full State Pension Entitlement Secured',
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: `Full 35 qualifying National Insurance years achieved, securing 100% of the New State Pension (£${Math.round(priStatePension).toLocaleString()}/yr).`,
        actionableStep: `Maintain your NI record until State Pension Age (${priSpaAge}).`,
        projectedBenefit: `Guarantees £${Math.round(priStatePension * (horizonAge - priSpaAge)).toLocaleString()} of cumulative triple-lock indexed income across retirement.`,
      });
    }
  }

  // Opportunity 4: Spousal Allowance Equalisation (Couple Mode)
  if (isCouple) {
    const priPension = (cleanPots.sippBalance || 0) + (cleanPots.workplacePensionBalance || 0);
    const partPension = (cleanPartnerPots.sippBalance || 0) + (cleanPartnerPots.workplacePensionBalance || 0);

    // Calculate total ongoing partner annual pension contributions
    const partnerSippMonthly = cleanPartnerPots.sippMonthlyContribution || 0;
    const partnerSippType = cleanPartnerPots.sippContributionType || 'net';
    const partnerSippAnnualGross = partnerSippType === 'gross'
      ? partnerSippMonthly * 12
      : partnerSippMonthly * 1.25 * 12;

    const partnerSalary = profile.partnerGrossAnnualSalary || 0;
    let partnerWorkplaceAnnualGross = 0;
    if (cleanPartnerPots.workplacePensionMonthlyEmployeeType === 'fixed') {
      partnerWorkplaceAnnualGross = (cleanPartnerPots.workplacePensionMonthlyEmployee || 0) * 12;
    } else {
      partnerWorkplaceAnnualGross = partnerSalary * ((cleanPartnerPots.workplacePensionMonthlyEmployee || 0) / 100);
    }
    const partnerEmployerMatchAnnual = partnerSalary * ((cleanPartnerPots.employerMatchPercentage || 0) / 100);
    const partnerTotalWorkplaceAnnual = partnerWorkplaceAnnualGross + partnerEmployerMatchAnnual;

    // Check one-off and pot transfer regular contributions for partner
    const partnerOneOffPensionAnnual = (profile.oneOffContributions || [])
      .filter((c) => c.enabled && c.owner === 'partner' && (c.targetPot === 'sipp' || c.targetPot === 'workplace_pension'))
      .reduce((sum, c) => {
        if (c.frequency === 'regular_monthly') return sum + (c.grossAmount || 0) * 12;
        return sum + (c.grossAmount || 0);
      }, 0);

    const partnerPotTransfersToPension = (profile.potTransfers || [])
      .filter((t) => t.enabled && (t.destinationOwner === 'partner' || t.destinationPot === 'sipp' || t.destinationPot === 'workplace_pension'))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const partnerAnnualPensionContrib = partnerSippAnnualGross + partnerTotalWorkplaceAnnual + partnerOneOffPensionAnnual + partnerPotTransfersToPension;

    const projectedPartnerPensionAtRet = retProj ? (retProj.partnerPensionPot || 0) : partPension;
    const projectedPrimaryPensionAtRet = retProj ? (retProj.primaryPensionPot || 0) : priPension;
    const projectedRatio = projectedPrimaryPensionAtRet > 0 ? (projectedPartnerPensionAtRet / projectedPrimaryPensionAtRet) : 1;

    const isPartnerContributionActive = partnerAnnualPensionContrib >= 2400 || partnerSippMonthly > 0;

    if (isPartnerContributionActive || (projectedRatio >= 0.4 && projectedRatio <= 2.5) || projectedPartnerPensionAtRet >= 100000) {
      opportunities.push({
        id: 'spousal_balanced',
        category: 'Tax Efficiency',
        title: 'Spousal Pension Equalisation Strategy Active',
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: isPartnerContributionActive
          ? `Spousal pension funding is actively configured: £${Math.round(partnerAnnualPensionContrib).toLocaleString()}/yr is being contributed into ${profile.partnerName || 'Partner'}'s pension, building a projected pot of £${Math.round(projectedPartnerPensionAtRet).toLocaleString()} at retirement.`
          : `Spousal pension pots are well-balanced (£${Math.round(priPension).toLocaleString()} vs £${Math.round(partPension).toLocaleString()}), enabling dual Personal Allowance utilization.`,
        actionableStep: `Continue scheduled monthly spousal contributions to maximize dual Personal Allowance utilisation (£25,140/yr combined) throughout retirement.`,
        projectedBenefit: `Maximises joint tax-free Personal Allowances and basic rate tax bands in retirement, saving up to £2,514/yr in joint income tax.`,
      });
    } else {
      const lowerMember = (partPension < priPension) ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');
      opportunities.push({
        id: 'spousal_equalisation',
        category: 'Tax Efficiency',
        title: 'Spousal Pension Equalisation & Dual Personal Allowance',
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: `Significant disparity between spousal pension sizes (${profile.name || 'Primary'}: £${Math.round(priPension).toLocaleString()} vs ${profile.partnerName || 'Partner'}: £${Math.round(partPension).toLocaleString()}), and no regular spousal pension contributions are currently configured.`,
        actionableStep: `Direct new pension contributions or spousal SIPP contributions (£2,880 net / £3,600 gross for non-earners) toward ${lowerMember}.`,
        projectedBenefit: `Utilises both spouses' £12,570 Personal Allowances and 20% basic rate bands in retirement, saving up to £2,514/yr in joint income tax.`,
      });
    }
  }

  // Opportunity 5: Mortgage Strategy & Decumulation Cash Flow
  if (profile.mortgage?.enabled && (profile.mortgage.currentBalance || 0) > 0) {
    const mortgageBal = profile.mortgage.currentBalance;
    const termYears = profile.mortgage.remainingTermYears || 20;
    const clearanceAge = currentAge + Math.ceil(termYears);
    const isPayoffAtRetirement = profile.mortgage.payoffAtRetirement;

    if (clearanceAge > targetAge && !isPayoffAtRetirement) {
      opportunities.push({
        id: 'mortgage_retirement_clearance',
        category: 'Decumulation & SWR',
        title: 'Mortgage Retirement Clearance Strategy',
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: `Outstanding mortgage of £${Math.round(mortgageBal).toLocaleString()} (${profile.mortgage.interestRatePercent}%) is projected to extend ${clearanceAge - targetAge} years into retirement.`,
        actionableStep: `Evaluate enabling 'Pay off at retirement' using 25% Tax-Free Pension Lump Sum (PCLS) or increasing monthly overpayments (currently £${profile.mortgage.regularMonthlyOverpayment || 0}/mo).`,
        projectedBenefit: `Removes ongoing monthly debt service in retirement, reducing required gross portfolio withdrawals and lowering sequence risk.`,
      });
    } else if (isPayoffAtRetirement || clearanceAge <= targetAge) {
      opportunities.push({
        id: 'mortgage_clearance_optimised',
        category: 'Decumulation & SWR',
        title: 'Debt-Free Retirement Trajectory',
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: isPayoffAtRetirement
          ? `Mortgage is set to be fully cleared at retirement (Age ${targetAge}) using ${profile.mortgage.payoffSourcePot?.replace(/_/g, ' ') || 'pension lump sum'}.`
          : `Mortgage will be fully repaid by Age ${clearanceAge} before retirement.`,
        actionableStep: `Ensure required payoff capital remains ring-fenced and protected from market volatility.`,
        projectedBenefit: `Ensures 100% of retirement cash flow is directed to living expenditure without debt drag.`,
      });
    }
  }

  // Opportunity 6: GIA Bed & ISA / CGT Allowance Harvesting
  const priGia = cleanPots.giaBalance || 0;
  const partGia = isCouple ? (cleanPartnerPots.giaBalance || 0) : 0;
  const giaTotal = priGia + partGia;
  const hasActiveGiaTransfer = (profile.potTransfers || []).some(
    (t) => t.enabled && t.sourcePot === 'gia' && (t.destinationPot === 'stocks_and_shares_isa' || t.destinationPot === 'cash_isa')
  );

  if (giaTotal > 15000 && !hasActiveGiaTransfer) {
    opportunities.push({
      id: 'gia_bed_and_isa',
      category: 'Tax Efficiency',
      title: 'Annual Bed & ISA Capital Gains Harvesting',
      impactLevel: 'Medium Impact',
      status: 'recommended',
      observation: `Taxable General Investment Accounts (GIA) hold £${Math.round(giaTotal).toLocaleString()} exposed to dividend tax and capital gains tax.`,
      actionableStep: `Schedule an annual Bed & ISA transfer of £20,000 per spouse in the Pot Transfer Manager, utilizing the £3,000 annual CGT allowance.`,
      projectedBenefit: `Permanently shelters investment capital in the zero-tax ISA wrapper, eliminating future dividend and capital gains tax liabilities.`,
    });
  } else if (giaTotal > 0 && hasActiveGiaTransfer) {
    opportunities.push({
      id: 'gia_bed_and_isa_active',
      category: 'Tax Efficiency',
      title: 'Bed & ISA Migration Active',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Annual Bed & ISA transfer is actively configured to systematically drain taxable GIA assets into tax-free ISAs.`,
      actionableStep: `Continue annual executions to migrate remaining GIA capital into ISAs.`,
      projectedBenefit: `Maximizes ISA wrapper utilization and prevents dividend tax leakage.`,
    });
  }

  // Opportunity 7: Lump Sum Allowance (LSA £268,275) Protection Check
  const projectedPensionAtRet = retProj
    ? (retProj.primaryPensionPot || 0) + (retProj.partnerPensionPot || 0)
    : 0;
  const potentialPcls = Math.round(projectedPensionAtRet * (profile.pclsLumpSumPercent ? profile.pclsLumpSumPercent / 100 : 0.25));
  const lsaLimit = profile.customLsaAllowance || 268275;

  if (potentialPcls > lsaLimit && profile.lsaProtectionType === 'standard') {
    opportunities.push({
      id: 'lsa_cap_monitoring',
      category: 'Tax Efficiency',
      title: 'Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
      impactLevel: 'Medium Impact',
      status: 'review_suggested',
      observation: `Projected pension pots (£${Math.round(projectedPensionAtRet).toLocaleString()}) produce a 25% tax-free cash entitlement of £${potentialPcls.toLocaleString()}, which exceeds the standard £268,275 Lump Sum Allowance by £${(potentialPcls - lsaLimit).toLocaleString()}.`,
      actionableStep: `Check if you hold historic transitional protection (Enhanced, Fixed, or Individual Protection) or consider redirecting future surplus savings into ISAs.`,
      projectedBenefit: `Prevents excess pension lump sum withdrawals above £268,275 from being taxed at marginal income tax rates (up to 40%–45%).`,
    });
  }

  // Opportunity 8: Plan Longevity & Maximized Spend Advisory
  if (profile.maximizedSpendConfig?.enabled) {
    opportunities.push({
      id: 'maximized_spend_active',
      category: 'Decumulation & SWR',
      title: 'Maximized Spend Mode Active',
      impactLevel: 'Strategic Value',
      status: 'already_optimised',
      observation: `Your plan is actively running in Maximized Spend mode with solved sustainable spending of £${Math.round(targetIncome).toLocaleString()}/yr, calibrating portfolio depletion to Age ${profile.maximizedSpendConfig.targetEndAge || horizonAge}.`,
      actionableStep: `Review actual annual spending vs solved drawdown capacity to decide whether to enjoy higher lifestyle spending or reinvest excess surplus into ISAs.`,
      projectedBenefit: `Unlocks 100% of your portfolio's sustainable spending capacity without running out of capital.`,
    });
  } else if (isFullyFunded && finalPotBalance > targetIncome * 2) {
    try {
      const maxSpendResult = solveMaximizedSpend({
        profile,
        pots,
        targetEndAge: horizonAge,
        targetLegacyBuffer: 0,
        spendingPattern: 'uniform',
      });

      const maxIncome = Math.round(maxSpendResult.maxAnnualIncome);
      const extraAnnual = Math.round(maxSpendResult.extraAnnualSpend);
      const boostPct = Math.round(maxSpendResult.boostPercentage);
      const extraLifetime = Math.round(maxSpendResult.extraLifetimeSpend);

      if (extraAnnual > 500) {
        opportunities.push({
          id: 'maximized_spend_potential',
          category: 'Decumulation & SWR',
          title: 'Surplus Capital Optimization & Maximized Spend Solver',
          impactLevel: 'Strategic Value',
          status: 'recommended',
          observation: `Your portfolio maintains full solvency with a projected surplus of £${finalPotBalance.toLocaleString()} remaining at Age ${horizonAge}. Initial SWR is conservative (${initialSwr.toFixed(1)}%).`,
          actionableStep: `The Max Spend Solver calculated that you can safely increase baseline spending from £${Math.round(targetIncome).toLocaleString()}/yr to £${maxIncome.toLocaleString()}/yr (+£${extraAnnual.toLocaleString()}/yr, a +${boostPct}% boost), or retire earlier.`,
          projectedBenefit: `Safely unlocks up to +£${extraLifetime.toLocaleString()} in extra lifetime lifestyle spending during retirement without running out of capital.`,
        });
      } else {
        opportunities.push({
          id: 'maximized_spend_calibrated',
          category: 'Decumulation & SWR',
          title: 'Spending Requirement Efficiently Calibrated',
          impactLevel: 'Strategic Value',
          status: 'already_optimised',
          observation: `Your baseline target spending of £${Math.round(targetIncome).toLocaleString()}/yr closely matches your portfolio's maximum sustainable drawdown capacity.`,
          actionableStep: `Maintain your current spending and drawdown sequencing.`,
          projectedBenefit: `Ensures full lifetime financial independence through Age ${horizonAge}.`,
        });
      }
    } catch {
      opportunities.push({
        id: 'maximized_spend_potential',
        category: 'Decumulation & SWR',
        title: 'Surplus Capital Optimization & Maximized Spend Solver',
        impactLevel: 'Strategic Value',
        status: 'recommended',
        observation: `Your portfolio maintains full solvency with a projected surplus of £${finalPotBalance.toLocaleString()} remaining at Age ${horizonAge}. Initial SWR is conservative (${initialSwr.toFixed(1)}%).`,
        actionableStep: `Use the 'Maximize Sustainable Spend' modal to calculate your exact personalized maximum spending capacity.`,
        projectedBenefit: `Safely unlocks maximum lifestyle spending in your active retirement years without risk of running out of capital.`,
      });
    }
  } else if (!isFullyFunded) {
    const deficitYears = shortfallYears.length;
    const firstDeficit = shortfallYears[0];
    opportunities.push({
      id: 'plan_shortfall_remedy',
      category: 'Decumulation & SWR',
      title: 'Deficit Closure & Portfolio Longevity Action Plan',
      impactLevel: 'High Impact',
      status: 'recommended',
      observation: `Projected capital depletion occurs at Age ${firstDeficit?.age || targetAge} (${deficitYears} years of deficit before Horizon Age ${horizonAge}).`,
      actionableStep: `Review actionable levers: 1) Increase monthly accumulation contributions; 2) Adjust retirement age by +1 to +2 years; or 3) Optimize dynamic spending phases.`,
      projectedBenefit: `Eliminates the projected capital deficit and restores 100% lifetime portfolio solvency through age ${horizonAge}.`,
    });
  }

  // Opportunity 9: Inheritance Tax & Estate Planning
  const totalAssetsNow =
    Object.values(cleanPots).reduce((sum, val) => (typeof val === 'number' ? sum + val : sum), 0) +
    (isCouple
      ? Object.values(cleanPartnerPots).reduce((sum, val) => (typeof val === 'number' ? sum + val : sum), 0)
      : 0);

  if (totalAssetsNow > 650000 || finalPotBalance > 500000) {
    opportunities.push({
      id: 'iht_estate_planning',
      category: 'Estate & IHT',
      title: 'Post-April 2027 Pension IHT Integration & Estate Planning',
      impactLevel: 'Strategic Value',
      status: 'review_suggested',
      observation: `Under Autumn 2024 UK Budget legislation, unspent defined contribution pensions enter the scope of Inheritance Tax (IHT) from April 2027.`,
      actionableStep: `Model your IHT exposure in the Estate Planning tab, utilizing spousal exemptions, annual £3,000 gifting allowances, and normal expenditure from income rules.`,
      projectedBenefit: `Mitigates up to 40% IHT on residual estate passing to non-spousal beneficiaries.`,
    });
  }

  // ---------------------------------------------------------------------------
  // 8. EXECUTIVE SUMMARY TEXT
  // ---------------------------------------------------------------------------
  let executiveSummary = '';
  if (isFullyFunded) {
    executiveSummary = `Your retirement plan is in a strong, sustainable position. Based on a target retirement age of ${targetAge} and a desired net income of £${targetIncome.toLocaleString()}/yr, your portfolio supports full expenditure through age ${horizonAge} with a projected terminal surplus of £${finalPotBalance.toLocaleString()}. Your initial Safe Withdrawal Rate of ${initialSwr.toFixed(1)}% and guaranteed floor coverage of ${guaranteedFloorCoveragePct}% provide robust protection against market sequence risk.`;
  } else {
    executiveSummary = `Your retirement plan projects a capital shortfall starting at age ${depletionAge || targetAge} (${Math.max(0, (depletionAge || targetAge) - targetAge)} years post-retirement). While early retirement is funded, maintaining your net target of £${targetIncome.toLocaleString()}/yr requires strategic adjustments. Implementing salary sacrifice optimizations, spousal allowance equalisation, or adjusting spending phases can close this deficit and secure lifetime solvency.`;
  }

  return {
    scorecard,
    milestones,
    opportunities,
    executiveSummary,
  };
}
