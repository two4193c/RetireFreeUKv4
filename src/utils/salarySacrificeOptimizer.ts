import { computeIncomeTaxOnAmount, calculateStandardNI } from './ukTaxEngine';
import { EMPLOYER_NI_RATE, PENSION_ANNUAL_ALLOWANCE } from '../config/ukTaxRates';
import { UserProfile, InvestmentPots } from '../types';

export interface PlanContributionsInfo {
  employeeWorkplaceAnnual: number;
  employerWorkplaceAnnual: number;
  employeeWorkplaceMonthly: number;
  employerWorkplaceMonthly: number;
  employeePercentOfSalary: number;
  employerPercentOfSalary: number;
  sippAnnual: number;
  totalPensionAnnual: number;
  hasWorkplaceContributions: boolean;
  sourceDescription: string;
}

export interface SalarySacrificeInput {
  salary: number;
  sacrificeAmount: number;
  isScottish?: boolean;
  employerNiRate?: number; // e.g. 0.138 or 0.150
  employerPassThroughPercent?: number; // 0 to 100
  claimChildBenefit?: boolean;
  childBenefitChildren?: number;
  yearsToRetirement?: number;
  expectedReturn?: number; // percentage, e.g. 6.5
  currentPlanSacrifice?: number; // detected from user plan contributions
}

export interface ChildBenefitDetails {
  annualGrossBenefit: number;
  clawbackPercent: number; // 0 to 100
  clawbackTaxCharge: number;
  netBenefitRetained: number;
}

export interface ScenarioBreakdown {
  label: string;
  contractualSalary: number;
  adjustedNetIncome: number;
  incomeTax: number;
  employeeNi: number;
  childBenefitRetained: number;
  netTakeHomePay: number;
  employeePensionAdded: number;
  employerRebateAdded: number;
  totalPensionAdded: number;
  netCostToEmployee: number; // reduction in net take-home compared to baseline
  effectiveCostPer100InPension: number; // £ cost to net take home for every £100 in pension
}

export interface TrapOptimization {
  id: 'pa_taper' | 'child_benefit' | 'higher_rate' | 'annual_allowance' | 'current_plan';
  title: string;
  badge: string;
  description: string;
  recommendedSacrifice: number;
  targetSalary: number;
  marginalRateSavedPercent: number;
  annualNetSaving: number;
  isApplicable: boolean;
}

export interface YearlyAccumulationProjection {
  year: number;
  age: number;
  rasPotBalance: number;
  smartPotBalance: number;
  extraPotFromSmart: number;
  cumulativeEmployeeNiSaved: number;
  cumulativeEmployerBonusContributed: number;
}

export interface SalarySacrificeResult {
  baseline: ScenarioBreakdown;
  reliefAtSource: ScenarioBreakdown;
  salarySacrifice: ScenarioBreakdown;
  // Advantage of Salary Sacrifice with Pass-Through over Relief at Source
  advantagesOverRas: {
    employeeNiSavedAnnual: number;
    employeeNiSavedMonthly: number;
    employerBonusAnnual: number;
    employerBonusMonthly: number;
    totalAnnualAdvantage: number;
    totalMonthlyAdvantage: number;
    immediateRoiPercent: number; // (TotalPensionAdded - NetCost) / NetCost * 100
    rasImmediateRoiPercent: number;
  };
  // Marginal rates at the current salary level
  marginalRates: {
    incomeTaxRatePercent: number;
    employeeNiRatePercent: number;
    hicbcClawbackRatePercent: number;
    totalMarginalRatePercent: number;
    isInPaTaper: boolean;
    isInHicbcTaper: boolean;
  };
  // Presets and trap busters
  trapOptimizations: TrapOptimization[];
  // Compound projections until retirement
  compoundProjection: {
    yearsToRetirement: number;
    rasFinalPot: number;
    smartFinalPot: number;
    extraRetirementWealth: number;
    totalEmployeeNiSaved: number;
    totalEmployerBonusInvested: number;
    yearlyBreakdown: YearlyAccumulationProjection[];
  };
  // Alerts and warnings
  warnings: string[];
}

/**
 * Weekly rates for UK Child Benefit:
 * 1st child: £25.60/week (£1,331.20/yr)
 * Each additional child: £16.95/week (£881.40/yr)
 */
