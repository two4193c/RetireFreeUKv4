import { describe, it, expect } from 'vitest';
import {
  computeIncomeTaxOnAmount,
  calculateUKTax,
  getLsaLimit,
  calculateMaxPcls,
  getPensionAccessAge,
  aggregateIncome,
} from '../ukTaxEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile } from '../../types';

describe('ukTaxEngine - computeIncomeTaxOnAmount', () => {
  it('returns 0 tax and 0 marginal rate for zero or negative gross income', () => {
    expect(computeIncomeTaxOnAmount(0)).toEqual({ tax: 0, marginalRate: 0 });
    expect(computeIncomeTaxOnAmount(-5000)).toEqual({ tax: 0, marginalRate: 0 });
  });

  it('returns 0 tax for income within the Personal Allowance (£12,570)', () => {
    const result = computeIncomeTaxOnAmount(12570);
    expect(result.tax).toBe(0);
    expect(result.marginalRate).toBe(0);
  });

  it('correctly calculates basic rate tax (20%) for income between PA and £50,270', () => {
    // Gross: £20,000 -> Taxable: £7,430 -> Tax at 20%: £1,486
    const result = computeIncomeTaxOnAmount(20000);
    expect(result.tax).toBeCloseTo(1486, 1);
    expect(result.marginalRate).toBe(20);
  });

  it('correctly calculates basic rate tax boundary at £50,270', () => {
    // Gross: £50,270 -> Taxable: £37,700 -> Tax at 20%: £7,540
    const result = computeIncomeTaxOnAmount(50270);
    expect(result.tax).toBeCloseTo(7540, 1);
    expect(result.marginalRate).toBe(20);
  });

  it('correctly calculates higher rate tax (40%) for income above £50,270', () => {
    // Gross: £70,000
    // Basic rate: £37,700 * 0.20 = £7,540
    // Higher rate: (£70,000 - £50,270) = £19,730 * 0.40 = £7,892
    // Total Tax = £15,432
    const result = computeIncomeTaxOnAmount(70000);
    expect(result.tax).toBeCloseTo(15432, 1);
    expect(result.marginalRate).toBe(40);
  });

  it('handles Personal Allowance taper for gross income between £100,000 and £125,140', () => {
    // Gross: £110,000 -> PA reduced by (£10,000 / 2) = £5,000 to £7,570
    // Taxable: £110,000 - £7,570 = £102,430
    // Basic rate portion: £37,700 * 0.20 = £7,540
    // Higher rate portion: (£102,430 - £37,700) = £64,730 * 0.40 = £25,892
    // Total Tax = £33,432
    const result = computeIncomeTaxOnAmount(110000);
    expect(result.tax).toBeCloseTo(33432, 1);
  });

  it('completely removes Personal Allowance for income >= £125,140', () => {
    // Gross: £125,140 -> PA = £0
    // Basic portion: £37,700 * 0.20 = £7,540
    // Higher portion: (£125,140 - £37,700) = £87,440 * 0.40 = £34,976
    // Total Tax = £42,516
    const result = computeIncomeTaxOnAmount(125140);
    expect(result.tax).toBeCloseTo(42516, 1);
  });

  it('applies additional rate tax (45%) for income above £125,140', () => {
    // Gross: £150,000
    // PA = £0
    // Basic: £37,700 * 0.20 = £7,540
    // Higher: (£125,140 - £37,700) = £87,440 * 0.40 = £34,976
    // Additional: (£150,000 - £125,140) = £24,860 * 0.45 = £11,187
    // Total = £53,703
    const result = computeIncomeTaxOnAmount(150000);
    expect(result.tax).toBeCloseTo(53703, 1);
    expect(result.marginalRate).toBe(45);
  });

  it('calculates Scottish tax bands correctly when isScottish is true', () => {
    const result = computeIncomeTaxOnAmount(40000, true);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.marginalRate).toBe(21);
  });

  it('respects custom tax band overrides when customTaxBands is enabled', () => {
    const customBands: UserProfile['customTaxBands'] = {
      enabled: true,
      personalAllowance: 15000,
      paTaperThreshold: 100000,
      basicRatePercent: 15,
      basicRateThreshold: 40000,
      higherRatePercent: 35,
      higherRateThreshold: 100000,
      additionalRatePercent: 45,
    };
    // Gross £30,000 -> PA £15,000 -> Taxable £15,000 at 15% = £2,250
    const result = computeIncomeTaxOnAmount(30000, false, customBands);
    expect(result.tax).toBeCloseTo(2250, 1);
    expect(result.marginalRate).toBe(15);
  });
});

describe('ukTaxEngine - calculateUKTax', () => {
  it('calculates tax and NI for a standard employee salary', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 60000,
      pensionContributionMethod: 'salary_sacrifice',
    };
    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.grossIncome).toBe(60000);
    expect(result.totalIncomeTax).toBeGreaterThan(0);
    expect(result.totalNationalInsurance).toBeGreaterThan(0);
    expect(result.netTakeHomePay).toBeLessThan(60000);
  });

  it('salary sacrifice reduces both taxable income and NI contributions', () => {
    const baseProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
    };
    const potsWithContribution = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 500, // £6,000 / year
      workplacePensionMonthlyEmployeeType: 'fixed' as const,
    };

    const salSacResult = calculateUKTax(
      { ...baseProfile, pensionContributionMethod: 'salary_sacrifice' },
      potsWithContribution
    );
    const netPayResult = calculateUKTax(
      { ...baseProfile, pensionContributionMethod: 'net_pay' },
      potsWithContribution
    );

    // Salary sacrifice saves NI compared to net pay
    expect(salSacResult.totalNationalInsurance).toBeLessThan(netPayResult.totalNationalInsurance);
  });
});

