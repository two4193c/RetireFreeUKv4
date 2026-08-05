import { describe, it, expect } from 'vitest';
import { calculateTaxEfficientSavingsCrossover } from '../taxEfficientSavingsEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

describe('taxEfficientSavingsEngine', () => {
  it('calculates higher rate tax relief advantage for a higher-rate earner', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      protectedPensionAccessAge: 57,
      grossAnnualSalary: 85000, // Higher rate earner (40% tax + 2% NI salary sacrifice)
      pensionContributionMethod: 'salary_sacrifice' as const,
      taxRegion: 'england_ni_wales' as const,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);

    expect(result.currentMarginalTaxRate).toBe(40);
    // 40% tax + 2% NI = 42% upfront relief rate
    expect(result.pensionAdvantagePercent).toBeGreaterThan(25);
    expect(result.pensionAccessAge).toBe(57);
    expect(result.isaBridgeYears).toBe(0); // Retirement at 60 >= pension access age 57
    expect(result.crossoverAge).toBe(57); // Pension preferred until access age
  });

  it('detects ISA bridge necessity when retiring early before pension access age', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 52, // Retiring at 52 (5 years before pension access age 57)
      protectedPensionAccessAge: 57,
      targetRetirementIncomeAnnual: 40000,
      grossAnnualSalary: 70000,
      pensionContributionMethod: 'salary_sacrifice' as const,
    };

    const emptyIsaPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 10000,
      cashIsaBalance: 0,
      cashSavingsBalance: 5000,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, emptyIsaPots);

    expect(result.isaBridgeYears).toBe(5); // 57 - 52 = 5 years
    expect(result.isaBridgeRequiredTotal).toBe(200000); // 40,000 * 5 = 200,000
    expect(result.isaBridgeDeficit).toBeGreaterThan(150000);
    expect(result.crossoverAge).toBeLessThan(52); // Must start ISA bridge savings early
    expect(result.recommendedMonthlySplit.isaPercent).toBeGreaterThanOrEqual(40);
  });

  it('handles basic rate earners with relief at source correctly', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 35,
      targetRetirementAge: 65,
      protectedPensionAccessAge: 57,
      grossAnnualSalary: 35000, // Basic rate earner (20% tax)
      pensionContributionMethod: 'relief_at_source' as const,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);

    expect(result.currentMarginalTaxRate).toBe(20);
    expect(result.isaBridgeYears).toBe(0);
    expect(result.ageBreakdowns.length).toBeGreaterThan(30);
  });
});