export const CB_FIRST_CHILD_ANNUAL = 25.60 * 52; // 1331.20
export const CB_ADDITIONAL_CHILD_ANNUAL = 16.95 * 52; // 881.40
export const HICBC_LOWER_THRESHOLD = 60_000;
export const HICBC_UPPER_THRESHOLD = 80_000;
export const NMW_ESTIMATED_ANNUAL = 23_810; // ~37.5 hrs/wk at £12.21/hr (April 2025 NMW)

/**
 * Calculates statutory Child Benefit entitlement and HICBC clawback.
 */
export function calculateChildBenefitDetails(
  adjustedNetIncome: number,
  childrenCount: number
): ChildBenefitDetails {
  if (childrenCount <= 0) {
    return {
      annualGrossBenefit: 0,
      clawbackPercent: 0,
      clawbackTaxCharge: 0,
      netBenefitRetained: 0,
    };
  }

  const annualGrossBenefit =
    CB_FIRST_CHILD_ANNUAL + Math.max(0, childrenCount - 1) * CB_ADDITIONAL_CHILD_ANNUAL;

  if (adjustedNetIncome <= HICBC_LOWER_THRESHOLD) {
    return {
      annualGrossBenefit,
      clawbackPercent: 0,
      clawbackTaxCharge: 0,
      netBenefitRetained: annualGrossBenefit,
    };
  }

  // 1% clawback for every £200 over £60,000, 100% at £80,000+
  const excess = adjustedNetIncome - HICBC_LOWER_THRESHOLD;
  const clawbackPercent = Math.min(100, (excess / 200) * 1);
  const clawbackTaxCharge = Math.round(((annualGrossBenefit * clawbackPercent) / 100) * 100) / 100;
  const netBenefitRetained = Math.max(0, annualGrossBenefit - clawbackTaxCharge);

  return {
    annualGrossBenefit,
    clawbackPercent,
    clawbackTaxCharge,
    netBenefitRetained,
  };
}

/**
 * Calculates current marginal tax, NI, and HICBC rates on the next £1 earned or sacrificed.
 */
export function calculateMarginalRates(
  salary: number,
  isScottish: boolean = false,
  claimChildBenefit: boolean = false,
  childrenCount: number = 0
): {
  incomeTaxRatePercent: number;
  employeeNiRatePercent: number;
  hicbcClawbackRatePercent: number;
  totalMarginalRatePercent: number;
  isInPaTaper: boolean;
  isInHicbcTaper: boolean;
} {
  if (salary <= 0) {
    return {
      incomeTaxRatePercent: 0,
      employeeNiRatePercent: 0,
      hicbcClawbackRatePercent: 0,
      totalMarginalRatePercent: 0,
      isInPaTaper: false,
      isInHicbcTaper: false,
    };
  }

  // Marginal income tax by checking difference on £100 delta
  const delta = 100;
  const taxA = computeIncomeTaxOnAmount(salary, isScottish).tax;
  const taxB = computeIncomeTaxOnAmount(Math.max(0, salary - delta), isScottish).tax;
  const incomeTaxRatePercent = Math.round(((taxA - taxB) / delta) * 1000) / 10;

  // Marginal NI
  const niA = calculateStandardNI(salary);
  const niB = calculateStandardNI(Math.max(0, salary - delta));
  const employeeNiRatePercent = Math.round(((niA - niB) / delta) * 1000) / 10;

  // Marginal HICBC
  let hicbcClawbackRatePercent = 0;
  const isInHicbcTaper = claimChildBenefit && childrenCount > 0 && salary > 60000 && salary <= 80000;
  if (isInHicbcTaper) {
    const cbA = calculateChildBenefitDetails(salary, childrenCount).netBenefitRetained;
    const cbB = calculateChildBenefitDetails(Math.max(0, salary - delta), childrenCount).netBenefitRetained;
    // As salary drops, benefit retained increases (saving)
    hicbcClawbackRatePercent = Math.round(((cbB - cbA) / delta) * 1000) / 10;
  }

  const isInPaTaper = salary > 100000 && salary <= 125140;
  const totalMarginalRatePercent =
    Math.round((incomeTaxRatePercent + employeeNiRatePercent + hicbcClawbackRatePercent) * 10) / 10;

  return {
    incomeTaxRatePercent,
    employeeNiRatePercent,
    hicbcClawbackRatePercent,
    totalMarginalRatePercent,
    isInPaTaper,
    isInHicbcTaper,
  };
}