describe('ukTaxEngine - LSA and PCLS limits', () => {
  it('returns standard LSA limit (£268,275) for standard protection', () => {
    const profile: any = { ...DEFAULT_PROFILE, lsaProtectionType: 'standard' };
    expect(getLsaLimit(profile)).toBe(268275);
  });

  it('returns fixed 2014 protection limit (£375,000)', () => {
    const profile: any = { ...DEFAULT_PROFILE, lsaProtectionType: 'fixed_2014' };
    expect(getLsaLimit(profile)).toBe(375000);
  });

  it('caps max PCLS at LSA limit when 25% of pension pot exceeds LSA limit', () => {
    const profile: any = { ...DEFAULT_PROFILE, lsaProtectionType: 'standard' }; // LSA = 268,275
    const largePensionPot = 1500000; // 25% = 375,000 > 268,275
    const pclsInfo = calculateMaxPcls(largePensionPot, profile);

    expect(pclsInfo.maxTaxFreeCash).toBe(268275);
    expect(pclsInfo.isCappedByLsa).toBe(true);
  });

  it('allows full 25% PCLS when 25% of pot is within LSA limit', () => {
    const profile: any = { ...DEFAULT_PROFILE, lsaProtectionType: 'standard' };
    const moderatePensionPot = 800000; // 25% = 200,000 <= 268,275
    const pclsInfo = calculateMaxPcls(moderatePensionPot, profile);

    expect(pclsInfo.maxTaxFreeCash).toBe(200000);
    expect(pclsInfo.isCappedByLsa).toBe(false);
  });
});

describe('ukTaxEngine - getPensionAccessAge', () => {
  it('returns 55 for individuals born before 6 April 1971', () => {
    const profile: any = { ...DEFAULT_PROFILE, dateOfBirth: '1970-01-01' };
    expect(getPensionAccessAge(profile)).toBe(55);
  });

  it('returns 57 for individuals born on or after 6 April 1971', () => {
    const profile: any = { ...DEFAULT_PROFILE, dateOfBirth: '1985-05-20' };
    expect(getPensionAccessAge(profile)).toBe(57);
  });

  it('respects explicitly configured pension access age', () => {
    const profile: any = { ...DEFAULT_PROFILE, pensionAccessAge: 58 };
    expect(getPensionAccessAge(profile)).toBe(58);
  });
});

describe('ukTaxEngine - aggregateIncome & Threshold Income Taper', () => {
  it('correctly aggregates non-investment taxable income from salary, fixed income, and DB pensions', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 65,
      grossAnnualSalary: 150000,
      fixedIncomeStreams: [
        { id: '1', name: 'Consulting', owner: 'primary', type: 'taxable', annualAmount: 30000, startAge: 40, endAge: 60, enabled: true },
        { id: '2', name: 'Gift', owner: 'primary', type: 'tax_free', annualAmount: 10000, startAge: 40, endAge: 60, enabled: true },
      ],
      dbPensions: [
        { id: 'db1', name: 'DB Scheme', owner: 'primary', annualIncome: 25000, startAge: 50, enabled: true },
      ],
    };

    const agg = aggregateIncome(profile, false, 50);
    expect(agg.grossSalary).toBe(150000);
    expect(agg.taxableFixedIncome).toBe(30000);
    expect(agg.dbPensionIncome).toBe(25000);
    expect(agg.nonInvestmentTaxableIncome).toBe(205000);
    expect(agg.investmentIncome).toBe(0);
  });

  it('triggers Annual Allowance taper when Threshold Income (>£200k) and Adjusted Income (>£260k) are met via aggregated non-investment income', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 65,
      grossAnnualSalary: 280000,
      hasTriggeredMpaa: false,
      carryForwardAllowance: 0,
    };

    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.thresholdIncome).toBe(280000);
    expect(result.adjustedIncome).toBe(280000);
    expect(result.isTaperedAnnualAllowance).toBe(true);
    expect(result.pensionAnnualAllowanceLimit).toBe(50000);
  });

  it('calculates full Salary Sacrifice NI savings for employee and employer without artificial caps', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 65,
      grossAnnualSalary: 60000,
      pensionContributionMethod: 'salary_sacrifice',
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 500, // £6,000/yr salary sacrifice
      workplacePensionMonthlyEmployeeType: 'amount',
    };

    const result = calculateUKTax(profile, pots);
    // Salary sacrificed = £6,000
    // Gross salary before sacrifice = £60,000. Post-sacrifice salary = £54,000.
    // NI on £60,000 = (50270 - 12570) * 0.08 + (60000 - 50270) * 0.02 = 3016 + 194.6 = 3210.6
    // NI on £54,000 = (50270 - 12570) * 0.08 + (54000 - 50270) * 0.02 = 3016 + 74.6 = 3090.6
    // NI saved = 120 (since £6,000 sacrifice is entirely above upper earnings limit of £50,270, saved at 2% = £120)
    expect(result.salarySacrificeNicSavedEmployee).toBeCloseTo(120, 1);
    expect(result.salarySacrificeNicSavedEmployer).toBeCloseTo(6000 * 0.138, 1);
  });
});
