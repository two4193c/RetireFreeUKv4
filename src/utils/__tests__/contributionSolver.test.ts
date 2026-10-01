import { describe, it, expect } from 'vitest';
import { solveContributionIncrease } from '../contributionSolver';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';
import { generateProjections } from '../projectionEngine';

describe('solveContributionIncrease', () => {
  it('returns canContribute false if current age >= target retirement age', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 65,
      targetRetirementAge: 60,
    };
    const res = solveContributionIncrease(profile, DEFAULT_POTS, true);
    expect(res.canContribute).toBe(false);
    expect(res.hasSolution).toBe(false);
    expect(res.workingYearsRemaining).toBe(0);
    expect(res.bestSolution).toBeNull();
  });

  it('calculates required monthly contributions for an underfunded retirement plan', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 50000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 60000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 10000,
      sippBalance: 5000,
      stocksAndSharesIsaBalance: 10000,
      cashSavingsBalance: 5000,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.canContribute).toBe(true);
    expect(res.hasSolution).toBe(true);
    expect(res.workingYearsRemaining).toBe(20);
    expect(res.bestSolution).not.toBeNull();
    expect(res.bestSolution?.isSuccessful).toBe(true);
    expect(res.bestSolution?.monthlyGross).toBeGreaterThan(0);
    expect(res.bestSolution?.monthlyNetCost).toBeLessThanOrEqual(res.bestSolution!.monthlyGross);
    // monthlyPotFieldValue must exist on all solutions
    expect(res.bestSolution?.monthlyPotFieldValue).toBeGreaterThan(0);
    // For SIPP: potFieldValue must equal gross/1.25 (net equivalent)
    if (res.sippSolution) {
      const expectedNet = Math.round(res.sippSolution.monthlyGross / 1.25);
      expect(res.sippSolution.monthlyPotFieldValue).toBe(expectedNet);
    }
    // For ISA / Workplace: potFieldValue equals monthlyGross
    if (res.isaSolution) {
      expect(res.isaSolution.monthlyPotFieldValue).toBe(res.isaSolution.monthlyGross);
    }
    if (res.workplaceSolution) {
      expect(res.workplaceSolution.monthlyPotFieldValue).toBe(res.workplaceSolution.monthlyGross);
    }
  });

  it('solves for ISA increase when user already has monthly ISA contribution in pots', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 50000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaMonthlyContribution: 300,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.isaSolution).not.toBeNull();
  });

  it('tests what happens when deficit is large so ISA contribution exceeds £20k annual limit', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 55, // only 5 working years
      targetRetirementIncomeAnnual: 40000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 60000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 20000,
      stocksAndSharesIsaMonthlyContribution: 500,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.hasSolution).toBe(true);
    expect(res.isaSolution).not.toBeNull();
  });

  it('solves for ISA increase when user already has monthly ISA contribution in profile.oneOffContributions', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 50000,
      oneOffContributions: [
        {
          id: 'isa_reg_1',
          name: 'Monthly S&S ISA',
          owner: 'primary',
          targetPot: 'stocks_and_shares_isa',
          frequency: 'regular_monthly',
          grossAmount: 300,
          startAge: 40,
          endAge: 60,
          enabled: true,
        },
      ],
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaMonthlyContribution: 0,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.isaSolution).not.toBeNull();
    expect(res.isaSolution?.monthlyGross).toBeGreaterThan(0);
    expect(res.isaSolution?.monthlyPotFieldValue).toBe(res.isaSolution!.monthlyGross);
    expect(res.isaSolution?.isSuccessful).toBe(true);

    // Verify applying the solved ISA amount eliminates all shortfalls
    const updatedPots: InvestmentPots = {
      ...pots,
      stocksAndSharesIsaMonthlyContribution: (pots.stocksAndSharesIsaMonthlyContribution || 0) + res.isaSolution!.monthlyPotFieldValue,
    };
    const candTax = calculateUKTax(profile, updatedPots);
    const candProj = generateProjections(profile, updatedPots, candTax);
    const retiredYears = candProj.filter((p) => p.isRetired && p.age <= (profile.lifeExpectancyAge || 85));
    const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 25);
    expect(shortfalls.length).toBe(0);
  });
});