/**
 * Main comparison engine: Relief at Source vs Salary Sacrifice with Employer NI Pass-Through.
 */
export function calculateSalarySacrificeComparison(input: SalarySacrificeInput): SalarySacrificeResult {
  const salary = Math.max(0, input.salary || 0);
  const sacrificeAmount = Math.min(salary, Math.max(0, input.sacrificeAmount || 0));
  const isScottish = Boolean(input.isScottish);
  const employerNiRate = input.employerNiRate ?? EMPLOYER_NI_RATE; // e.g. 0.138 or 0.150
  const passThroughPercent = Math.min(100, Math.max(0, input.employerPassThroughPercent ?? 0));
  const claimChildBenefit = Boolean(input.claimChildBenefit);
  const childrenCount = claimChildBenefit ? Math.max(0, input.childBenefitChildren ?? 0) : 0;
  const yearsToRetirement = Math.max(1, Math.min(50, input.yearsToRetirement ?? 10));
  const expectedReturn = input.expectedReturn ?? 6.5;

  // 1. Baseline: No Pension Contribution
  const baselineTax = computeIncomeTaxOnAmount(salary, isScottish).tax;
  const baselineNi = calculateStandardNI(salary);
  const baselineCb = claimChildBenefit
    ? calculateChildBenefitDetails(salary, childrenCount).netBenefitRetained
    : 0;
  const baselineTakeHome = Math.max(0, salary - baselineTax - baselineNi + baselineCb);

  const baseline: ScenarioBreakdown = {
    label: 'Baseline (Cash Only)',
    contractualSalary: salary,
    adjustedNetIncome: salary,
    incomeTax: baselineTax,
    employeeNi: baselineNi,
    childBenefitRetained: baselineCb,
    netTakeHomePay: baselineTakeHome,
    employeePensionAdded: 0,
    employerRebateAdded: 0,
    totalPensionAdded: 0,
    netCostToEmployee: 0,
    effectiveCostPer100InPension: 0,
  };

  // 2. Relief at Source (RAS):
  // Employee contributes sacrificeAmount gross.
  // In RAS:
  // - Contractual gross is NOT reduced for NI purposes (pays full employee NI).
  // - Employer NI is unchanged (pays full employer NI, 0 rebate).
  // - ANI is reduced by sacrificeAmount (so income tax relief is identical, and HICBC is clawed back less).
  const rasAni = Math.max(0, salary - sacrificeAmount);
  const rasTax = computeIncomeTaxOnAmount(rasAni, isScottish).tax;
  const rasNi = baselineNi; // NI is unchanged under RAS!
  const rasCb = claimChildBenefit
    ? calculateChildBenefitDetails(rasAni, childrenCount).netBenefitRetained
    : 0;
  
  // Tax relief received = baselineTax - rasTax
  const rasTaxRelief = Math.max(0, baselineTax - rasTax);
  const rasCbSaved = Math.max(0, rasCb - baselineCb);
  // Net cost to employee = sacrificeAmount - taxRelief - cbSaved
  const rasNetCost = Math.max(0, sacrificeAmount - rasTaxRelief - rasCbSaved);
  const rasTakeHome = Math.max(0, baselineTakeHome - rasNetCost);
  const rasEffectiveCostPer100 =
    sacrificeAmount > 0 ? (rasNetCost / sacrificeAmount) * 100 : 0;

  const reliefAtSource: ScenarioBreakdown = {
    label: 'Relief at Source (RAS)',
    contractualSalary: salary,
    adjustedNetIncome: rasAni,
    incomeTax: rasTax,
    employeeNi: rasNi,
    childBenefitRetained: rasCb,
    netTakeHomePay: rasTakeHome,
    employeePensionAdded: sacrificeAmount,
    employerRebateAdded: 0,
    totalPensionAdded: sacrificeAmount,
    netCostToEmployee: rasNetCost,
    effectiveCostPer100InPension: rasEffectiveCostPer100,
  };

  // 3. Salary Sacrifice (SMART):
  // Contractual gross becomes salary - sacrificeAmount.
  // - Employee NI is calculated on reduced salary (employee NI savings!).
  // - Employer saves sacrificeAmount * employerNiRate.
  // - Employer passes through passThroughPercent % into pension.
  const smartContractualSalary = Math.max(0, salary - sacrificeAmount);
  const smartAni = smartContractualSalary;
  const smartTax = computeIncomeTaxOnAmount(smartAni, isScottish).tax;
  const smartNi = calculateStandardNI(smartContractualSalary);
  const smartCb = claimChildBenefit
    ? calculateChildBenefitDetails(smartAni, childrenCount).netBenefitRetained
    : 0;

  const employerNiSaved = sacrificeAmount * employerNiRate;
  const employerRebateAdded = employerNiSaved * (passThroughPercent / 100);
  const totalSmartPensionAdded = sacrificeAmount + employerRebateAdded;

  const smartTakeHome = Math.max(0, smartContractualSalary - smartTax - smartNi + smartCb);
  const smartNetCost = Math.max(0, baselineTakeHome - smartTakeHome);
  const smartEffectiveCostPer100 =
    totalSmartPensionAdded > 0 ? (smartNetCost / totalSmartPensionAdded) * 100 : 0;

  const salarySacrifice: ScenarioBreakdown = {
    label: 'Salary Sacrifice (SMART)',
    contractualSalary: smartContractualSalary,
    adjustedNetIncome: smartAni,
    incomeTax: smartTax,
    employeeNi: smartNi,
    childBenefitRetained: smartCb,
    netTakeHomePay: smartTakeHome,
    employeePensionAdded: sacrificeAmount,
    employerRebateAdded,
    totalPensionAdded: totalSmartPensionAdded,
    netCostToEmployee: smartNetCost,
    effectiveCostPer100InPension: smartEffectiveCostPer100,
  };

  // Advantages of Salary Sacrifice over Relief at Source:
  const employeeNiSavedAnnual = Math.max(0, baselineNi - smartNi);
  const employerBonusAnnual = employerRebateAdded;
  const totalAnnualAdvantage = employeeNiSavedAnnual + employerBonusAnnual;

  const smartImmediateRoi =
    smartNetCost > 0
      ? ((totalSmartPensionAdded - smartNetCost) / smartNetCost) * 100
      : 0;
  const rasImmediateRoi =
    rasNetCost > 0
      ? ((sacrificeAmount - rasNetCost) / rasNetCost) * 100
      : 0;

  const advantagesOverRas = {
    employeeNiSavedAnnual,
    employeeNiSavedMonthly: employeeNiSavedAnnual / 12,
    employerBonusAnnual,
    employerBonusMonthly: employerBonusAnnual / 12,
    totalAnnualAdvantage,
    totalMonthlyAdvantage: totalAnnualAdvantage / 12,
    immediateRoiPercent: smartImmediateRoi,
    rasImmediateRoiPercent: rasImmediateRoi,
  };

  // Marginal rates
  const marginalRates = calculateMarginalRates(salary, isScottish, claimChildBenefit, childrenCount);

  // Trap Buster presets
  const trapOptimizations = calculateTrapOptimizations(
    salary,
    claimChildBenefit,
    childrenCount,
    isScottish,
    input.currentPlanSacrifice
  );

  // Compound multi-year projection
  const compoundProjection = calculateCompoundProjection(
    yearsToRetirement,
    expectedReturn,
    sacrificeAmount,
    totalSmartPensionAdded,
    employeeNiSavedAnnual,
    employerBonusAnnual
  );

  // Warnings & compliance checks
  const warnings: string[] = [];
  if (salary - sacrificeAmount < NMW_ESTIMATED_ANNUAL && salary > 0) {
    warnings.push(
      `Warning: Reducing salary below ~£${Math.round(NMW_ESTIMATED_ANNUAL).toLocaleString()} may breach National Minimum Wage regulations. Check employer HR policy.`
    );
  }
  if (totalSmartPensionAdded > PENSION_ANNUAL_ALLOWANCE) {
    warnings.push(
      `Notice: Total pension contributions (£${Math.round(totalSmartPensionAdded).toLocaleString()}) exceed standard Pension Annual Allowance (£${PENSION_ANNUAL_ALLOWANCE.toLocaleString()}). Unused carry forward from the last 3 tax years may be required.`
    );
  }

  return {
    baseline,
    reliefAtSource,
    salarySacrifice,
    advantagesOverRas,
    marginalRates,
    trapOptimizations,
    compoundProjection,
    warnings,
  };
}

