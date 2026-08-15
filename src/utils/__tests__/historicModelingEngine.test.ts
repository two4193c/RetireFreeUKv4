import { describe, it, expect } from 'vitest';
import { runHistoricSimulation } from '../historicModelingEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('historicModelingEngine - Crystallised Pot Tracking', () => {
  it('correctly tracks uncrystallised and crystallised pots during upfront PCLS and drawdown', () => {
    // We want to force an Upfront PCLS to trigger and see it move pots.
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'pro_rata',
      crystallisationMode: 'upfront',
      pclsLumpSumPercent: 25,
      takeLumpSumAtStart: true,
      includeStatePension: false,
      expectedInvestmentReturn: 0.00001,
      postRetirementReturn: 0.00001,
      potReturnOverrides: { enabled: false } as any,
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 20000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };

    const taxResult = {
      primaryTotalTax: 0,
      primaryNetIncome: 0,
      partnerTotalTax: 0,
      partnerNetIncome: 0,
    } as any;

    const summary = runHistoricSimulation(profile, pots, taxResult, 62);
    
    // Check the first run result trajectory
    const runResult = summary.runResults[0];
    expect(runResult).toBeDefined();
    
    const row60 = runResult.trajectory.find((r) => r.age === 60);
    expect(row60).toBeDefined();

    // 1. Upfront PCLS of 25% on 100,000 = 25,000.
    // 2. The remaining 75,000 becomes crystallised. Uncrystallised = 0.
    // 3. Drawdown to meet 40000 target income comes from Pro Rata.
    // At age 60, after PCLS, total accessible = 75k pension + (20k + 25k) ISA = 120k.
    // Target net income = 40k. Pro rata draws ~2/3 from ISA, ~1/3 from Pension.
    
    // Let's assert the primaryUncrystallisedPot was correctly zeroed out after PCLS.
    expect(row60!.primaryUncrystallisedPot).toBeCloseTo(0, 1);
    
    // The crystallised pot should be the 75k minus whatever pension drawdown happened this year.
    expect(row60!.primaryCrystallisedPot).toBeLessThan(75000);
    expect(row60!.primaryCrystallisedPot).toBeCloseTo(row60!.pensionPot, 1);
  });

  it('correctly tracks uncrystallised pot and applies 25% tax-free during phased drawdown (UFPLS)', () => {
    // No upfront PCLS. We draw directly from uncrystallised.
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'pension_first',
      crystallisationMode: 'ufpls',
      takeLumpSumAtStart: false,
      includeStatePension: false,
      expectedInvestmentReturn: 0.00001,
      postRetirementReturn: 0.00001,
      potReturnOverrides: { enabled: false } as any,
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 20000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };

    const taxResult = {
      primaryTotalTax: 0,
      primaryNetIncome: 0,
      partnerTotalTax: 0,
      partnerNetIncome: 0,
    } as any;

    const summary = runHistoricSimulation(profile, pots, taxResult, 62);
    
    const runResult = summary.runResults[0];
    expect(runResult).toBeDefined();
    
    const row60 = runResult.trajectory.find((r) => r.age === 60);
    expect(row60).toBeDefined();

    // Since we used UFPLS (no upfront PCLS) and pension_first:
    // It should draw heavily from Uncrystallised pot.
    // pensionPot should equal primaryUncrystallisedPot (since crystallised is 0).
    expect(row60!.primaryCrystallisedPot).toBeCloseTo(0, 1);
    expect(row60!.primaryUncrystallisedPot).toBeCloseTo(row60!.pensionPot, 1);
    
    // 100k - pensionDrawdown = primaryUncrystallisedPot
    // We can verify that it actually drew some amount.
    expect(row60!.drawdownAmount).toBeGreaterThan(0);
    expect(row60!.primaryUncrystallisedPot).toBeLessThan(100000);
  });
});
