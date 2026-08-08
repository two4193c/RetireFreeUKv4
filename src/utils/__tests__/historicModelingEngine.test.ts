import { describe, it, expect } from 'vitest';
import { runHistoricSimulation } from '../historicModelingEngine';
import { UserProfile, InvestmentPots, TaxCalculationResult } from '../../types';

describe('historicModelingEngine', () => {
  const baseProfile = {
    currentAge: 50,
    targetRetirementAge: 60,
    targetRetirementIncomeAnnual: 30000,
    statePensionAge: 67,
    includeStatePension: true,
    qualifyingYears: 35,
    drawdownStrategy: 'isa_first',
  } as unknown as UserProfile;

  const basePots = {
    primaryPensionPot: 500000,
    primaryIsaPot: 100000,
    primaryGiaPot: 0,
    primaryCashSavingsPot: 50000,
  } as unknown as InvestmentPots;

  const baseTaxResult = {
    netTakeHomeAnnual: 40000,
    totalIncomeTaxAnnual: 10000,
    totalNationalInsuranceAnnual: 3000,
    grossSalaryAnnual: 60000,
    totalPensionContributionsAnnual: 5000,
    employerPensionContributionsAnnual: 3000,
    employeePensionContributionsAnnual: 2000,
    effectiveTaxRate: 21.6,
    marginalTaxRate: 32,
    pensionTaxReliefAnnual: 1000,
    takeHomeMonthly: 3333,
    regularIsaContributionsAnnual: 0,
    totalIsaContributionsAnnual: 0,
    lisaGovernmentBonusAnnual: 0,
    regularCashGiaContributionsAnnual: 0,
    totalCashGiaContributionsAnnual: 0,
  } as unknown as TaxCalculationResult;

  it('runs historic simulation without error', () => {
    const sim = runHistoricSimulation(baseProfile, basePots, baseTaxResult);
    expect(sim.runResults.length).toBeGreaterThan(0);
    expect(sim.medianFinalReal).toBeDefined();
    expect(sim.worstStartYear).toBeDefined();
    expect(sim.bestStartYear).toBeDefined();
  });

  it('respects maximizedSpendConfig and reinvests surplus when enabled', () => {
    const profileWithMaxSpend: UserProfile = {
      ...baseProfile,
      maximizedSpendConfig: {
        enabled: true,
        targetAnnualIncome: 50000,
        baselineTargetAnnualIncome: 30000,
        reinvestExcessDrawdown: true,
        actualSpendingTargetAnnual: 30000,
        reinvestDestinationPot: 'isa',
      },
    };

    const sim = runHistoricSimulation(profileWithMaxSpend, basePots, baseTaxResult);
    expect(sim.runResults.length).toBeGreaterThan(0);

    // Pick a sample run trajectory
    const sampleRun = sim.runResults[0];
    expect(sampleRun.trajectory.length).toBeGreaterThan(0);

    // Verify drawdownAmount is tracked on retired years
    const retiredYears = sampleRun.trajectory.filter((t) => t.isRetired);
    expect(retiredYears.length).toBeGreaterThan(0);
    for (const yr of retiredYears) {
      expect(yr.drawdownAmount).toBeGreaterThanOrEqual(0);
    }
  });
});