/**
 * Evaluates the 4 high-impact presets / trap busters:
 * 1. 60% Personal Allowance Trap (£100,000 - £125,140)
 * 2. Child Benefit Clawback Trap (£60,000 - £80,000)
 * 3. 40% Higher Rate Tax threshold (£50,270)
 * 4. Maximum Annual Allowance (£60,000)
 */
export function calculateTrapOptimizations(
  salary: number,
  claimChildBenefit: boolean,
  childrenCount: number,
  isScottish: boolean,
  currentPlanSacrifice?: number
): TrapOptimization[] {
  const traps: TrapOptimization[] = [];

  // 0. Current Plan Contribution (if configured and > 0)
  if (currentPlanSacrifice !== undefined && currentPlanSacrifice > 0) {
    const isHr = salary > 50270;
    const planMarginalSaved = isHr ? (isScottish ? 44 : 42) : 28;
    traps.push({
      id: 'current_plan',
      title: 'Current Plan Contribution',
      badge: 'Current Plan',
      description: `Sacrifice your current configured workplace pension contribution (£${Math.round(currentPlanSacrifice).toLocaleString()}/yr) via SMART pensions.`,
      recommendedSacrifice: Math.min(salary, currentPlanSacrifice),
      targetSalary: Math.max(0, salary - currentPlanSacrifice),
      marginalRateSavedPercent: planMarginalSaved,
      annualNetSaving: Math.round(currentPlanSacrifice * (planMarginalSaved / 100)),
      isApplicable: true,
    });
  }

  // 1. Personal Allowance Trap (60% / 62% marginal tax)
  const isEligiblePa = salary > 100000;
  const targetPaSalary = 100000;
  const paSacrifice = isEligiblePa
    ? Math.min(salary - targetPaSalary, PENSION_ANNUAL_ALLOWANCE)
    : 0;
  const paMarginalSaved = isScottish ? 65 : 62; // 60% tax + 2% NI (or 63% scot + 2% NI)
  const paNetSaving = paSacrifice * (paMarginalSaved / 100);

  traps.push({
    id: 'pa_taper',
    title: '60% Personal Allowance Trap Buster',
    badge: '62% Tax & NI Relief',
    description: `Sacrifice earnings down to £100,000 to eliminate the brutal Personal Allowance taper and reclaim £1 of tax-free allowance for every £2 sacrificed.`,
    recommendedSacrifice: paSacrifice,
    targetSalary: targetPaSalary,
    marginalRateSavedPercent: paMarginalSaved,
    annualNetSaving: Math.round(paNetSaving),
    isApplicable: isEligiblePa,
  });

  // 2. Child Benefit Trap (£60k - £80k HICBC)
  const isEligibleCb = claimChildBenefit && childrenCount > 0 && salary > 60000;
  const targetCbSalary = 60000;
  const cbSacrifice = isEligibleCb
    ? Math.min(salary - targetCbSalary, PENSION_ANNUAL_ALLOWANCE)
    : 0;
  const cbMarginalSaved = 42 + (childrenCount >= 2 ? 11 : 6.6); // 40% + 2% NI + HICBC clawback
  const cbNetSaving = cbSacrifice * (cbMarginalSaved / 100);

  traps.push({
    id: 'child_benefit',
    title: '100% Child Benefit Reclaim',
    badge: 'Up to 53%–55% Relief',
    description: `Sacrifice down to £60,000 to eliminate the High Income Child Benefit Charge (HICBC) and reclaim 100% of your family's Child Benefit.`,
    recommendedSacrifice: cbSacrifice,
    targetSalary: targetCbSalary,
    marginalRateSavedPercent: Math.round(cbMarginalSaved),
    annualNetSaving: Math.round(cbNetSaving),
    isApplicable: isEligibleCb,
  });

  // 3. 40% Higher Rate Threshold (£50,270)
  const isEligibleHr = salary > 50270;
  const targetHrSalary = 50270;
  const hrSacrifice = isEligibleHr
    ? Math.min(salary - targetHrSalary, PENSION_ANNUAL_ALLOWANCE)
    : 0;
  const hrMarginalSaved = isScottish ? 44 : 42; // 40% + 2% NI (or 42% Scot + 2% NI)
  const hrNetSaving = hrSacrifice * (hrMarginalSaved / 100);

  traps.push({
    id: 'higher_rate',
    title: 'Higher Rate (40%) Bracket Buster',
    badge: '42% Relief',
    description: `Sacrifice all income taxed at the Higher Rate (40% + 2% NI) down to the Basic Rate threshold of £50,270.`,
    recommendedSacrifice: hrSacrifice,
    targetSalary: targetHrSalary,
    marginalRateSavedPercent: hrMarginalSaved,
    annualNetSaving: Math.round(hrNetSaving),
    isApplicable: isEligibleHr,
  });

  // 4. Maximum Pension Annual Allowance (£60,000)
  const maxAllowanceSacrifice = Math.min(salary, PENSION_ANNUAL_ALLOWANCE);
  traps.push({
    id: 'annual_allowance',
    title: 'Max Annual Allowance (£60,000)',
    badge: 'Max Accumulation',
    description: `Maximize your annual pension allowance limit (£60,000/yr) before retirement to achieve peak tax efficiency.`,
    recommendedSacrifice: maxAllowanceSacrifice,
    targetSalary: Math.max(0, salary - maxAllowanceSacrifice),
    marginalRateSavedPercent: 42,
    annualNetSaving: Math.round(maxAllowanceSacrifice * 0.42),
    isApplicable: salary > 0,
  });

  return traps;
}

