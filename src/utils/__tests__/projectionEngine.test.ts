import { describe, it, expect } from 'vitest';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('projectionEngine - generateProjections', () => {
  it('generates a full projection array covering ages from currentAge to effectiveMaxAge (100)', () => {
    const profile: UserProfile = {
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
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 35,
      targetRetirementAge: 60,
      grossAnnualSalary: 60000,
    };
    const pots: InvestmentPots = {
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
    const pots: InvestmentPots = {
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
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 50000,
    };
    const pots: InvestmentPots = {
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
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 57,
      targetRetirementAge: 60,
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      lumpSumTiming: 'access_age',
    };
    const pots: InvestmentPots = {
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
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 95,
      targetRetirementIncomeAnnual: 80000, // Very high target
      includeStatePension: false,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 150000, // Small pot
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashSavingsBalance: 0,
    };

    const rows = generateProjections(profile, pots);
    const lastRow = rows[rows.length - 1];

    // Pot should be depleted well before age 95
    expect(lastRow.totalPot).toBe(0);
    expect(lastRow.potDepleted).toBe(true);
  });

  it('correctly processes Decumulation Life Events (inflows and outflows) in retirement', () => {
    const profile: UserProfile = {
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
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
      cashSavingsBalance: 50000,
    };

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
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 53,
      targetRetirementAge: 53,
      protectedPensionAccessAge: 57,
      lifeExpectancyAge: 80,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'isa_first',
      includeStatePension: false,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      stocksAndSharesIsaBalance: 0,
      giaBalance: 100000,
      cashSavingsBalance: 50000,
    };

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
    const partnerPots: InvestmentPots = {
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
    const profile: UserProfile = {
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
    const pots: InvestmentPots = {
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
});
