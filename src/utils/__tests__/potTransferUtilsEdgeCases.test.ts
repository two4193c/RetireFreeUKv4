import { describe, it, expect } from 'vitest';
import {
  parseTransferTarget,
  parseTransferYear,
  normalizeTransferDate,
  getProjectedPotBalance,
} from '../potTransferUtils';
import { UserProfile, InvestmentPots } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';

// "Today" is 24 Sep 2026 (month 9, day 24)
const now = new Date(2026, 8, 24, 12, 0, 0);

const zeroReturns = {
  enabled: true,
  workplacePensionReturn: 0,
  sippReturn: 0,
  stocksAndSharesIsaReturn: 0,
  cashIsaReturn: 0,
  lisaReturn: 0,
  giaReturn: 0,
  cashSavingsReturn: 0,
};

const makeProfile = (over: Partial<UserProfile> = {}): UserProfile =>
  ({
    ...DEFAULT_PROFILE,
    currentAge: 40,
    targetRetirementAge: 60,
    isCouplePlanning: false,
    potReturnOverrides: zeroReturns,
    oneOffContributions: [],
    potTransfers: [],
    ...over,
  }) as UserProfile;

const makePots = (over: Partial<InvestmentPots> = {}): InvestmentPots =>
  ({
    ...DEFAULT_POTS,
    workplacePensionBalance: 0,
    workplacePensionMonthlyEmployee: 0,
    employerMatchPercentage: 0,
    sippBalance: 0,
    sippMonthlyContribution: 0,
    stocksAndSharesIsaBalance: 0,
    stocksAndSharesIsaMonthlyContribution: 0,
    cashIsaBalance: 0,
    cashIsaMonthlyContribution: 0,
    lisaBalance: 0,
    lisaMonthlyContribution: 0,
    giaBalance: 0,
    giaMonthlyContribution: 0,
    cashSavingsBalance: 0,
    cashSavingsMonthlyContribution: 0,
    ...over,
  }) as InvestmentPots;

describe('parseTransferTarget edge cases', () => {
  it('defaults to next 6 April when nothing is supplied', () => {
    const p = parseTransferTarget(undefined, undefined, undefined, now);
    expect(p.isoDate).toBe('2027-04-06');
  });

  it('treats whitespace-only date as missing', () => {
    expect(parseTransferTarget('   ', undefined, undefined, now).isoDate).toBe('2027-04-06');
    expect(normalizeTransferDate('   ', now)).toBeUndefined();
    expect(normalizeTransferDate(undefined, now)).toBeUndefined();
  });

  it('parses year-month ISO partials with day 1', () => {
    expect(parseTransferTarget('2028-05', undefined, undefined, now).isoDate).toBe('2028-05-01');
  });

  it('parses a bare year', () => {
    expect(parseTransferTarget('2030', undefined, undefined, now).isoDate).toBe('2030-04-06');
    expect(parseTransferYear('2030', undefined, undefined, now)).toBe(2030);
  });

  it('ignores a bare number that is not a plausible year', () => {
    expect(parseTransferTarget('50', undefined, undefined, now).targetYear).toBe(2027);
  });

  it('parses MM/YYYY and expands two-digit years with a 70 pivot', () => {
    expect(parseTransferTarget('03/2028', undefined, undefined, now).isoDate).toBe('2028-03-01');
    expect(parseTransferTarget('3/28', undefined, undefined, now).isoDate).toBe('2028-03-01');
    expect(parseTransferTarget('1/1/70', undefined, undefined, now).targetYear).toBe(1970);
    expect(parseTransferTarget('1/1/69', undefined, undefined, now).targetYear).toBe(2069);
  });

  it('falls back to sane values for out-of-range month/day', () => {
    const p = parseTransferTarget('2028-13-45', undefined, undefined, now);
    expect(p.targetYear).toBe(2028);
    expect(p.targetMonth).toBe(4);
    expect(p.targetDay).toBe(6);
  });

  it('falls back for garbage input', () => {
    expect(parseTransferTarget('abc-def-ghi', undefined, undefined, now).isoDate).toBe('2027-04-06');
    expect(parseTransferTarget('x/y/z', undefined, undefined, now).targetYear).toBe(2027);
    expect(parseTransferTarget('abc', undefined, undefined, now).isoDate).toBe('2027-04-06');
  });

  it('never goes into the past for age based transfers where age already passed', () => {
    expect(parseTransferTarget(undefined, 30, 40, now).targetYear).toBe(2026);
  });

  it('ignores transferAge when baseAge is missing or age is zero', () => {
    expect(parseTransferTarget(undefined, 50, undefined, now).targetYear).toBe(2027);
    expect(parseTransferTarget(undefined, 0, 40, now).targetYear).toBe(2027);
  });

  it('prefers transferDate over transferAge', () => {
    expect(parseTransferTarget('2029-02-02', 60, 40, now).isoDate).toBe('2029-02-02');
  });
});