/**
 * Multi-year compounding accumulator until retirement.
 */
function calculateCompoundProjection(
  years: number,
  annualReturnPercent: number,
  rasAnnualContribution: number,
  smartAnnualContribution: number,
  annualEmployeeNiSaved: number,
  annualEmployerBonus: number
) {
  const r = annualReturnPercent / 100;
  let rasPot = 0;
  let smartPot = 0;
  let cumNi = 0;
  let cumEmployerBonus = 0;

  const yearlyBreakdown: YearlyAccumulationProjection[] = [];

  for (let y = 1; y <= years; y++) {
    // Add annual contribution at beginning of year, grow at r
    rasPot = (rasPot + rasAnnualContribution) * (1 + r);
    smartPot = (smartPot + smartAnnualContribution) * (1 + r);
    cumNi += annualEmployeeNiSaved;
    cumEmployerBonus += annualEmployerBonus;

    yearlyBreakdown.push({
      year: y,
      age: y, // will be offset in UI with currentAge
      rasPotBalance: Math.round(rasPot),
      smartPotBalance: Math.round(smartPot),
      extraPotFromSmart: Math.round(smartPot - rasPot),
      cumulativeEmployeeNiSaved: Math.round(cumNi),
      cumulativeEmployerBonusContributed: Math.round(cumEmployerBonus),
    });
  }

  const rasFinalPot = Math.round(rasPot);
  const smartFinalPot = Math.round(smartPot);
  const extraRetirementWealth = smartFinalPot - rasFinalPot;

  return {
    yearsToRetirement: years,
    rasFinalPot,
    smartFinalPot,
    extraRetirementWealth,
    totalEmployeeNiSaved: Math.round(cumNi),
    totalEmployerBonusInvested: Math.round(cumEmployerBonus),
    yearlyBreakdown,
  };
}

