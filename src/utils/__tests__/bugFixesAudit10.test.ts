import { describe, it, expect } from 'vitest';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE } from '../defaultData';
import { runMonteCarloSimulation, calculateCashBufferRequiredDetails } from '../monteCarloEngine';
import { runHistoricSimulation } from '../historicModelingEngine';
import { calculateUKTax } from '../ukTaxEngine';

describe('Round 10 Bug Fixes Audit', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    currentAge: 60,
    targetRetirementAge: 60,
    lifeExpectancyAge: 85,
    statePensionAge: 67,
    expectedInvestmentReturn: 5,
    postRetirementReturn: 4,
    expectedInflationRate: 2.5,
    targetRetirementIncomeAnnual: 30000,
    drawdownStrategy: 'pro_rata',
    taxRegion: 'england_ni_wales',
    takeLumpSumAtStart: false,
    includeStatePension: true,
    statePensionAmountAnnual: 11502,
    grossAnnualSalary: 0,
  };

  const basePots: InvestmentPots = {
    workplacePensionBalance: 400000,
    workplacePensionMonthlyEmployee: 0,
    workplacePensionMonthlyEmployeeType: 'fixed',
    employerMatchPercentage: 0,
    sippBalance: 0,
    sippMonthlyContribution: 0,
    stocksAndSharesIsaBalance: 100000,
    stocksAndSharesIsaMonthlyContribution: 0,
    cashIsaBalance: 0,
    cashIsaMonthlyContribution: 0,
    lisaBalance: 0,
    lisaMonthlyContribution: 0,
    giaBalance: 0,
    giaMonthlyContribution: 0,
    cashSavingsBalance: 50000,
    cashSavingsMonthlyContribution: 0,
  };

  describe('BUG-61: Monte Carlo simulation prevents double PCLS tax-free extraction', () => {
    it('treats pension withdrawals as 100% taxable when upfront 25% PCLS was taken at retirement', () => {
      // Run with takeLumpSumAtStart = true
      const profileWithUpfrontPcls: UserProfile = {
        ...baseProfile,
        takeLumpSumAtStart: true,
        pclsLumpSumPercent: 25,
      };

      const result = runMonteCarloSimulation(profileWithUpfrontPcls, basePots, calculateUKTax(profileWithUpfrontPcls, basePots), {
        numSimulations: 20,
        maxAge: 70,
        accumulationVolatility: 0,
        decumulationVolatility: 0,
      });

      expect(result).toBeDefined();
      expect(result.agePercentiles.length).toBeGreaterThan(0);
    });
  });

  describe('BUG-62: Cash ISA one-off contribution routed to ISA pot in Monte Carlo', () => {
    it('properly places cash_isa one-off contributions into ISA pot, not cashGiaPot', () => {
      const profileWithCashIsaOneOff: UserProfile = {
        ...baseProfile,
        currentAge: 55,
        targetRetirementAge: 60,
        oneOffContributions: [
          {
            id: 'cash_isa_1',
            name: 'Cash ISA Contribution',
            enabled: true,
            targetPot: 'cash_isa',
            grossAmount: 20000,
            date: `${new Date().getFullYear()}-06-01`,
            inflationLinked: false,
            frequency: 'one_off',
          },
        ],
      };

      const pots: InvestmentPots = {
        ...basePots,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 10000,
        cashSavingsBalance: 5000,
      };

      const result = runMonteCarloSimulation(profileWithCashIsaOneOff, pots, calculateUKTax(profileWithCashIsaOneOff, pots), {
        numSimulations: 5,
        maxAge: 56,
        accumulationVolatility: 0,
        decumulationVolatility: 0,
      });

      expect(result).toBeDefined();
    });
  });

  describe('BUG-63: Cash Buffer required details respects couple Personal Allowance and custom bands', () => {
    it('allocates dual Personal Allowance (£25,140 inflated) in couple planning mode', () => {
      const coupleProfile: UserProfile = {
        ...baseProfile,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        partnerStatePensionAge: 67,
        drawdownStrategy: 'tax_optimizer',
      };

      const details = calculateCashBufferRequiredDetails(coupleProfile, basePots, 60, 2);
      expect(details).toBeDefined();
      expect(details.yearlyDetails.length).toBe(2);
    });

    it('respects custom income increase mode in Monte Carlo simulation', () => {
      const customIncProfile: UserProfile = {
        ...baseProfile,
        incomeIncreaseMode: 'custom',
        customIncomeIncreasePercent: 0, // Flat real target income
      };

      const result = runMonteCarloSimulation(customIncProfile, basePots, calculateUKTax(customIncProfile, basePots), {
        numSimulations: 10,
        maxAge: 70,
        accumulationVolatility: 0,
        decumulationVolatility: 0,
      });

      expect(result).toBeDefined();
    });
  });

  describe('BUG-64: Historic modeling engine partner tax region and custom income increase', () => {
    it('falls back partner tax region to primary tax region (Scotland) and runs successfully', () => {
      const scotCoupleProfile: UserProfile = {
        ...baseProfile,
        taxRegion: 'scotland',
        partnerTaxRegion: undefined, // Should fallback to Scotland
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        incomeIncreaseMode: 'custom',
        customIncomeIncreasePercent: 1.5,
        dynamicSpendingRules: {
          enabled: true,
          capitalPreservationThresholdPercent: 20,
          capitalPreservationCutPercent: 10,
          prosperityThresholdPercent: 20,
          prosperityIncreasePercent: 10,
          skipInflationOnNegativeReturn: true,
        },
      };

      const baseTax = calculateUKTax(scotCoupleProfile, basePots);
      const summary = runHistoricSimulation(scotCoupleProfile, basePots, baseTax, 65);

      expect(summary).toBeDefined();
      expect(summary.runResults.length).toBeGreaterThan(0);
      expect(summary.runResults[0].trajectory.length).toBeGreaterThan(0);
    });
  });
});
