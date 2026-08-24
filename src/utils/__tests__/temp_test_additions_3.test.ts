import { describe, it, expect } from 'vitest';
import { runHistoricSimulation } from '../historicModelingEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

describe('historicModelingEngine - Pro Rata Coverage', () => {
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

  it('handles pro_rata strategy with all pots having balances', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'pro_rata' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.drawdownAmount).toBeGreaterThan(0);
  });
  
  it('reinvests excess into cash fallback', () => {
    const profWithAnnuityUnknown = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 10000,
      reinvestExcessDrawdown: true,
      annuityExcessReinvestOption: 'cash',
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 20,
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 0 };
    const summary = runHistoricSimulation(profWithAnnuityUnknown, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.cashGiaPot).toBeGreaterThan(0);
  });
  
  it('handles db pensions with tax free lump sum', () => {
    const dbProfile = {
      ...baseProfile,
      dbPensions: [
        { enabled: true, owner: 'primary', startAge: 60, annualIncome: 10000, taxFreeLumpSum: 20000, inflationLinked: true, targetPot: 'stocks_and_shares_isa' }
      ]
    };
    const pots = { ...DEFAULT_POTS };
    const summary = runHistoricSimulation(dbProfile, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.isaPot).toBeGreaterThan(0);
  });
});
