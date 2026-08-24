import { describe, it, expect } from 'vitest';
import { runHistoricSimulation } from '../historicModelingEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('historicModelingEngine - Additional Coverage', () => {
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

  it('handles pension_first strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'pension_first' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.pensionPot).toBeLessThan(100000);
    expect(row60!.drawdownAmount).toBeGreaterThan(0);
  });

  it('handles cash_first strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'cash_first' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.cashGiaPot).toBeLessThan(50000);
  });

  it('handles tax_optimizer strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'tax_optimizer' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });

  it('handles basic_rate_bracket strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'basic_rate_bracket' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });

  it('handles higher_rate_bracket strategy', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 };
    const summary = runHistoricSimulation({ ...baseProfile, drawdownStrategy: 'higher_rate_bracket' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });

  it('handles mid-year pension depletion and fallbacks to ISA/Cash', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 20000, stocksAndSharesIsaBalance: 20000, cashSavingsBalance: 20000 };
    const summary = runHistoricSimulation({ ...baseProfile, targetRetirementIncomeAnnual: 50000, drawdownStrategy: 'pension_first' }, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.pensionPot).toBeCloseTo(0, 0);
    expect(row60!.drawdownAmount).toBeGreaterThan(0);
  });

  it('calculates percentiles and best/worst correctly across multiple runs', () => {
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 1000000 };
    const summary = runHistoricSimulation(baseProfile, pots, baseTax, 65);
    expect(summary.bestStartYear.finalRealBalance).toBeGreaterThanOrEqual(summary.worstStartYear.finalRealBalance);
    expect(summary.p90FinalReal).toBeGreaterThanOrEqual(summary.p10FinalReal);
    const agg60 = summary.aggregateTrajectory.find(a => a.age === 60);
    expect(agg60!.p90TotalPot).toBeGreaterThanOrEqual(agg60!.p10TotalPot);
  });

  it('reinvests excess guaranteed income into ISA', () => {
    const profWithAnnuity = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 10000,
      reinvestExcessDrawdown: true,
      annuityExcessReinvestOption: 'stocks_and_shares_isa',
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 20, // 20k income from 100k
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 0 };
    const summary = runHistoricSimulation(profWithAnnuity, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.isaPot).toBeGreaterThan(0);
  });

  it('reinvests excess into GIA/cash when chosen', () => {
    const profWithAnnuityGia = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 10000,
      reinvestExcessDrawdown: true,
      annuityExcessReinvestOption: 'gia',
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 20,
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 0 };
    const summary = runHistoricSimulation(profWithAnnuityGia, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.cashGiaPot).toBeGreaterThan(0);
  });

  it('handles fixed income streams with until_age and inflation linked', () => {
    const profile = {
      ...baseProfile,
      fixedIncomeStreams: [
        { enabled: true, owner: 'primary', annualAmount: 20000, startAge: 60, endAge: 62, inflationLinked: true }
      ]
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const summary = runHistoricSimulation(profile, pots, baseTax, 65);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    const row63 = summary.runResults[0].trajectory.find(r => r.age === 63);
    expect(row60!.drawdownAmount).toBeLessThan(50000);
    expect(row63!.drawdownAmount).toBeGreaterThan(row60!.drawdownAmount);
  });

  it('handles annuity duration termination until_age', () => {
    const profile = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 5000, // Low spend so pots survive
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 100,
      annuityRatePercent: 10,
      annuityType: 'inflation_linked',
      annuityDurationOption: 'until_age',
      annuityDurationUntilAge: 62
    };
    const pots = { ...DEFAULT_POTS, workplacePensionBalance: 100000 };
    const summary = runHistoricSimulation(profile, pots, baseTax, 65);
    const row61 = summary.runResults[0].trajectory.find(r => r.age === 61);
    const row63 = summary.runResults[0].trajectory.find(r => r.age === 63);
    // At age 61 the fixed-term annuity is active providing income (low drawdown from pots)
    // At age 63 the annuity has expired so more pot drawdown is needed
    expect(row63!.drawdownAmount).toBeGreaterThanOrEqual(row61!.drawdownAmount);
  });

  it('handles pot transfers during the simulation', () => {
    const profile = {
      ...baseProfile,
      targetRetirementIncomeAnnual: 0,
      potTransfers: [
        { enabled: true, owner: 'primary', sourcePot: 'cash_savings', destinationPot: 'stocks_and_shares_isa', transferAge: 60, amount: 10000 }
      ]
    };
    const pots = { ...DEFAULT_POTS, cashSavingsBalance: 20000, stocksAndSharesIsaBalance: 0 };
    const summary = runHistoricSimulation(profile, pots, baseTax, 62);
    const row60 = summary.runResults[0].trajectory.find(r => r.age === 60);
    expect(row60!.isaPot).toBeGreaterThan(0);
  });
});
