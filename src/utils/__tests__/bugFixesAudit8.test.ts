import { describe, it, expect } from 'vitest';
import { calculateGiltLadder } from '../giltLadderEngine';
import { solveTaxOptimalAnnualDrawdown, PotState, TaxOptimizerAnnualInput } from '../taxOptimizerSolver';
import { computePlanInsights } from '../planInsightsEngine';
import { calculateTaxEfficientSavingsCrossover } from '../taxEfficientSavingsEngine';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots, GiltLadderConfig } from '../../types';

describe('Audit Round 8 Bug Fixes (BUG-50 to BUG-54)', () => {
  // BUG-50: Gilt Ladder Coupon Tax Accounting from Longer-Dated Gilts & Cash Flow Additivity
  it('BUG-50: Gilt Ladder records tax paid on coupons from future rungs and satisfies principal + coupon = totalNetPayout', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 25000,
      grossAnnualSalary: 75000, // Higher Rate tax payer (40% coupon tax)
      expectedInflationRate: 0, // Should be preserved as 0%
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      giaBalance: 200000,
    };
    const config: GiltLadderConfig = {
      enabled: true,
      startAge: 60,
      durationYears: 4,
      targetAnnualIncome: 20000,
      fundingSource: 'gia', // Subject to coupon tax
      giltType: 'benchmark', // Has non-zero coupons
      customYieldPercent: 4.0,
      taxBracketOverride: 'higher', // 40% tax on coupons
      inflationLinked: false,
    };

    const summary = calculateGiltLadder(config, profile, pots);

    expect(summary.rungs.length).toBe(4);

    // Verify each rung's annual coupon cashflow + maturing principal equals total net payout
    summary.rungs.forEach((r) => {
      expect(r.maturingPrincipal! + r.annualCouponCashflow!).toBe(r.totalNetPayout);
    });

    // In a 4-year ladder with positive coupons, rung 0 receives coupons from rungs 1, 2, and 3.
    // The tax paid on those future coupons must be recorded in rung 0's taxPaid.
    const rung0 = summary.rungs[0];
    if (rung0.futureCouponsReceived && rung0.futureCouponsReceived > 0) {
      // Net coupon received from future rungs is futureGross * (1 - 0.40)
      // Tax paid should exceed just the tax on rung 0's own coupon
      const grossMaturityCoupon = rung0.grossCouponIncome;
      const netMaturityCoupon = rung0.netCouponIncome;
      const taxOnMaturityCouponOnly = grossMaturityCoupon - netMaturityCoupon;
      expect(rung0.taxPaid).toBeGreaterThan(taxOnMaturityCouponOnly);
    }

    // Verify totalTaxPaid equals sum of all rungs' taxPaid
    const sumOfRungTaxes = summary.rungs.reduce((acc, r) => acc + r.taxPaid, 0);
    expect(summary.totalTaxPaid).toBe(sumOfRungTaxes);
  });

  // BUG-51: Partner LISA pot accounted for in Tax Optimizer Solver
  it('BUG-51: Partner LISA pot is included in partIsaTotal for couple drawdown in taxOptimizerSolver', () => {
    const pots: PotState = {
      primaryUncrystallisedPot: 0,
      primaryCrystallisedPot: 0,
      partnerUncrystallisedPot: 0,
      partnerCrystallisedPot: 0,
      primarySsIsaPot: 0,
      primaryCashIsaPot: 0,
      primaryLisaPot: 0,
      partnerSsIsaPot: 0,
      partnerCashIsaPot: 0,
      partnerLisaPot: 30000, // Partner has £30k in LISA
      primaryCashGiaPot: 0,
      partnerCashGiaPot: 0,
    };

    const input: TaxOptimizerAnnualInput = {
      age: 62,
      partnerAge: 60,
      pensionAccessAge: 57,
      partnerPensionAccessAge: 57,
      netIncomeNeeded: 20000,
      primaryTaxableGuaranteed: 0,
      partnerTaxableGuaranteed: 0,
      primaryTaxFreeGuaranteed: 0,
      partnerTaxFreeGuaranteed: 0,
      primaryMaxLsa: 268275,
      partnerMaxLsa: 268275,
      primaryCumulativeTaxFreeDrawn: 0,
      partnerCumulativeTaxFreeDrawn: 0,
      pots,
      inflationFactor: 1,
      isScottishTax: false,
      isPartnerScottishTax: false,
      indexTaxBands: true,
      isCouple: true,
      remainingRetirementYears: 25,
    };

    const result = solveTaxOptimalAnnualDrawdown(input);

    // Partner LISA is an ISA wrapper: it should provide the £20,000 net income needed
    expect(result.isaDrawdown).toBe(20000);
    expect(result.totalNetIncomeAchieved).toBe(20000);
  });

  // BUG-52: planInsightsEngine statePensionAmountAnnual: 0 and accurate mortgage clearance age
  it('BUG-52: planInsightsEngine honors £0 state pension and uses overpayment-adjusted mortgage clearance', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      targetRetirementIncomeAnnual: 30000,
      includeStatePension: true,
      statePensionAmountAnnual: 0, // Client has 0 qualifying years / £0 state pension
      fullStatePensionAmount: 11502,
      qualifyingYears: 0,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        propertyValue: 400000,
        currentBalance: 100000,
        interestRatePercent: 3.5,
        remainingTermYears: 25, // Naive term = age 45 + 25 = 70
        remainingTermMonths: 0,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 1000, // Large overpayment clears loan in ~6-7 years (around age 52)
        payoffAtRetirement: false,
        payoffSourcePot: 'pension_lump_sum',
        deductFromRetirementIncome: true,
      },
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
    };

    const insights = computePlanInsights(profile, pots, []);

    // 1. Guaranteed floor should NOT include £11,502 state pension when statePensionAmountAnnual is 0
    expect(insights.scorecard.guaranteedFloorAmount).toBe(0);

    // 2. Milestone B (State Pension) should NOT be generated when state pension is £0
    const spMilestones = insights.milestones.filter((m) => m.type === 'state_pension');
    expect(spMilestones.length).toBe(0);

    // 3. Milestone C (Mortgage clearance) should reflect actual overpayments (cleared well before age 70)
    const mortgageMilestone = insights.milestones.find((m) => m.type === 'mortgage_clearance');
    expect(mortgageMilestone).toBeDefined();
    // With £1,000/mo overpayment on £100k balance, clearance is around age 51-53, NOT age 70
    expect(mortgageMilestone!.age).toBeLessThan(55);
  });

  // BUG-53: taxEfficientSavingsEngine uses statutory NMPA for individuals born before 6 April 1973
  it('BUG-53: taxEfficientSavingsEngine recognizes NMPA 55 for individuals born before 6 April 1973', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dateOfBirth: '1968-05-15', // Born before 6 April 1973 -> NMPA is 55
      currentAge: 50,
      targetRetirementAge: 55,
      targetRetirementIncomeAnnual: 25000,
      grossAnnualSalary: 60000,
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 200000,
      stocksAndSharesIsaBalance: 20000,
    };

    const result = calculateTaxEfficientSavingsCrossover(profile, pots);

    // Statutory pension access age should be 55, NOT 57
    expect(result.pensionAccessAge).toBe(55);
    // Since target retirement age is 55 and pension access is 55, no ISA bridge is needed
    expect(result.isaBridgeYears).toBe(0);
    expect(result.isaBridgeRequiredTotal).toBe(0);
  });

  // BUG-54: projectionEngine respects 0% return rates and 0% pot return overrides
  it('BUG-54: projectionEngine preserves 0% return overrides and 0% expected investment return', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 58,
      targetRetirementAge: 60,
      expectedInvestmentReturn: 0, // Flat 0% return
      postRetirementReturn: 0,
      potReturnOverrides: {
        enabled: true,
        workplacePensionReturn: 0,
        stocksAndSharesIsaReturn: 0,
        giaReturn: 0,
        cashSavingsReturn: 0,
      },
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 50000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      cashSavingsBalance: 20000,
      workplacePensionMonthlyEmployee: 0,
      employerMatchPercentage: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };

    const projections = generateProjections(profile, pots);

    // At age 59 (still in accumulation), pots should have 0 growth
    const at59 = projections.find((p) => p.age === 59);
    expect(at59).toBeDefined();
    expect(at59!.primaryPensionPot).toBe(100000);
    expect(at59!.primaryIsaPot).toBe(50000);
    expect(at59!.primaryCashSavingsPot).toBe(20000);
  });
});
