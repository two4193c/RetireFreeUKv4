import { UserProfile, InvestmentPots, YearProjection } from '../types';
import {
  PERSONAL_ALLOWANCE,
  RUK_BASIC_THRESHOLD,
  RUK_HIGHER_RATE,
  RUK_ADDITIONAL_THRESHOLD,
  SCOT_STARTER_THRESHOLD,
  SCOT_BASIC_THRESHOLD,
  SCOT_INTERMEDIATE_THRESHOLD,
  SCOT_HIGHER_THRESHOLD,
  SCOT_ADVANCED_THRESHOLD,
  LSA_STANDARD_LIMIT,
} from '../config/ukTaxRates';
import { computeIncomeTaxOnAmount } from './ukTaxEngine';

export interface AgeSavingsBreakdown {
  age: number;
  year: number;
  pensionNetReturnRatio: number; // e.g. 1.417 (£1.417 net value per £1 net cost)
  isaNetReturnRatio: number; // 1.000 (£1.000 net value per £1 net cost)
  taxReliefPercent: number; // Upfront relief %
  retirementTaxPercent: number; // Effective drawdown tax %
  isPrePensionAccess: boolean; // True if age < pensionAccessAge
  isRetirementPhase: boolean; // True if age >= targetRetirementAge
  isaBridgeNeededAnnual?: number;
  recommendedFocus: 'pension' | 'isa' | 'balanced' | 'drawdown';
  reason: string;
}

export interface TaxEfficientSavingsCrossoverResult {
  currentMarginalTaxRate: number; // e.g. 40
  contributionMethod: string;
  pensionAccessAge: number;
  targetRetirementAge: number;
  crossoverAge: number | null; // Age at which ISA savings become more beneficial or necessary
  crossoverReason: string;
  pensionAdvantagePercent: number; // Net percentage bonus of pension over ISA (e.g. +41.7%)
  isaBridgeYears: number; // Number of early retirement years before pension access
  isaBridgeRequiredTotal: number; // Total ISA fund needed at retirement age for bridge
  isaBridgeProjectedAtRetirement: number; // Projected ISA pot at retirement age
  isaBridgeDeficit: number; // Shortfall in ISA bridge pot
  recommendedMonthlySplit: {
    pensionPercent: number;
    isaPercent: number;
  };
  ageBreakdowns: AgeSavingsBreakdown[];
}

/**
 * Calculates the age at which tax-efficient savings (ISA vs Pension) become more beneficial
 * based on contribution tax relief, decumulation tax rates, LSA limits, and early retirement ISA bridge needs.
 */
