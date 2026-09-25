import { describe, it, expect } from 'vitest';
import { parseTransferTarget, parseTransferYear, normalizeTransferDate, getProjectedPotBalance } from '../potTransferUtils';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

describe('potTransferUtils', () => {
  const fixedNow = new Date('2026-09-24T12:00:00Z');

  describe('parseTransferTarget and parseTransferYear', () => {
    it('parses standard ISO date format (YYYY-MM-DD)', () => {
      const parsed = parseTransferTarget('2027-03-01', undefined, undefined, fixedNow);
      expect(parsed.targetYear).toBe(2027);
      expect(parsed.targetMonth).toBe(3);
      expect(parsed.targetDay).toBe(1);
      expect(parsed.isoDate).toBe('2027-03-01');
      expect(parseTransferYear('2027-03-01', undefined, undefined, fixedNow)).toBe(2027);
    });

    it('parses UK slash date formats like 1/3/27 and 01/03/2027', () => {
      const parsedShort = parseTransferTarget('1/3/27', undefined, undefined, fixedNow);
      expect(parsedShort.targetYear).toBe(2027);
      expect(parsedShort.targetMonth).toBe(3);
      expect(parsedShort.targetDay).toBe(1);
      expect(parsedShort.isoDate).toBe('2027-03-01');
      expect(parseTransferYear('1/3/27', undefined, undefined, fixedNow)).toBe(2027);

      const parsedLong = parseTransferTarget('01/03/2027', undefined, undefined, fixedNow);
      expect(parsedLong.targetYear).toBe(2027);
      expect(parsedLong.targetMonth).toBe(3);
      expect(parsedLong.targetDay).toBe(1);
      expect(parsedLong.isoDate).toBe('2027-03-01');
    });

    it('parses age-based transfers', () => {
      // Current age 47, transfer age 50 -> 3 years later (2029)
      const parsed = parseTransferTarget(undefined, 50, 47, fixedNow);
      expect(parsed.targetYear).toBe(2029);
      expect(parsed.targetMonth).toBe(4);
      expect(parsed.targetDay).toBe(6);
      expect(parsed.isoDate).toBe('2029-04-06');
    });

    it('normalizes date strings to ISO format', () => {
      expect(normalizeTransferDate('1/3/27', fixedNow)).toBe('2027-03-01');
      expect(normalizeTransferDate('01/03/2027', fixedNow)).toBe('2027-03-01');
      expect(normalizeTransferDate('2027-03-01', fixedNow)).toBe('2027-03-01');
    });
  });

  describe('getProjectedPotBalance (User Issue: 11k pot, 1k/mo, 15k transfer on 1/3/27)', () => {
    const testProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 47,
      targetRetirementAge: 55,
      lifeExpectancyAge: 90,
      statePensionAge: 68,
      includeStatePension: true,
      enableTripleLock: true,
      statePensionAmountAnnual: 11500,
      fullStatePensionAmount: 11500,
      qualifyingYears: 35,
      grossAnnualSalary: 30000,
      isCouplePlanning: false,
      taxRegion: 'england_ni_wales',
      pensionContributionMethod: 'relief_at_source',
      targetRetirementIncomeAnnual: 25000,
      expectedInflationRate: 2.5,
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      pclsLumpSumPercent: 25,
      takeLumpSumAtStart: false,
      lsaProtectionType: 'standard',
      customLsaAllowance: 268275,
      potTransfers: [],
    };

    const testPots: InvestmentPots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 11000,
      cashSavingsMonthlyContribution: 1000,
    };

    it('accurately calculates projected balance as ~£16,205 instead of inflated ~£36,105', () => {
      // Target: 1st March 2027 (in ~5 months from Sept 2026)
      const balance = getProjectedPotBalance(
        testProfile,
        testPots,
        'primary',
        'cash_savings',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // Starting balance £11,000 + 5 months of £1,000 (£5,000) + 3.5% cash interest = ~£16,205
      expect(balance).toBeGreaterThan(16000);
      expect(balance).toBeLessThan(16500);
      // Ensure it is definitely not the bugged 36105 value (which added 24 months of contributions)
      expect(balance).not.toBeCloseTo(36105, -2);
    });

    it('works identically when transferDate is provided in UK format 1/3/27', () => {
      const balance = getProjectedPotBalance(
        testProfile,
        testPots,
        'primary',
        'cash_savings',
        2027,
        '1/3/27',
        undefined,
        fixedNow
      );

      expect(balance).toBeGreaterThan(16000);
      expect(balance).toBeLessThan(16500);
    });

    it('allows a £15,000 transfer to execute without insufficient funds error', () => {
      const balance = getProjectedPotBalance(
        testProfile,
        testPots,
        'primary',
        'cash_savings',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      const requestedTransfer = 15000;
      const actualTransferred = Math.min(requestedTransfer, balance);
      const remainingBalance = balance - actualTransferred;

      expect(actualTransferred).toBe(15000);
      expect(remainingBalance).toBeGreaterThan(1000);
    });
  });

  describe('Other contribution types - month-by-month and double counting prevention', () => {
    const baseProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 47,
      targetRetirementAge: 60,
      grossAnnualSalary: 60000,
      isCouplePlanning: false,
      expectedInvestmentReturn: 6.0,
      potReturnOverrides: {
        ...DEFAULT_PROFILE.potReturnOverrides!,
        enabled: false,
      },
      oneOffContributions: [],
      potTransfers: [],
    };

    it('SIPP: does NOT double count when configured in both pots and oneOffContributions', () => {
      // 5 months to 2027-03-01
      // SIPP has £50,000 starting.
      // pots has £400/mo net.
      // oneOffContributions ALSO has £400/mo net.
      // Without the fix, both would be added every month (£800/mo * 1.25 = £1,000/mo).
      // With the fix, oneOffContributions replaces baseline pots, adding £400 * 1.25 = £500/mo.
      const profileWithDuplicateSipp: UserProfile = {
        ...baseProfile,
        oneOffContributions: [
          {
            id: 'sipp-regular-1',
            name: 'Regular Monthly SIPP',
            owner: 'primary',
            targetPot: 'sipp',
            frequency: 'regular_monthly',
            grossAmount: 400,
            startAge: 47,
            endAge: 60,
            sippContributionType: 'net',
            enabled: true,
          },
        ],
      };

      const potsWithSipp: InvestmentPots = {
        ...DEFAULT_POTS,
        sippBalance: 50000,
        sippMonthlyContribution: 400,
      };

      const balance = getProjectedPotBalance(
        profileWithDuplicateSipp,
        potsWithSipp,
        'primary',
        'sipp',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // 5 months of £500 gross (£400 net + 25%) = £2,500 contribution.
      // Starting £50,000 + £2,500 + growth = ~£53,800
      // If double counted, it would be starting £50,000 + £5,000 + growth = ~£56,300
      expect(balance).toBeLessThan(54500);
      expect(balance).toBeGreaterThan(53000);
    });

    it('Workplace Pension: uses months and does NOT double count when defined in oneOffContributions', () => {
      // 5 months to 2027-03-01
      // Salary = £60,000 (£5,000/mo)
      // workplace in oneOffContributions: 5% employee + 3% employer = 8% = £400/mo
      // pots ALSO has 5% employee + 3% employer = £400/mo
      // With double counting: £800/mo = £4,000 over 5 months
      // Without double counting: £400/mo = £2,000 over 5 months
      const profileWithWp: UserProfile = {
        ...baseProfile,
        oneOffContributions: [
          {
            id: 'wp-1',
            name: 'Workplace Pension',
            owner: 'primary',
            targetPot: 'workplace_pension',
            frequency: 'regular_monthly',
            grossAmount: 0,
            workplaceContributionType: 'percent',
            employeePercent: 5,
            employerPercent: 3,
            startAge: 47,
            endAge: 60,
            enabled: true,
          },
        ],
      };

      const potsWithWp: InvestmentPots = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        workplacePensionMonthlyEmployee: 5,
        workplacePensionMonthlyEmployeeType: 'percent',
        employerMatchPercentage: 3,
      };

      const balance = getProjectedPotBalance(
        profileWithWp,
        potsWithWp,
        'primary',
        'workplace_pension',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // Starting £100,000 + 5 months of £400 (£2,000) + growth = ~£104,500
      // If double counted: £100,000 + 5 * £800 = £106,600+
      expect(balance).toBeLessThan(105500);
      expect(balance).toBeGreaterThan(103500);
    });

    it('Stocks & Shares ISA: uses months and does NOT double count', () => {
      const profileWithIsa: UserProfile = {
        ...baseProfile,
        oneOffContributions: [
          {
            id: 'isa-1',
            name: 'Monthly ISA',
            owner: 'primary',
            targetPot: 'stocks_and_shares_isa',
            frequency: 'regular_monthly',
            grossAmount: 500,
            startAge: 47,
            endAge: 60,
            enabled: true,
          },
        ],
      };

      const potsWithIsa: InvestmentPots = {
        ...DEFAULT_POTS,
        stocksAndSharesIsaBalance: 20000,
        stocksAndSharesIsaMonthlyContribution: 500,
      };

      const balance = getProjectedPotBalance(
        profileWithIsa,
        potsWithIsa,
        'primary',
        'stocks_and_shares_isa',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // Starting £20,000 + 5 * £500 (£2,500) + growth = ~£23,000
      // If double counted: £20,000 + 5 * £1,000 (£5,000) = ~£25,600
      expect(balance).toBeLessThan(23800);
      expect(balance).toBeGreaterThan(22600);
    });

    it('LISA: applies 25% government bonus and respects age 50 contribution cutoff', () => {
      // Current age 47 -> at age 47 contributions receive 25% bonus
      const profileUnder50: UserProfile = {
        ...baseProfile,
        currentAge: 47,
      };

      const potsWithLisa: InvestmentPots = {
        ...DEFAULT_POTS,
        lisaBalance: 10000,
        lisaMonthlyContribution: 300, // £300/mo + 25% bonus (£75) = £375/mo
      };

      const balanceUnder50 = getProjectedPotBalance(
        profileUnder50,
        potsWithLisa,
        'primary',
        'lisa',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // 5 months of £375 = £1,875. Starting £10,000 + £1,875 + growth = ~£12,100
      expect(balanceUnder50).toBeGreaterThan(12000);
      expect(balanceUnder50).toBeLessThan(12500);

      // When starting age is 50+, no new LISA contributions are allowed
      const profileOver50: UserProfile = {
        ...baseProfile,
        currentAge: 51,
      };

      const balanceOver50 = getProjectedPotBalance(
        profileOver50,
        potsWithLisa,
        'primary',
        'lisa',
        2027,
        '2027-03-01',
        undefined,
        fixedNow
      );

      // £10,000 with 5 months of growth only (no contributions added) = ~£10,270
      expect(balanceOver50).toBeLessThan(10400);
      expect(balanceOver50).toBeGreaterThan(10200);
    });
  });
});
