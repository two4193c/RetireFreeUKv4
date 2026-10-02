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
  const baseProjections = generateProjections(profile, activePots, baseTax);

  const primaryLe = profile.lifeExpectancyAge || 90;
  const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
  const partnerLePrimaryAge = (profile.partnerLifeExpectancyAge || 95) - partnerAgeDiff;
  const maxPlanAge = profile.isCouplePlanning ? Math.max(primaryLe, partnerLePrimaryAge) : primaryLe;

  const baseRetiredYears = baseProjections.filter((p) => p.isRetired && p.age <= maxPlanAge);
  const baseShortfalls = baseRetiredYears.filter((p) => (p.incomeShortfall || 0) > 25);

  // If there are no deficits within the client's lifetime, no contribution increase is needed
  if (baseShortfalls.length === 0) {
    return {
      canContribute: true,
      hasSolution: false,
      workingYearsRemaining,
      sippSolution: null,
      isaSolution: null,
      workplaceSolution: null,
      bestSolution: null,
    };
  }

  const marginalTaxRate = (baseTax.marginalTaxRate ?? 20) / 100;
  const isSalarySacrifice = profile.pensionContributionMethod === 'salary_sacrifice';
  const grossSalary = profile.grossAnnualSalary || 0;
  // NI savings rate: 0 below Primary Threshold (£12,570), 2% above Upper Earnings Limit (£50,270), 8% between PT and UEL
  const niSavingsRate = grossSalary <= 12570 ? 0 : grossSalary > 50270 ? 0.02 : 0.08;
  const salarySacrificeReliefRate = marginalTaxRate + niSavingsRate;
  // Whether the user has a salary / employer to contribute to workplace pension
  const hasWorkplaceSalary = grossSalary > 0;
  const baseWorkplaceMonthly = activePots.workplacePensionMonthlyEmployeeType === 'percent'
    ? (grossSalary * ((activePots.workplacePensionMonthlyEmployee || 0) / 100)) / 12
    : (activePots.workplacePensionMonthlyEmployee || 0);

  // ISA limit headroom calculation:
  // baseTax.isaAllowanceRemaining is the remaining ISA allowance for the current tax year.
  // We only allow monthly contributions up to remaining ISA allowance / 12 so that contributions
  // never exceed the ISA limit and never spill over into cash/GIA.
  const remainingIsaAnnual = Math.max(0, baseTax.isaAllowanceRemaining ?? 0);
  const maxMonthlyIsaIncrease = Math.floor(remainingIsaAnnual / 12);
  const canContributeIsa = maxMonthlyIsaIncrease >= 1;

  function runBisection(potType: 'sipp' | 'isa' | 'workplace'): ContributionSolution | null {
    if (potType === 'isa' && !canContributeIsa) {
      return null;
    }

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
        workplacePensionMonthlyEmployee: potType === 'workplace' ? baseWorkplaceMonthly + mid : activePots.workplacePensionMonthlyEmployee,
        workplacePensionMonthlyEmployeeType: potType === 'workplace' ? 'fixed' : activePots.workplacePensionMonthlyEmployeeType,
      };

      const candTax = calculateUKTax(profile, testPots);
      const candProjections = generateProjections(profile, testPots, candTax);

      // Check whether any retired year has an income shortfall > £25 (ignoring integer rounding noise)
      const retiredYears = candProjections.filter((p) => p.isRetired && p.age <= maxPlanAge);
      const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 25);

      if (shortfalls.length === 0) {
        bestMid = mid;
        bestProjections = candProjections;
        high = mid; // Try smaller contribution
      } else {
        low = mid; // Need more contribution
      }
    }

    let monthlyGross: number;
    let isSuccessful = true;
    let deficitEliminatedPct = 100;

    if (potType === 'isa') {
      if (bestMid !== null && bestMid <= maxMonthlyIsaIncrease && bestMid > 0.01) {
        monthlyGross = Math.max(1, Math.ceil(bestMid));
        isSuccessful = true;
        deficitEliminatedPct = 100;
      } else {
        // Deficit requires more than remaining ISA allowance, so contribute up to the ISA limit
        monthlyGross = maxMonthlyIsaIncrease;
        const maxIsaPots: InvestmentPots = {
          ...activePots,
          stocksAndSharesIsaMonthlyContribution: (activePots.stocksAndSharesIsaMonthlyContribution || 0) + monthlyGross,
        };
        const maxIsaTax = calculateUKTax(profile, maxIsaPots);
        bestProjections = generateProjections(profile, maxIsaPots, maxIsaTax);
        const initDeficit = baseShortfalls.reduce((sum, p) => sum + (p.incomeShortfall || 0), 0);
        const newDeficit = bestProjections
          .filter((p) => p.isRetired && p.age <= maxPlanAge)
          .reduce((sum, p) => sum + (p.incomeShortfall || 0), 0);
        deficitEliminatedPct = initDeficit > 0
          ? Math.max(1, Math.min(100, Math.round(((initDeficit - newDeficit) / initDeficit) * 100)))
          : 100;
        isSuccessful = deficitEliminatedPct >= 100;
      }
    } else {
      if (bestMid === null || bestMid <= 0.01) return null;
      monthlyGross = Math.max(1, Math.ceil(bestMid));
      isSuccessful = true;
      deficitEliminatedPct = 100;
    }

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
      isSuccessful,
      projectedRetirementPot: retirementPot,
      deficitEliminatedPct,
    };
  }

  const sippSolution = runBisection('sipp');
  const isaSolution = canContributeIsa ? runBisection('isa') : null;
  // Only run workplace bisection if user has a salary / employer relationship
  const workplaceSolution = hasWorkplaceSalary ? runBisection('workplace') : null;

  // Select best solution: prioritize fully successful solutions (100% eliminated), picking lowest net cost
  const options = [workplaceSolution, sippSolution, isaSolution].filter(Boolean) as ContributionSolution[];
  const fullySuccessfulOptions = options.filter((o) => o.isSuccessful);
  const bestSolution = fullySuccessfulOptions.length > 0
    ? fullySuccessfulOptions.reduce((a, b) => a.monthlyNetCost <= b.monthlyNetCost ? a : b)
    : (options.length > 0 ? options[0] : null);

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
