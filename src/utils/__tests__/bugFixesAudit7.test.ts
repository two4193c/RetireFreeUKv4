import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation } from '../monteCarloEngine';
import { runHistoricModelingSimulation } from '../historicModelingEngine';
import { UserProfile, InvestmentPots } from '../../types';
import { calculateUKTax } from '../ukTaxEngine';
import { ZERO_POTS } from '../defaultData';

const BASE_PROFILE: UserProfile = {
  currentAge: 50,
  targetRetirementAge: 60,
  lifeExpectancyAge: 85,
  statePensionAge: 67,
  includeStatePension: false,
  grossAnnualSalary: 0, // 0 salary so no recurring monthly contributions complicate asset tests
  isCouplePlanning: false,
  taxRegion: 'england_ni_wales',
  pensionContributionMethod: 'relief_at_source',
  targetRetirementIncomeAnnual: 30000,
  expectedInflationRate: 0, // 0% inflation for clean arithmetic assertions
  adjustForInflation: false,
  indexTaxBands: false,
  expectedInvestmentReturn: 0, // 0% return for clean deterministic checks
  postRetirementReturn: 0,
  pclsLumpSumPercent: 25,
  takeLumpSumAtStart: false,
  drawdownStrategy: 'isa_first',
  incomeProductOption: 'flexi_drawdown',
  dbPensions: [],
  fixedIncomeStreams: [],
  oneOffContributions: [],
  decumulationLifeEvents: [],
};

const BASE_POTS: InvestmentPots = {
  workplacePensionBalance: 200000,
  workplacePensionMonthlyEmployee: 0,
  workplacePensionMonthlyEmployeeType: 'fixed',
  employerMatchPercentage: 0,
  sippBalance: 0,
  stocksAndSharesIsaBalance: 50000,
  cashIsaBalance: 0,
  lisaBalance: 0,
  giaBalance: 0,
  cashSavingsBalance: 20000,
  sippMonthlyContribution: 0,
  sippContributionType: 'net',
  stocksAndSharesIsaMonthlyContribution: 0,
  cashIsaMonthlyContribution: 0,
  lisaMonthlyContribution: 0,
  giaMonthlyContribution: 0,
  cashSavingsMonthlyContribution: 0,
};

