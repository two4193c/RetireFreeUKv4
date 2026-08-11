import { describe, it, expect } from 'vitest';
import { solveMaximizedSpend, createCandidateProfile, testFeasibility, disableMaximizedSpend, getScopeEvaluationInputs } from '../maximizedSpendSolver';
import { calculateUKTax } from '../ukTaxEngine';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../defaultData';
import { InvestmentPots } from '../../types';

describe('maximizedSpendSolver', () => {
  it('solves for a higher sustainable annual spend when wealth is ample', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 15000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const result = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
    });

    expect(result.maxAnnualIncome).toBeGreaterThan(15000);
    expect(result.finalPotAtTargetAge).toBeGreaterThanOrEqual(0);
    expect(result.targetEndAge).toBe(95);
    expect(result.extraLifetimeSpend).toBeGreaterThan(0);
  });

  it('respects custom legacy buffer', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const resultZero = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
    });

    const resultBuffer = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 200000,
    });

    // Requiring a £200k legacy buffer at age 95 should yield a lower max annual spend than £0 buffer
    expect(resultBuffer.maxAnnualIncome).toBeLessThan(resultZero.maxAnnualIncome);
    expect(resultBuffer.finalPotAtTargetAge).toBeGreaterThanOrEqual(199900);
  });

  it('supports front-loaded spending pattern', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 30000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const result = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'front_loaded',
    });

    expect(result.maxAnnualIncome).toBeGreaterThan(0);
    expect(result.phaseIncomes?.goGoIncome).toBe(Math.round(result.maxAnnualIncome * 1.2));
  });

  it('restores baseline income requirements when disableMaximizedSpend is called', () => {
    const originalProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 12000,
      spendingPhases: {
        enabled: false,
      },
    };

    const solverResult = solveMaximizedSpend({
      profile: originalProfile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
    });

    const activeSolverProfile = solverResult.bestCandidateProfile;
    expect(activeSolverProfile.maximizedSpendConfig?.enabled).toBe(true);
    expect(activeSolverProfile.targetRetirementIncomeAnnual).toBeGreaterThan(12000);

    const revertedProfile = disableMaximizedSpend(activeSolverProfile);
    expect(revertedProfile.maximizedSpendConfig?.enabled).toBe(false);
    expect(revertedProfile.targetRetirementIncomeAnnual).toBe(12000);
    expect(revertedProfile.spendingPhases?.enabled).toBe(false);
  });

  it('produces identical result when re-running solver on an already max-enabled profile', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const firstRun = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'proportional_phases',
    });

    const secondRun = solveMaximizedSpend({
      profile: firstRun.bestCandidateProfile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
    });

    expect(secondRun.maxAnnualIncome).toEqual(firstRun.maxAnnualIncome);
    expect(secondRun.originalAnnualIncome).toEqual(firstRun.originalAnnualIncome);
  });

  it('solves maximized spend accurately when reinvest excess drawdown option is enabled', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const amplePots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 600000,
      sippBalance: 200000,
      stocksAndSharesIsaBalance: 100000,
    };

    const resOff = solveMaximizedSpend({
      profile,
      pots: amplePots,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
      reinvestExcessDrawdown: false,
    });

    const resOn = solveMaximizedSpend({
      profile,
      pots: amplePots,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
      reinvestExcessDrawdown: true,
      actualSpendingTargetAnnual: 25000,
      reinvestDestinationPot: 'isa',
    });

    expect(resOn.maxAnnualIncome).toEqual(resOff.maxAnnualIncome);
    expect(resOn.reinvestExcessDetails).toBeDefined();
    expect(resOn.reinvestExcessDetails?.enabled).toBe(true);
    expect(resOn.reinvestExcessDetails?.annualSurplusReinvested).toBe(resOff.maxAnnualIncome - 25000);
  });

  it('solves maximized spend with guaranteed annuity floor target option', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 65,
      lifeExpectancyAge: 95,
      protectedPensionAccessAge: 57,
    };

    const result = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
      annuityFloorMode: 'target_floor',
      annuityFloorIncomeTarget: 15000,
      annuityFloorAge: 65,
      annuityRatePercent: 6.0,
      annuityType: 'inflation_linked_single',
    });

    expect(result.maxAnnualIncome).toBeGreaterThan(15000);
    expect(result.annuityFloorDetails).toBeDefined();
    expect(result.annuityFloorDetails?.mode).toBe('target_floor');
    expect(result.annuityFloorDetails?.guaranteedAnnualIncome).toBeGreaterThan(0);
    expect(result.annuityFloorDetails?.pensionPotAllocated).toBeGreaterThan(0);
    expect(result.bestCandidateProfile.incomeProductOption).toBe('hybrid');
  });

  it('persists solver settings (targetEndAge, targetLegacyBuffer, spendingPattern, annuityFloor) into maximizedSpendConfig', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
    };

    const result = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 90,
      targetLegacyBuffer: 50000,
      spendingPattern: 'front_loaded',
      annuityFloorMode: 'target_floor',
      annuityFloorIncomeTarget: 12000,
      annuityFloorAge: 65,
      annuityRatePercent: 5.5,
      annuityType: 'level_single',
      annuityDurationOption: 'lifetime',
    });

    const candidateConfig = result.bestCandidateProfile.maximizedSpendConfig;
    expect(candidateConfig).toBeDefined();
    expect(candidateConfig?.targetEndAge).toBe(90);
    expect(candidateConfig?.targetLegacyBuffer).toBe(50000);
    expect(candidateConfig?.spendingPattern).toBe('front_loaded');
    expect(candidateConfig?.annuityFloorMode).toBe('target_floor');
    expect(candidateConfig?.annuityFloorIncomeTarget).toBe(12000);
    expect(candidateConfig?.annuityFloorAge).toBe(65);
    expect(candidateConfig?.annuityRatePercent).toBe(5.5);
    expect(candidateConfig?.annuityType).toBe('level_single');

    // Re-running solveMaximizedSpend with only the updated profile should pick up the persisted settings automatically
    const reRun = solveMaximizedSpend({
      profile: result.bestCandidateProfile,
      pots: DEFAULT_POTS,
    });

    expect(reRun.targetEndAge).toBe(90);
    expect(reRun.targetLegacyBuffer).toBe(50000);
    expect(reRun.spendingPattern).toBe('front_loaded');
    expect(reRun.annuityFloorDetails?.mode).toBe('target_floor');
  });

  it('supports couple mode solver scopes (as a couple, primary only, partner only)', () => {
    const coupleProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Sam',
      targetRetirementIncomeAnnual: 40000,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 60,
      lifeExpectancyAge: 95,
      partnerLifeExpectancyAge: 95,
      partnerPots: {
        ...DEFAULT_PARTNER_POTS,
        workplacePensionBalance: 150000,
        sippBalance: 50000,
        stocksAndSharesIsaBalance: 40000,
        cashIsaBalance: 10000,
        lisaBalance: 0,
        giaBalance: 0,
        cashSavingsBalance: 5000,
      },
    };

    const couplePots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
      sippBalance: 100000,
      stocksAndSharesIsaBalance: 60000,
      cashIsaBalance: 20000,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 10000,
    };

    // 1. Solve as a Couple
    const coupleResult = solveMaximizedSpend({
      profile: coupleProfile,
      pots: couplePots,
      coupleScope: 'couple',
    });

    expect(coupleResult.coupleScope).toBe('couple');
    expect(coupleResult.bestCandidateProfile.maximizedSpendConfig?.coupleScope).toBe('couple');

    // 2. Solve Primary Only
    const primaryResult = solveMaximizedSpend({
      profile: coupleProfile,
      pots: couplePots,
      coupleScope: 'primary',
    });

    expect(primaryResult.coupleScope).toBe('primary');
    expect(primaryResult.bestCandidateProfile.maximizedSpendConfig?.coupleScope).toBe('primary');

    // 3. Solve Partner Only
    const partnerResult = solveMaximizedSpend({
      profile: coupleProfile,
      pots: couplePots,
      coupleScope: 'partner',
    });

    expect(partnerResult.coupleScope).toBe('partner');
    expect(partnerResult.bestCandidateProfile.maximizedSpendConfig?.coupleScope).toBe('partner');

    // Combined couple max spend should be higher than primary priority or partner priority alone
    expect(coupleResult.maxAnnualIncome).toBeGreaterThan(primaryResult.maxAnnualIncome);
    expect(coupleResult.maxAnnualIncome).toBeGreaterThan(partnerResult.maxAnnualIncome);
  });

  it('solves maximized spend with fixed-term escalating annuity floor', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
      protectedPensionAccessAge: 57,
    };

    const result = solveMaximizedSpend({
      profile,
      pots: DEFAULT_POTS,
      targetEndAge: 95,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
      annuityFloorMode: 'custom_percent',
      annuityFloorPercent: 30,
      annuityFloorAge: 60,
      annuityRatePercent: 5.5,
      annuityType: 'fixed_increase_single_3',
      annuityDurationOption: 'until_age',
      annuityDurationUntilAge: 75,
    });

    expect(result.maxAnnualIncome).toBeGreaterThan(0);
    expect(result.annuityFloorDetails).toBeDefined();
    expect(result.annuityFloorDetails?.annuityType).toBe('fixed_increase_single_3');
    expect(result.annuityFloorDetails?.annuityDurationOption).toBe('until_age');
    expect(result.annuityFloorDetails?.annuityDurationUntilAge).toBe(75);
  });

  it('runs on Plan 55 scenario and returns reasonable results', () => {
    const plan55Profile: any = {
      dateOfBirth: "1975-11-04",
      currentAge: 50,
      targetRetirementAge: 55,
      lifeExpectancyAge: 90,
      statePensionAge: 67,
      includeStatePension: true,
      enableTripleLock: true,
      statePensionAmountAnnual: 12547.6,
      fullStatePensionAmount: 12547.6,
      qualifyingYears: 35,
      grossAnnualSalary: 112000,
      isCouplePlanning: true,
      partnerName: "Natahsa",
      partnerDateOfBirth: "1976-08-08",
      partnerCurrentAge: 49,
      partnerTargetRetirementAge: 57,
      partnerStatePensionAge: 67,
      partnerIncludeStatePension: true,
      partnerEnableTripleLock: true,
      partnerStatePensionAmountAnnual: 12547.6,
      partnerFullStatePensionAmount: 12547.6,
      partnerQualifyingYears: 35,
      partnerGrossAnnualSalary: 0,
      partnerWorkplacePensionBalance: 0,
      partnerSippBalance: 143000,
      partnerIsaBalance: 22000,
      partnerPots: {
        workplacePensionBalance: 0,
        workplacePensionMonthlyEmployee: 0,
        workplacePensionMonthlyEmployeeType: "percent",
        employerMatchPercentage: 0,
        sippBalance: 143000,
        sippMonthlyContribution: 0,
        stocksAndSharesIsaBalance: 22000,
        stocksAndSharesIsaMonthlyContribution: 0,
        cashIsaBalance: 22000,
        cashIsaMonthlyContribution: 0,
        lisaBalance: 0,
        lisaMonthlyContribution: 0,
        giaBalance: 0,
        giaMonthlyContribution: 0,
        cashSavingsBalance: 0,
        cashSavingsMonthlyContribution: 0
      },
      taxRegion: "england_ni_wales",
      customTaxBands: { enabled: false },
      pensionContributionMethod: "salary_sacrifice",
      targetRetirementIncomeAnnual: 1000000,
      spendingPhases: {
        enabled: false,
        customRanges: [
          { id: "range-isa-bridge", name: "ISA Bridge Years", startAge: 55, endAge: 56, annualTargetIncome: 32000 },
          { id: "range-1", name: "Go-Go Years (Active)", startAge: 57, endAge: 74, annualTargetIncome: 45000 },
          { id: "range-2", name: "Slow-Go Years (Paced)", startAge: 75, endAge: 84, annualTargetIncome: 35000 },
          { id: "range-3", name: "No-Go Years (Home/Quiet)", startAge: 85, annualTargetIncome: 25000 }
        ],
        goGoEndAge: 56,
        goGoIncomeAnnual: 1000000,
        slowGoEndAge: 74,
        slowGoIncomeAnnual: 1406250,
        noGoIncomeAnnual: 1093750
      },
      expectedInflationRate: 2.5,
      adjustForInflation: false,
      indexTaxBands: false,
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      pclsLumpSumPercent: 25,
      takeLumpSumAtStart: false,
      lumpSumTiming: "access_age",
      lsaProtectionType: "standard",
      customLsaAllowance: 268275,
      drawdownStrategy: "basic_rate_bracket",
      incomeProductOption: "flexi_drawdown",
      annuityAllocationPercent: 50,
      annuityType: "level_single",
      annuityRatePercent: 6,
      annuityDurationOption: "lifetime",
      annuityDurationUntilAge: 75,
      annuityTranches: [],
      partnerIncomeProductOption: "flexi_drawdown",
      partnerAnnuityAllocationPercent: 50,
      partnerAnnuityType: "inflation_linked_single",
      partnerAnnuityRatePercent: 4.2,
      partnerAnnuityDurationOption: "lifetime",
      partnerAnnuityDurationUntilAge: 75,
      partnerAnnuityTranches: [],
      dbPensions: [
        {
          id: "db_1785700757496",
          name: "Defined Benefit Scheme 1",
          owner: "primary",
          startAge: 60,
          annualIncome: 5000,
          taxFreeLumpSum: 30000,
          inflationLinked: true,
          enabled: true,
          targetPot: "cash_isa"
        }
      ],
      fixedIncomeStreams: [
        {
          id: "fixed_1785700774519",
          name: "Personal Independence Payment (PIP)",
          owner: "partner",
          type: "tax_free",
          annualAmount: 6000,
          startAge: 50,
          inflationLinked: false,
          enabled: true
        }
      ],
      oneOffContributions: [
        {
          id: "contrib_1785700483172",
          name: "Workplace Pension Monthly Contribution",
          owner: "primary",
          targetPot: "workplace_pension",
          frequency: "regular_monthly",
          grossAmount: 2890,
          startAge: 50,
          endAge: 55,
          workplaceContributionType: "fixed",
          employeePercent: 5,
          employerPercent: 3,
          enabled: true,
          employeeMonthlyAmount: 2890,
          employerMonthlyAmount: 0
        },
        {
          id: "contrib_1785700498837",
          name: "SIPP",
          owner: "primary",
          targetPot: "sipp",
          frequency: "regular_monthly",
          grossAmount: 400,
          startAge: 50,
          endAge: 55,
          enabled: true
        },
        {
          id: "contrib_1785700533984",
          name: "Regular Monthly SIPP Savings",
          owner: "partner",
          targetPot: "sipp",
          frequency: "regular_monthly",
          grossAmount: 240,
          startAge: 49,
          endAge: 57,
          enabled: true
        }
      ],
      decumulationLifeEvents: [],
      ihtSettings: { primaryResidenceValue: 270000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 },
      potReturnOverrides: { enabled: false },
      mortgage: { enabled: false },
      assetAllocationSplit: {
        enabled: true,
        accumulation: { equity: 100, bond: 0, cash: 0 },
        decumulation: { equity: 55, bond: 36, cash: 9 },
        assetClassReturns: { equityReturn: 8, bondReturn: 4, cashReturn: 2 }
      },
      name: "Richard",
      partnerDrawdownStrategy: "tax_free_bracket",
      annuityExcessReinvestOption: "stocks_and_shares_isa"
    };

    const plan55Pots = {
      workplacePensionBalance: 153000,
      workplacePensionMonthlyEmployee: 0,
      workplacePensionMonthlyEmployeeType: "percent",
      employerMatchPercentage: 0,
      sippBalance: 343000,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaBalance: 87000,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaBalance: 6600,
      cashIsaMonthlyContribution: 0,
      lisaBalance: 0,
      lisaMonthlyContribution: 0,
      giaBalance: 0,
      giaMonthlyContribution: 0,
      cashSavingsBalance: 0,
      cashSavingsMonthlyContribution: 0
    };

    const res = solveMaximizedSpend({
      profile: plan55Profile,
      pots: plan55Pots as any,
      targetEndAge: 90,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform',
    });

    console.log("Plan 55 Solver Result:", {
      maxAnnualIncome: res.maxAnnualIncome,
      finalPotAtTargetAge: res.finalPotAtTargetAge,
      depletedAge: res.projectionsWithMaxSpend.find(p => p.totalPot <= 1)?.age
    });

    expect(res.maxAnnualIncome).toBeGreaterThan(0);
  });

  it('runs on Freedom Kitty plan (scenario_1785588361044) and checks max spend', () => {
    const kittyProfile: any = {
      dateOfBirth: "1979-06-15",
      currentAge: 47,
      targetRetirementAge: 53,
      lifeExpectancyAge: 90,
      statePensionAge: 68,
      includeStatePension: true,
      enableTripleLock: true,
      statePensionAmountAnnual: 12547.6,
      fullStatePensionAmount: 12547.6,
      qualifyingYears: 35,
      grossAnnualSalary: 26437,
      isCouplePlanning: false,
      taxRegion: "england_ni_wales",
      pensionContributionMethod: "salary_sacrifice",
      targetRetirementIncomeAnnual: 12500,
      spendingPhases: { enabled: false },
      expectedInflationRate: 2,
      adjustForInflation: false,
      indexTaxBands: false,
      expectedInvestmentReturn: 8,
      postRetirementReturn: 5.5,
      pclsLumpSumPercent: 25,
      protectedPensionAccessAge: 57,
      drawdownStrategy: "pension_first",
      incomeProductOption: "flexi_drawdown",
      oneOffContributions: [
        {
          id: "contrib_1785526878900",
          name: "Workplace Pension Monthly Contribution",
          owner: "primary",
          targetPot: "workplace_pension",
          frequency: "regular_monthly",
          grossAmount: 0,
          startAge: 47,
          endAge: 53,
          workplaceContributionType: "percent",
          employeePercent: 2,
          employerPercent: 8,
          enabled: true
        },
        {
          id: "contrib_1785589003464",
          name: "Monthly to Savings",
          owner: "primary",
          targetPot: "cash_savings",
          frequency: "regular_monthly",
          grossAmount: 500,
          startAge: 47,
          endAge: 53,
          enabled: true
        }
      ],
      potTransfers: [
        {
          id: "transfer_1785588620655",
          name: "Saving to SIPP Pension Top-Up 2027",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "sipp",
          amount: 19000,
          transferDate: "2027-04-09",
          enabled: true
        },
        {
          id: "transfer_1785588672428",
          name: "Saving to SIPP Pension Top-Up 2028",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "sipp",
          amount: 19000,
          transferDate: "2028-04-09",
          enabled: true
        },
        {
          id: "transfer_1785594235528",
          name: "Savings to S&S ISA 2027",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "stocks_and_shares_isa",
          amount: 20000,
          transferDate: "2027-04-10",
          enabled: true
        },
        {
          id: "transfer_1785600513575",
          name: "Cash Savings to S&S ISA",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "stocks_and_shares_isa",
          amount: 20000,
          transferDate: "2028-05-06",
          enabled: true
        },
        {
          id: "transfer_1785600605450",
          name: "Saving to SIPP Pension Top-Up 2029",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "sipp",
          amount: 20000,
          transferDate: "2029-04-09",
          enabled: true
        },
        {
          id: "transfer_1785601051979",
          name: "Cash Savings to Cash ISA",
          owner: "primary",
          sourcePot: "cash_savings",
          destinationOwner: "primary",
          destinationPot: "cash_isa",
          amount: 20000,
          transferDate: "2029-04-11",
          enabled: true
        }
      ]
    };

    const kittyPots: any = {
      workplacePensionBalance: 1119,
      sippBalance: 23968,
      stocksAndSharesIsaBalance: 40394,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 84979
    };

    const res = solveMaximizedSpend({
      profile: kittyProfile,
      pots: kittyPots,
      targetEndAge: 90,
      targetLegacyBuffer: 0,
      spendingPattern: 'uniform'
    });

    console.log("Full Kitty Plan Solver Result:", {
      maxAnnualIncome: res.maxAnnualIncome,
      finalPotAtTargetAge: res.finalPotAtTargetAge,
      depletedAge: res.projectionsWithMaxSpend.find(p => (p.incomeShortfall || 0) > 50)?.age
    });

    expect(res.maxAnnualIncome).toBeGreaterThan(0);
  });

  it('runs through all 6 attached scenarios and verifies drawdown and pot projections', () => {
    const scenarios = [
      {
        id: "preset_standard",
        name: "Balanced Mid-Career (£65k Salary)",
        profile: {
          dateOfBirth: "1989-06-15", currentAge: 35, targetRetirementAge: 60, lifeExpectancyAge: 90, statePensionAge: 67, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 65000, isCouplePlanning: false, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 32000, expectedInflationRate: 2.5, adjustForInflation: false, indexTaxBands: false, expectedInvestmentReturn: 6.5, postRetirementReturn: 4.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, drawdownStrategy: "isa_first", incomeProductOption: "flexi_drawdown", dbPensions: [], fixedIncomeStreams: [], oneOffContributions: [], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 450000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: true, propertyName: "Primary Residence", propertyValue: 450000, currentBalance: 220000, interestRatePercent: 4.5, remainingTermYears: 20, remainingTermMonths: 0, repaymentType: "repayment", regularMonthlyOverpayment: 150, lumpSumOverpayments: [], payoffAtRetirement: false, payoffSourcePot: "pension_lump_sum", deductFromRetirementIncome: true }
        },
        pots: { workplacePensionBalance: 45000, sippBalance: 15000, stocksAndSharesIsaBalance: 25000, cashIsaBalance: 8000, lisaBalance: 4000, giaBalance: 0, cashSavingsBalance: 12000 }
      },
      {
        id: "preset_tax_trap",
        name: "High Earner (£115k Tax Trap Escape)",
        profile: {
          dateOfBirth: "1982-03-20", currentAge: 42, targetRetirementAge: 57, lifeExpectancyAge: 90, statePensionAge: 67, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 115000, isCouplePlanning: false, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 48000, expectedInflationRate: 2.5, adjustForInflation: false, indexTaxBands: true, expectedInvestmentReturn: 6.5, postRetirementReturn: 4.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, drawdownStrategy: "isa_first", incomeProductOption: "flexi_drawdown", dbPensions: [], fixedIncomeStreams: [], oneOffContributions: [], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 450000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: true, propertyName: "Primary Residence", propertyValue: 450000, currentBalance: 220000, interestRatePercent: 4.5, remainingTermYears: 20, remainingTermMonths: 0, repaymentType: "repayment", regularMonthlyOverpayment: 150, lumpSumOverpayments: [], payoffAtRetirement: false, payoffSourcePot: "pension_lump_sum", deductFromRetirementIncome: true }
        },
        pots: { workplacePensionBalance: 120000, sippBalance: 35000, stocksAndSharesIsaBalance: 65000, cashIsaBalance: 8000, lisaBalance: 4000, giaBalance: 0, cashSavingsBalance: 25000 }
      },
      {
        id: "preset_young_starter",
        name: "Early Career Starter (£38k Salary)",
        profile: {
          dateOfBirth: "1998-11-10", currentAge: 26, targetRetirementAge: 62, lifeExpectancyAge: 90, statePensionAge: 67, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 38000, isCouplePlanning: false, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 26000, expectedInflationRate: 2.5, adjustForInflation: false, indexTaxBands: true, expectedInvestmentReturn: 6.5, postRetirementReturn: 4.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, drawdownStrategy: "isa_first", incomeProductOption: "flexi_drawdown", dbPensions: [], fixedIncomeStreams: [], oneOffContributions: [], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 450000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: true, propertyName: "Primary Residence", propertyValue: 450000, currentBalance: 220000, interestRatePercent: 4.5, remainingTermYears: 20, remainingTermMonths: 0, repaymentType: "repayment", regularMonthlyOverpayment: 150, lumpSumOverpayments: [], payoffAtRetirement: false, payoffSourcePot: "pension_lump_sum", deductFromRetirementIncome: true }
        },
        pots: { workplacePensionBalance: 12000, sippBalance: 0, stocksAndSharesIsaBalance: 8000, cashIsaBalance: 3000, lisaBalance: 4000, giaBalance: 0, cashSavingsBalance: 6000 }
      },
      {
        id: "scenario_1785525569342",
        name: "Freedom Kitty - Kitty Plan",
        profile: {
          dateOfBirth: "1979-06-15", currentAge: 47, targetRetirementAge: 53, lifeExpectancyAge: 90, statePensionAge: 68, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 26437, isCouplePlanning: false, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 89122, spendingPhases: { enabled: false, goGoEndAge: 63, goGoIncomeAnnual: 89122, slowGoEndAge: 73, slowGoIncomeAnnual: 74268, noGoIncomeAnnual: 59414 }, expectedInflationRate: 2, adjustForInflation: false, indexTaxBands: false, expectedInvestmentReturn: 8, postRetirementReturn: 5.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, protectedPensionAccessAge: 57, drawdownStrategy: "pension_first", incomeProductOption: "flexi_drawdown", dbPensions: [], fixedIncomeStreams: [], oneOffContributions: [ { id: "contrib_1785526878900", name: "Workplace Pension Monthly Contribution", owner: "primary", targetPot: "workplace_pension", frequency: "regular_monthly", grossAmount: 0, startAge: 47, endAge: 53, workplaceContributionType: "percent", employeePercent: 2, employerPercent: 8, enabled: true }, { id: "contrib_1785588160044", name: "Regular Monthly SIPP Savings", owner: "primary", targetPot: "stocks_and_shares_isa", frequency: "regular_monthly", grossAmount: 500, startAge: 48, endAge: 49, enabled: true }, { id: "contrib_1785588296050", name: "Regular Monthly SIPP Savings", owner: "primary", targetPot: "sipp", frequency: "regular_monthly", grossAmount: 500, startAge: 49, endAge: 53, enabled: true } ], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 100000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: true, propertyName: "Primary Residence", propertyValue: 200000, currentBalance: 76896, interestRatePercent: 3.72, remainingTermYears: 17, remainingTermMonths: 0, repaymentType: "repayment", regularMonthlyOverpayment: 0, lumpSumOverpayments: [], payoffAtRetirement: false, payoffSourcePot: "pension_lump_sum", deductFromRetirementIncome: true }, lumpSumTargetPot: "stocks_and_shares_isa", name: "Kitty", potTransfers: [ { id: "transfer_1785590974926", name: "Cash Savings to Cash ISA", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "sipp", amount: 19000, transferDate: "2027-04-10", enabled: true } ]
        },
        pots: { workplacePensionBalance: 1119, sippBalance: 23968, stocksAndSharesIsaBalance: 40394, cashIsaBalance: 0, lisaBalance: 0, giaBalance: 0, cashSavingsBalance: 84979 }
      },
      {
        id: "scenario_1785588361044",
        name: "Freedom Kitty - New Plan",
        profile: {
          dateOfBirth: "1979-06-15", currentAge: 47, targetRetirementAge: 53, lifeExpectancyAge: 90, statePensionAge: 68, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 26437, isCouplePlanning: false, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 24067, spendingPhases: { enabled: false }, expectedInflationRate: 2, adjustForInflation: false, indexTaxBands: false, expectedInvestmentReturn: 8, postRetirementReturn: 5.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, protectedPensionAccessAge: 57, drawdownStrategy: "pension_first", incomeProductOption: "flexi_drawdown", dbPensions: [], fixedIncomeStreams: [], oneOffContributions: [ { id: "contrib_1785526878900", name: "Workplace Pension Monthly Contribution", owner: "primary", targetPot: "workplace_pension", frequency: "regular_monthly", grossAmount: 0, startAge: 47, endAge: 53, workplaceContributionType: "percent", employeePercent: 2, employerPercent: 8, enabled: true }, { id: "contrib_1785589003464", name: "Monthly to Savings", owner: "primary", targetPot: "cash_savings", frequency: "regular_monthly", grossAmount: 500, startAge: 47, endAge: 53, enabled: true } ], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 100000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: true, propertyName: "Primary Residence", propertyValue: 200000, currentBalance: 76896, interestRatePercent: 3.72, remainingTermYears: 17, remainingTermMonths: 0, repaymentType: "repayment", regularMonthlyOverpayment: 0, lumpSumOverpayments: [], payoffAtRetirement: false, payoffSourcePot: "pension_lump_sum", deductFromRetirementIncome: true }, lumpSumTargetPot: "stocks_and_shares_isa", name: "Kitty", potTransfers: [ { id: "transfer_1785588620655", name: "Saving to SIPP Pension Top-Up 2027", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "sipp", amount: 19000, transferDate: "2027-04-09", enabled: true }, { id: "transfer_1785588672428", name: "Saving to SIPP Pension Top-Up 2028", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "sipp", amount: 19000, transferDate: "2028-04-09", enabled: true }, { id: "transfer_1785594235528", name: "Savings to S&S ISA 2027", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "stocks_and_shares_isa", amount: 20000, transferDate: "2027-04-10", enabled: true }, { id: "transfer_1785600513575", name: "Cash Savings to S&S ISA", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "stocks_and_shares_isa", amount: 20000, transferDate: "2028-05-06", enabled: true }, { id: "transfer_1785600605450", name: "Saving to SIPP Pension Top-Up 2029", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "sipp", amount: 20000, transferDate: "2029-04-09", enabled: true }, { id: "transfer_1785601051979", name: "Cash Savings to Cash ISA", owner: "primary", sourcePot: "cash_savings", destinationOwner: "primary", destinationPot: "cash_isa", amount: 20000, transferDate: "2029-04-11", enabled: true } ]
        },
        pots: { workplacePensionBalance: 1119, sippBalance: 23968, stocksAndSharesIsaBalance: 40394, cashIsaBalance: 0, lisaBalance: 0, giaBalance: 0, cashSavingsBalance: 84979 }
      },
      {
        id: "scenario_1785699716793",
        name: "Plan 55 Drawdown Basic and Tax Free",
        profile: {
          dateOfBirth: "1975-11-04", currentAge: 50, targetRetirementAge: 55, lifeExpectancyAge: 90, statePensionAge: 67, includeStatePension: true, enableTripleLock: true, statePensionAmountAnnual: 12547.6, fullStatePensionAmount: 12547.6, qualifyingYears: 35, grossAnnualSalary: 112000, isCouplePlanning: true, partnerName: "Natahsa", partnerDateOfBirth: "1976-08-08", partnerCurrentAge: 49, partnerTargetRetirementAge: 57, partnerStatePensionAge: 67, partnerIncludeStatePension: true, partnerEnableTripleLock: true, partnerStatePensionAmountAnnual: 12547.6, partnerFullStatePensionAmount: 12547.6, partnerQualifyingYears: 35, partnerGrossAnnualSalary: 0, partnerWorkplacePensionBalance: 0, partnerSippBalance: 143000, partnerIsaBalance: 22000, partnerPots: { workplacePensionBalance: 0, sippBalance: 143000, stocksAndSharesIsaBalance: 22000, cashIsaBalance: 22000 }, taxRegion: "england_ni_wales", pensionContributionMethod: "salary_sacrifice", targetRetirementIncomeAnnual: 86541, spendingPhases: { enabled: false, customRanges: [ { id: "range-isa-bridge", name: "ISA Bridge Years", startAge: 55, endAge: 56, annualTargetIncome: 32000 }, { id: "range-1", name: "Go-Go Years (Active)", startAge: 57, endAge: 74, annualTargetIncome: 45000 }, { id: "range-2", name: "Slow-Go Years (Paced)", startAge: 75, endAge: 84, annualTargetIncome: 35000 }, { id: "range-3", name: "No-Go Years (Home/Quiet)", startAge: 85, annualTargetIncome: 25000 } ] }, expectedInflationRate: 2.5, adjustForInflation: false, indexTaxBands: false, expectedInvestmentReturn: 6.5, postRetirementReturn: 4.5, pclsLumpSumPercent: 25, takeLumpSumAtStart: false, lumpSumTiming: "access_age", lsaProtectionType: "standard", customLsaAllowance: 268275, drawdownStrategy: "basic_rate_bracket", incomeProductOption: "flexi_drawdown", dbPensions: [ { id: "db_1785700757496", name: "Defined Benefit Scheme 1", owner: "primary", startAge: 60, annualIncome: 5000, taxFreeLumpSum: 30000, inflationLinked: true, enabled: true, targetPot: "cash_isa" } ], fixedIncomeStreams: [ { id: "fixed_1785700774519", name: "Personal Independence Payment (PIP)", owner: "partner", type: "tax_free", annualAmount: 6000, startAge: 50, inflationLinked: false, enabled: true } ], oneOffContributions: [ { id: "contrib_1785700483172", name: "Workplace Pension Monthly Contribution", owner: "primary", targetPot: "workplace_pension", frequency: "regular_monthly", grossAmount: 2890, startAge: 50, endAge: 55, workplaceContributionType: "fixed", employeePercent: 5, employerPercent: 3, enabled: true, employeeMonthlyAmount: 2890, employerMonthlyAmount: 0 }, { id: "contrib_1785700498837", name: "SIPP", owner: "primary", targetPot: "sipp", frequency: "regular_monthly", grossAmount: 400, startAge: 50, endAge: 55, enabled: true }, { id: "contrib_1785700533984", name: "Regular Monthly SIPP Savings", owner: "partner", targetPot: "sipp", frequency: "regular_monthly", grossAmount: 240, startAge: 49, endAge: 57, enabled: true } ], decumulationLifeEvents: [], ihtSettings: { primaryResidenceValue: 270000, annualPropertyGrowthPercent: 3, otherTaxableAssets: 50000 }, potReturnOverrides: { enabled: false }, mortgage: { enabled: false }, assetAllocationSplit: { enabled: true, accumulation: { equity: 100, bond: 0, cash: 0 }, decumulation: { equity: 55, bond: 36, cash: 9 }, assetClassReturns: { equityReturn: 8, bondReturn: 4, cashReturn: 2 } }, name: "Richard", partnerDrawdownStrategy: "tax_free_bracket"
        },
        pots: { workplacePensionBalance: 153000, sippBalance: 343000, stocksAndSharesIsaBalance: 87000, cashIsaBalance: 6600, lisaBalance: 0, giaBalance: 0, cashSavingsBalance: 0 }
      }
    ];

    for (const sc of scenarios) {
      const pattern = sc.profile.spendingPhases?.customRanges ? 'proportional_phases' : 'uniform';
      const res = solveMaximizedSpend({
        profile: sc.profile as any,
        pots: sc.pots as any,
        targetEndAge: sc.profile.lifeExpectancyAge || 90,
        targetLegacyBuffer: 0,
        spendingPattern: pattern,
      });

      console.log(`=== SCENARIO: ${sc.name} (${sc.id}) [Pattern: ${pattern}] ===`);
      console.log(`Max Base Annual Income Solved: £${res.maxAnnualIncome.toLocaleString()}/yr`);
      console.log(`Original Annual Income: £${res.originalAnnualIncome.toLocaleString()}/yr`);
      console.log(`Final Pot at Age ${res.targetEndAge}: £${res.finalPotAtTargetAge.toLocaleString()}`);

      const retAge = sc.profile.targetRetirementAge;
      const sampleAges = [retAge, retAge + 5, retAge + 10, 67, 75, 85, res.targetEndAge].filter((a, idx, arr) => a >= retAge && a <= res.targetEndAge && arr.indexOf(a) === idx).sort((a,b) => a-b);

      const table = sampleAges.map(age => {
        const row = res.projectionsWithMaxSpend.find(p => p.age === age);
        return {
          age,
          year: row?.year,
          targetRetIncome: row?.targetRetirementIncome,
          netRetIncome: row?.netRetirementIncome,
          shortfall: row?.incomeShortfall,
          totalWithdrawal: row?.totalWithdrawalAmount,
          pensionDraw: row?.pensionDrawdown,
          isaDraw: row?.isaDrawdown,
          cashDraw: row?.cashDrawdown,
          statePension: row?.statePensionReceived,
          totalPot: row?.totalPot,
          pensionPot: row?.pensionPot,
          isaPot: row?.isaPot,
          cashGiaPot: row?.cashGiaPot,
        };
      });
      console.table(table);
    }
  });

  it('prepares single scope evaluation inputs correctly in getScopeEvaluationInputs', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      currentAge: 50,
      partnerCurrentAge: 52,
      partnerTargetRetirementAge: 60,
      partnerStatePensionAmountAnnual: 11000,
      partnerPots: {
        ...DEFAULT_POTS,
        workplacePensionBalance: 150000,
        stocksAndSharesIsaBalance: 40000,
      },
    };
    const pots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 250000,
      stocksAndSharesIsaBalance: 80000,
    };

    // 1. Primary scope
    const primaryResult = getScopeEvaluationInputs(profile, pots, 'primary');
    expect(primaryResult.evalProfile.isCouplePlanning).toBe(false);
    expect(primaryResult.evalPots.workplacePensionBalance).toBe(250000);

    // 2. Partner scope
    const partnerResult = getScopeEvaluationInputs(profile, pots, 'partner');
    expect(partnerResult.evalProfile.isCouplePlanning).toBe(false);
    expect(partnerResult.evalProfile.currentAge).toBe(52);
    expect(partnerResult.evalProfile.targetRetirementAge).toBe(60);
    expect(partnerResult.evalPots.workplacePensionBalance).toBe(150000);
    expect(partnerResult.evalPots.stocksAndSharesIsaBalance).toBe(40000);
  });
});

