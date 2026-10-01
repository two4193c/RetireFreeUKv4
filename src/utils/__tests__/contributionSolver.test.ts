import { describe, it, expect } from 'vitest';
import { solveContributionIncrease } from '../contributionSolver';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';
import { generateProjections } from '../projectionEngine';

describe('solveContributionIncrease', () => {
  it('returns canContribute false if current age >= target retirement age', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 65,
      targetRetirementAge: 60,
    };
    const res = solveContributionIncrease(profile, DEFAULT_POTS, true);
    expect(res.canContribute).toBe(false);
    expect(res.hasSolution).toBe(false);
    expect(res.workingYearsRemaining).toBe(0);
    expect(res.bestSolution).toBeNull();
  });

  it('calculates required monthly contributions for an underfunded retirement plan', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 50000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 60000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 10000,
      sippBalance: 5000,
      stocksAndSharesIsaBalance: 10000,
      cashSavingsBalance: 5000,
      sippMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.canContribute).toBe(true);
    expect(res.hasSolution).toBe(true);
    expect(res.workingYearsRemaining).toBe(20);
    expect(res.bestSolution).not.toBeNull();
    expect(res.bestSolution?.isSuccessful).toBe(true);
    expect(res.bestSolution?.monthlyGross).toBeGreaterThan(0);
    expect(res.bestSolution?.monthlyNetCost).toBeLessThanOrEqual(res.bestSolution!.monthlyGross);
    // monthlyPotFieldValue must exist on all solutions
    expect(res.bestSolution?.monthlyPotFieldValue).toBeGreaterThan(0);
    // For SIPP: potFieldValue must equal gross/1.25 (net equivalent)
    if (res.sippSolution) {
      const expectedNet = Math.round(res.sippSolution.monthlyGross / 1.25);
      expect(res.sippSolution.monthlyPotFieldValue).toBe(expectedNet);
    }
    // For ISA / Workplace: potFieldValue equals monthlyGross
    if (res.isaSolution) {
      expect(res.isaSolution.monthlyPotFieldValue).toBe(res.isaSolution.monthlyGross);
    }
    if (res.workplaceSolution) {
      expect(res.workplaceSolution.monthlyPotFieldValue).toBe(res.workplaceSolution.monthlyGross);
    }
  });

  it('solves for ISA increase when user already has monthly ISA contribution in pots', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 50000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaMonthlyContribution: 300,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.isaSolution).not.toBeNull();
  });

  it('allows ISA option up to remaining ISA limit when deficit requires more than the limit', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 55, // only 5 working years
      targetRetirementIncomeAnnual: 40000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 60000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 20000,
      stocksAndSharesIsaMonthlyContribution: 500,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.hasSolution).toBe(true);
    expect(res.sippSolution).not.toBeNull();
    // ISA limit is £20,000/yr (£1,666/mo); with £500/mo already used, remaining headroom is £1,166/mo.
    // ISA solution is offered up to the remaining ISA limit (£1,166/mo), with zero spillover to cash!
    expect(res.isaSolution).not.toBeNull();
    expect(res.isaSolution?.monthlyGross).toBe(1166);
    expect(res.isaSolution?.isSuccessful).toBe(false); // only partially eliminates deficit
  });

  it('does not display ISA option once ISA annual limit is already reached via existing contributions', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 58,
      targetRetirementIncomeAnnual: 45000,
      lifeExpectancyAge: 85,
      grossAnnualSalary: 60000,
      oneOffContributions: [
        {
          id: 'isa_full',
          name: 'Max Monthly ISA',
          owner: 'primary',
          targetPot: 'stocks_and_shares_isa',
          frequency: 'regular_monthly',
          grossAmount: 1666.67, // Uses all £20k allowance
          startAge: 45,
          endAge: 60,
          enabled: true,
        },
      ],
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 10000,
      sippBalance: 10000,
    };

    const res = solveContributionIncrease(profile, pots, true);
    // SIPP is still valid and can solve
    expect(res.sippSolution).not.toBeNull();
    // ISA limit is reached, so ISA option must NOT be displayed
    expect(res.isaSolution).toBeNull();
  });

  it('solves for ISA increase when user already has monthly ISA contribution in profile.oneOffContributions', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 25000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 50000,
      oneOffContributions: [
        {
          id: 'isa_reg_1',
          name: 'Monthly S&S ISA',
          owner: 'primary',
          targetPot: 'stocks_and_shares_isa',
          frequency: 'regular_monthly',
          grossAmount: 300,
          startAge: 40,
          endAge: 60,
          enabled: true,
        },
      ],
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaMonthlyContribution: 0,
    };

    const res = solveContributionIncrease(profile, pots, true);
    expect(res.isaSolution).not.toBeNull();
    expect(res.isaSolution?.monthlyGross).toBeGreaterThan(0);
    expect(res.isaSolution?.monthlyPotFieldValue).toBe(res.isaSolution!.monthlyGross);
    expect(res.isaSolution?.isSuccessful).toBe(true);

    // Verify applying the solved ISA amount eliminates all shortfalls
    const updatedPots: InvestmentPots = {
      ...pots,
      stocksAndSharesIsaMonthlyContribution: (pots.stocksAndSharesIsaMonthlyContribution || 0) + res.isaSolution!.monthlyPotFieldValue,
    };
    const candTax = calculateUKTax(profile, updatedPots);
    const candProj = generateProjections(profile, updatedPots, candTax);
    const retiredYears = candProj.filter((p) => p.isRetired && p.age <= (profile.lifeExpectancyAge || 85));
    const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 25);
    expect(shortfalls.length).toBe(0);
  });

  it('verifies that setting up a "Bridging the Gap" monthly contribution in profile.oneOffContributions eliminates retirement shortfall', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 25000,
      lifeExpectancyAge: 85,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.0,
      postRetirementReturn: 4.5,
      grossAnnualSalary: 55000,
      oneOffContributions: [],
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 15000,
      sippBalance: 20000,
      workplacePensionBalance: 30000,
    };

    // Before solver: plan has failures
    const initialTax = calculateUKTax(profile, pots);
    const initialProj = generateProjections(profile, pots, initialTax);
    const initialFailures = initialProj.filter((p) => p.isRetired && (p.incomeShortfall || 0) > 25);
    expect(initialFailures.length).toBeGreaterThan(0);

    // Solve for contribution
    const res = solveContributionIncrease(profile, pots, true);
    expect(res.isaSolution).not.toBeNull();
    expect(res.sippSolution).not.toBeNull();
    expect(res.workplaceSolution).not.toBeNull();

    // 1. Test ISA "Bridging the Gap - Stocks & Shares ISA" contribution
    const isaProfile: UserProfile = {
      ...profile,
      oneOffContributions: [
        {
          id: 'contrib_gap_isa',
          name: 'Bridging the Gap - Stocks & Shares ISA',
          owner: 'primary',
          targetPot: 'stocks_and_shares_isa',
          frequency: 'regular_monthly',
          grossAmount: res.isaSolution!.monthlyGross,
          startAge: profile.currentAge,
          endAge: profile.targetRetirementAge,
          enabled: true,
          description: `Monthly savings of £${res.isaSolution!.monthlyGross}/mo into Stocks & Shares ISA to eliminate retirement income deficit`,
        },
      ],
    };
    const isaTax = calculateUKTax(isaProfile, pots);
    const isaProj = generateProjections(isaProfile, pots, isaTax);
    const isaFailures = isaProj.filter((p) => p.isRetired && p.age <= 85 && (p.incomeShortfall || 0) > 25);
    expect(isaFailures.length).toBe(0);

    // 2. Test SIPP "Bridging the Gap - SIPP" contribution
    const sippProfile: UserProfile = {
      ...profile,
      oneOffContributions: [
        {
          id: 'contrib_gap_sipp',
          name: 'Bridging the Gap - SIPP',
          owner: 'primary',
          targetPot: 'sipp',
          frequency: 'regular_monthly',
          grossAmount: res.sippSolution!.monthlyGross,
          sippContributionType: 'gross',
          startAge: profile.currentAge,
          endAge: profile.targetRetirementAge,
          enabled: true,
          description: `Monthly savings of £${res.sippSolution!.monthlyGross}/mo into SIPP to eliminate retirement income deficit`,
        },
      ],
    };
    const sippTax = calculateUKTax(sippProfile, pots);
    const sippProj = generateProjections(sippProfile, pots, sippTax);
    const sippFailures = sippProj.filter((p) => p.isRetired && p.age <= 85 && (p.incomeShortfall || 0) > 25);
    expect(sippFailures.length).toBe(0);

    // 3. Test applying more than one: combining both ISA and SIPP bridging contributions
    const combinedProfile: UserProfile = {
      ...profile,
      oneOffContributions: [
        ...isaProfile.oneOffContributions,
        ...sippProfile.oneOffContributions,
      ],
    };
    expect(combinedProfile.oneOffContributions.length).toBe(2);
    expect(combinedProfile.oneOffContributions[0].name).toBe('Bridging the Gap - Stocks & Shares ISA');
    expect(combinedProfile.oneOffContributions[1].name).toBe('Bridging the Gap - SIPP');
    const combTax = calculateUKTax(combinedProfile, pots);
    const combProj = generateProjections(combinedProfile, pots, combTax);
    const combFailures = combProj.filter((p) => p.isRetired && p.age <= 85 && (p.incomeShortfall || 0) > 25);
    expect(combFailures.length).toBe(0);
  });

  it('verifies data.json scenario with plan deficit has no spurious £1 solution after applying SIPP', async () => {
    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
    const scenario = data.scenarios[0];
    const profile = { ...scenario.profile, targetRetirementIncomeAnnual: 25000 };
    const pots = scenario.pots;

    // Remove all ISA contributions to test the user scenario where there are NO ISA contributions
    const noIsaProfile = {
      ...profile,
      oneOffContributions: (profile.oneOffContributions || []).filter((c) => c.targetPot !== 'stocks_and_shares_isa' && c.targetPot !== 'cash_isa' && c.targetPot !== 'lisa'),
    };
    const noIsaPots = {
      ...pots,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
    };
    const res = solveContributionIncrease(noIsaProfile, noIsaPots, noIsaProfile.adjustForInflation);
    expect(res.hasSolution).toBe(true);
    expect(res.sippSolution).not.toBeNull();
    // With no ISA contributions, ISA option IS displayed and solves up to the ISA limit!
    expect(res.isaSolution).not.toBeNull();
    expect(res.isaSolution?.monthlyGross).toBe(1191);

    // Apply SIPP "Bridging the Gap"
    const sippProfile = {
      ...profile,
      oneOffContributions: [
        ...(profile.oneOffContributions || []),
        {
          id: 'contrib_bridging',
          name: 'Bridging the Gap',
          owner: 'primary',
          targetPot: 'sipp',
          frequency: 'regular_monthly',
          grossAmount: res.sippSolution!.monthlyGross,
          sippContributionType: 'gross',
          startAge: profile.currentAge,
          endAge: profile.targetRetirementAge,
          enabled: true,
        },
      ],
    };
    const resAfterSipp = solveContributionIncrease(sippProfile, pots, profile.adjustForInflation);
    // After applying SIPP solution, all shortfalls during lifetime are eliminated:
    expect(resAfterSipp.hasSolution).toBe(false);
    expect(resAfterSipp.sippSolution).toBeNull();
    expect(resAfterSipp.isaSolution).toBeNull();
    expect(resAfterSipp.workplaceSolution).toBeNull();

    // In ProjectionChart, shortfallYears up to client life expectancy is 0
    const candTax = calculateUKTax(sippProfile, pots);
    const candProj = generateProjections(sippProfile, pots, candTax);
    const retiredYears = candProj.filter((p) => p.isRetired && p.age <= profile.lifeExpectancyAge);
    const shortfalls = retiredYears.filter((p) => (p.incomeShortfall || 0) > 25);
    expect(shortfalls.length).toBe(0);
  });
});