describe('getProjectedPotBalance regular contributions', () => {
  it('adds monthly contributions up to a mid-month target (GIA)', () => {
    const pots = makePots({ giaBalance: 1000, giaMonthlyContribution: 100 });
    // Sep -> Mar = 6 months, all with contributions (day 15 > payroll)
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(1600, 6);
  });

  it('skips the final month contribution when transfer is on day 1', () => {
    const pots = makePots({ giaBalance: 1000, giaMonthlyContribution: 100 });
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'gia', 2027, '2027-03-01', undefined, now)).toBeCloseTo(1500, 6);
  });

  it('returns current balance when target is in the past', () => {
    const pots = makePots({ giaBalance: 1234, giaMonthlyContribution: 100 });
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'gia', 2025, '2025-01-01', undefined, now)).toBe(1234);
  });

  it('returns current balance when target is earlier today/this month', () => {
    const pots = makePots({ giaBalance: 500, giaMonthlyContribution: 100 });
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'gia', 2026, '2026-09-10', undefined, now)).toBe(500);
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'gia', 2026, '2026-09-24', undefined, now)).toBe(500);
  });

  it('applies 25% tax relief to SIPP net contributions', () => {
    const pots = makePots({ sippBalance: 0, sippMonthlyContribution: 100 });
    expect(getProjectedPotBalance(makeProfile(), pots, 'primary', 'sipp', 2027, '2027-03-15', undefined, now)).toBeCloseTo(750, 6);
  });

  it('applies LISA bonus under 50 and stops contributions from 50', () => {
    const pots = makePots({ lisaMonthlyContribution: 100 });
    expect(getProjectedPotBalance(makeProfile({ currentAge: 40 }), pots, 'primary', 'lisa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(750, 6);
    expect(getProjectedPotBalance(makeProfile({ currentAge: 55, targetRetirementAge: 70 }), pots, 'primary', 'lisa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(0, 6);
  });

  it('handles ISA, cash ISA and cash savings contributions', () => {
    const pots = makePots({
      stocksAndSharesIsaMonthlyContribution: 50,
      cashIsaMonthlyContribution: 20,
      cashSavingsMonthlyContribution: 10,
    });
    const p = makeProfile();
    expect(getProjectedPotBalance(p, pots, 'primary', 'stocks_and_shares_isa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(300, 6);
    expect(getProjectedPotBalance(p, pots, 'primary', 'cash_isa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(120, 6);
    expect(getProjectedPotBalance(p, pots, 'primary', 'cash_savings', 2027, '2027-03-15', undefined, now)).toBeCloseTo(60, 6);
  });

  it('computes workplace pension from percent employee + employer match', () => {
    const pots = makePots({
      workplacePensionMonthlyEmployee: 5,
      workplacePensionMonthlyEmployeeType: 'percent',
      employerMatchPercentage: 3,
    });
    const p = makeProfile({ grossAnnualSalary: 60000 });
    // (5% + 3%) of 60k / 12 = 400/mo * 6
    expect(getProjectedPotBalance(p, pots, 'primary', 'workplace_pension', 2027, '2027-03-15', undefined, now)).toBeCloseTo(2400, 6);
  });

  it('computes workplace pension with fixed employee amount', () => {
    const pots = makePots({
      workplacePensionMonthlyEmployee: 200,
      workplacePensionMonthlyEmployeeType: 'fixed',
      employerMatchPercentage: 3,
    });
    const p = makeProfile({ grossAnnualSalary: 60000 });
    expect(getProjectedPotBalance(p, pots, 'primary', 'workplace_pension', 2027, '2027-03-15', undefined, now)).toBeCloseTo(2100, 6);
  });

  it('stops contributions once retired', () => {
    const pots = makePots({ giaBalance: 1000, giaMonthlyContribution: 100 });
    // Age 60 and retire at 60 => retired immediately
    const p = makeProfile({ currentAge: 60, targetRetirementAge: 60 });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(1000, 6);
  });

  it('compounds growth monthly with return overrides', () => {
    const pots = makePots({ giaBalance: 10000 });
    const p = makeProfile({
      potReturnOverrides: { ...zeroReturns, giaReturn: 12 },
    });
    // 6 months at 1% monthly
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(10000 * Math.pow(1.01, 6), 4);
  });

  it('uses default asset-class rates when overrides are disabled', () => {
    const pots = makePots({ cashSavingsBalance: 10000 });
    const p = makeProfile({ potReturnOverrides: { ...zeroReturns, enabled: false } });
    const v = getProjectedPotBalance(p, pots, 'primary', 'cash_savings', 2027, '2027-03-15', undefined, now);
    expect(v).toBeCloseTo(10000 * Math.pow(1 + 0.035 / 12, 6), 4);
    const pCashIsa = getProjectedPotBalance(p, makePots({ cashIsaBalance: 10000 }), 'primary', 'cash_isa', 2027, '2027-03-15', undefined, now);
    expect(pCashIsa).toBeCloseTo(10000 * Math.pow(1 + 0.042 / 12, 6), 4);
  });

  it('never returns a negative balance and returns 0 for unknown pot', () => {
    expect(getProjectedPotBalance(makeProfile(), makePots(), 'primary', 'unknown_pot', 2027, '2027-03-15', undefined, now)).toBe(0);
  });
});

describe('getProjectedPotBalance one-offs and other transfers', () => {
  it('adds a one-off lump sum landing before the target date', () => {
    const pots = makePots({ giaBalance: 100 });
    const p = makeProfile({
      oneOffContributions: [
        { id: 'o1', name: 'Bonus', targetPot: 'gia', grossAmount: 500, date: '2027-01-10', enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(600, 6);
  });

  it('ignores disabled, wrong-owner, wrong-pot one-offs', () => {
    const pots = makePots({ giaBalance: 100 });
    const p = makeProfile({
      oneOffContributions: [
        { id: 'a', name: 'a', targetPot: 'gia', grossAmount: 500, date: '2027-01-10', enabled: false },
        { id: 'b', name: 'b', targetPot: 'gia', grossAmount: 500, date: '2027-01-10', enabled: true, owner: 'partner' },
        { id: 'c', name: 'c', targetPot: 'sipp', grossAmount: 500, date: '2027-01-10', enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(100, 6);
  });

  it('does not apply a same-month one-off that falls after the target day', () => {
    const pots = makePots({ giaBalance: 100 });
    const p = makeProfile({
      oneOffContributions: [
        { id: 'o1', name: 'Late', targetPot: 'gia', grossAmount: 500, date: '2027-03-20', enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(100, 6);
  });

  it('grosses up SIPP net one-offs by 25% but not gross ones', () => {
    const pots = makePots();
    const mk = (type: 'net' | 'gross'): UserProfile =>
      makeProfile({
        oneOffContributions: [
          { id: 'o', name: 'o', targetPot: 'sipp', grossAmount: 800, date: '2027-01-10', enabled: true, sippContributionType: type },
        ],
      });
    expect(getProjectedPotBalance(mk('net'), pots, 'primary', 'sipp', 2027, '2027-03-15', undefined, now)).toBeCloseTo(1000, 6);
    expect(getProjectedPotBalance(mk('gross'), pots, 'primary', 'sipp', 2027, '2027-03-15', undefined, now)).toBeCloseTo(800, 6);
  });

  it('applies the LISA bonus to one-offs only under age 50', () => {
    const pots = makePots();
    const oneOff = [{ id: 'o', name: 'o', targetPot: 'lisa' as const, grossAmount: 4000, date: '2027-01-10', enabled: true }];
    expect(getProjectedPotBalance(makeProfile({ oneOffContributions: oneOff }), pots, 'primary', 'lisa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(5000, 6);
    expect(getProjectedPotBalance(makeProfile({ currentAge: 55, targetRetirementAge: 70, oneOffContributions: oneOff }), pots, 'primary', 'lisa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(4000, 6);
  });

  it('age-based one-off lands on 6 April of the matching year', () => {
    const pots = makePots();
    const p = makeProfile({
      currentAge: 40,
      oneOffContributions: [
        { id: 'o', name: 'o', targetPot: 'gia', grossAmount: 700, startAge: 41, enabled: true },
      ],
    });
    // age 41 => 2027, 6 April 2027
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-06-01', undefined, now)).toBeCloseTo(700, 6);
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-01', undefined, now)).toBeCloseTo(0, 6);
  });

  it('regular monthly one-offs replace the baseline contribution (no double count)', () => {
    const pots = makePots({ giaMonthlyContribution: 100 });
    const p = makeProfile({
      oneOffContributions: [
        { id: 'r', name: 'r', targetPot: 'gia', frequency: 'regular_monthly', grossAmount: 300, enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(1800, 6);
  });

  it('regular monthly one-offs honour start/end age', () => {
    const pots = makePots();
    const p = makeProfile({
      currentAge: 40,
      oneOffContributions: [
        // Only active when age 41 (from Jan 2027 calendar-year based age)
        { id: 'r', name: 'r', targetPot: 'gia', frequency: 'regular_monthly', grossAmount: 100, startAge: 41, endAge: 41, enabled: true },
      ],
    });
    // Age is evaluated by calendar year: Oct-Dec 2026 => 40 (excluded); 2027 months Jan-Mar => 3 months
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(300, 6);
  });

  it('regular monthly one-off variants for SIPP, LISA and workplace pension', () => {
    const base = (c: object) =>
      makeProfile({
        grossAnnualSalary: 60000,
        oneOffContributions: [{ id: 'r', name: 'r', frequency: 'regular_monthly', grossAmount: 100, enabled: true, ...c } as any],
      });
    const pots = makePots();
    expect(getProjectedPotBalance(base({ targetPot: 'sipp' }), pots, 'primary', 'sipp', 2027, '2027-03-15', undefined, now)).toBeCloseTo(750, 6);
    expect(getProjectedPotBalance(base({ targetPot: 'sipp', sippContributionType: 'gross' }), pots, 'primary', 'sipp', 2027, '2027-03-15', undefined, now)).toBeCloseTo(600, 6);
    expect(getProjectedPotBalance(base({ targetPot: 'lisa' }), pots, 'primary', 'lisa', 2027, '2027-03-15', undefined, now)).toBeCloseTo(750, 6);
    expect(
      getProjectedPotBalance(base({ targetPot: 'workplace_pension', workplaceContributionType: 'fixed', employeeMonthlyAmount: 100, employerMonthlyAmount: 50 }), pots, 'primary', 'workplace_pension', 2027, '2027-03-15', undefined, now)
    ).toBeCloseTo(900, 6);
    // default percent: 5% + 3% of 60k / 12 = 400 / month
    expect(getProjectedPotBalance(base({ targetPot: 'workplace_pension' }), pots, 'primary', 'workplace_pension', 2027, '2027-03-15', undefined, now)).toBeCloseTo(2400, 6);
  });

  it('subtracts earlier transfers out of the source pot (floored at zero)', () => {
    const pots = makePots({ giaBalance: 1000 });
    const p = makeProfile({
      potTransfers: [
        { id: 't1', name: 't1', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 400, transferDate: '2027-01-15', enabled: true },
        { id: 't2', name: 't2', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 5000, transferDate: '2027-02-15', enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', 'current', now)).toBe(0);
    expect(getProjectedPotBalance(p, pots, 'primary', 'cash_isa', 2027, '2027-03-15', 'current', now)).toBeCloseTo(5400, 6);
  });

  it('grosses up transfers into SIPP from non-pension sources only', () => {
    const pots = makePots({ giaBalance: 1000, workplacePensionBalance: 1000 });
    const mk = (src: 'gia' | 'workplace_pension'): UserProfile =>
      makeProfile({
        potTransfers: [{ id: 't', name: 't', sourcePot: src, destinationPot: 'sipp', amount: 800, transferDate: '2027-01-15', enabled: true }],
      });
    expect(getProjectedPotBalance(mk('gia'), pots, 'primary', 'sipp', 2027, '2027-03-15', 'x', now)).toBeCloseTo(1000, 6);
    expect(getProjectedPotBalance(mk('workplace_pension'), pots, 'primary', 'sipp', 2027, '2027-03-15', 'x', now)).toBeCloseTo(800, 6);
  });

  it('applies the LISA bonus on transfers in, but not from another LISA or at 50+', () => {
    const pots = makePots({ giaBalance: 10000, lisaBalance: 10000 });
    const mk = (src: 'gia' | 'lisa', age = 40): [UserProfile, InvestmentPots] => [
      makeProfile({
        currentAge: age,
        targetRetirementAge: 70,
        potTransfers: [{ id: 't', name: 't', sourcePot: src, destinationPot: 'lisa', amount: 4000, transferDate: '2027-01-15', enabled: true }],
      }),
      pots,
    ];
    const [p1, po1] = mk('gia');
    expect(getProjectedPotBalance(p1, po1, 'primary', 'lisa', 2027, '2027-03-15', 'x', now)).toBeCloseTo(15000, 6);
    // LISA -> LISA debits and credits the same pot with no bonus: net zero
    const [p2, po2] = mk('lisa');
    expect(getProjectedPotBalance(p2, po2, 'primary', 'lisa', 2027, '2027-03-15', 'x', now)).toBeCloseTo(10000, 6);
    const [p3, po3] = mk('gia', 55);
    expect(getProjectedPotBalance(p3, po3, 'primary', 'lisa', 2027, '2027-03-15', 'x', now)).toBeCloseTo(14000, 6);
  });

  it('ignores disabled transfers, the transfer being evaluated, and later-dated transfers', () => {
    const pots = makePots({ giaBalance: 1000 });
    const p = makeProfile({
      potTransfers: [
        { id: 'dis', name: 'd', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 100, transferDate: '2027-01-15', enabled: false },
        { id: 'self', name: 's', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 200, transferDate: '2027-01-15', enabled: true },
        { id: 'later', name: 'l', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 300, transferDate: '2027-03-20', enabled: true },
      ],
    });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', 'self', now)).toBeCloseTo(1000, 6);
  });

  it('orders same-day transfers by list position', () => {
    const pots = makePots({ giaBalance: 1000 });
    const t = (id: string, amount: number) => ({ id, name: id, sourcePot: 'gia' as const, destinationPot: 'cash_isa' as const, amount, transferDate: '2027-03-15', enabled: true });
    const p = makeProfile({ potTransfers: [t('first', 100), t('second', 200)] });
    // evaluating 'second' => 'first' happens before it
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', 'second', now)).toBeCloseTo(900, 6);
    // evaluating 'first' => 'second' happens after it
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', 'first', now)).toBeCloseTo(1000, 6);
  });

  it('supports age-based other transfers', () => {
    const pots = makePots({ giaBalance: 1000 });
    const p = makeProfile({
      currentAge: 40,
      potTransfers: [{ id: 't', name: 't', sourcePot: 'gia', destinationPot: 'cash_isa', amount: 250, transferAge: 41, enabled: true }],
    });
    // age 41 => 6 April 2027 which is before 1 June 2027
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-06-01', 'x', now)).toBeCloseTo(750, 6);
  });
});

describe('getProjectedPotBalance partner handling', () => {
  it('uses partner pots and age when planning as a couple', () => {
    const p = makeProfile({
      isCouplePlanning: true,
      partnerCurrentAge: 40,
      partnerTargetRetirementAge: 60,
      partnerPots: makePots({ giaBalance: 777 }),
    });
    const primaryPots = makePots({ giaBalance: 111 });
    expect(getProjectedPotBalance(p, primaryPots, 'partner', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(777, 6);
    expect(getProjectedPotBalance(p, primaryPots, 'primary', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(111, 6);
  });

  it('falls back to primary pots when partner requested but not a couple', () => {
    const p = makeProfile({ isCouplePlanning: false, partnerPots: makePots({ giaBalance: 777 }) });
    expect(getProjectedPotBalance(p, makePots({ giaBalance: 111 }), 'partner', 'gia', 2027, '2027-03-15', undefined, now)).toBeCloseTo(111, 6);
  });

  it('ignores partner-involved transfers when not a couple', () => {
    const p = makeProfile({
      isCouplePlanning: false,
      potTransfers: [{ id: 't', name: 't', owner: 'partner', sourcePot: 'gia', destinationPot: 'gia', amount: 500, transferDate: '2027-01-15', enabled: true }],
    });
    expect(getProjectedPotBalance(p, makePots({ giaBalance: 1000 }), 'primary', 'gia', 2027, '2027-03-15', 'x', now)).toBeCloseTo(1000, 6);
  });

  it('handles cross-owner transfers between spouses', () => {
    const p = makeProfile({
      isCouplePlanning: true,
      partnerCurrentAge: 40,
      partnerPots: makePots({ giaBalance: 0 }),
      potTransfers: [{ id: 't', name: 't', owner: 'primary', destinationOwner: 'partner', sourcePot: 'gia', destinationPot: 'gia', amount: 400, transferDate: '2027-01-15', enabled: true }],
    });
    const pots = makePots({ giaBalance: 1000 });
    expect(getProjectedPotBalance(p, pots, 'primary', 'gia', 2027, '2027-03-15', 'x', now)).toBeCloseTo(600, 6);
    expect(getProjectedPotBalance(p, pots, 'partner', 'gia', 2027, '2027-03-15', 'x', now)).toBeCloseTo(400, 6);
  });
});
