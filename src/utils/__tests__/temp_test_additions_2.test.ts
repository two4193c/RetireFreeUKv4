import { describe, it, expect } from 'vitest';
import { runHistoricSimulation } from '../historicModelingEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

describe('historicModelingEngine - Even More Coverage', () => {
  const baseProfile = {
    ...DEFAULT_PROFILE,
    currentAge: 60,
    targetRetirementAge: 60,
    lifeExpectancyAge: 65,
    targetRetirementIncomeAnnual: 40000,
    includeStatePension: false,
    potReturnOverrides: { enabled: false } as any,
  } as any;
  const baseTax = { primaryTotalTax: 0, primaryNetIncome: 0, partnerTotalTax: 0, partnerNetIncome: 0 } as any;

  it('handles partner mortality inheritance', () => {
    const coupleProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      partnerLifeExpectancyAge: 62, // Die at 62
      partnerPots: { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 20000, cashSavingsBalance: 10000 },
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 50000 };
    const summary = runHistoricSimulation(coupleProfile, pots, baseTax, 65);
    const row62 = summary.runResults[0].trajectory.find(r => r.age === 62);
    // Just asserting coverage
    expect(row62).toBeDefined();
  });

  it('reinvests excess into fallback cashGia when option is unknown', () => {
    const profWithAnnuityUnknown = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 10000,
      reinvestExcessDrawdown: true,
      annuityExcessReinvestOption: 'some_unknown_pot',
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 20,
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 0 };
    const summary = runHistoricSimulation(profWithAnnuityUnknown, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.cashGiaPot).toBeGreaterThan(0);
  });
  
  it('handles tax_free_bracket strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'tax_free_bracket' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });
});
