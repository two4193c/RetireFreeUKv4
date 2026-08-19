import { describe, it, expect } from 'vitest';
import { calculateGiltLadder, UK_GILT_DATABASE } from '../giltLadderEngine';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots, GiltLadderConfig } from '../../types';

describe('giltLadderEngine', () => {
  it('contains valid UK Treasury Gilts with sensible maturity dates and yields', () => {
    expect(UK_GILT_DATABASE.length).toBeGreaterThanOrEqual(10);
    UK_GILT_DATABASE.forEach((gilt) => {
      expect(gilt.isin).toMatch(/^GB00/);
      expect(gilt.couponPercent).toBeGreaterThanOrEqual(0);
      expect(gilt.benchmarkPrice).toBeGreaterThan(50);
      expect(gilt.benchmarkPrice).toBeLessThan(120);
      expect(gilt.maturityYear).toBeGreaterThanOrEqual(2025);
    });
  });

  it('calculates a 5-year Gilt Ladder accurately', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 30000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      giaBalance: 200000,
    };
    const config: GiltLadderConfig = {
      enabled: true,
      startAge: 60,
      durationYears: 5,
      targetAnnualIncome: 30000,
      fundingSource: 'gia',
      inflationAdjusted: false,
    };

    const summary = calculateGiltLadder(config, profile, pots);

    expect(summary.rungs.length).toBe(5);
    expect(summary.totalPayoutDelivered).toBeGreaterThanOrEqual(150000); // at least £30k * 5
    expect(summary.totalUpfrontCost).toBeLessThan(summary.totalPayoutDelivered); // bought at discount
    expect(summary.totalTaxFreeCapitalGains).toBeGreaterThan(0); // 0% CGT arbitrage
    expect(summary.effectiveAnnualYieldPercent).toBeGreaterThan(2.0);

    // Verify individual rungs
    summary.rungs.forEach((rung, idx) => {
      expect(rung.age).toBe(60 + idx);
      expect(rung.totalNetPayout).toBeGreaterThanOrEqual(30000);
      expect(rung.maturingPrincipal).toBeGreaterThan(0);
      expect(rung.taxFreeCapitalGain).toBeGreaterThanOrEqual(0);
    });
  });

  it('handles funding source capacity checks', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      giaBalance: 10000, // Insufficient for £50k ladder
    };
    const config: GiltLadderConfig = {
      enabled: true,
      startAge: 60,
      durationYears: 5,
      targetAnnualIncome: 20000,
      fundingSource: 'gia',
      inflationAdjusted: false,
    };

    const summary = calculateGiltLadder(config, profile, pots);
    expect(summary.isFundingSufficient).toBe(false);
  });
});

describe('projectionEngine Gilt Ladder Integration', () => {
  it('deducts upfront purchase cost from GIA pot and delivers income annually during ladder years', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 58,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 25000,
      giltLadderConfig: {
        enabled: true,
        startAge: 60,
        durationYears: 5,
        targetAnnualIncome: 25000,
        fundingSource: 'gia',
        inflationAdjusted: false,
      },
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      giaBalance: 150000,
      workplacePensionBalance: 300000,
      stocksAndSharesIsaBalance: 50000,
    };

    const rows = generateProjections(profile, pots);

    // At age 59 (before retirement & gilt ladder)
    const at59 = rows.find((r) => r.age === 59);
    expect(at59).toBeDefined();

    // At age 60 (gilt ladder purchase age)
    const at60 = rows.find((r) => r.age === 60);
    expect(at60).toBeDefined();
    expect(at60!.giltLadderPurchasedThisYear).toBe(true);
    expect(at60!.giltLadderCapitalAllocated).toBeGreaterThan(0);
    expect(at60!.giltLadderIncomeReceived).toBeGreaterThanOrEqual(25000);

    // Verify GIA balance decreased due to upfront purchase
    expect(at60!.giaPot).toBeLessThan(at59!.giaPot);

    // For ages 60 to 64 (5 year duration)
    for (let age = 60; age < 65; age++) {
      const yearRow = rows.find((r) => r.age === age);
      expect(yearRow!.giltLadderIncomeReceived).toBeGreaterThanOrEqual(25000);
    }

    // At age 65 (after ladder expires)
    const at65 = rows.find((r) => r.age === 65);
    expect(at65!.giltLadderIncomeReceived).toBe(0);
  });

  it('works with Pension / SIPP funding source', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000,
      giltLadderConfig: {
        enabled: true,
        startAge: 60,
        durationYears: 4,
        targetAnnualIncome: 20000,
        fundingSource: 'pension',
        inflationAdjusted: false,
      },
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 400000,
      giaBalance: 0,
      stocksAndSharesIsaBalance: 0,
    };

    const rows = generateProjections(profile, pots);
    const at60 = rows.find((r) => r.age === 60);

    expect(at60!.giltLadderPurchasedThisYear).toBe(true);
    expect(at60!.giltLadderCapitalAllocated).toBeGreaterThan(0);
    expect(at60!.giltLadderIncomeReceived).toBeGreaterThanOrEqual(20000);
  });

  it('works with ISA funding source', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000,
      giltLadderConfig: {
        enabled: true,
        startAge: 60,
        durationYears: 3,
        targetAnnualIncome: 20000,
        fundingSource: 'isa',
        inflationAdjusted: false,
      },
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 200000,
      workplacePensionBalance: 300000,
    };

    const rows = generateProjections(profile, pots);
    const at60 = rows.find((r) => r.age === 60);

    expect(at60!.giltLadderPurchasedThisYear).toBe(true);
    expect(at60!.giltLadderCapitalAllocated).toBeGreaterThan(0);
    expect(at60!.giltLadderIncomeReceived).toBeGreaterThanOrEqual(20000);
  });
});
