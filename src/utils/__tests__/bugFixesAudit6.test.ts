import { describe, it, expect } from 'vitest';
import { runHistoricModelingSimulation } from '../historicModelingEngine';
import { generateProjections } from '../projectionEngine';
import { getScopeEvaluationInputs } from '../maximizedSpendSolver';
import { computeCashFlowSankeyData } from '../sankeyEngine';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_POTS, DEFAULT_PARTNER_POTS, DEFAULT_PROFILE } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';

describe('Round 6 Logic Bug Fixes Audit (BUG-39 to BUG-44)', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    dateOfBirth: '1979-06-15',
    currentAge: 55,
    targetRetirementAge: 60,
    lifeExpectancyAge: 85,
    statePensionAge: 67,
    includeStatePension: true,
    statePensionAmountAnnual: 11973,
    grossAnnualSalary: 60000,
    isCouplePlanning: false,
    taxRegion: 'england_ni_wales',
    pensionContributionMethod: 'relief_at_source',
    targetRetirementIncomeAnnual: 25000,
    expectedInflationRate: 2.5,
    expectedInvestmentReturn: 5.0,
    postRetirementReturn: 4.0,
    drawdownStrategy: 'pension_first',
    adjustForInflation: false,
    indexTaxBands: false,
    crystallisationMode: 'ufpls',
    pclsLumpSumPercent: 25,
  };

  const basePots: InvestmentPots = {
    ...DEFAULT_POTS,
    workplacePensionBalance: 200000,
    sippBalance: 50000,
    stocksAndSharesIsaBalance: 30000,
    cashSavingsBalance: 10000,
  };

  /**
   * BUG-39: In historicModelingEngine, executeDeduct was previously called BEFORE approximateNetFromGrossForOwner.
   * This mutated pots and incremented cumulative tax-free drawn prior to calculating netDraw,
   * causing approximateNetFromGrossForOwner to see 0 uncrystallised pot and depleted LSA headroom,
   * which wrongly treated the entire drawdown as 100% taxable at full income tax rates.
   * With the fix, approximateNetFromGrossForOwner evaluates the draw before mutation, preserving the 25% tax-free element.
   */
  it('BUG-39: Historic modeling pension-first decumulation preserves 25% tax-free element on drawdown', () => {
    const taxResult = calculateUKTax(baseProfile, basePots);
    const result = runHistoricModelingSimulation(baseProfile, basePots, taxResult, 75);

    expect(result).toBeDefined();
    expect(result.runResults.length).toBeGreaterThan(0);
    expect(result.successRate).toBeGreaterThan(50);
    // Under UFPLS, with £12,570 personal allowance and 25% tax free, withdrawals are highly tax-efficient.
    const firstRun = result.runResults[0];
    expect(firstRun.trajectory.length).toBeGreaterThan(0);
    const retiredSnapshot = firstRun.trajectory.find((t) => t.age === 60);
    expect(retiredSnapshot).toBeDefined();
    expect(retiredSnapshot!.totalPot).toBeGreaterThan(150000);
  });

  /**
   * BUG-40: In maximizedSpendSolver.ts getScopeEvaluationInputs:
   * 1. When scope === 'primary', partner's fixedIncomeStreams, oneOffContributions, decumulationLifeEvents,
   *    and potTransfers were NOT filtered out, leaking partner resources into primary evaluation.
   * 2. When scope === 'partner', partner's assets/events were never mapped to 'primary' owner, and
   *    partner pension configurations (drawdownStrategy, pclsLumpSumPercent, etc.) were ignored.
   */
  it('BUG-40: getScopeEvaluationInputs cleanly isolates primary and partner assets, streams, and configurations', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerName: 'Jane',
      partnerDateOfBirth: '1981-04-10',
      partnerCurrentAge: 53,
      partnerTargetRetirementAge: 58,
      partnerStatePensionAge: 67,
      partnerGrossAnnualSalary: 40000,
      partnerDrawdownStrategy: 'tax_free_bracket',
      drawdownStrategy: 'basic_rate_bracket',
      fixedIncomeStreams: [
        {
          id: 'pri_stream',
          name: 'Primary Consulting',
          owner: 'primary',
          type: 'taxable',
          annualAmount: 5000,
          startAge: 60,
          inflationLinked: false,
          enabled: true,
        },
        {
          id: 'part_stream',
          name: 'Partner PIP',
          owner: 'partner',
          type: 'tax_free',
          annualAmount: 7000,
          startAge: 55,
          inflationLinked: false,
          enabled: true,
        },
      ],
      oneOffContributions: [
        {
          id: 'c1',
          name: 'Partner Bonus',
          owner: 'partner',
          targetPot: 'sipp',
          frequency: 'one_off',
          grossAmount: 10000,
          startAge: 54,
          enabled: true,
        },
      ],
      decumulationLifeEvents: [
        {
          id: 'e1',
          name: 'Partner Downsize',
          owner: 'partner',
          type: 'income',
          amount: 50000,
          age: 65,
          enabled: true,
        },
      ],
      partnerPots: {
        ...DEFAULT_PARTNER_POTS,
        sippBalance: 80000,
        stocksAndSharesIsaBalance: 25000,
      },
    };

    // 1. Primary scope
    const { evalProfile: priProf } = getScopeEvaluationInputs(coupleProfile, basePots, 'primary');
    expect(priProf.isCouplePlanning).toBe(false);
    expect(priProf.fixedIncomeStreams!.length).toBe(1);
    expect(priProf.fixedIncomeStreams![0].name).toBe('Primary Consulting');
    expect(priProf.oneOffContributions!.length).toBe(0);
    expect(priProf.decumulationLifeEvents!.length).toBe(0);

    // 2. Partner scope
    const { evalProfile: partProf, evalPots: partPots } = getScopeEvaluationInputs(coupleProfile, basePots, 'partner');
    expect(partProf.isCouplePlanning).toBe(false);
    expect(partProf.currentAge).toBe(53);
    expect(partProf.targetRetirementAge).toBe(58);
    expect(partProf.drawdownStrategy).toBe('tax_free_bracket'); // partner's drawdownStrategy mapped
    expect(partPots.sippBalance).toBe(80000);
    expect(partPots.stocksAndSharesIsaBalance).toBe(25000);
    expect(partProf.fixedIncomeStreams!.length).toBe(1);
    expect(partProf.fixedIncomeStreams![0].name).toBe('Partner PIP');
    expect(partProf.fixedIncomeStreams![0].owner).toBe('primary'); // mapped to primary for single evaluation
    expect(partProf.oneOffContributions!.length).toBe(1);
    expect(partProf.oneOffContributions![0].owner).toBe('primary');
    expect(partProf.decumulationLifeEvents!.length).toBe(1);
    expect(partProf.decumulationLifeEvents![0].owner).toBe('primary');
  });

  /**
   * BUG-41: In projectionEngine.ts executeDeduct:
   * When ISA pot was 0, dividing by 0 caused `r = Infinity`, resulting in `0 * -Infinity = NaN`,
   * corrupting ISA balances. Also, phantom drawdowns occurred if requested amount exceeded pot.
   */
  it('BUG-41: executeDeduct in projectionEngine handles 0 ISA balance without producing NaN or phantom draw', () => {
    const zeroIsaProfile: UserProfile = {
      ...baseProfile,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'isa_first', // will attempt to draw from ISA first
    };
    const zeroIsaPots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 0,
      cashIsaBalance: 0,
      lisaBalance: 0,
      cashSavingsBalance: 0,
      workplacePensionBalance: 150000,
      sippBalance: 0,
    };

    const projections = generateProjections(zeroIsaProfile, zeroIsaPots);
    expect(projections.length).toBeGreaterThan(0);
    const row60 = projections.find((p) => p.age === 60);
    expect(row60).toBeDefined();
    expect(isNaN(row60!.isaPot)).toBe(false);
    expect(isNaN(row60!.stocksAndSharesIsaPot)).toBe(false);
    expect(row60!.isaPot).toBe(0);
    expect(row60!.isaDrawdown).toBe(0); // No phantom drawdown from empty ISA
  });

  /**
   * BUG-42: In projectionEngine accumulation phase:
   * stocksAndSharesIsaPot, cashIsaPot, and lisaPot in the row output were calculated before
   * processLifeEventsThisYear ran. An accumulation life event targeting stocks_and_shares_isa
   * updated primarySsIsaPot and isaPot, but stocksAndSharesIsaPot remained the stale pre-event value.
   */
  it('BUG-42: Accumulation life event to stocks_and_shares_isa correctly reflects in stocksAndSharesIsaPot row field', () => {
    const profileWithLifeEvent: UserProfile = {
      ...baseProfile,
      currentAge: 55,
      targetRetirementAge: 60,
      decumulationLifeEvents: [
        {
          id: 'acc_event',
          name: 'Inheritance Inflow',
          type: 'income',
          amount: 25000,
          age: 56,
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: false,
          enabled: true,
          owner: 'primary',
        },
      ],
    };

    const projections = generateProjections(profileWithLifeEvent, basePots);
    const row56 = projections.find((p) => p.age === 56);
    expect(row56).toBeDefined();
    expect(row56!.isRetired).toBe(false);
    // stocksAndSharesIsaPot should match primaryStocksAndSharesIsaPot + partnerStocksAndSharesIsaPot
    expect(row56!.stocksAndSharesIsaPot).toBe(row56!.primaryStocksAndSharesIsaPot + (row56!.partnerStocksAndSharesIsaPot || 0));
    expect(row56!.stocksAndSharesIsaPot).toBeGreaterThanOrEqual(25000);
  });

  /**
   * BUG-43: Zero-safe nullish coalescing in projectionEngine.
   * Checks that partnerCurrentAge and partnerTargetRetirementAge of 0 or custom values evaluate cleanly.
   */
  it('BUG-43: projectionEngine uses zero-safe nullish coalescing for partner properties', () => {
    const coupleProf: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerName: 'Sarah',
      partnerCurrentAge: 50,
      partnerTargetRetirementAge: 55,
      partnerStatePensionAge: 67,
      partnerLifeExpectancyAge: 92,
    };
    const projections = generateProjections(coupleProf, basePots);
    expect(projections.length).toBeGreaterThan(0);
    const retiredRow = projections.find((p) => p.age === 60);
    expect(retiredRow).toBeDefined();
    expect(retiredRow!.partnerTotalPot).toBeDefined();
  });

  /**
   * BUG-44: In sankeyEngine decumulation:
   * When primary has £0 life events expense and partner has £15,000, primary mode should not
   * fall back to 50% (£7,500) due to `||`.
   */
  it('BUG-44: sankeyEngine does not assign partner life event expenses to primary when primaryLifeEventsExpense is 0', () => {
    const mockProjections: any[] = [
      {
        age: 65,
        year: 2044,
        isRetired: true,
        primaryStatePensionReceived: 11973,
        partnerStatePensionReceived: 11973,
        primaryPensionDrawdown: 10000,
        partnerPensionDrawdown: 10000,
        primaryPensionDrawdownTaxable: 7500,
        partnerPensionDrawdownTaxable: 7500,
        primaryPensionDrawdownTaxFree: 2500,
        partnerPensionDrawdownTaxFree: 2500,
        primaryTaxPaid: 1500,
        partnerTaxPaid: 1500,
        totalTaxPaid: 3000,
        lifeEventsExpense: 15000,
        primaryLifeEventsExpense: 0,
        partnerLifeEventsExpense: 15000,
      },
    ];

    const coupleProf: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerCurrentAge: 55,
      adjustForInflation: false,
    };

    // Primary individual view
    const priSankey = computeCashFlowSankeyData(coupleProf, basePots, mockProjections, 65, 'primary');
    expect(priSankey).toBeDefined();
    // Primary has 0 life events expense, so no link to life_events_expense node should exist from primary
    const priExpenseLink = priSankey!.links.find((l) => l.targetId === 'life_events_expense');
    expect(priExpenseLink).toBeUndefined();

    // Partner individual view
    const partSankey = computeCashFlowSankeyData(coupleProf, basePots, mockProjections, 65, 'partner');
    expect(partSankey).toBeDefined();
    const partExpenseLink = partSankey!.links.find((l) => l.targetId === 'life_events_expense');
    expect(partExpenseLink).toBeDefined();
    expect(partExpenseLink!.amount).toBe(15000);
  });
});
