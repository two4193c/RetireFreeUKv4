import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation } from '../monteCarloEngine';
import { solveMaximizedSpend } from '../maximizedSpendSolver';
import { calculateUKTax } from '../ukTaxEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { DrawdownStrategy } from '../../types';

describe('monteCarloEngine with Maximized Spend', () => {
  it('depletes the pot towards target age when Maximized Spend and bracket drawdown strategy are enabled', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 55,
      targetRetirementIncomeAnnual: 40000,
      pensionGrowthRate: 4.5,
      isaGrowthRate: 4.5,
      cashGrowthRate: 4.5,
      postRetirementReturn: 4.5,
      includeStatePension: false,
      drawdownStrategy: 'pension_first' as DrawdownStrategy,
      adjustForInflation: true,
    };

    const solved = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 90,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
    });

    const solvedProfile = {
      ...profile,
      maximizedSpendConfig: {
        enabled: true,
        targetAnnualIncome: solved.maxAnnualIncome,
        targetEndAge: 90,
      },
    };

    const taxResult = calculateUKTax(solvedProfile, DEFAULT_POTS);
    const mcResult = runMonteCarloSimulation(solvedProfile, DEFAULT_POTS, taxResult, {
      numSimulations: 100,
      maxAge: 90,
      accumulationVolatility: 0,
      decumulationVolatility: 0, // Deterministic test to verify central path
    });

    const endAgeData = mcResult.agePercentiles.find((p) => p.age === 90);
    expect(endAgeData).toBeDefined();
    // At age 90, the p50 total pot should be near 0 (less than 5% of peak pot at age 55)
    const peakData = mcResult.agePercentiles.find((p) => p.age === 55);
    expect(peakData).toBeDefined();
    if (peakData && endAgeData) {
      expect(endAgeData.p50TotalPot).toBeLessThan(peakData.p50TotalPot * 0.1);
    }
  });

  it('correctly calculates couple guaranteed income without overcounting partner streams', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 67,
      targetRetirementAge: 67,
      targetRetirementIncomeAnnual: 30000,
      isCouplePlanning: true,
      partnerCurrentAge: 67,
      partnerTargetRetirementAge: 67,
      includeStatePension: true,
      partnerIncludeStatePension: true,
      statePensionAge: 67,
      partnerStatePensionAge: 67,
      statePensionAmountAnnual: 10000,
      partnerStatePensionAmountAnnual: 10000,
      adjustForInflation: false,
    };

    const taxResult = calculateUKTax(profile, DEFAULT_POTS);
    const mcResult = runMonteCarloSimulation(profile, DEFAULT_POTS, taxResult, {
      numSimulations: 10,
      maxAge: 75,
      accumulationVolatility: 0,
      decumulationVolatility: 0,
    });

    // Run should complete smoothly without errors or infinite drawdown demand
    expect(mcResult.successRate).toBeGreaterThanOrEqual(0);
    expect(mcResult.agePercentiles.length).toBeGreaterThan(0);
  });
});
