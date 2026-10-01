import { UserProfile, InvestmentPots, YearProjection } from '../types';
import { generateProjections } from './projectionEngine';
import { calculateUKTax } from './ukTaxEngine';

export interface ContributionSolution {
  potType: 'sipp' | 'isa' | 'workplace';
  potLabel: string;
  monthlyGross: number;
  monthlyNetCost: number;
  annualGross: number;
  annualNetCost: number;
  taxReliefRate: number; // e.g. 0.20 or 0.40
  monthlyTaxRelief: number; // e.g. monthlyGross * taxReliefRate
  workingYearsRemaining: number;
  isSuccessful: boolean;
  projectedRetirementPot: number;
  deficitEliminatedPct: number;
}

export interface ContributionAnalysisResult {
  canContribute: boolean;
  workingYearsRemaining: number;
  sippSolution: ContributionSolution | null;
  isaSolution: ContributionSolution | null;
  workplaceSolution: ContributionSolution | null;
  bestSolution: ContributionSolution | null;
}

/**
 * Solves for the minimal monthly contribution increase needed between current age
 * and target retirement age to eliminate retirement income deficits and achieve 100% plan success.
 */
export function solveContributionIncrease(
  profile: UserProfile,
  pots?: InvestmentPots,
  adjustInflation: boolean = true
): ContributionAnalysisResult {
  const currentAge = profile.currentAge || 35;
  const retAge = profile.targetRetirementAge || 60;
  const workingYearsRemaining = Math.max(0, retAge - currentAge);
  const activePots = pots || ({} as InvestmentPots);

  if (workingYearsRemaining <= 0) {
    return {
      canContribute: false,
      workingYearsRemaining: 0,
      sippSolution: null,
      isaSolution: null,
      workplaceSolution: null,
      bestSolution: null,
    };
  }

  // Calculate user's upfront tax relief rates
  const baseTax = calculateUKTax(profile, activePots);
  const marginalTaxRate = (baseTax.marginalTaxRate || 20) / 100;
  const isSalarySacrifice = profile.pensionContributionMethod === 'salary_sacrifice';
  const niSavingsRate = marginalTaxRate >= 0.40 ? 0.02 : 0.08;
  const salarySacrificeReliefRate = marginalTaxRate + niSavingsRate;

  function runBisection(potType: 'sipp' | 'isa' | 'workplace'): ContributionSolution | null {
    let low = 0;
    let high = 25000; // Search ceiling up to £25k/month
    let bestMid: number | null = null;
    let bestProjections: YearProjection[] | null = null;

    // 18 binary search iterations provides < £0.10 precision
    for (let iter = 0; iter < 18; iter++) {
      const mid = (low + high) / 2;
      const testPots: InvestmentPots = {
        ...activePots,
        sippMonthlyContribution: potType === 'sipp' ? (activePots.sippMonthlyContribution || 0) + mid : activePots.sippMonthlyContribution,
        stocksAndSharesIsaMonthlyContribution: potType === 'isa' ? (activePots.stocksAndSharesIsaMonthlyContribution || 0) + mid : activePots.stocksAndSharesIsaMonthlyContribution,
        workplacePensionMonthlyEmployee: potType === 'workplace' ? (activePots.workplacePensionMonthlyEmployee || 0) + mid : activePots.workplacePensionMonthlyEmployee,
        workplacePensionMonthlyEmployeeType: potType === 'workplace' ? 'fixed' : activePots.workplacePensionMonthlyEmployeeType,
      };

      const candTax = calculateUKTax(profile, testPots);
      const candProjections = generateProjections(profile, testPots, candTax);

      // Check whether any retired year has an income shortfall > £25 (ignoring integer rounding noise)
      const retiredYears = candProjections.filter((p) => p.isRetired && p.age <= (profile.lifeExpectancyAge || 90));
      const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 25);

      if (shortfalls.length === 0) {
        bestMid = mid;
        bestProjections = candProjections;
        high = mid; // Try smaller contribution
      } else {
        low = mid; // Need more contribution
      }
    }

    if (bestMid === null) return null;

    const monthlyGross = Math.max(1, Math.ceil(bestMid));
    const effectiveReliefRate = potType === 'isa'
      ? 0
      : (potType === 'workplace' && isSalarySacrifice ? salarySacrificeReliefRate : marginalTaxRate);

    const monthlyNetCost = Math.round(monthlyGross * (1 - effectiveReliefRate));
    const annualGross = monthlyGross * 12;
    const annualNetCost = monthlyNetCost * 12;
    const monthlyTaxRelief = monthlyGross - monthlyNetCost;

    // Projected retirement pot at target retirement age
    const retObj = bestProjections?.find((p) => p.age === retAge);
    const offset = retAge - currentAge;
    const inflFactor = Math.pow(1 + (profile.expectedInflationRate || 2.5) / 100, offset);
    const scale = adjustInflation ? 1 / inflFactor : 1;
    const retirementPot = Math.round((retObj?.totalPot || 0) * scale);

    return {
      potType,
      potLabel: potType === 'sipp'
        ? 'SIPP / Personal Pension'
        : potType === 'workplace'
        ? 'Workplace Pension (Salary Sacrifice)'
        : 'Stocks & Shares ISA',
      monthlyGross,
      monthlyNetCost,
      annualGross,
      annualNetCost,
      taxReliefRate: effectiveReliefRate,
      monthlyTaxRelief,
      workingYearsRemaining,
      isSuccessful: true,
      projectedRetirementPot: retirementPot,
      deficitEliminatedPct: 100,
    };
  }

  const sippSolution = runBisection('sipp');
  const isaSolution = runBisection('isa');
  const workplaceSolution = runBisection('workplace');

  // Select best solution: prefer workplace or sipp if available due to tax relief, or isa
  const bestSolution = workplaceSolution || sippSolution || isaSolution;

  return {
    canContribute: true,
    workingYearsRemaining,
    sippSolution,
    isaSolution,
    workplaceSolution,
    bestSolution,
  };
}
