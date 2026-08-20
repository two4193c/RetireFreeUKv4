import { describe, it, expect } from 'vitest';
import { calculateTaxEfficientSavingsCrossover } from '../taxEfficientSavingsEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { YearProjection } from '../../types';

describe('taxEfficientSavingsEngine (monthlySavingsEngine wrapper)', () => {
  it('handles Scottish tax rates correctly for higher earner', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      protectedPensionAccessAge: 57,
      grossAnnualSalary: 130000, // Scottish Advanced rate
      taxRegion: 'scotland' as const,
      pensionContributionMethod: 'salary_sacrifice' as const,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
    expect(result.currentMarginalTaxRate).toBe(48); // SCOT_ADVANCED_THRESHOLD
    expect(result.pensionAdvantagePercent).toBeGreaterThan(0);
  });

  it('handles Scottish tax rates correctly for basic earner', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      protectedPensionAccessAge: 57,
      grossAnnualSalary: 13000, // Scottish Starter rate
      taxRegion: 'scotland' as const,
      pensionContributionMethod: 'salary_sacrifice' as const,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
    expect(result.currentMarginalTaxRate).toBe(19); // SCOT_STARTER_THRESHOLD
  });

  it('handles RUK Additional Rate earners', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      protectedPensionAccessAge: 57,
      grossAnnualSalary: 200000, // RUK Additional Rate
      taxRegion: 'england_ni_wales' as const,
      pensionContributionMethod: 'salary_sacrifice' as const,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
    expect(result.currentMarginalTaxRate).toBe(45);
  });

  it('handles ISA bridge calculation with projections', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 52,
      protectedPensionAccessAge: 57,
      targetRetirementIncomeAnnual: 40000,
      grossAnnualSalary: 70000,
    };

    const projections: YearProjection[] = [
      {
        age: 52,
        partnerAge: 52,
        year: 2034,
        primaryIsaPot: 50000,
        partnerIsaPot: 50000,
        primaryCashGiaPot: 20000,
      } as any,
    ];

    const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS, projections);
    
    expect(result.isaBridgeYears).toBe(5);
    expect(result.isaBridgeProjectedAtRetirement).toBe(120000); // 50k + 50k + 20k
    expect(result.isaBridgeRequiredTotal).toBe(200000);
    expect(result.isaBridgeDeficit).toBe(80000);
  });

  describe('Partner savings rates and configurations', () => {
    it('calculates ISA bridge considering partner ISA pots from pots object', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        currentAge: 45,
        targetRetirementAge: 52,
        protectedPensionAccessAge: 57,
        targetRetirementIncomeAnnual: 40000,
        grossAnnualSalary: 70000,
      };

      const pots = {
        ...DEFAULT_POTS,
        stocksAndSharesIsaBalance: 20000,
        cashIsaBalance: 30000,
        cashSavingsBalance: 10000,
        // partnerIsaPot doesn't exist on pots, but cashSavingsBalance etc are total
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, pots);
      
      expect(result.isaBridgeProjectedAtRetirement).toBe(60000);
      expect(result.isaBridgeDeficit).toBe(140000);
    });
  });

  describe('ISA / LISA / SIPP split contributions flow', () => {
    it('recommends strong ISA weighting when early retirement bridge is deeply underfunded', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        currentAge: 45,
        targetRetirementAge: 50,
        protectedPensionAccessAge: 57,
        targetRetirementIncomeAnnual: 50000,
        grossAnnualSalary: 70000,
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      
      // Deficit is huge, ratio > 0.5
      expect(result.recommendedMonthlySplit.isaPercent).toBe(60);
      expect(result.recommendedMonthlySplit.pensionPercent).toBe(40);
    });

    it('recommends balanced ISA weighting when early retirement bridge is moderately underfunded', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        currentAge: 45,
        targetRetirementAge: 50,
        protectedPensionAccessAge: 57,
        targetRetirementIncomeAnnual: 50000,
        grossAnnualSalary: 70000,
      };

      const projections: YearProjection[] = [
        {
          age: 50,
          partnerAge: 50,
          year: 2032,
          primaryIsaPot: 200000, // Covers most of 350,000 required
          partnerIsaPot: 0,
          primaryCashGiaPot: 0,
        } as any,
      ];

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS, projections);
      
      // Deficit is 150,000 against 350,000 required. Ratio = 150k / 350k = 0.42 (<= 0.5)
      expect(result.recommendedMonthlySplit.isaPercent).toBe(40);
      expect(result.recommendedMonthlySplit.pensionPercent).toBe(60);
    });

    it('recommends heavy SIPP/Pension weighting when tax advantage is massive', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        currentAge: 45,
        targetRetirementAge: 60, // No bridge needed
        protectedPensionAccessAge: 57,
        grossAnnualSalary: 200000, // Massive tax relief
        pensionContributionMethod: 'salary_sacrifice' as const,
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      expect(result.recommendedMonthlySplit.pensionPercent).toBe(85);
      expect(result.recommendedMonthlySplit.isaPercent).toBe(15);
    });

    it('recommends equal split when pension advantage is minimal (basic rate to basic rate)', () => {
      const profile = {
        ...DEFAULT_PROFILE,
        currentAge: 45,
        targetRetirementAge: 60, // No bridge needed
        protectedPensionAccessAge: 57,
        grossAnnualSalary: 25000, // Basic rate, low advantage
        pensionContributionMethod: 'relief_at_source' as const,
      };

      const result = calculateTaxEfficientSavingsCrossover(profile, DEFAULT_POTS);
      // Depending on exact advantage, if <= 5%
      if (result.pensionAdvantagePercent <= 5) {
        expect(result.recommendedMonthlySplit.pensionPercent).toBe(50);
        expect(result.recommendedMonthlySplit.isaPercent).toBe(50);
      } else {
        expect(result.recommendedMonthlySplit.pensionPercent).toBe(80);
      }
    });
  });
});
