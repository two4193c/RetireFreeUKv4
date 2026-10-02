import { describe, it, expect } from 'vitest';
import { calculateCapitalGainsTax, computeIncomeTaxOnAmount, calculateDividendTax, aggregateIncome, calculateUKTax } from '../ukTaxEngine';
import { STATE_PENSION_FULL_ANNUAL } from '../../config/ukTaxRates';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('Bug Fixes Verification Suite', () => {
  // BUG-1
  describe('BUG-1: Capital Gains Tax differential rates', () => {
    it('applies 10% basic and 20% higher rates for non-residential assets (e.g. shares/GIA)', () => {
      // Basic rate band remaining
      const basicNonRes = calculateCapitalGainsTax(20000, 10000, false);
      expect(basicNonRes.cgtTax).toBe(7000 * 0.10);
      expect(basicNonRes.cgtRate).toBe(0.10);

      // Higher rate band
      const higherNonRes = calculateCapitalGainsTax(40000, 10000, false);
      expect(higherNonRes.cgtTax).toBe(7000 * 0.20);
      expect(higherNonRes.cgtRate).toBe(0.20);
    });

    it('applies 18% basic and 24% higher rates for residential property', () => {
      // Basic rate band remaining
      const basicRes = calculateCapitalGainsTax(20000, 10000, true);
      expect(basicRes.cgtTax).toBe(7000 * 0.18);
      expect(basicRes.cgtRate).toBe(0.18);

      // Higher rate band
      const higherRes = calculateCapitalGainsTax(40000, 10000, true);
      expect(higherRes.cgtTax).toBe(7000 * 0.24);
      expect(higherRes.cgtRate).toBe(0.24);
    });
  });

  // BUG-4
  describe('BUG-4: Personal Allowance taper marginal rate calculation', () => {
    it('correctly sets marginal tax rate to 60% in the £100k-£125,140 taper zone for rUK', () => {
      const res110k = computeIncomeTaxOnAmount(110000, false);
      expect(res110k.marginalRate).toBe(60); // 40% higher rate + 20% taper
    });

    it('adds 20% taper adjustment to Scottish higher rate in the taper zone', () => {
      const res110kScot = computeIncomeTaxOnAmount(110000, true);
      // In Scotland £110k is in the Advanced Rate (45%), so 45 + 20 = 65%
      expect(res110kScot.marginalRate).toBe(65);
    });
  });

  // BUG-5 & BUG-10
  describe('BUG-5 & BUG-10: State Pension default consistency across engines', () => {
    it('uses STATE_PENSION_FULL_ANNUAL (11,973) in aggregateIncome when not set on profile', () => {
      const profileWithoutSp: any = {
        ...DEFAULT_PROFILE,
        currentAge: 68,
        statePensionAge: 67,
        includeStatePension: true,
        statePensionDeferralYears: 0,
        statePensionAmountAnnual: undefined,
        fullStatePensionAmount: undefined,
      };

      const agg = aggregateIncome(profileWithoutSp, false, 68);
      expect(agg.statePensionIncome).toBe(STATE_PENSION_FULL_ANNUAL);
    });

    it('uses STATE_PENSION_FULL_ANNUAL in projectionEngine when not set on profile', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 66,
        targetRetirementAge: 66,
        lifeExpectancyAge: 70,
        statePensionAge: 67,
        includeStatePension: true,
        qualifyingYears: 35,
        enableTripleLock: false, // fixed for simplicity
        statePensionAmountAnnual: undefined as any,
        fullStatePensionAmount: undefined as any,
      };
      const pots: InvestmentPots = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        sippBalance: 0,
        stocksAndSharesIsaBalance: 0,
        cashSavingsBalance: 0,
      };

      const projections = generateProjections(profile, pots);
      const row67 = projections.find((r) => r.age === 67);
      expect(row67).toBeDefined();
      expect(row67!.statePensionReceived).toBe(STATE_PENSION_FULL_ANNUAL);
    });
  });

  // BUG-9
  describe('BUG-9: calculateDividendTax _isScottish parameter', () => {
    it('dividend tax rates are UK-wide regardless of isScottish parameter', () => {
      const ruk = calculateDividendTax(20000, 2000, false);
      const scot = calculateDividendTax(20000, 2000, true);
      expect(ruk.dividendTax).toBe(scot.dividendTax);
    });
  });

  // BUG-3: pro_rata drawdown
  describe('BUG-3: pro_rata drawdown proportion accuracy', () => {
    it('draws from accessible pots without exceeding the target net needed', () => {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        lifeExpectancyAge: 65,
        targetRetirementIncomeAnnual: 30000,
        drawdownStrategy: 'pro_rata',
        includeStatePension: false,
        adjustForInflation: false,
      };
      const pots: InvestmentPots = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 60000,
        cashSavingsBalance: 40000,
        sippBalance: 0,
        cashIsaBalance: 0,
      };

      const rows = generateProjections(profile, pots);
      const firstDecumRow = rows.find((r) => r.age === 60);
      expect(firstDecumRow).toBeDefined();
      // Total net income should closely match target
      expect(firstDecumRow!.netRetirementIncome).toBeCloseTo(30000, -1);
      // All three sources should have contributed
      expect(firstDecumRow!.pensionDrawdown).toBeGreaterThan(0);
      expect(firstDecumRow!.isaDrawdown).toBeGreaterThan(0);
      expect(firstDecumRow!.cashDrawdown).toBeGreaterThan(0);
    });
  });

  // BUG-8: Pre-retirement extra income effective tax rate vs marginal tax rate
  describe('BUG-8: Effective tax rate calculation for pre-retirement extra taxable income', () => {
    it('effective tax rate is lower than marginal rate due to Personal Allowance', () => {
      const basicRateProfile: any = {
        ...DEFAULT_PROFILE,
        grossAnnualSalary: 20000,
        pensionContributionMethod: 'relief_at_source',
        monthlyRegularContributions: {
          workplacePensionEmployeePercent: 0,
          workplacePensionEmployerPercent: 0,
          sippGrossMonthly: 0,
          stocksAndSharesIsaMonthly: 0,
          cashIsaMonthly: 0,
          lisaMonthly: 0,
          cashSavingsMonthly: 0,
          generalInvestmentAccountMonthly: 0,
        },
      };
      const taxResult = calculateUKTax(basicRateProfile, DEFAULT_POTS);
      // Tax paid is 20% on (20000 - 12570) = 7430 * 0.20 = £1,486
      expect(taxResult.totalIncomeTax).toBe(1486);
      expect(taxResult.marginalTaxRate).toBe(20);
      const effectiveRate = taxResult.grossIncome > 0
        ? taxResult.totalIncomeTax / taxResult.grossIncome
        : 0;
      // Effective rate is 1,486 / 20,000 = 7.43%
      expect(effectiveRate).toBeCloseTo(0.0743, 4);
      // Demonstrates that applying effective rate (7.43%) prevents the 20% marginal rate over-taxation
      expect(effectiveRate).toBeLessThan(taxResult.marginalTaxRate / 100);
    });
  });
});
