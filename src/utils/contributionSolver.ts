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
  /** The net equivalent to store in pots (for SIPP: gross/1.25, i.e. what the pot field expects) */
  monthlyPotFieldValue: number;
  workingYearsRemaining: number;
  isSuccessful: boolean;
  projectedRetirementPot: number;
  deficitEliminatedPct: number;
}

export interface ContributionAnalysisResult {
  canContribute: boolean;
  /** True only when at least one bisection found a feasible solution within the £25k/mo ceiling */
  hasSolution: boolean;
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
      hasSolution: false,
      workingYearsRemaining: 0,
      sippSolution: null,
      isaSolution: null,
      workplaceSolution: null,
      bestSolution: null,
    };
  }

  // Calculate user's upfront tax relief rates
  const baseTax = calculateUKTax(profile, activePots);
  const marginalTaxRate = (baseTax.marginalTaxRate ?? 20) / 100;
  const isSalarySacrifice = profile.pensionContributionMethod === 'salary_sacrifice';
  // NI savings rate: 0 if no income, 2% above higher-rate threshold, 8% basic rate band
  const niSavingsRate = marginalTaxRate <= 0 ? 0 : marginalTaxRate >= 0.40 ? 0.02 : 0.08;
  const salarySacrificeReliefRate = marginalTaxRate + niSavingsRate;
  // Whether the user has a salary / employer to contribute to workplace pension
  const hasWorkplaceSalary = (profile.grossAnnualSalary || 0) > 0;

  function runBisection(potType: 'sipp' | 'isa' | 'workplace'): ContributionSolution | null {
    let low = 0;
    let high = 25000; // Search ceiling up to £25k/month
    let bestMid: number | null = null;
    let bestProjections: YearProjection[] | null = null;

    // 18 binary search iterations provides < £0.10 precision
    for (let iter = 0; iter < 18; iter++) {
      const mid = (low + high) / 2;
      // IMPORTANT: pots.sippMonthlyContribution is treated as NET (out-of-pocket) by the tax engine,
      // which multiplies by 1.25 to get the gross going into the SIPP (relief at source).
      // The bisection `mid` represents a GROSS monthly contribution, so we convert to net (÷1.25)
      // before storing in the pot field so the engine produces the correct gross in projection.
      const sippNetDelta = potType === 'sipp' ? mid / 1.25 : 0;
      const testPots: InvestmentPots = {
        ...activePots,
        sippMonthlyContribution: potType === 'sipp' ? (activePots.sippMonthlyContribution || 0) + sippNetDelta : activePots.sippMonthlyContribution,
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

    // monthlyPotFieldValue: the value to WRITE into the pots field to produce this gross.
    // For SIPP: the pot field is net (out-of-pocket); engine multiplies by 1.25 → gross/1.25 = net.
    // For ISA and Workplace: the pot field IS the gross amount.
    const monthlyPotFieldValue = potType === 'sipp'
      ? Math.round(monthlyGross / 1.25)
      : monthlyGross;

    // Projected retirement pot at target retirement age
    const retObj = bestProjections?.find((p) => p.age === retAge);
    const offset = retAge - currentAge;
    // Use ?? not || so that 0% inflation is respected
    const inflFactor = Math.pow(1 + (profile.expectedInflationRate ?? 2.5) / 100, offset);
    const scale = adjustInflation ? 1 / inflFactor : 1;
    const retirementPot = Math.round((retObj?.totalPot || 0) * scale);

    const workplaceLabel = isSalarySacrifice
      ? 'Workplace Pension (Salary Sacrifice)'
      : 'Workplace Pension';

    return {
      potType,
      potLabel: potType === 'sipp'
        ? 'SIPP / Personal Pension'
        : potType === 'workplace'
        ? workplaceLabel
        : 'Stocks & Shares ISA',
      monthlyGross,
      monthlyNetCost,
      monthlyPotFieldValue,
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
  // Only run workplace bisection if user has a salary / employer relationship
  const workplaceSolution = hasWorkplaceSalary ? runBisection('workplace') : null;

  // Select best solution: pick the option with the lowest net monthly cost to the user
  const options = [workplaceSolution, sippSolution, isaSolution].filter(Boolean) as ContributionSolution[];
  const bestSolution = options.length > 0
    ? options.reduce((a, b) => a.monthlyNetCost <= b.monthlyNetCost ? a : b)
    : null;

  const hasSolution = bestSolution !== null;

  return {
    canContribute: true,
    hasSolution,
    workingYearsRemaining,
    sippSolution,
    isaSolution,
    workplaceSolution,
    bestSolution,
  };
}
