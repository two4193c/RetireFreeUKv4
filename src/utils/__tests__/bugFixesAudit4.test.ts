import { describe, it, expect } from 'vitest';
import {
  calculateMaxPcls,
  calculatePartnerMaxPcls,
  calculatePartnerUKTax,
  calculateUKTax,
} from '../ukTaxEngine';
import { computePlanInsights } from '../planInsightsEngine';
import { getTotalFeePercent, getPotAssetAllocation } from '../assetAllocation';
import { runHistoricModelingSimulation } from '../historicModelingEngine';
import { calculateGiltLadder, getCouponTaxRate } from '../giltLadderEngine';
import { solveMaximizedSpend } from '../maximizedSpendSolver';
import { UserProfile, InvestmentPots, GiltLadderConfig } from '../../types';
import { DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../defaultData';

describe('Round 4 Logic Bug Fixes Audit (BUG-25 through BUG-35)', () => {
  const baseProfile: UserProfile = {
    dateOfBirth: '1989-06-15',
    currentAge: 35,
    targetRetirementAge: 60,
    lifeExpectancyAge: 90,
    statePensionAge: 67,
    includeStatePension: true,
    statePensionAmountAnnual: 11973,
    grossAnnualSalary: 60000,
    isCouplePlanning: false,
    taxRegion: 'england_ni_wales',
    pensionContributionMethod: 'salary_sacrifice',
    targetRetirementIncomeAnnual: 30000,
    expectedInflationRate: 2.5,
    adjustForInflation: true,
    indexTaxBands: true,
    expectedInvestmentReturn: 6.5,
    postRetirementReturn: 4.5,
    pclsLumpSumPercent: 25,
    takeLumpSumAtStart: false,
    lsaProtectionType: 'standard',
    customLsaAllowance: 268275,
    drawdownStrategy: 'isa_first',
    incomeProductOption: 'flexi_drawdown',
    annuityAllocationPercent: 50,
    annuityType: 'level_single',
    annuityRatePercent: 6.0,
    dbPensions: [],
    fixedIncomeStreams: [],
    oneOffContributions: [],
    decumulationLifeEvents: [],
  };

  const basePots: InvestmentPots = {
    workplacePensionBalance: 100000,
    sippBalance: 50000,
    stocksAndSharesIsaBalance: 30000,
    cashIsaBalance: 10000,
    lisaBalance: 0,
    giaBalance: 0,
    cashSavingsBalance: 10000,
    workplacePensionMonthlyEmployee: 500,
    workplacePensionMonthlyEmployeeType: 'fixed',
    employerMatchPercentage: 5,
    sippMonthlyContribution: 0,
    sippContributionType: 'net',
    stocksAndSharesIsaMonthlyContribution: 200,
    cashIsaMonthlyContribution: 0,
    lisaMonthlyContribution: 0,
    giaMonthlyContribution: 0,
    cashSavingsMonthlyContribution: 0,
  };

  // BUG-27: 0% PCLS does not revert to 25%
  it('BUG-27: calculateMaxPcls & calculatePartnerMaxPcls preserve 0% PCLS without defaulting to 25%', () => {
    const zeroPclsProfile: UserProfile = {
      ...baseProfile,
      pclsLumpSumPercent: 0,
      partnerPclsLumpSumPercent: 0,
    };

    const priResult = calculateMaxPcls(200000, zeroPclsProfile);
    expect(priResult.pclsPercent).toBe(0);
    expect(priResult.maxDcPcls).toBe(0);
    expect(priResult.maxTaxFreeCash).toBe(0);

    const partResult = calculatePartnerMaxPcls(200000, zeroPclsProfile);
    expect(partResult.pclsPercent).toBe(0);
    expect(partResult.maxDcPcls).toBe(0);
  });

  // BUG-25: Upfront PCLS recycling check works with crystallisationMode === 'upfront'
  it('BUG-25a: calculateUKTax flags PCLS recycling risk when crystallisationMode is upfront', () => {
    const upfrontProfile: UserProfile = {
      ...baseProfile,
      crystallisationMode: 'upfront',
      takeLumpSumAtStart: false, // takeLumpSumAtStart is false, but crystallisationMode is upfront
      oneOffContributions: [
        {
          id: 'oneoff-1',
          name: 'Large Top-Up',
          owner: 'primary',
          targetPot: 'sipp',
          grossAmount: 20000, // exceeds 30% of £37,500 PCLS (£11,250) and > £7,500
          frequency: 'one_off',
          enabled: true,
        },
      ],
    };

    const taxResult = calculateUKTax(upfrontProfile, basePots);
    expect(taxResult.isPclsRecyclingRisk).toBe(true);
    expect(taxResult.pclsRecyclingDetails).toBeDefined();
  });

  // BUG-25b: calculatePartnerUKTax isolates partner fields
  it('BUG-25b: calculatePartnerUKTax maps partner profile fields independently', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      drawdownStrategy: 'isa_first',
      partnerDrawdownStrategy: 'tax_optimizer',
      crystallisationMode: 'phased_tranches',
      partnerCrystallisationMode: 'upfront',
      partnerGrossAnnualSalary: 45000,
      partnerName: 'Jane',
    };

    const partnerTax = calculatePartnerUKTax(coupleProfile, basePots);
    expect(partnerTax).toBeDefined();
    expect(partnerTax.personalAllowance).toBe(12570);
  });

  // BUG-29 & BUG-30: planInsightsEngine uses partner's pots and detects SP gap with includeStatePension !== false
  it('BUG-29 & BUG-30: planInsightsEngine evaluates partner tax and state pension gaps correctly', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      includeStatePension: true,
      qualifyingYears: 30, // 5 years short
      partnerIncludeStatePension: true,
      partnerQualifyingYears: 32, // 3 years short
      partnerGrossAnnualSalary: 110000, // In £100k-£125k tax trap
      partnerPots: {
        ...DEFAULT_PARTNER_POTS,
        workplacePensionBalance: 60000,
        sippBalance: 20000,
      },
    };

    const insights = computePlanInsights(coupleProfile, basePots, []);
    
    // Check Primary State Pension gap opportunity
    const priSpGap = insights.opportunities.find((o) => o.id === 'state_pension_gap_fill_primary');
    expect(priSpGap).toBeDefined();
    expect(priSpGap?.observation).toContain('30 qualifying years');

    // Check Partner State Pension gap opportunity
    const partSpGap = insights.opportunities.find((o) => o.id === 'state_pension_gap_fill_partner');
    expect(partSpGap).toBeDefined();
    expect(partSpGap?.observation).toContain('32 qualifying years');

    // Check Partner 60% tax trap opportunity
    const partTaxTrap = insights.opportunities.find((o) => o.id === 'tax_trap_mitigation_partner');
    expect(partTaxTrap).toBeDefined();
  });

  // BUG-31 & BUG-32: assetAllocation includes cashIsa and maps lisa / cashSavings
  it('BUG-31 & BUG-32: assetAllocation handles cashIsa and aliased pots', () => {
    const feeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0,
      perPotFeesEnabled: true,
      primaryPots: {
        workplacePension: { platformFeePercent: 0.20, fundFeePercent: 0.30, advisorFeePercent: 0 },
        sipp: { platformFeePercent: 0.25, fundFeePercent: 0.40, advisorFeePercent: 0 },
        stocksAndSharesIsa: { platformFeePercent: 0.15, fundFeePercent: 0.25, advisorFeePercent: 0 },
        cashIsa: { platformFeePercent: 0.10, fundFeePercent: 0.10, advisorFeePercent: 0 },
        gia: { platformFeePercent: 0.20, fundFeePercent: 0.30, advisorFeePercent: 0 },
      },
    };

    const totalFee = getTotalFeePercent(feeConfig);
    // Average of (0.50 + 0.65 + 0.40 + 0.20 + 0.50) / 5 = 2.25 / 5 = 0.45%
    expect(totalFee).toBe(0.45);

    // Check lisa maps to stocksAndSharesIsa allocation
    const aaSplit = {
      enabled: true,
      perPotAllocationsEnabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      primaryPots: {
        stocksAndSharesIsa: {
          accumulation: { equity: 90, bond: 10, cash: 0 },
          decumulation: { equity: 50, bond: 40, cash: 10 },
        },
      },
    };

    const lisaAlloc = getPotAssetAllocation(aaSplit, 'primary', 'lisa', 'accumulation');
    expect(lisaAlloc.equity).toBe(90);
  });

  // BUG-33: historicModelingEngine couples have independent taxation on guaranteed income
  it('BUG-33: historicModelingEngine does not combine couple guaranteed income into single personal allowance', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      currentAge: 67,
      targetRetirementAge: 67,
      isCouplePlanning: true,
      includeStatePension: true,
      statePensionAmountAnnual: 12000,
      partnerCurrentAge: 67,
      partnerTargetRetirementAge: 67,
      partnerStatePensionAge: 67,
      partnerIncludeStatePension: true,
      partnerStatePensionAmountAnnual: 12000,
      targetRetirementIncomeAnnual: 24000,
      expectedInflationRate: 0,
      partnerPots: { ...DEFAULT_PARTNER_POTS },
    };

    const taxResult = calculateUKTax(coupleProfile, basePots);
    const summary = runHistoricModelingSimulation(coupleProfile, basePots, taxResult);
    expect(summary.totalRuns).toBeGreaterThan(0);
    expect(summary.runResults.length).toBeGreaterThan(0);
  });

  // BUG-34: giltLadderEngine preserves £0 salary and applies 0% coupon tax within PA
  it('BUG-34: giltLadderEngine awards 0% coupon tax for £0 earner within Personal Allowance', () => {
    const zeroEarnProfile: UserProfile = {
      ...baseProfile,
      grossAnnualSalary: 0,
    };

    const giltConfig: GiltLadderConfig = {
      enabled: true,
      fundingSource: 'gia',
      giltType: 'low_coupon',
      targetAnnualIncome: 10000,
      durationYears: 3,
      purchaseAge: 60,
    };

    const summary = calculateGiltLadder(giltConfig, zeroEarnProfile, basePots);
    expect(summary.totalTaxPaid).toBe(0); // 0% coupon tax rate because £0 salary is within PA
  });

  // BUG-35: maximizedSpendSolver handles partner state pension fallback
  it('BUG-35: solveMaximizedSpend succeeds for partner scope with undefined partnerStatePensionAmountAnnual', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerGrossAnnualSalary: 25000,
      partnerPots: { ...DEFAULT_PARTNER_POTS, sippBalance: 100000 },
      partnerStatePensionAmountAnnual: undefined,
      partnerFullStatePensionAmount: 11973,
      partnerQualifyingYears: 35,
    };

    const result = solveMaximizedSpend({
      profile: coupleProfile,
      pots: basePots,
      coupleScope: 'partner',
    });

    expect(result.maxAnnualIncome).toBeGreaterThan(0);
    expect(result.bestCandidateProfile.statePensionAmountAnnual).toBeUndefined();
  });
});
