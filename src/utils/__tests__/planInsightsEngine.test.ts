import { describe, it, expect } from 'vitest';
import { computePlanInsights } from '../planInsightsEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';
import { generateProjections } from '../projectionEngine';
import { UserProfile, InvestmentPots } from '../../types';

describe('planInsightsEngine', () => {
  it('correctly assesses a well-funded plan with surplus and provides actionable insights', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      grossAnnualSalary: 65000,
      qualifyingYears: 35,
      includeStatePension: true,
      targetRetirementIncomeAnnual: 30000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
      sippBalance: 100000,
      stocksAndSharesIsaBalance: 100000,
    };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    const insights = computePlanInsights(profile, pots, projections, taxResult);

    expect(insights.scorecard.isFullyFunded).toBe(true);
    expect(insights.scorecard.runwayYears).toBe(50); // 90 - 40
    expect(insights.scorecard.initialSwr).toBeGreaterThan(0);
    expect(insights.opportunities.length).toBeGreaterThan(0);

    const maxSpendOpp = insights.opportunities.find((o) => o.id === 'maximized_spend_potential');
    expect(maxSpendOpp).toBeDefined();
    expect(maxSpendOpp?.status).toBe('recommended');
  });

  it('detects 60% tax trap when active and advises contribution', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 115000,
      pensionContributionMethod: 'relief_at_source',
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 0,
      sippMonthlyContribution: 0,
    };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    const insights = computePlanInsights(profile, pots, projections, taxResult);
    const trapOpp = insights.opportunities.find((o) => o.id === 'tax_trap_mitigation');

    expect(trapOpp).toBeDefined();
    expect(trapOpp?.status).toBe('recommended');
    expect(trapOpp?.observation).toContain('115,000');
  });

  it('recognizes when 60% tax trap is already mitigated by pension contributions', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 115000,
      pensionContributionMethod: 'salary_sacrifice',
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 15, // 15% of 115k = £17,250 -> ANI = £97,750
      workplacePensionMonthlyEmployeeType: 'percent',
    };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    const insights = computePlanInsights(profile, pots, projections, taxResult);
    const trapOptimisedOpp = insights.opportunities.find((o) => o.id === 'tax_trap_optimised');

    expect(trapOptimisedOpp).toBeDefined();
    expect(trapOptimisedOpp?.status).toBe('already_optimised');
  });

  it('detects State Pension missing qualifying years and advises Class 3 NI gap fill', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      includeStatePension: true,
      qualifyingYears: 28, // 7 missing years
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);
    const projections = generateProjections(profile, DEFAULT_POTS);

    const insights = computePlanInsights(profile, DEFAULT_POTS, projections, taxResult);
    const niOpp = insights.opportunities.find((o) => o.id === 'state_pension_gap_fill');

    expect(niOpp).toBeDefined();
    expect(niOpp?.status).toBe('recommended');
    expect(niOpp?.observation).toContain('28 qualifying years');
  });

  it('detects mortgage extending into retirement and generates appropriate milestone and opportunity', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 58,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        propertyValue: 400000,
        currentBalance: 150000,
        interestRatePercent: 4.5,
        remainingTermYears: 20, // 45 + 20 = age 65 (7 years past age 58)
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 0,
        payoffAtRetirement: false,
        deductFromRetirementIncome: true,
      },
    };
    const taxResult = calculateUKTax(profile, DEFAULT_POTS);
    const projections = generateProjections(profile, DEFAULT_POTS);

    const insights = computePlanInsights(profile, DEFAULT_POTS, projections, taxResult);
    const mortOpp = insights.opportunities.find((o) => o.id === 'mortgage_retirement_clearance');

    expect(mortOpp).toBeDefined();
    expect(mortOpp?.status).toBe('recommended');
    expect(mortOpp?.observation).toContain('extend 7 years into retirement');
  });
});