/**
 * Derives workplace pension and SIPP contributions currently configured in the user's plan.
 * Checks active regular monthly items in profile.oneOffContributions, falling back to pots.
 */
export function getPlanContributionsInfo(
  profile: UserProfile,
  pots: InvestmentPots,
  owner: 'primary' | 'partner' = 'primary'
): PlanContributionsInfo {
  const isPartner = owner === 'partner';
  const salary = Math.max(
    0,
    isPartner
      ? (profile.partnerGrossAnnualSalary || 0)
      : (profile.grossAnnualSalary || 0)
  );
  const targetPots = isPartner ? (profile.partnerPots || pots) : pots;

  const activeContribs = (profile.oneOffContributions || []).filter(
    (c) => c.enabled !== false && (c.owner || 'primary') === owner
  );

  const workplaceRegular = activeContribs.filter(
    (c) => c.frequency === 'regular_monthly' && c.targetPot === 'workplace_pension'
  );

  let employeeWorkplaceAnnual = 0;
  let employerWorkplaceAnnual = 0;
  let sourceDescription = '';

  if (workplaceRegular.length > 0) {
    workplaceRegular.forEach((c) => {
      if (c.workplaceContributionType === 'fixed') {
        const empMonthly = c.employeeMonthlyAmount ?? c.grossAmount ?? 0;
        const emprMonthly = c.employerMonthlyAmount ?? 0;
        employeeWorkplaceAnnual += empMonthly * 12;
        employerWorkplaceAnnual += emprMonthly * 12;
        sourceDescription = sourceDescription
          ? `${sourceDescription} + ${c.name || 'Workplace Pension'} (£${Math.round(empMonthly)}/mo)`
          : `${c.name || 'Workplace Pension'} (£${Math.round(empMonthly)}/mo fixed)`;
      } else {
        const empPct = c.employeePercent ?? 5;
        const emprPct = c.employerPercent ?? 3;
        const empMonthly = (salary * (empPct / 100)) / 12;
        const emprMonthly = (salary * (emprPct / 100)) / 12;
        employeeWorkplaceAnnual += empMonthly * 12;
        employerWorkplaceAnnual += emprMonthly * 12;
        sourceDescription = sourceDescription
          ? `${sourceDescription} + ${c.name || 'Workplace Pension'} (${empPct}%)`
          : `${c.name || 'Workplace Pension'} (${empPct}% employee / ${emprPct}% employer)`;
      }
    });
  } else if (targetPots) {
    if (targetPots.workplacePensionMonthlyEmployeeType === 'percent') {
      const empPct = targetPots.workplacePensionMonthlyEmployee || 0;
      employeeWorkplaceAnnual = salary * (empPct / 100);
      sourceDescription = `Workplace Pension in Pots (${empPct}% employee)`;
    } else {
      const empMonthly = targetPots.workplacePensionMonthlyEmployee || 0;
      employeeWorkplaceAnnual = empMonthly * 12;
      sourceDescription = empMonthly > 0 ? `Workplace Pension in Pots (£${Math.round(empMonthly)}/mo)` : 'No active workplace contribution';
    }
    const emprPct = targetPots.employerMatchPercentage || 0;
    employerWorkplaceAnnual = salary * (emprPct / 100);
  }

  // Also calculate regular SIPP contributions for visibility
  let sippAnnual = 0;
  const sippRegular = activeContribs.filter(
    (c) => c.frequency === 'regular_monthly' && c.targetPot === 'sipp'
  );
  if (sippRegular.length > 0) {
    sippRegular.forEach((c) => {
      const raw = (c.grossAmount || 0) * 12;
      sippAnnual += c.sippContributionType === 'gross' ? raw : raw * 1.25;
    });
  } else if (targetPots && targetPots.sippMonthlyContribution) {
    sippAnnual = (targetPots.sippMonthlyContribution || 0) * 12 * 1.25;
  }

  employeeWorkplaceAnnual = Math.round(employeeWorkplaceAnnual);
  employerWorkplaceAnnual = Math.round(employerWorkplaceAnnual);
  sippAnnual = Math.round(sippAnnual);

  const employeePercentOfSalary =
    salary > 0 ? Math.round(((employeeWorkplaceAnnual / salary) * 100) * 10) / 10 : 0;
  const employerPercentOfSalary =
    salary > 0 ? Math.round(((employerWorkplaceAnnual / salary) * 100) * 10) / 10 : 0;

  return {
    employeeWorkplaceAnnual,
    employerWorkplaceAnnual,
    employeeWorkplaceMonthly: Math.round(employeeWorkplaceAnnual / 12),
    employerWorkplaceMonthly: Math.round(employerWorkplaceAnnual / 12),
    employeePercentOfSalary,
    employerPercentOfSalary,
    sippAnnual,
    totalPensionAnnual: employeeWorkplaceAnnual + employerWorkplaceAnnual + sippAnnual,
    hasWorkplaceContributions: employeeWorkplaceAnnual > 0,
    sourceDescription: sourceDescription || 'No workplace contributions configured',
  };
}
