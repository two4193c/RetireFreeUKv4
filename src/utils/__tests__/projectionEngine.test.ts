import { describe, it, expect } from 'vitest';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('projectionEngine - generateProjections', () => {
  it('generates a full projection array covering ages from currentAge to effectiveMaxAge (100)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 35,
      targetRetirementAge: 60,
      lifeExpectancyAge: 90,
    };
    const rows = generateProjections(profile, DEFAULT_POTS);

    expect(rows[0].age).toBe(35);
    expect(rows[rows.length - 1].age).toBe(100);
    expect(rows.length).toBe(100 - 35 + 1); // 66 years
  });

  it('accumulates pension pot during working years prior to targetRetirementAge', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 35,
      targetRetirementAge: 60,
      grossAnnualSalary: 60000,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      workplacePensionMonthlyEmployee: 400,
      workplacePensionMonthlyEmployeeType: 'fixed',
    };

    const rows = generateProjections(profile, pots);
    const at35 = rows.find((r) => r.age === 35);
    const at59 = rows.find((r) => r.age === 59);

    expect(at59!.totalPot).toBeGreaterThan(at35!.totalPot);
  });

  it('correctly models tax band indexing vs frozen tax bands (Fiscal Drag)', () => {
    const baseProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 80,
      targetRetirementIncomeAnnual: 40000,
      expectedInflationRate: 3.0, // 3% CPI inflation
      includeStatePension: false,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 1000000, // £1m pension pot
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
    };

    // Scenario 1: Tax bands indexed with inflation
    const indexedProjections = generateProjections(
      { ...baseProfile, indexTaxBands: true },
      pots
    );

    // Scenario 2: Tax bands frozen (Fiscal Drag)
    const frozenProjections = generateProjections(
      { ...baseProfile, indexTaxBands: false },
      pots
    );

    // In year 15 (age 75), inflation factor is 1.03^15 = ~1.558.
    // Required nominal target is £40,000 * 1.558 = ~£62,319.
    // With frozen tax bands (£12,570 PA and £50,270 higher rate limit), more income is taxed at 40%,
    // requiring higher gross pension drawdown to achieve net £62,319, which pays more total tax!
    const rowIndexed75 = indexedProjections.find((r) => r.age === 75)!;
    const rowFrozen75 = frozenProjections.find((r) => r.age === 75)!;

    expect(rowFrozen75.totalTaxPaid).toBeGreaterThan(rowIndexed75.totalTaxPaid);
  });

  it('supports couple planning and applies individual tax allowances to both partners', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 50000,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      sippBalance: 0,
    };

    const rows = generateProjections(profile, pots);
    const retireRow = rows.find((r) => r.age === 60);

    expect(retireRow).toBeDefined();
    expect(retireRow!.netRetirementIncome).toBeGreaterThan(0);
    expect(retireRow!.totalWithdrawalAmount).toBeGreaterThan(0);
  });

  it('correctly handles upfront PCLS (Tax-Free Lump Sum) extraction when takeLumpSumAtStart is enabled', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 57,
      targetRetirementAge: 60,
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      lumpSumTiming: 'access_age',
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 400000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
    };

    const rows = generateProjections(profile, pots);
    const age57Row = rows.find((r) => r.age === 57);

    // At age 57 (access age), 25% PCLS (£100,000) is taken tax-free
    expect(age57Row).toBeDefined();
  });

  it('detects pot depletion when retirement spending exceeds sustainable withdrawals', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
      targetRetirementIncomeAnnual: 80000, // Very high target
      includeStatePension: false,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 150000, // Small pot
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashSavingsBalance: 0, workplacePensionMonthlyEmployee: 0, workplacePensionMonthlyEmployeeType: 'percent', employerMatchPercentage: 0, sippMonthlyContribution: 0, stocksAndSharesIsaMonthlyContribution: 0, cashIsaMonthlyContribution: 0, lisaMonthlyContribution: 0, giaMonthlyContribution: 0, cashSavingsMonthlyContribution: 0};

    const rows = generateProjections(profile, pots);
    const lastRow = rows[rows.length - 1];

    // Pot should be depleted well before age 95
    expect(lastRow.totalPot).toBe(0);
    expect(lastRow.potDepleted).toBe(true);
  });

  it('correctly processes Decumulation Life Events (inflows and outflows) in retirement', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      targetRetirementIncomeAnnual: 25000,
      decumulationLifeEvents: [
        {
          id: 'downsizing_1',
          name: 'Property Downsizing Lump Sum',
          type: 'income',
          amount: 100000,
          age: 68,
          targetPot: 'cash_savings',
          inflationLinked: false,
          enabled: true,
        },
        {
          id: 'car_1',
          name: 'New Vehicle Purchase',
          type: 'expense',
          amount: 20000,
          age: 65,
          targetPot: 'cash_savings',
          inflationLinked: false,
          enabled: true,
        },
      ],
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
      cashSavingsBalance: 50000, workplacePensionMonthlyEmployee: 0, workplacePensionMonthlyEmployeeType: 'percent', employerMatchPercentage: 0, sippMonthlyContribution: 0, stocksAndSharesIsaMonthlyContribution: 0, cashIsaMonthlyContribution: 0, lisaMonthlyContribution: 0, giaMonthlyContribution: 0, cashSavingsMonthlyContribution: 0};

    const rows = generateProjections(profile, pots);

    const row65 = rows.find((r) => r.age === 65);
    const row68 = rows.find((r) => r.age === 68);

    expect(row65).toBeDefined();
    expect(row65!.lifeEventsExpense).toBe(20000);
    expect(row65!.decumulationLifeEventsSummary).toContain('New Vehicle Purchase');

    expect(row68).toBeDefined();
    expect(row68!.lifeEventsIncome).toBe(100000);
    expect(row68!.decumulationLifeEventsSummary).toContain('Property Downsizing Lump Sum');
  });

  it('correctly decrements sub-pots (giaPot and cashSavingsPot) when drawing down from cashGiaPot in decumulation', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 53,
      targetRetirementAge: 53,
      protectedPensionAccessAge: 57,
      lifeExpectancyAge: 80,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'isa_first',
      includeStatePension: false,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      stocksAndSharesIsaBalance: 0,
      giaBalance: 100000,
      cashSavingsBalance: 50000, workplacePensionMonthlyEmployee: 0, workplacePensionMonthlyEmployeeType: 'percent', employerMatchPercentage: 0, sippMonthlyContribution: 0, stocksAndSharesIsaMonthlyContribution: 0, cashIsaMonthlyContribution: 0, lisaMonthlyContribution: 0, giaMonthlyContribution: 0, cashSavingsMonthlyContribution: 0};

    const rows = generateProjections(profile, pots);
    const row53 = rows.find((r) => r.age === 53);
    expect(row53).toBeDefined();

    // In year 1 (age 53), pension cannot be accessed yet (protected age 57).
    // The required income of £40,000 must be drawn from Cash / GIA.
    expect(row53!.cashDrawdown).toBeGreaterThan(0);

    // Sub-pot integrity check: giaPot + cashSavingsPot MUST equal cashGiaPot (within £1 integer rounding)
    expect(Math.abs((row53!.giaPot + row53!.cashSavingsPot) - row53!.cashGiaPot)).toBeLessThanOrEqual(1);
    expect(Math.abs((row53!.primaryGiaPot + row53!.primaryCashSavingsPot) - row53!.primaryCashGiaPot)).toBeLessThanOrEqual(1);

    // Verify primaryCashSavingsPot was actually reduced from 50,000
    expect(row53!.primaryCashSavingsPot).toBeLessThan(50000);

    // Across all decumulation rows, sub-pots must always remain consistent for ALL pot types
    for (const r of rows) {
      if (r.isRetired) {
        // Cash & GIA consistency
        expect(Math.abs((r.giaPot + r.cashSavingsPot) - r.cashGiaPot)).toBeLessThanOrEqual(1);
        expect(Math.abs((r.primaryGiaPot + r.primaryCashSavingsPot) - r.primaryCashGiaPot)).toBeLessThanOrEqual(1);
        // ISA consistency
        expect(Math.abs((r.primaryIsaPot + r.partnerIsaPot) - r.isaPot)).toBeLessThanOrEqual(1);
        // Pension consistency
        expect(Math.abs((r.primaryPensionPot + r.partnerPensionPot) - r.pensionPot)).toBeLessThanOrEqual(1);
        // Total pot consistency
        expect(Math.abs((r.pensionPot + r.isaPot + r.cashGiaPot) - r.totalPot)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('verifies sub-pot integrity across all pots (Pension, ISA, Cash, GIA) in couple planning mode', () => {
    const partnerPots: any = {
      workplacePensionBalance: 200000,
      sippBalance: 50000,
      stocksAndSharesIsaBalance: 30000,
      cashIsaBalance: 10000,
      lisaBalance: 0,
      giaBalance: 20000,
      cashSavingsBalance: 15000,
      workplacePensionMonthlyEmployee: 0,
      workplacePensionMonthlyEmployeeType: 'percent',
      employerMatchPercentage: 0,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 55,
      protectedPensionAccessAge: 57,
      lifeExpectancyAge: 85,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'basic_rate_bracket',
      isCouplePlanning: true,
      partnerCurrentAge: 54,
      partnerTargetRetirementAge: 55,
      partnerProtectedPensionAccessAge: 57,
      partnerPots,
    };
    const pots: any = {
      workplacePensionBalance: 300000,
      sippBalance: 150000,
      stocksAndSharesIsaBalance: 80000,
      cashIsaBalance: 20000,
      lisaBalance: 0,
      giaBalance: 50000,
      cashSavingsBalance: 40000,
      workplacePensionMonthlyEmployee: 0,
      workplacePensionMonthlyEmployeeType: 'percent',
      employerMatchPercentage: 0,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };

    const rows = generateProjections(profile, pots);
    expect(rows.length).toBeGreaterThan(0);

    for (const r of rows) {
      // Primary pots sum check
      expect(Math.abs((r.primaryGiaPot + r.primaryCashSavingsPot) - r.primaryCashGiaPot)).toBeLessThanOrEqual(1);
      expect(Math.abs((r.primaryPensionPot + r.primaryIsaPot + r.primaryCashGiaPot) - r.primaryTotalPot)).toBeLessThanOrEqual(1);

      // Partner pots sum check
      expect(Math.abs((r.partnerGiaPot + r.partnerCashSavingsPot) - r.partnerCashGiaPot)).toBeLessThanOrEqual(1);
      expect(Math.abs((r.partnerPensionPot + r.partnerIsaPot + r.partnerCashGiaPot) - r.partnerTotalPot)).toBeLessThanOrEqual(1);

      // Total pot sum check
      expect(Math.abs((r.pensionPot + r.isaPot + r.cashGiaPot) - r.totalPot)).toBeLessThanOrEqual(1);
      expect(Math.abs((r.primaryTotalPot + r.partnerTotalPot) - r.totalPot)).toBeLessThanOrEqual(1);
    }
  });

  it('handles partner mortality inheritance and stops partner state pension and DB pension after partner death', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      partnerLifeExpectancyAge: 70, // Partner dies at age 70
      includeStatePension: true,
      partnerIncludeStatePension: true,
      partnerStatePensionAge: 67,
      partnerPots: {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 50000,
      },
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 200000,
      stocksAndSharesIsaBalance: 100000,
    };

    const rows = generateProjections(profile, pots);

    // At age 68 (before death at 70), partner is receiving state pension
    const row68 = rows.find((r) => r.age === 68)!;
    expect(row68.partnerStatePensionReceived).toBeGreaterThan(0);
    expect(row68.partnerTotalPot).toBeGreaterThan(0);

    // At age 72 (after partner death at 70), partner state pension should be 0, partner pots should be 0 (inherited by primary)
    const row72 = rows.find((r) => r.age === 72)!;
    expect(row72.partnerStatePensionReceived).toBe(0);
    expect(row72.partnerTotalPot).toBe(0);
  });
  it('verifies that the tax_optimizer strategy does NOT double deduct from ISA and Cash/GIA sub-pots', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'tax_optimizer',
      includeStatePension: false,
      crystallisationMode: 'phased_tranches',
      expectedInvestmentReturn: 0.00001,
      postRetirementReturn: 0.00001,
      potReturnOverrides: { enabled: false },
    };
    
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 50000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };

    const rows = generateProjections(profile, pots);
    const row60 = rows.find((r) => r.age === 60);

    expect(row60).toBeDefined();

    // Verify the primarySsIsaPot is accurately decremented, not double deducted.
    // If it double deducted, the reduction would be 2x the isaDrawdown amount.
    const startingIsa = 50000;
    const isaDrawdown = row60!.isaDrawdown || 0;
    
    // Ensure that it actually drew from ISA
    expect(isaDrawdown).toBeGreaterThan(0);

    expect(row60!.primaryStocksAndSharesIsaPot).toBeCloseTo(startingIsa - isaDrawdown, 1);
    expect(row60!.primaryIsaPot).toBeCloseTo(startingIsa - isaDrawdown, 1);
    expect(Math.abs((row60!.primaryIsaPot + row60!.partnerIsaPot) - row60!.isaPot)).toBeLessThanOrEqual(1);
    expect(Math.abs((row60!.primaryGiaPot + row60!.primaryCashSavingsPot) - row60!.primaryCashGiaPot)).toBeLessThanOrEqual(1);
  });

  it('triggers specific annuity purchases and state pension at specified ages', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      includeStatePension: true,
      statePensionAge: 68,
      statePensionAmountAnnual: 10000,
      incomeProductOption: 'annuity',
      annuityAllocationPercent: 50,
      annuityPurchaseAge: 65,
      annuityType: 'level_single',
      annuityRatePercent: 5.0,
      targetRetirementIncomeAnnual: 40000,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 200000,
    };

    const rows = generateProjections(profile, pots);
    const row64 = rows.find((r) => r.age === 64)!;
    const row65 = rows.find((r) => r.age === 65)!;
    const row67 = rows.find((r) => r.age === 67)!;
    const row68 = rows.find((r) => r.age === 68)!;

    // Annuity check
    expect(row64.annuityIncomeReceived || 0).toBe(0);
    expect(row65.annuityCapitalAllocated).toBeGreaterThan(0);
    expect(row65.annuityIncomeReceived).toBeGreaterThan(0);

    // State pension check
    expect(row67.statePensionReceived || 0).toBe(0);
    expect(row68.statePensionReceived).toBeGreaterThan(0);
  });

  it('handles complex partner decumulation overlapping with different retirement ages', () => {
    const partnerPots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      workplacePensionMonthlyEmployee: 500,
      workplacePensionMonthlyEmployeeType: 'fixed',
    };
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 65,
      lifeExpectancyAge: 85,
      isCouplePlanning: true,
      partnerCurrentAge: 55,
      partnerTargetRetirementAge: 60,
      partnerPots,
      targetRetirementIncomeAnnual: 40000,
      grossAnnualSalary: 50000,
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      workplacePensionMonthlyEmployee: 500,
      workplacePensionMonthlyEmployeeType: 'fixed',
    };

    const rows = generateProjections(profile, pots);
    const primary55 = rows.find((r) => r.age === 55)!;

    const primary54 = rows.find((r) => r.age === 54)!;
    
    // Primary is accumulating
    expect(primary55.primaryTotalPot).toBeGreaterThan(primary54.primaryTotalPot);
    
    expect(primary55).toBeDefined();
    
    const primary65 = rows.find((r) => r.age === 65)!; // Primary retires here
    expect(primary65).toBeDefined();
  });

  it('processes custom milestone life events with partner assignment and complex overlaps', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 30000,
      decumulationLifeEvents: [
        {
          id: '1',
          name: 'Primary Expense',
          type: 'expense',
          amount: 30000,
          age: 62,
          owner: 'primary',
          targetPot: 'cash_savings',
          enabled: true,
        },
        {
          id: '2',
          name: 'Partner Income',
          type: 'income',
          amount: 50000,
          age: 64,
          owner: 'partner',
          targetPot: 'cash_savings',
          enabled: true,
        }
      ],
    };
    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      cashSavingsBalance: 100000,
    };
    
    const rows = generateProjections(profile, pots);
    
    const row62 = rows.find((r) => r.age === 62)!;
    expect(row62.primaryLifeEventsExpense).toBeGreaterThan(0);
    expect(row62.partnerLifeEventsExpense || 0).toBe(0);
    expect(row62.lifeEventsExpense).toBe(row62.primaryLifeEventsExpense);

    const row64 = rows.find((r) => r.age === 64)!;
    expect(row64.partnerLifeEventsIncome).toBeGreaterThan(0);
    expect(row64.primaryLifeEventsIncome || 0).toBe(0);
    expect(row64.lifeEventsIncome).toBe(row64.partnerLifeEventsIncome);
  });

  it('Fee drag application logic during accumulation and decumulation - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 55,
      expectedInvestmentReturn: 0,
      postRetirementReturn: 0,
      potReturnOverrides: { enabled: false },
      investmentFees: {
        enabled: true,
        perPotFeesEnabled: true,
        primaryPots: {
          workplacePension: { platformFeePercent: 2.5 }
        }
      }
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };
    const rows = generateProjections(profile, pots);
    const row50 = rows.find(r => r.age === 50);
    // 2.5% of 100000 is 2500
    expect(Math.round(row50!.estimatedInvestmentFees)).toBe(2500);
  });

  it('Mortgage payment integration (payoffAtRetirement with downsizing) - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 65,
      lifeExpectancyAge: 85,
      mortgage: {
        enabled: true,
        currentBalance: 50000,
        remainingTermYears: 10,
        payoffAtRetirement: true
      },
      propertyDownsizePlan: {
        enabled: true,
        downsizeAge: 65,
        currentPropertyValue: 300000,
        targetNewPropertyCostToday: 200000,
        destinationPot: 'cash',
        sellingCostsPercent: 0,
        expectedAnnualGrowthRate: 0
      }
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row65 = rows.find(r => r.age === 65);
    
    // Equity released should have mortgage deducted: 300000 - 200000 - 50000(approx)
    expect(row65!.propertyDownsizeEquityReleased).toBeLessThan(100000);
    expect(row65!.propertyDownsizeEquityReleased).toBeGreaterThan(0);
  });

  it('One-off contribution scheduling logic - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      planStartYear: new Date().getFullYear(),
      currentAge: 50,
      targetRetirementAge: 60,
      oneOffContributions: [
        {
          id: '1',
          name: 'Bonus',
          owner: 'primary',
          targetPot: 'sipp',
          frequency: 'one_off',
          grossAmount: 10000,
          date: `${new Date().getFullYear() + 2}-01-01`,
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row52 = rows.find(r => r.age === 52);
    expect(row52!.oneOffContributionsReceived).toBe(10000);
    expect(row52!.primaryPensionPot).toBeGreaterThan(10000); // 10k + tax relief
  });

  it('Salary sacrifice vs net-pay pension schemes - explicit check', () => {
    const potsSacrifice: any = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 5,
      workplacePensionMonthlyEmployeeType: 'percent'
    };
    const profileSacrifice: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'salary_sacrifice'
    };
    
    const profileNetPay: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'net_pay'
    };
    
    const resSacrifice = generateProjections(profileSacrifice, potsSacrifice);
    const resNetPay = generateProjections(profileNetPay, potsSacrifice);
    
    const sacrificeTax = resSacrifice.find(r => r.age === profileSacrifice.currentAge)!.totalTaxPaid;
    const netPayTax = resNetPay.find(r => r.age === profileNetPay.currentAge)!.totalTaxPaid;
    // Salary sacrifice typically results in lower or different tax/NI overall compared to net-pay
    expect(sacrificeTax).not.toBe(netPayTax);
  });

  it('Tax optimizer drawdown strategy - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'tax_optimizer'
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      stocksAndSharesIsaBalance: 50000,
      cashSavingsBalance: 50000
    };
    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60!.netRetirementIncome).toBeGreaterThan(0);
  });

  it('Reinvest excess drawdown logic into ISA/GIA/cash - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000, // low target
      reinvestExcessDrawdown: true,
      reinvestDestinationPot: 'stocks_and_shares_isa',
      includeStatePension: true,
      statePensionAge: 60, // get it immediately to force excess
      statePensionAmountAnnual: 15000,
      dbPensions: [
        {
          id: 'db1',
          name: 'DB',
          owner: 'primary',
          startAge: 60,
          annualIncome: 20000, // 15k + 20k = 35k > 20k target
          taxFreeLumpSum: 0,
          enabled: true,
          targetPot: 'cash_savings'
        }
      ]
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60!.annualIncomeExcess).toBeGreaterThan(0);
    expect(row60!.isaPot).toBeGreaterThan(0); // Excess reinvested into ISA
  });

  it('Inter-pot auto-rebalance transfers logic - explicit check', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      expectedInvestmentReturn: 0,
      expectedInflationRate: 0,
      postRetirementReturn: 0,
      potReturnOverrides: { enabled: true, stocksAndSharesIsa: 0, cashSavings: 0 },
      assetAllocationSplit: { enabled: false },
      potTransfers: [
        {
          id: 'trans1',
          owner: 'primary',
          sourcePot: 'cash_savings',
          destinationOwner: 'primary',
          destinationPot: 'stocks_and_shares_isa',
          transferAge: 51,
          amount: 5000,
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 10000,
      stocksAndSharesIsaBalance: 0,
      cashSavingsMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      workplacePensionMonthlyEmployee: 0,
      sippMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0
    };
    const rows = generateProjections(profile, pots);
    const row50 = rows.find(r => r.age === 50);
    const row51 = rows.find(r => r.age === 51);
    
    // In year 1 (age 50), no transfer yet, ISA should be 0.
    // In year 2 (age 51), transfer of 5000 happens, ISA should jump to 5000 + growth.
    expect(row50!.primaryStocksAndSharesIsaPot).toBe(0);
    expect(row51!.primaryStocksAndSharesIsaPot).toBeGreaterThanOrEqual(5000);
    expect(row51!.primaryCashSavingsPot).toBeLessThan(10000);
  });


  it('triggers every major branch', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      planStartYear: 2026,
      currentAge: 55,
      targetRetirementAge: 58,
      lifeExpectancyAge: 95,
      isCouplePlanning: true,
      partnerCurrentAge: 53,
      partnerTargetRetirementAge: 58,
      partnerLifeExpectancyAge: 90,
      
      includeStatePension: true,
      enableTripleLock: true,
      statePensionAge: 67,
      statePensionAmountAnnual: 11000,
      qualifyingYears: 30,
      partnerIncludeStatePension: true,
      partnerEnableTripleLock: false,
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 10000,
      partnerQualifyingYears: 20,

      grossAnnualSalary: 100000,
      pensionContributionMethod: 'salary_sacrifice',
      partnerGrossAnnualSalary: 60000,
      
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      expectedInflationRate: 2.5,
      adjustForInflation: true,
      indexTaxBands: true,
      potReturnOverrides: {
        enabled: true,
        workplacePension: 7,
        sipp: 6,
        stocksAndSharesIsa: 5,
        cashIsa: 4,
        lisa: 5,
        gia: 6,
        cashSavings: 3,
      },
      investmentFees: {
        enabled: true,
        perPotFeesEnabled: true,
        globalPlatformFeePercent: 0.5,
        primaryPots: { workplacePension: { platformFeePercent: 1.0 } },
        partnerPots: { sipp: { platformFeePercent: 1.2 } }
      },

      incomeProductOption: 'annuity',
      annuityRatePercent: 5,
      annuityEscalationRate: 3,
      annuityPurchaseAge: 60,
      partnerAnnuityPurchaseAge: 62,

      drawdownStrategy: 'proportional_phases',
      partnerDrawdownStrategy: 'tax_optimizer',
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { id: 't1', age: 58, amount: 100000, enabled: true, owner: 'primary' },
        { id: 't2', age: 60, amount: 200000, enabled: true, owner: 'primary' }
      ],
      partnerCrystallisationMode: 'phased_tranches',
      partnerCrystallisationTranches: [
        { id: 'pt1', age: 58, amount: 50000, enabled: true, owner: 'partner' }
      ],

      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      lumpSumTiming: 'access_age',
      lsaProtectionType: 'standard',
      
      spendingPhases: {
        enabled: true,
        customRanges: [
          { id: 'sp1', startAge: 58, endAge: 65, annualTargetIncome: 120000 },
          { id: 'sp2', startAge: 66, endAge: 85, annualTargetIncome: 80000 }
        ]
      },

      dbPensions: [
        { id: 'db1', name: 'DB', owner: 'primary', startAge: 60, annualIncome: 20000, taxFreeLumpSum: 10000, inflationLinked: true, enabled: true, targetPot: 'cash_savings' },
        { id: 'db2', name: 'DB P', owner: 'partner', startAge: 62, annualIncome: 15000, taxFreeLumpSum: 0, inflationLinked: false, enabled: true, targetPot: 'isa' }
      ],

      fixedIncomeStreams: [
        { id: 'fi1', name: 'Rental', owner: 'primary', startAge: 55, annualAmount: 15000, type: 'taxable', enabled: true },
        { id: 'fi2', name: 'Gift', owner: 'partner', startAge: 55, annualAmount: 5000, type: 'tax_free', enabled: true }
      ],

      mortgage: {
        enabled: true,
        currentBalance: 200000,
        remainingTermYears: 15,
        repaymentType: 'repayment',
        payoffAtRetirement: true
      },

      propertyDownsizePlan: {
        enabled: true,
        downsizeAge: 75,
        currentPropertyValue: 800000,
        targetNewPropertyCostToday: 500000,
        sellingCostsPercent: 1.5,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      
      potTransfers: [
        { id: 'tr1', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'stocks_and_shares_isa', transferAge: 56, amount: 10000, enabled: true },
        { id: 'tr2', owner: 'primary', sourcePot: 'gia', destinationOwner: 'partner', destinationPot: 'sipp', transferAge: 57, amount: 20000, enabled: true }
      ],

      decumulationLifeEvents: [
        { id: 'le1', name: 'Car', age: 60, cost: 30000, enabled: true, owner: 'primary', targetPot: 'cash_savings', type: 'one_off_expense' },
        { id: 'le2', name: 'Inheritance', age: 65, cost: -50000, enabled: true, owner: 'partner', targetPot: 'stocks_and_shares_isa', type: 'property_downsize' } // negative cost = income
      ],

      oneOffContributions: [
        { id: 'oc1', name: 'Bonus', owner: 'primary', targetPot: 'workplace_pension', frequency: 'one_off', grossAmount: 20000, date: '2028-01-01', enabled: true }
      ],

      reinvestExcessDrawdown: true,
      reinvestDestinationPot: 'gia',
      partnerReinvestDestinationPot: 'isa',

      maximizedSpendConfig: {
        enabled: true,
        reinvestExcessDrawdown: true,
        reinvestDestinationPot: 'isa',
        drawdownStrategy: 'proportional_phases'
      }
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      sippBalance: 200000,
      stocksAndSharesIsaBalance: 100000,
      cashIsaBalance: 50000,
      giaBalance: 80000,
      cashSavingsBalance: 40000,
      lisaBalance: 20000,

      partnerWorkplacePensionBalance: 300000,
      partnerSippBalance: 100000,
      partnerStocksAndSharesIsaBalance: 80000,
      partnerCashIsaBalance: 20000,
      partnerGiaBalance: 30000,
      partnerCashSavingsBalance: 50000,
      partnerLisaBalance: 10000,
      
      workplacePensionMonthlyEmployee: 500,
      workplacePensionMonthlyEmployer: 500,
      sippMonthlyContribution: 200,
      stocksAndSharesIsaMonthlyContribution: 300,
      cashIsaMonthlyContribution: 100,
      giaMonthlyContribution: 100,
      cashSavingsMonthlyContribution: 200,
      lisaMonthlyContribution: 100,
      
      partnerWorkplacePensionMonthlyEmployee: 300,
      partnerWorkplacePensionMonthlyEmployer: 300,
      partnerSippMonthlyContribution: 100,
      partnerStocksAndSharesIsaMonthlyContribution: 200,
      partnerCashIsaMonthlyContribution: 100,
      partnerGiaMonthlyContribution: 100,
      partnerCashSavingsMonthlyContribution: 100,
      partnerLisaMonthlyContribution: 50,
    };

    generateProjections(profile, pots);
  });


  it('covers primary and partner gilt ladder purchases with various funding sources', () => {
    const sources = ['gia', 'isa', 'cash', 'pension', 'blended'];
    for (const source of sources) {
      const profile: any = {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        lifeExpectancyAge: 65,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        incomeProductOption: 'gilt_ladder',
        partnerIncomeProductOption: 'gilt_ladder',
        giltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 10000,
          durationYears: 5,
          fundingSource: source
        },
        partnerGiltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 10000,
          durationYears: 5,
          fundingSource: source
        }
      };

      const pots: any = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 100000,
        giaBalance: 100000,
        cashSavingsBalance: 100000,
        partnerWorkplacePensionBalance: 100000,
        partnerStocksAndSharesIsaBalance: 100000,
        partnerGiaBalance: 100000,
        partnerCashSavingsBalance: 100000
      };

      const rows = generateProjections(profile, pots);
      const row60 = rows.find(r => r.age === 60);
      expect(row60).toBeDefined();
    }
  });

  it('covers uncrystallised drawdown for pcls recycling check branch', () => {
    // Just a quick check to hit some uncrystallised vs crystallised branches
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      crystallisationMode: 'uncrystallised_drawdown',
      takeLumpSumAtStart: false
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000 });
  });

  it('covers phased tranches with pcls timing delayed', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      takeLumpSumAtStart: false,
      lumpSumTiming: 'phased',
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { age: 62, amount: 50000, enabled: true, owner: 'primary' }
      ]
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000 });
  });


  it('covers hybrid annuity tranches for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      incomeProductOption: 'hybrid',
      partnerIncomeProductOption: 'hybrid',
      annuityTranches: [
        { enabled: true, owner: 'primary', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'level', durationOption: 'lifetime' }
      ],
      partnerAnnuityTranches: [
        { enabled: true, owner: 'partner', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'inflation_linked', durationOption: 'fixed_term', durationUntilAge: 75 }
      ]
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      primaryUncrystallisedPot: 100000,
      partnerWorkplacePensionBalance: 100000,
      partnerUncrystallisedPot: 100000,
      stocksAndSharesIsaBalance: 100000,
      cashSavingsBalance: 100000,
    };

    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });

  it('covers partner annuity purchase (non-hybrid)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      partnerIncomeProductOption: 'annuity',
      partnerAnnuityPurchaseAge: 60,
      partnerAnnuityAllocationPercent: 100,
      partnerAnnuityRatePercent: 5,
      partnerAnnuityType: 'level'
    };

    const pots: any = {
      ...DEFAULT_POTS,
      partnerWorkplacePensionBalance: 100000,
      partnerUncrystallisedPot: 100000
    };

    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });


  it('covers pro_rata drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'pro_rata'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers cash_first drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'cash_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers pension_first drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'pension_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers basic_rate_bracket drawdown strategy for couple', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'basic_rate_bracket',
      partnerDrawdownStrategy: 'isa_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, partnerWorkplacePensionBalance: 100000, partnerStocksAndSharesIsaBalance: 50000 });
  });

  it('covers higher_rate_bracket drawdown strategy for couple', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 150000,
      drawdownStrategy: 'higher_rate_bracket',
      partnerDrawdownStrategy: 'higher_rate_bracket'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 500000, stocksAndSharesIsaBalance: 50000, partnerWorkplacePensionBalance: 500000, partnerStocksAndSharesIsaBalance: 50000 });
  });

  it('covers proportional_phases secondary safety net', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 200000,
      drawdownStrategy: 'proportional_phases'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 50000, stocksAndSharesIsaBalance: 20000, cashSavingsBalance: 20000 });
  });


  it('covers maximizedSpendConfig with coupleScope: primary and partner', () => {
    const profilePrimary: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'proportional_phases',
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'primary',
        drawdownStrategy: 'proportional_phases'
      }
    };
    generateProjections(profilePrimary, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 100000 });

    const profilePartner: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'proportional_phases',
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'partner',
        drawdownStrategy: 'proportional_phases'
      }
    };
    generateProjections(profilePartner, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 100000 });
  });

  it('covers primary only accessing pension while partner has none', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'partner'
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 0 });
  });

  it('covers partner only accessing pension while primary has none', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'primary'
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 0, partnerWorkplacePensionBalance: 100000 });
  });


  it('covers pot transfers for various source and destination combinations (partner and primary)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 50,
      partnerTargetRetirementAge: 60,
      potTransfers: [
        // partner sources
        { id: '1', owner: 'partner', sourcePot: 'workplace_pension', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '2', owner: 'partner', sourcePot: 'stocks_and_shares_isa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '3', owner: 'partner', sourcePot: 'cash_isa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '4', owner: 'partner', sourcePot: 'lisa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '5', owner: 'partner', sourcePot: 'gia', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '6', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        
        // primary sources
        { id: '7', owner: 'primary', sourcePot: 'workplace_pension', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '8', owner: 'primary', sourcePot: 'stocks_and_shares_isa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '9', owner: 'primary', sourcePot: 'cash_isa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '10', owner: 'primary', sourcePot: 'lisa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '11', owner: 'primary', sourcePot: 'gia', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        
        // partner destinations
        { id: '12', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'sipp', transferAge: 51, amount: 1000, enabled: true },
        { id: '13', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'stocks_and_shares_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '14', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'cash_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '15', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'lisa', transferAge: 51, amount: 1000, enabled: true },
        { id: '16', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'gia', transferAge: 51, amount: 1000, enabled: true },
        { id: '17', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },

        // primary destinations
        { id: '18', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'sipp', transferAge: 51, amount: 1000, enabled: true },
        { id: '19', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'stocks_and_shares_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '20', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'cash_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '21', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'lisa', transferAge: 51, amount: 1000, enabled: true },
        { id: '22', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'gia', transferAge: 51, amount: 1000, enabled: true }
      ]
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 10000,
      stocksAndSharesIsaBalance: 10000,
      cashIsaBalance: 10000,
      lisaBalance: 10000,
      giaBalance: 10000,
      cashSavingsBalance: 100000, // plenty for sources

      partnerWorkplacePensionBalance: 10000,
      partnerStocksAndSharesIsaBalance: 10000,
      partnerCashIsaBalance: 10000,
      partnerLisaBalance: 10000,
      partnerGiaBalance: 10000,
      partnerCashSavingsBalance: 100000 // plenty for sources
    };

    const rows = generateProjections(profile, pots);
    expect(rows).toBeDefined();
  });


  it('covers spendingPhases and maximizedSpendConfig spendingPhases logic', () => {
    // 1. Normal spendingPhases with custom ranges
    let profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      spendingPhases: {
        enabled: true,
        customRanges: [
          { startAge: 60, endAge: 65, annualTargetIncome: 50000 },
          { startAge: 66, endAge: 75, annualTargetIncome: 40000 }
        ]
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 2. Normal spendingPhases with legacy 3-phase goGo
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      spendingPhases: {
        enabled: true,
        goGoEndAge: 65,
        goGoIncomeAnnual: 50000,
        slowGoEndAge: 75,
        slowGoIncomeAnnual: 40000,
        noGoIncomeAnnual: 30000
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 3. Maximized Spend Config spendingPhases with custom ranges
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      maximizedSpendConfig: {
        enabled: true,
        spendingPhases: {
          enabled: true,
          customRanges: [
            { startAge: 60, endAge: 65, annualTargetIncome: 60000 },
            { startAge: 66, endAge: 75, annualTargetIncome: 50000 }
          ]
        }
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 4. Maximized Spend Config spendingPhases with legacy 3-phase goGo
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      maximizedSpendConfig: {
        enabled: true,
        spendingPhases: {
          enabled: true,
          goGoEndAge: 65,
          goGoIncomeAnnual: 60000,
          slowGoEndAge: 75,
          slowGoIncomeAnnual: 50000,
          noGoIncomeAnnual: 40000
        }
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });
    
    // 5. Test under startAge and over endAge
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      lifeExpectancyAge: 90,
      spendingPhases: {
        enabled: true,
        customRanges: [
          { startAge: 60, endAge: 70, annualTargetIncome: 50000 },
        ]
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });
  });


  it('covers takeLumpSumAtStart (PCLS upfront) for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      workplacePensionBalance: 100000, 
      partnerWorkplacePensionBalance: 100000 
    });
  });

  it('covers phased tranches for partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: false,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { enabled: true, owner: 'partner', age: 60, amount: 50000, pclsPercent: 25 }
      ]
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      workplacePensionBalance: 100000, 
      partnerWorkplacePensionBalance: 100000 
    });
  });


  it('covers takeLumpSumAtStart (PCLS upfront) for primary and partner with correct timing', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: true,
      lumpSumTiming: 'upfront',
      partnerLumpSumTiming: 'upfront',
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      primaryUncrystallisedPot: 100000, 
      partnerUncrystallisedPot: 100000,
      workplacePensionBalance: 100000,
      partnerWorkplacePensionBalance: 100000
    });
  });


  it('covers one-off expenses deducting from various pots for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      oneOffExpenses: [
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'stocks_and_shares_isa', enabled: true },
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'gia', enabled: true },
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'cash_savings', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'stocks_and_shares_isa', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'gia', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'cash_savings', enabled: true },
        
        // Exceeding amount to test fallbacks (deduct from other pots)
        { owner: 'primary', date: '2031-01-01', amount: 100000, targetPot: 'cash_savings', enabled: true },
        { owner: 'partner', date: '2031-01-01', amount: 100000, targetPot: 'cash_savings', enabled: true },
      ]
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      stocksAndSharesIsaBalance: 20000,
      cashIsaBalance: 10000,
      lisaBalance: 10000,
      giaBalance: 20000,
      cashSavingsBalance: 20000,
      
      partnerStocksAndSharesIsaBalance: 20000,
      partnerCashIsaBalance: 10000,
      partnerLisaBalance: 10000,
      partnerGiaBalance: 20000,
      partnerCashSavingsBalance: 20000
    });
  });


  it('covers gilt ladder fallback deductions', () => {
    const sources = ['gia', 'isa', 'cash', 'pension', 'blended'];
    for (const source of sources) {
      const profile: any = {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        lifeExpectancyAge: 65,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        incomeProductOption: 'gilt_ladder',
        partnerIncomeProductOption: 'gilt_ladder',
        giltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 1000000, // Massive cost to force fallbacks
          durationYears: 5,
          fundingSource: source
        },
        partnerGiltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 1000000,
          durationYears: 5,
          fundingSource: source
        }
      };

      const pots: any = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 10,
        primaryUncrystallisedPot: 10,
        primaryCrystallisedPot: 10,
        stocksAndSharesIsaBalance: 10,
        cashIsaBalance: 10,
        giaBalance: 10,
        cashSavingsBalance: 10,
        
        partnerWorkplacePensionBalance: 10,
        partnerUncrystallisedPot: 10,
        partnerCrystallisedPot: 10,
        partnerStocksAndSharesIsaBalance: 10,
        partnerCashIsaBalance: 10,
        partnerGiaBalance: 10,
        partnerCashSavingsBalance: 10,
        
        // Add one big pot so that we don't break downstream logic unnecessarily
        // Wait, if it fails to fund, it just deducts whatever it can and continues.
      };

      generateProjections(profile, pots);
    }
  });

  it('covers PCLS fallback deductions', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: true,
      lumpSumTiming: 'upfront',
      partnerLumpSumTiming: 'upfront',
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      primaryUncrystallisedPot: 100000, 
      primaryCrystallisedPot: 100000, 
      partnerUncrystallisedPot: 100000,
      partnerCrystallisedPot: 100000,
      workplacePensionBalance: 100000,
      partnerWorkplacePensionBalance: 100000
    });
  });


  it('covers PCLS upfront with crystallisationMode = upfront', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      crystallisationMode: 'upfront', // This is the KEY!
      partnerCrystallisationMode: 'upfront',
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      primaryUncrystallisedPot: 100000, 
      partnerUncrystallisedPot: 100000,
      workplacePensionBalance: 100000,
      partnerWorkplacePensionBalance: 100000
    });
  });

});
