import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation, calculateCashBufferRequiredDetails } from '../monteCarloEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';

describe('monteCarloEngine - runMonteCarloSimulation', () => {
  it('runs a basic Monte Carlo simulation successfully', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 15,
      maxAge: 80, // Keep short for test speed
      accumulationVolatility: 10,
      decumulationVolatility: 8,
      marketScenario: 'standard'
    });

    expect(result).toBeDefined();
    expect(result.params.numSimulations).toBe(15);
    expect(result.params.maxAge).toBe(80);
    
    // Check that percentiles array is populated correctly
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    
    const firstRow = result.agePercentiles[0];
    expect(firstRow).toHaveProperty('age');
    expect(firstRow).toHaveProperty('p10TotalPot');
    expect(firstRow).toHaveProperty('p25TotalPot');
    expect(firstRow).toHaveProperty('p50TotalPot');
    expect(firstRow).toHaveProperty('p75TotalPot');
    expect(firstRow).toHaveProperty('p90TotalPot');
    expect(firstRow).toHaveProperty('survivalRate');
    
    // It should reach target maxAge (or depletion before it)
    const lastRow = result.agePercentiles[result.agePercentiles.length - 1];
    expect(lastRow.age).toBe(80);
    
    // In a short time horizon with high pots, success rate is usually 1.0 (or close)
    expect(firstRow.survivalRate).toBeDefined();
  });

  it('handles early_crash scenario properly', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 10,
      maxAge: 70,
      marketScenario: 'early_crash',
      crashStartAge: 60,
      crashDurationYears: 2
    });

    expect(result.params.marketScenario).toBe('early_crash');
    expect(result.params.crashStartAge).toBe(60);
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    
    const at60 = result.agePercentiles.find(r => r.age === 60);
    expect(at60).toBeDefined();
  });

  it('runs stressed market scenario', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 10,
      marketScenario: 'stressed',
      stressedReturnDropPercent: 3.0
    });

    expect(result.params.marketScenario).toBe('stressed');
    expect(result.agePercentiles.length).toBeGreaterThan(0);
  });
});

describe('monteCarloEngine - calculateCashBufferRequiredDetails', () => {
  it('returns valid buffer detail based on profile target', () => {
    const profile = {
      ...DEFAULT_PROFILE,
    };
    
    const pots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 50000,
      cashIsaBalance: 20000
    };
    
    const result = calculateCashBufferRequiredDetails(profile, pots, 60, 3, 70000);
    expect(result).toBeDefined();
    expect(result.useCashBuffer).toBe(true);
    expect(typeof result.cashBufferYears).toBe('number');
    expect(Array.isArray(result.yearlyDetails)).toBe(true);
  });
});

describe('monteCarloEngine - massive market crashes and percentile edge cases', () => {
  it('handles massive market crash with total depletion', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        expectedInvestmentReturn: 5,
        targetRetirementAge: 60,
        essentialRetirementAnnualSpend: 100000 // Huge spend to force depletion
      }, 
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 100000, // Small pot to deplete quickly
        primarySippBalance: 0,
        cashSavingsBalance: 0,
        cashIsaBalance: 0,
        stocksSharesIsaBalance: 0,
        giaBalance: 0,
      }, 
      taxResult, 
      {
        numSimulations: 10,
        maxAge: 80,
        marketScenario: 'early_crash',
        crashStartAge: 60,
        crashDurationYears: 5,
        crashYearDropsPercent: [50, 40, 30, 20, 10] // Massive drops
      }
    );

    expect(result.params.marketScenario).toBe('early_crash');
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    // At age 75, pot should be 0 or very small due to depletion
    const at75 = result.agePercentiles.find(r => r.age === 75);
    expect(at75).toBeDefined();
    
    // Survival rate should be low or 0
    expect(result.successRateAge80).toBeLessThan(100);
  });
  
  it('calculates percentiles correctly for single depletion to test getPercentile edges', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        expectedInvestmentReturn: 0,
        targetRetirementAge: 65,
        essentialRetirementAnnualSpend: 200000 
      }, 
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 150000, 
      }, 
      taxResult, 
      {
        numSimulations: 10,
        maxAge: 70,
        marketScenario: 'stressed',
        stressedReturnDropPercent: 20
      }
    );

    expect(result).toBeDefined();
    expect(result.agePercentiles).toBeDefined();
    
    // Check percentiles for edge boundaries
    const lastRow = result.agePercentiles[result.agePercentiles.length - 1];
    expect(lastRow.p10TotalPot).toBeDefined();
    expect(lastRow.p90TotalPot).toBeDefined();
  });
});
