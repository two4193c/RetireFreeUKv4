import { describe, it, expect } from 'vitest';
import { solveContributionIncrease } from '../contributionSolver';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

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
});
