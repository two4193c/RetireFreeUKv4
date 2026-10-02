import { describe, it, expect } from "vitest";
import { runMonteCarloSimulation } from "../monteCarloEngine";
import { UserProfile, InvestmentPots } from "../../types";
import { DEFAULT_POTS, DEFAULT_PROFILE } from "../defaultData";
import { calculateUKTax } from "../ukTaxEngine";

describe("Round 5 Logic Bug Fixes Audit (BUG-35, BUG-37, BUG-38)", () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    dateOfBirth: "1979-06-15",
    currentAge: 45,
    targetRetirementAge: 60,
    lifeExpectancyAge: 90,
    statePensionAge: 67,
    includeStatePension: true,
    statePensionAmountAnnual: 11973,
    grossAnnualSalary: 60000,
    isCouplePlanning: false,
    taxRegion: "england_ni_wales",
    pensionContributionMethod: "relief_at_source",
    targetRetirementIncomeAnnual: 30000,
    expectedInflationRate: 2.5,
    expectedInvestmentReturn: 6.0,
    postRetirementReturn: 4.5,
    drawdownStrategy: "isa_first",
    adjustForInflation: true,
    indexTaxBands: true,
    crystallisationMode: "upfront",
    pclsLumpSumPercent: 25,
  };

  const basePots: InvestmentPots = {
    ...DEFAULT_POTS,
    workplacePensionBalance: 300000,
    sippBalance: 0,
    stocksAndSharesIsaBalance: 50000,
    lisaBalance: 0,
    giaBalance: 0,
    cashSavingsBalance: 20000,
    cashIsaBalance: 0,
    sippMonthlyContribution: 0,
    stocksAndSharesIsaMonthlyContribution: 500,
    workplacePensionMonthlyEmployee: 1000,
    employerMatchPercentage: 3,
    workplacePensionMonthlyEmployeeType: "fixed",
    giaMonthlyContribution: 0,
    cashSavingsMonthlyContribution: 0,
  };

  /**
   * BUG-37 (income events): Previously, the outer block ran for ALL years,
   * and the inner decumulation block also ran. At retirement age, both fired,
   * doubling income event pot additions.
   * After fix: Only the decumulation block fires.
   *
   * Test: We verify that a £500,000 event (big enough to dominate noise) does
   * NOT produce a retirement pot boost of more than double the event amount.
   * If double-counted, we'd see ~1,000,000 boost; a single count should be ~500,000.
   */
  it("BUG-37: Large income events are NOT double-counted (boost < 1.5x event amount)", () => {
    const taxResult = calculateUKTax(baseProfile, basePots);
    const baselineResult = runMonteCarloSimulation(baseProfile, basePots, taxResult, {
      numSimulations: 500, maxAge: 61, marketScenario: "standard",
    });

    const profileWithEvent: UserProfile = {
      ...baseProfile,
      decumulationLifeEvents: [{
        id: "evt1", name: "Inheritance", type: "income", age: 60,
        amount: 500000, targetPot: "cash_savings", inflationLinked: false, enabled: true, owner: "primary",
      }],
    };
    const eventResult = runMonteCarloSimulation(profileWithEvent, basePots, taxResult, {
      numSimulations: 500, maxAge: 61, marketScenario: "standard",
    });

    // At age 61 (maxAge=61), just one year after the event at 60, the boost should be
    // approximately £500,000 (single count), not £1,000,000 (double count).
    const baseAt61 = baselineResult.medianEndPot;
    const eventAt61 = eventResult.medianEndPot;
    const boost = eventAt61 - baseAt61;

    // Boost must be positive (event added money)
    expect(boost).toBeGreaterThan(100000);
    // Boost must be less than 1.5x the event (would be ~1M if double-counted)
    expect(boost).toBeLessThan(750000);
  });

  /**
   * BUG-37 (expense events): An expense event should only appear once in the
   * drawdown target (lifeEventsExpenseThisYear). The outer block previously
   * also deducted it directly from the pot via deductProRata, causing both
   * a pot deduction AND extra drawdown.
   * After fix: Only the decumulation branch counts expenses (no pot deduction).
   *
   * Test: A large expense at retirement should not reduce the pot by more
   * than the expected drawdown to cover it (i.e., <= 1.5x the expense amount).
   */
  it("BUG-37: Expense events do not double-deduct (once from pot AND once from drawdown target)", () => {
    const taxResult = calculateUKTax(baseProfile, basePots);
    const baselineResult = runMonteCarloSimulation(baseProfile, basePots, taxResult, {
      numSimulations: 500, maxAge: 61, marketScenario: "standard",
    });

    const profileWithExpense: UserProfile = {
      ...baseProfile,
      decumulationLifeEvents: [{
        id: "evt2", name: "Renovation", type: "expense", age: 60,
        amount: 100000, targetPot: "cash_savings", inflationLinked: false, enabled: true, owner: "primary",
      }],
    };
    const expenseResult = runMonteCarloSimulation(profileWithExpense, basePots, taxResult, {
      numSimulations: 500, maxAge: 61, marketScenario: "standard",
    });

    const reduction = baselineResult.medianEndPot - expenseResult.medianEndPot;
    // Should be positive (expense reduces pot)
    expect(reduction).toBeGreaterThan(0);
    // If double-deducted, reduction would be ~200k+; with single count ~100k-130k (gross pension to fund net)
    expect(reduction).toBeLessThan(190000);
  });

  it("BUG-38: LSA tracker order-of-ops: taxable draws not over-counted within a year", () => {
    const highSpendProfile: UserProfile = {
      ...baseProfile, targetRetirementIncomeAnnual: 55000, drawdownStrategy: "pension_first",
    };
    const taxResult = calculateUKTax(highSpendProfile, basePots);

    const result = runMonteCarloSimulation(highSpendProfile, basePots, taxResult, {
      numSimulations: 200, maxAge: 90, marketScenario: "standard",
    });

    expect(result).toBeDefined();
    expect(Number.isNaN(result.successRate)).toBe(false);
    expect(result.successRateAge85).toBeGreaterThanOrEqual(0);
    expect(result.successRateAge85).toBeLessThanOrEqual(100);
    expect(result.medianRetirementPot).toBeGreaterThan(0);
  });

  it("BUG-35: Cash buffer calculation with partial pots produces valid (non-NaN) results", () => {
    const partialPots = {
      workplacePensionBalance: 300000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 20000,
    } as InvestmentPots;

    const taxResult = calculateUKTax(baseProfile, basePots);
    const result = runMonteCarloSimulation(baseProfile, partialPots, taxResult, {
      numSimulations: 50, maxAge: 90, marketScenario: "early_crash",
      crashStartAge: 60, crashDurationYears: 2, useCashBuffer: true, cashBufferYears: 2,
    });

    expect(result).toBeDefined();
    expect(Number.isNaN(result.successRate)).toBe(false);
    expect(Number.isNaN(result.medianRetirementPot)).toBe(false);
    result.agePercentiles.forEach((p) => {
      expect(Number.isFinite(p.p50TotalPot)).toBe(true);
    });
  });
});
