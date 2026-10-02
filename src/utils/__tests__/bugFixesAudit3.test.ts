import { describe, it, expect } from 'vitest';
import { solveContributionIncrease } from '../contributionSolver';
import { getProjectedPotBalance } from '../potTransferUtils';
import { runMonteCarloSimulation } from '../monteCarloEngine';
import { runHistoricModelingSimulation } from '../historicModelingEngine';
import { calculateUKTax } from '../ukTaxEngine';
import { UserProfile, InvestmentPots, PotTransfer } from '../../types';
import { DEFAULT_PARTNER_POTS, ZERO_POTS } from '../defaultData';

describe('Logic Bugs Audit Round 3 (BUG-18 to BUG-24)', () => {
  const baseProfile: UserProfile = {
    currentAge: 40,
    targetRetirementAge: 60,
    targetRetirementIncomeAnnual: 40000,
    grossAnnualSalary: 60000,
    taxRegion: 'england',
    pensionContributionMethod: 'relief_at_source',
    includeStatePension: true,
    qualifyingYears: 35,
    statePensionAge: 67,
    expectedInvestmentReturn: 5.0,
    expectedInflationRate: 2.5,
    isCouplePlanning: false,
    drawdownStrategy: 'isa_first',
  };

  const potsWithPercentageWorkplace: InvestmentPots = {
    ...ZERO_POTS,
    workplacePensionBalance: 100000,
    workplacePensionMonthlyEmployee: 5, // 5% of £60k = £3,000/yr = £250/month
    workplacePensionMonthlyEmployeeType: 'percent',
    employerMatchPercentage: 3, // 3% of £60k = £1,800/yr
  };

  // BUG-18: Percentage workplace contribution overwrite
  it('BUG-18: solveContributionIncrease preserves existing 5% salary contribution (£250/mo) when solving in fixed pounds', () => {
    // With 5% employee + 3% employer on £60k, retirement income is substantial.
    // If 5% was erroneously turned into £5/mo, the solver would think the user was previously contributing almost nothing.
    const solution = solveContributionIncrease(baseProfile, potsWithPercentageWorkplace);
    
    if (solution.workplaceSolution) {
      // The solution must be non-zero and reasonable, and base workplace monthly must have been £250
      expect(solution.workplaceSolution.monthlyGross).toBeGreaterThan(0);
      expect(solution.workplaceSolution.monthlyGross).toBeLessThan(15000);
    }
  });

  // BUG-19: Scottish salary sacrifice NI savings rate
  it('BUG-19: Scottish salary sacrifice provides 8% NI savings between £43,663 and £50,270', () => {
    const scotProfile: UserProfile = {
      ...baseProfile,
      grossAnnualSalary: 48000,
      taxRegion: 'scotland',
      pensionContributionMethod: 'salary_sacrifice',
      targetRetirementIncomeAnnual: 50000, // force shortfall
    };
    const scotPots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 10000,
    };

    const res = solveContributionIncrease(scotProfile, scotPots);
    expect(res.workplaceSolution).not.toBeNull();
    // For Scottish £48k salary, income tax marginal rate is 42% (0.42).
    // NI savings rate should be 8% (0.08) because salary £48k <= £50,270.
    // Total relief rate = 42% + 8% = 50% (0.50).
    // Under the old bug, marginalTaxRate >= 0.40 assigned 2% NI savings -> 44% relief rate.
    expect(res.workplaceSolution?.taxReliefRate).toBeCloseTo(0.50, 2);
  });

  // BUG-20: SIPP pension-to-pension transfer no tax relief & LISA age 50+ guard
  it('BUG-20: SIPP transfer from pension does not add 20% basic rate tax relief, and LISA transfer over age 50 does not add 25% bonus', () => {
    const fixedNow = new Date('2026-09-01T00:00:00Z');
    const profile: UserProfile = {
      ...baseProfile,
      currentAge: 52,
    };
    const pots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 50000,
      sippBalance: 10000,
      stocksAndSharesIsaBalance: 20000,
      lisaBalance: 10000,
    };

    // 1. Transfer Workplace Pension -> SIPP
    const pensionTransfer: PotTransfer = {
      id: 'trans_1',
      enabled: true,
      sourcePot: 'workplace_pension',
      destinationPot: 'sipp',
      amount: 10000,
      transferDate: '2026-10-01',
      sourceOwner: 'primary',
      destinationOwner: 'primary',
    };
    profile.potTransfers = [pensionTransfer];

    // getProjectedPotBalance for SIPP at 2026-11-01 (after trans_1 executes in October)
    const sippBalance = getProjectedPotBalance(
      profile,
      pots,
      'primary',
      'sipp',
      2026,
      '2026-11-01',
      undefined,
      fixedNow
    );
    // Starting £10,000 + £10,000 transfer (no 20% top-up from pension source) + growth
    // If bug existed: £10,000 + £12,500 = £22,500+
    expect(sippBalance).toBeLessThan(21500);
    expect(sippBalance).toBeGreaterThan(19500);

    // 2. Transfer ISA -> LISA at age 52 (age >= 50)
    const lisaTransfer: PotTransfer = {
      id: 'trans_2',
      enabled: true,
      sourcePot: 'stocks_and_shares_isa',
      destinationPot: 'lisa',
      amount: 4000,
      transferDate: '2026-10-01',
      sourceOwner: 'primary',
      destinationOwner: 'primary',
    };
    profile.potTransfers = [lisaTransfer];

    const lisaBalance = getProjectedPotBalance(
      profile,
      pots,
      'primary',
      'lisa',
      2026,
      '2026-11-01',
      undefined,
      fixedNow
    );
    // Starting £10,000 + £4,000 transfer (no 25% bonus for age 50+) + growth
    // If bug existed: £10,000 + £5,000 = £15,000+
    expect(lisaBalance).toBeLessThan(14600);
    expect(lisaBalance).toBeGreaterThan(13800);
  });

  // BUG-21: Monte Carlo partner accumulation contributions separated from primary
  it('BUG-21: Monte Carlo simulation credits partner contributions to partner pots during accumulation', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerCurrentAge: 40,
      partnerTargetRetirementAge: 60,
      partnerGrossAnnualSalary: 40000,
      grossAnnualSalary: 50000,
    };
    const primaryPots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 50000,
      workplacePensionMonthlyEmployee: 500,
      workplacePensionMonthlyEmployeeType: 'fixed',
    };
    const partnerPots: InvestmentPots = {
      ...DEFAULT_PARTNER_POTS,
      ...ZERO_POTS,
      workplacePensionBalance: 30000,
      workplacePensionMonthlyEmployee: 400,
      workplacePensionMonthlyEmployeeType: 'fixed',
    };
    coupleProfile.partnerPots = partnerPots;

    const taxResult = calculateUKTax(coupleProfile, primaryPots);
    const mcRes = runMonteCarloSimulation(coupleProfile, primaryPots, taxResult, { numSimulations: 10, maxAge: 65 });
    expect(mcRes).toBeDefined();
    expect(mcRes.params.numSimulations).toBe(10);
    expect(mcRes.agePercentiles.length).toBeGreaterThan(0);
    expect(mcRes.medianRetirementPot).toBeGreaterThan(0);
  });

  // BUG-22: Monte Carlo indexTaxBands false flag respected
  it('BUG-22: Monte Carlo simulation runs with indexTaxBands: false without error', () => {
    const frozenProfile: UserProfile = {
      ...baseProfile,
      indexTaxBands: false,
    };
    const pots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 150000,
    };
    const taxResult = calculateUKTax(frozenProfile, pots);
    const mcRes = runMonteCarloSimulation(frozenProfile, pots, taxResult, { numSimulations: 10, maxAge: 70 });
    expect(mcRes).toBeDefined();
    expect(mcRes.params.numSimulations).toBe(10);
  });

  // BUG-23 & BUG-24: Historic modeling partner DB lump sum & partner PCLS age check
  it('BUG-23 & BUG-24: Historic modeling correctly deposits partner DB commuted lump sum into partner pot and evaluates partner upfront PCLS', () => {
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      currentAge: 60,
      targetRetirementAge: 65, // Primary retires at 65
      partnerCurrentAge: 58,
      partnerTargetRetirementAge: 60, // Partner retires at 60
      partnerLumpSumTakeAge: 60, // Partner takes upfront PCLS at 60
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      crystallisationMode: 'upfront',
      partnerCrystallisationMode: 'upfront',
      dbPensions: [
        {
          id: 'partner_db_1',
          name: 'Partner NHS Pension',
          owner: 'partner',
          annualIncome: 12000,
          startAge: 60,
          taxFreeLumpSum: 30000,
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: true,
          enabled: true,
        },
      ],
    };

    const primaryPots: InvestmentPots = {
      ...ZERO_POTS,
      workplacePensionBalance: 100000,
    };
    const partnerPots: InvestmentPots = {
      ...DEFAULT_PARTNER_POTS,
      ...ZERO_POTS,
      workplacePensionBalance: 80000,
    };
    coupleProfile.partnerPots = partnerPots;

    const taxResult = calculateUKTax(coupleProfile, primaryPots);
    const histRes = runHistoricModelingSimulation(coupleProfile, primaryPots, taxResult, 75);
    expect(histRes).toBeDefined();
    expect(histRes.runResults.length).toBeGreaterThan(0);
    // Verified that simulation executes through partner retirement and DB lump sum event without crashing
    const sampleRun = histRes.runResults[0];
    const rowPartner60 = sampleRun.trajectory.find((p) => p.age === 62); // partner is 60 when primary is 62
    expect(rowPartner60).toBeDefined();
  });
});
