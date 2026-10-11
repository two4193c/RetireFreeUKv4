import { describe, it, expect } from 'vitest';
import {
  estimateGiltPrice,
  getGiltForYear,
  getCouponTaxRate,
  calculateGiltLadder,
  getDefaultGiltLadderConfig,
  UK_GILT_DATABASE,
} from '../giltLadderEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots, GiltLadderConfig } from '../../types';

describe('giltLadderEngine comprehensive tests', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    currentAge: 55,
    targetRetirementAge: 60,
    statePensionAge: 67,
    statePensionDeferralYears: 0,
    grossAnnualSalary: 60000,
    expectedInflationRate: 2.5,
  };

  const basePots: InvestmentPots = {
    ...DEFAULT_POTS,
    giaBalance: 150000,
    stocksAndSharesIsaBalance: 50000,
    cashIsaBalance: 20000,
    lisaBalance: 10000,
    cashSavingsBalance: 30000,
    workplacePensionBalance: 200000,
    sippBalance: 100000,
  };

  describe('estimateGiltPrice', () => {
    it('estimates price with zero coupon and zero yield (par 100)', () => {
      const price = estimateGiltPrice(2026, 2030, 0, 0);
      expect(price).toBe(100);
    });

    it('estimates discounted price when coupon is lower than market YTM', () => {
      const price = estimateGiltPrice(2026, 2031, 0.25, 4.35);
      expect(price).toBeLessThan(100);
      expect(price).toBeGreaterThan(70);
    });

    it('handles maturity year equal to or less than current year gracefully', () => {
      const price = estimateGiltPrice(2026, 2026, 4.0, 4.0);
      expect(price).toBeCloseTo(100, 1);
    });
  });

  describe('getGiltForYear', () => {
    it('returns low_coupon gilt from database if available', () => {
      const gilt = getGiltForYear(2026, 2028, 'low_coupon');
      expect(gilt.isin).toBe('GB00BMBL1D56');
      expect(gilt.couponPercent).toBe(0.125);
    });

    it('returns benchmark gilt from database if available', () => {
      const gilt = getGiltForYear(2026, 2028, 'benchmark');
      expect(gilt.isin).toBe('GB00BFX0RH92');
      expect(gilt.couponPercent).toBe(1.625);
    });

    it('synthesizes synthetic gilt when year is far beyond database (e.g. 2045)', () => {
      const synthLow = getGiltForYear(2026, 2045, 'low_coupon', 4.5);
      expect(synthLow.isin).toBe('GB00SYNTH2045');
      expect(synthLow.couponPercent).toBe(0.75);
      expect(synthLow.cleanPrice).toBeGreaterThan(0);

      const synthBench = getGiltForYear(2026, 2045, 'benchmark', 4.5);
      expect(synthBench.isin).toBe('GB00SYNTH2045');
      expect(synthBench.couponPercent).toBe(4.0);
    });
  });

  describe('getCouponTaxRate', () => {
    it('returns 0 for tax sheltered pots (isa and pension)', () => {
      expect(getCouponTaxRate('isa', 'auto', 80000)).toBe(0);
      expect(getCouponTaxRate('pension', 'auto', 80000)).toBe(0);
    });

    it('honours explicit tax bracket overrides', () => {
      expect(getCouponTaxRate('gia', 'basic', 150000)).toBe(0.20);
      expect(getCouponTaxRate('gia', 'higher', 20000)).toBe(0.40);
      expect(getCouponTaxRate('gia', 'additional', 20000)).toBe(0.45);
    });

    it('auto detects correct marginal tax rate from gross salary', () => {
      expect(getCouponTaxRate('gia', 'auto', 10000)).toBe(0); // below personal allowance
      expect(getCouponTaxRate('gia', 'auto', 35000)).toBe(0.20); // basic
      expect(getCouponTaxRate('gia', 'auto', 75000)).toBe(0.40); // higher
      expect(getCouponTaxRate('gia', 'auto', 140000)).toBe(0.45); // additional
    });
  });

  describe('calculateGiltLadder edge cases and branches', () => {
    it('returns empty summary when duration is 0 or target income is 0', () => {
      const configZeroIncome: GiltLadderConfig = {
        enabled: true,
        startAge: 60,
        endAge: 65,
        targetAnnualIncome: 0,
        fundingSource: 'gia',
      };
      const res1 = calculateGiltLadder(configZeroIncome, baseProfile, basePots);
      expect(res1.durationYears).toBe(0);
      expect(res1.rungs).toHaveLength(0);

      const configZeroDur: GiltLadderConfig = {
        enabled: true,
        startAge: 60,
        purchaseAge: 60,
        durationYears: 0,
        targetAnnualIncome: 20000,
        fundingSource: 'gia',
      };
      const res2 = calculateGiltLadder(configZeroDur, baseProfile, basePots);
      expect(res2.durationYears).toBe(0);
      expect(res2.rungs).toHaveLength(0);
    });

    it('supports partner configuration with partner ages and salaries', () => {
      const coupleProfile: UserProfile = {
        ...baseProfile,
        isCouplePlanning: true,
        partnerCurrentAge: 52,
        partnerTargetRetirementAge: 58,
        partnerStatePensionAge: 68,
        partnerStatePensionDeferralYears: 2,
        partnerGrossAnnualSalary: 130000,
        partnerDateOfBirth: '1974-06-15',
      };

      const config: GiltLadderConfig = {
        enabled: true,
        owner: 'partner',
        purchaseAge: 58,
        durationYears: 4,
        targetAnnualIncome: 25000,
        fundingSource: 'gia',
        taxBracketOverride: 'auto',
      };

      const res = calculateGiltLadder(config, coupleProfile, basePots);
      expect(res.durationYears).toBe(4);
      expect(res.rungs.length).toBe(4);
      expect(res.rungs[0].age).toBe(59);
    });

    it('correctly calculates ladder with inflation linkage enabled', () => {
      const config: GiltLadderConfig = {
        enabled: true,
        startAge: 60,
        durationYears: 3,
        targetAnnualIncome: 20000,
        fundingSource: 'gia',
        inflationLinked: true,
      };

      const res = calculateGiltLadder(config, baseProfile, basePots);
      expect(res.rungs.length).toBe(3);
      // Rung 2 and 3 should have targetNetCashflow strictly higher than Rung 1 due to inflation
      expect(res.rungs[1].totalNetPayout).toBeGreaterThan(res.rungs[0].totalNetPayout);
      expect(res.rungs[2].totalNetPayout).toBeGreaterThan(res.rungs[1].totalNetPayout);
    });

    it('checks funding capacity for various funding source options', () => {
      const testSources: Array<'gia' | 'isa' | 'cash' | 'pension' | 'blended'> = [
        'gia',
        'isa',
        'cash',
        'pension',
        'blended',
      ];

      testSources.forEach((source) => {
        const config: GiltLadderConfig = {
          enabled: true,
          startAge: 60,
          durationYears: 2,
          targetAnnualIncome: 10000,
          fundingSource: source,
        };
        const res = calculateGiltLadder(config, baseProfile, basePots);
        expect(res.isFundingSufficient).toBe(true);
      });

      // Now test insufficient funding for cash source
      const poorPots: InvestmentPots = {
        ...DEFAULT_POTS,
        cashSavingsBalance: 100,
        cashIsaBalance: 100,
      };
      const resInsufficient = calculateGiltLadder(
        {
          enabled: true,
          startAge: 60,
          durationYears: 3,
          targetAnnualIncome: 20000,
          fundingSource: 'cash',
        },
        baseProfile,
        poorPots
      );
      expect(resInsufficient.isFundingSufficient).toBe(false);
    });
  });

  describe('getDefaultGiltLadderConfig helper', () => {
    it('builds sensible defaults tailored to user profile', () => {
      const cfg = getDefaultGiltLadderConfig(baseProfile);
      expect(cfg.enabled).toBe(false);
      expect(cfg.startAge).toBe(60);
      expect(cfg.endAge).toBeGreaterThan(60);
      expect(cfg.targetAnnualIncome).toBeGreaterThanOrEqual(15000);
      expect(cfg.fundingSource).toBe('gia');
      expect(cfg.giltType).toBe('low_coupon');
    });
  });
});