export function calculateTaxEfficientSavingsCrossover(
  profile: UserProfile,
  pots: InvestmentPots,
  projections?: YearProjection[]
): TaxEfficientSavingsCrossoverResult {
  const currentAge = profile.currentAge || 45;
  const targetRetirementAge = profile.targetRetirementAge || 60;
  const pensionAccessAge = profile.protectedPensionAccessAge || (targetRetirementAge >= 57 ? 57 : 57);
  const isScottish = profile.taxRegion === 'scotland';
  const salary = profile.grossAnnualSalary || 0;
  const method = profile.pensionContributionMethod || 'salary_sacrifice';

  // 1. Calculate Upfront Contribution Relief & Net Cost
  let contributionMarginalTaxRate = 0;
  let niSavingsRate = 0;

  if (isScottish) {
    if (salary > SCOT_ADVANCED_THRESHOLD) {
      contributionMarginalTaxRate = 0.48;
    } else if (salary > SCOT_HIGHER_THRESHOLD) {
      contributionMarginalTaxRate = 0.42;
    } else if (salary > SCOT_INTERMEDIATE_THRESHOLD) {
      contributionMarginalTaxRate = 0.21;
    } else if (salary > SCOT_BASIC_THRESHOLD) {
      contributionMarginalTaxRate = 0.20;
    } else if (salary > SCOT_STARTER_THRESHOLD) {
      contributionMarginalTaxRate = 0.19;
    } else {
      contributionMarginalTaxRate = 0.0;
    }
  } else {
    if (salary > RUK_ADDITIONAL_THRESHOLD) {
      contributionMarginalTaxRate = 0.45;
    } else if (salary > RUK_BASIC_THRESHOLD) {
      contributionMarginalTaxRate = 0.40;
    } else if (salary > PERSONAL_ALLOWANCE) {
      contributionMarginalTaxRate = 0.20;
    } else {
      contributionMarginalTaxRate = 0.0;
    }
  }

  // NI Savings under Salary Sacrifice
  if (method === 'salary_sacrifice') {
    if (salary > RUK_BASIC_THRESHOLD) {
      niSavingsRate = 0.02; // 2% NI above higher rate threshold
    } else if (salary > PERSONAL_ALLOWANCE) {
      niSavingsRate = 0.08; // 8% NI basic rate
    }
  }

  const totalUpfrontReliefRate = Math.min(0.60, contributionMarginalTaxRate + niSavingsRate);

  // For £1,000 net take-home salary invested:
  // Net cost of ISA = £1,000 net. Gross into ISA = £1,000.
  // Net cost of Pension = £1,000 net. Gross into Pension = £1,000 / (1 - totalUpfrontReliefRate)
  const pensionGrossPer1000NetCost = totalUpfrontReliefRate > 0
    ? 1000 / (1 - totalUpfrontReliefRate)
    : 1000;

  // 2. Estimate Decumulation Drawdown Tax Rate
  // Look at projections near retirement age to estimate marginal tax rate on pension drawdown
  let retirementMarginalTaxRate = 0.20; // Default basic rate
  if (projections && projections.length > 0) {
    const retProj = projections.find((p) => p.age === targetRetirementAge) || projections[0];
    const totalStateAndFixed = (retProj.statePensionReceived || 0) + (retProj.pensionDrawdown || 0);
    const taxInfo = computeIncomeTaxOnAmount(totalStateAndFixed, isScottish, profile.customTaxBands);
    retirementMarginalTaxRate = taxInfo.marginalRate / 100;
  }

  // Pension Decumulation Tax: 25% PCLS tax-free, 75% taxable at retirementMarginalTaxRate
  const pclsPercent = (profile.pclsLumpSumPercent ?? 25) / 100;
  const taxablePercent = 1 - pclsPercent;
  const effectiveRetirementTaxRate = taxablePercent * retirementMarginalTaxRate;

  // Pension Net Value at retirement per £1,000 Net Cost = Pension Gross * (1 - Effective Retirement Tax Rate)
  const pensionNetValueAtRetirement = pensionGrossPer1000NetCost * (1 - effectiveRetirementTaxRate);
  const pensionNetReturnRatio = pensionNetValueAtRetirement / 1000; // e.g. 1.417 (£1.417 per £1 net cost)
  const isaNetReturnRatio = 1.000; // Always 1.000 (£1.000 net per £1 net cost)

  const pensionAdvantagePercent = Math.round((pensionNetReturnRatio - 1) * 100 * 10) / 10;

  // 3. Early Retirement ISA Bridge Calculation
  const isaBridgeYears = Math.max(0, pensionAccessAge - targetRetirementAge);
  let isaBridgeRequiredTotal = 0;
  let isaBridgeProjectedAtRetirement = 0;
  let isaBridgeDeficit = 0;

  if (isaBridgeYears > 0) {
    const annualReq = profile.targetRetirementIncomeAnnual || 30000;
    isaBridgeRequiredTotal = annualReq * isaBridgeYears;

    if (projections && projections.length > 0) {
      const retProj = projections.find((p) => p.age === targetRetirementAge);
      if (retProj) {
        isaBridgeProjectedAtRetirement = (retProj.primaryIsaPot || 0) + (retProj.partnerIsaPot || 0) + (retProj.primaryCashGiaPot || 0);
      }
    } else {
      isaBridgeProjectedAtRetirement = (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.cashSavingsBalance || 0);
    }

    isaBridgeDeficit = Math.max(0, isaBridgeRequiredTotal - isaBridgeProjectedAtRetirement);
  }

  // 4. Determine Crossover Age and Reason
  let crossoverAge: number | null = null;
  let crossoverReason = '';

  const yearsToRetire = Math.max(0, targetRetirementAge - currentAge);

  if (isaBridgeYears > 0 && isaBridgeDeficit > 0) {
    // Need ISA savings to bridge early retirement gap
    const annualSavingsCapacity = 10000; // Default estimate
    const yearsNeededForBridge = Math.min(yearsToRetire, Math.ceil(isaBridgeDeficit / annualSavingsCapacity));
    crossoverAge = Math.max(currentAge, targetRetirementAge - yearsNeededForBridge);
    crossoverReason = `At Age ${crossoverAge}, ISA contributions become essential to build a £${Math.round(isaBridgeDeficit).toLocaleString()} ISA bridge for early retirement between Age ${targetRetirementAge} and Pension Access Age ${pensionAccessAge}.`;
  } else if (pensionNetReturnRatio <= 1.05) {
    // Pension and ISA have nearly identical tax efficiency (e.g. basic rate contributor drawing in basic rate without salary sacrifice)
    crossoverAge = currentAge;
    crossoverReason = `At Age ${currentAge}, Pension upfront relief matches future drawdown tax. ISA is recommended for higher liquidity and zero withdrawal tax.`;
  } else {
    // Pension is strictly more beneficial until pension access age
    crossoverAge = pensionAccessAge;
    crossoverReason = `Pension savings remain ${pensionAdvantagePercent}% more tax-efficient than ISA from Age ${currentAge} up to Pension Access Age ${pensionAccessAge} due to ${Math.round(totalUpfrontReliefRate * 100)}% upfront tax relief.`;
  }

  // 5. Recommended Monthly Contribution Split
  let recommendedPensionPercent = 80;
  let recommendedIsaPercent = 20;

  if (isaBridgeYears > 0 && isaBridgeDeficit > 0) {
    const urgencyRatio = isaBridgeDeficit / Math.max(1, isaBridgeRequiredTotal);
    if (urgencyRatio > 0.5) {
      recommendedIsaPercent = 60;
      recommendedPensionPercent = 40;
    } else {
      recommendedIsaPercent = 40;
      recommendedPensionPercent = 60;
    }
  } else if (pensionAdvantagePercent >= 30) {
    recommendedPensionPercent = 85;
    recommendedIsaPercent = 15;
  } else if (pensionAdvantagePercent <= 5) {
    recommendedPensionPercent = 50;
    recommendedIsaPercent = 50;
  }

  // 6. Generate Age-by-Age Breakdown Array (from currentAge to age 75 or maxAge)
  const ageBreakdowns: AgeSavingsBreakdown[] = [];
  const maxAge = Math.max(75, targetRetirementAge + 10);
  const currentYear = new Date().getFullYear();

  for (let age = currentAge; age <= maxAge; age++) {
    const year = currentYear + (age - currentAge);
    const isPrePensionAccess = age < pensionAccessAge;
    const isRetirementPhase = age >= targetRetirementAge;

    let focus: 'pension' | 'isa' | 'balanced' | 'drawdown' = 'pension';
    let reason = '';

    if (isRetirementPhase) {
      focus = 'drawdown';
      reason = `Decumulation phase: Draw down tax-free PCLS & ISA first, then pension flexi-drawdown.`;
    } else if (crossoverAge !== null && age >= crossoverAge && isPrePensionAccess) {
      focus = 'isa';
      reason = `Priority to ISA for early retirement liquidity prior to pension access at Age ${pensionAccessAge}.`;
    } else if (pensionAdvantagePercent > 10) {
      focus = 'pension';
      reason = `Pension is ${pensionAdvantagePercent}% more tax-efficient (${Math.round(totalUpfrontReliefRate * 100)}% tax relief).`;
    } else {
      focus = 'balanced';
      reason = `Balanced split: Utilize both Pension upfront relief and ISA liquidity.`;
    }

    ageBreakdowns.push({
      age,
      year,
      pensionNetReturnRatio,
      isaNetReturnRatio,
      taxReliefPercent: Math.round(totalUpfrontReliefRate * 100),
      retirementTaxPercent: Math.round(effectiveRetirementTaxRate * 100),
      isPrePensionAccess,
      isRetirementPhase,
      isaBridgeNeededAnnual: isRetirementPhase && isPrePensionAccess ? (profile.targetRetirementIncomeAnnual || 30000) : 0,
      recommendedFocus: focus,
      reason,
    });
  }

  return {
    currentMarginalTaxRate: Math.round(contributionMarginalTaxRate * 100),
    contributionMethod: method,
    pensionAccessAge,
    targetRetirementAge,
    crossoverAge,
    crossoverReason,
    pensionAdvantagePercent,
    isaBridgeYears,
    isaBridgeRequiredTotal: Math.round(isaBridgeRequiredTotal),
    isaBridgeProjectedAtRetirement: Math.round(isaBridgeProjectedAtRetirement),
    isaBridgeDeficit: Math.round(isaBridgeDeficit),
    recommendedMonthlySplit: {
      pensionPercent: recommendedPensionPercent,
      isaPercent: recommendedIsaPercent,
    },
    ageBreakdowns,
  };
}
