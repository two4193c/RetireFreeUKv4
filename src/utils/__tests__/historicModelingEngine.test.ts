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
  it('handles reverse sequence-of-return risk correctly', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      targetRetirementIncomeAnnual: 40000,
      includeStatePension: false,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const taxResult = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;
    
    const summaryForward = runHistoricSimulation(profile, pots, taxResult, 65, undefined, false);
    const summaryReverse = runHistoricSimulation(profile, pots, taxResult, 65, undefined, true);
    
    expect(summaryForward.runResults.length).toBeGreaterThan(0);
    expect(summaryReverse.runResults.length).toBeGreaterThan(0);
    
    const fwdTraj = summaryForward.runResults[0].trajectory;
    const revTraj = summaryReverse.runResults[0].trajectory;
    expect(fwdTraj).not.toEqual(revTraj);
  });

  it('handles couple planning with partner drawdown and PCLS', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      targetRetirementIncomeAnnual: 40000,
      includeStatePension: false,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      partnerLifeExpectancyAge: 65,
      partnerCrystallisationMode: 'upfront',
      partnerPclsLumpSumPercent: 25,
      partnerTakeLumpSumAtStart: true,
      partnerPots: { ...DEFAULT_POTS, workplacePensionBalance: 100000 } as any,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const taxResult = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;

    const summary = runHistoricSimulation(profile, pots, taxResult, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
    
    expect(row60!.partnerUncrystallisedPot).toBeCloseTo(0, 1);
    expect(row60!.partnerCrystallisedPot).toBeGreaterThan(0); 
  });

  it('handles annuities for primary and partner', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      includeStatePension: false,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 5,
      partnerIncomeProductOption: 'annuity',
      partnerAnnuityRatePercent: 5,
      partnerPots: { ...DEFAULT_POTS, workplacePensionBalance: 100000 } as any,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const taxResult = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;

    const summary = runHistoricSimulation(profile, pots, taxResult, 65);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.primaryCrystallisedPot).toBeCloseTo(0, 1);
    expect(row60!.partnerCrystallisedPot).toBeCloseTo(0, 1);
  });

  it('handles phased tranches', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { age: 60, amount: 40000, pclsPercent: 25, enabled: true, owner: 'primary', targetPot: 'cash_savings' }
      ]
    } as any;
    const pots: InvestmentPots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const taxResult = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;

    const summary = runHistoricSimulation(profile, pots, taxResult, 65);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
    
    // Pot started at 100k, 40k crystallised leaving 60k uncrystallised.
    // Even with max historic market growth, it should be well under the original 100k grown.
    expect(row60!.primaryUncrystallisedPot).toBeLessThan(90000);
    expect(row60!.primaryCrystallisedPot).toBeGreaterThan(0);
  });

  it('handles custom asset allocation and custom max age', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      targetRetirementIncomeAnnual: 40000,
      includeStatePension: false,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const taxResult = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;

    const customAllocation = { equityPercent: 100, bondPercent: 0, cashPercent: 0 };
    const maxAge = 70;

    const summary = runHistoricSimulation(profile, pots, taxResult, maxAge, customAllocation);
    
    // Check it stops at maxAge
    expect(summary.maxAge).toBe(70);
    const lastRow = summary.runResults[0].trajectory[summary.runResults[0].trajectory.length - 1];
    expect(lastRow.age).toBe(70);
  });
});