describe('Round 7 Bug Fixes Audit (BUG-45 through BUG-49)', () => {
  it('BUG-45: monteCarloEngine and historicModelingEngine process accumulation life events', () => {
    const profileWithLifeEvents: UserProfile = {
      ...BASE_PROFILE,
      decumulationLifeEvents: [
        {
          id: 'le-1',
          name: 'Inheritance at age 52',
          type: 'income',
          amount: 40000,
          age: 52,
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: false,
          enabled: true,
        },
        {
          id: 'le-2',
          name: 'Home Renovation at age 55',
          type: 'expense',
          amount: 15000,
          age: 55,
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: false,
          enabled: true,
        },
      ],
    };

    const taxResult = calculateUKTax(profileWithLifeEvents, BASE_POTS);

    // 1. Monte Carlo: Check accumulation years
    const mc = runMonteCarloSimulation(profileWithLifeEvents, BASE_POTS, taxResult, {
      numSimulations: 20,
      accumulationVolatility: 0, // Deterministic test
      decumulationVolatility: 0,
    });

    // Age 50: starting ISA is 50,000
    const row50 = mc.agePercentiles.find((r) => r.age === 50);
    expect(row50).toBeDefined();

    // Age 53: ISA should have received +40,000 inheritance -> 90,000
    const row53 = mc.agePercentiles.find((r) => r.age === 53);
    expect(row53).toBeDefined();
    expect(row53!.p50IsaPot).toBeGreaterThanOrEqual(85000);

    // Age 56: ISA should have paid 15,000 renovation expense -> reduced to 75,000
    const row56 = mc.agePercentiles.find((r) => r.age === 56);
    expect(row56).toBeDefined();
    expect(row56!.p50IsaPot).toBeLessThan(row53!.p50IsaPot);

    // 2. Historic simulation: Compare run with life events against baseline run without life events
    const histWith = runHistoricModelingSimulation(profileWithLifeEvents, BASE_POTS, taxResult);
    const histWithout = runHistoricModelingSimulation(BASE_PROFILE, BASE_POTS, taxResult);

    const trajWith53 = histWith.runResults[0].trajectory.find((t) => t.age === 53);
    const trajWithout53 = histWithout.runResults[0].trajectory.find((t) => t.age === 53);

    const trajWith56 = histWith.runResults[0].trajectory.find((t) => t.age === 56);
    const trajWithout56 = histWithout.runResults[0].trajectory.find((t) => t.age === 56);

    expect(trajWith53).toBeDefined();
    expect(trajWithout53).toBeDefined();
    expect(trajWith56).toBeDefined();
    expect(trajWithout56).toBeDefined();

    // With +40,000 inheritance, ISA at age 53 must be higher than baseline
    expect(trajWith53!.isaPot).toBeGreaterThan(trajWithout53!.isaPot);
    // At age 56, the difference between with-event and without-event must be reduced by the 15,000 expense
    const diff53 = trajWith53!.isaPot - trajWithout53!.isaPot;
    const diff56 = trajWith56!.isaPot - trajWithout56!.isaPot;
    expect(diff56).toBeLessThan(diff53);
  });

  it('BUG-46: Bracket strategies draw excess needed income from pension rather than failing with shortfall', () => {
    // Retiree has £300,000 in pension, £0 in ISA, £0 in Cash
    // Target net income £45,000/yr.
    // With basic_rate_bracket or tax_free_bracket, personal allowance (£12,570) or basic threshold is not enough to cover £45k net
    // The engine must draw remaining shortfall from available pension.
    const retireeProfile: UserProfile = {
      ...BASE_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 45000,
      drawdownStrategy: 'tax_free_bracket', // Prior to fix, stopped drawing after personal allowance (£12,570)
    };

    const retireePots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 300000,
      stocksAndSharesIsaBalance: 0,
      cashSavingsBalance: 0,
    };

    const taxResult = calculateUKTax(retireeProfile, retireePots);

    // 1. Monte Carlo: income survival rate should be 100% in year 1 because pension has £300k
    const mc = runMonteCarloSimulation(retireeProfile, retireePots, taxResult, {
      numSimulations: 20,
      accumulationVolatility: 0,
      decumulationVolatility: 0,
    });
    const row60 = mc.agePercentiles.find((r) => r.age === 60);
    expect(row60).toBeDefined();
    expect(row60!.incomeSurvivalRate).toBe(100);

    // 2. Historic Simulation: drawdownAmount should meet the income requirement
    const hist = runHistoricModelingSimulation(retireeProfile, retireePots, taxResult);
    const histRun = hist.runResults[0];
    const traj60 = histRun.trajectory.find((t) => t.age === 60);
    expect(traj60).toBeDefined();
    expect(traj60!.drawdownAmount).toBeGreaterThanOrEqual(45000);
  });

  it('BUG-48: Partner mortality inheritance updates combined pots and prevents double counting', () => {
    const coupleProfile: UserProfile = {
      ...BASE_PROFILE,
      isCouplePlanning: true,
      currentAge: 70,
      targetRetirementAge: 60,
      lifeExpectancyAge: 90,
      partnerCurrentAge: 70,
      partnerTargetRetirementAge: 60,
      partnerLifeExpectancyAge: 75, // Partner dies at age 75
      partnerWorkplacePensionBalance: 100000,
      partnerPots: {
        ...ZERO_POTS,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 25000,
        cashSavingsBalance: 10000,
      },
    };

    const couplePots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 150000,
      stocksAndSharesIsaBalance: 30000,
      cashSavingsBalance: 15000,
    };

    const taxResult = calculateUKTax(coupleProfile, couplePots);

    // Historic simulation
    const hist = runHistoricModelingSimulation(coupleProfile, couplePots, taxResult);
    const histRun = hist.runResults[0];

    const traj74 = histRun.trajectory.find((t) => t.age === 74);
    const traj75 = histRun.trajectory.find((t) => t.age === 75);

    expect(traj74).toBeDefined();
    expect(traj75).toBeDefined();

    // At age 75, partner dies: partner's assets are inherited by primary
    // Ensure pensionPot, isaPot, and cashGiaPot sum up to totalPot without stale or double-counted values
    const expectedTotal75 = traj75!.pensionPot + traj75!.isaPot + traj75!.cashGiaPot;
    expect(Math.abs(traj75!.totalPot - expectedTotal75)).toBeLessThanOrEqual(5);
  });

  it('BUG-49: Couple safety fallback in historicModelingEngine sweeps remaining liquid pots', () => {
    // Primary has £0 ISA/Cash and £10k Pension. Partner has £100,000 ISA.
    // Household target income is £30,000.
    // Even if primary's pot is exhausted, partner's liquid ISA covers the household shortfall.
    const coupleProfile: UserProfile = {
      ...BASE_PROFILE,
      isCouplePlanning: true,
      currentAge: 62,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 30000,
      partnerCurrentAge: 62,
      partnerTargetRetirementAge: 60,
      partnerPots: {
        ...ZERO_POTS,
        stocksAndSharesIsaBalance: 100000,
      },
    };

    const couplePots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 10000,
      stocksAndSharesIsaBalance: 0,
      cashSavingsBalance: 0,
    };

    const taxResult = calculateUKTax(coupleProfile, couplePots);
    const hist = runHistoricModelingSimulation(coupleProfile, couplePots, taxResult);
    const histRun = hist.runResults[0];
    const traj62 = histRun.trajectory.find((t) => t.age === 62);

    expect(traj62).toBeDefined();
    expect(traj62!.drawdownAmount).toBeGreaterThanOrEqual(29900);
  });
});
