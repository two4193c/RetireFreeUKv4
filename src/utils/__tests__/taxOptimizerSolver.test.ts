import { describe, it, expect } from 'vitest';
import {
  solveTaxOptimalAnnualDrawdown,
  TaxOptimizerAnnualInput,
  TaxOptimizerAnnualResult,
  PotState,
} from '../taxOptimizerSolver';

// ---------------------------------------------------------------------------
// Helpers & Fixtures
// ---------------------------------------------------------------------------

/** All-zero pot state used as base for spread overrides */
const ZERO_POTS: PotState = {
  primaryUncrystallisedPot: 0,
  primaryCrystallisedPot: 0,
  partnerUncrystallisedPot: 0,
  partnerCrystallisedPot: 0,
  primarySsIsaPot: 0,
  primaryCashIsaPot: 0,
  primaryLisaPot: 0,
  partnerSsIsaPot: 0,
  partnerCashIsaPot: 0,
  primaryCashGiaPot: 0,
  partnerCashGiaPot: 0,
};

/** Build a minimal valid input with sensible single-person defaults.
 *  Override individual fields via the `overrides` partial.
 */
function makeInput(overrides: Partial<TaxOptimizerAnnualInput> = {}): TaxOptimizerAnnualInput {
  return {
    age: 60,
    pensionAccessAge: 57,
    netIncomeNeeded: 0,
    primaryTaxableGuaranteed: 0,
    partnerTaxableGuaranteed: 0,
    primaryTaxFreeGuaranteed: 0,
    partnerTaxFreeGuaranteed: 0,
    primaryMaxLsa: 268_275,
    partnerMaxLsa: 268_275,
    primaryCumulativeTaxFreeDrawn: 0,
    partnerCumulativeTaxFreeDrawn: 0,
    pots: { ...ZERO_POTS },
    inflationFactor: 1,
    isScottishTax: false,
    isPartnerScottishTax: false,
    indexTaxBands: false,
    isCouple: false,
    remainingRetirementYears: 25,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. Zero net income needed
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Zero net income needed', () => {
  it('returns an all-zero result when netIncomeNeeded is 0', () => {
    const result = solveTaxOptimalAnnualDrawdown(makeInput({ netIncomeNeeded: 0 }));

    expect(result.primaryGrossPensionDraw).toBe(0);
    expect(result.partnerGrossPensionDraw).toBe(0);
    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.primaryTaxablePensionDraw).toBe(0);
    expect(result.partnerTaxablePensionDraw).toBe(0);
    expect(result.primaryTaxFreePensionCash).toBe(0);
    expect(result.partnerTaxFreePensionCash).toBe(0);
    expect(result.totalTaxFreePensionCash).toBe(0);
    expect(result.taxPaidOnPension).toBe(0);
    expect(result.netPensionProduced).toBe(0);
    expect(result.isaDrawdown).toBe(0);
    expect(result.cashGiaDrawdown).toBe(0);
    expect(result.totalNetIncomeAchieved).toBe(0);
    expect(result.marginalTaxRate).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it('returns an all-zero result when netIncomeNeeded is negative', () => {
    const result = solveTaxOptimalAnnualDrawdown(makeInput({ netIncomeNeeded: -5_000 }));

    expect(result.totalNetIncomeAchieved).toBe(0);
    expect(result.taxPaidOnPension).toBe(0);
    expect(result.rationale).toContain('No net income required');
  });
});

// ---------------------------------------------------------------------------
// 2. Pre-pension access age – Cash/GIA then ISA bridge (zero tax)
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Pre-pension access age bridge', () => {
  it('draws only from Cash/GIA when age < pensionAccessAge and Cash/GIA is sufficient', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 52,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 50_000,
          primarySsIsaPot: 100_000,
        },
      })
    );

    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.cashGiaDrawdown).toBeCloseTo(10_000, 1);
    expect(result.isaDrawdown).toBe(0);
    expect(result.taxPaidOnPension).toBe(0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(10_000, 1);
  });

  it('draws from Cash/GIA first, then ISA for the remainder', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 50,
        pensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 8_000,
          primarySsIsaPot: 50_000,
        },
      })
    );

    expect(result.cashGiaDrawdown).toBeCloseTo(8_000, 1);
    expect(result.isaDrawdown).toBeCloseTo(12_000, 1);
    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.taxPaidOnPension).toBe(0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(20_000, 1);
  });

  it('caps total achieved if Cash/GIA + ISA are both insufficient', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 54,
        pensionAccessAge: 57,
        netIncomeNeeded: 50_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 5_000,
          primarySsIsaPot: 10_000,
        },
      })
    );

    expect(result.cashGiaDrawdown).toBeCloseTo(5_000, 1);
    expect(result.isaDrawdown).toBeCloseTo(10_000, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(15_000, 1);
    expect(result.taxPaidOnPension).toBe(0);
  });

  it('draws zero pension even when pension pots are large but age is below access age', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 55,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primaryCashGiaPot: 20_000,
        },
      })
    );

    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.cashGiaDrawdown).toBeCloseTo(10_000, 1);
  });

  it('pre-pension bridge rationale mentions tax-free', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 50,
        pensionAccessAge: 57,
        netIncomeNeeded: 5_000,
        pots: { ...ZERO_POTS, primaryCashGiaPot: 10_000 },
      })
    );

    expect(result.rationale).toContain('Pre-Pension Access Age');
    expect(result.rationale).toContain('tax-free');
  });
});

// ---------------------------------------------------------------------------
// 3. Personal Allowance fill – pension draw within £12,570 PA, zero tax
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Personal Allowance fill (0% tax)', () => {
  it('draws pension within PA at zero marginal tax when no guaranteed income', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
        },
      })
    );

    expect(result.taxPaidOnPension).toBeCloseTo(0, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(10_000, 1);
    expect(result.marginalTaxRate).toBe(0);
  });

  it('draws pension within remaining PA when some guaranteed income exists', () => {
    // PA = £12,570, guaranteed = £5,000, room = £7,570.
    // Need £7,000 which is < PA room, so zero tax.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 7_000,
        primaryTaxableGuaranteed: 5_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
        },
      })
    );

    expect(result.taxPaidOnPension).toBeCloseTo(0, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(7_000, 1);
  });

  it('draws from crystallised pot first within PA (no 25% tax-free split)', () => {
    // Crystallised pot is fully taxable – PA covers it.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 8_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryCrystallisedPot: 100_000,
        },
      })
    );

    expect(result.taxPaidOnPension).toBeCloseTo(0, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(8_000, 1);
  });
});

// ---------------------------------------------------------------------------
// 4. Basic Rate band smoothing – draws up to £50,270 ceiling
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Basic Rate band smoothing', () => {
  it('fills basic rate band without higher-rate tax when need exceeds PA', () => {
    // Need £30,000. PA = £12,570, basic-rate ceiling for rUK = £50,270.
    // With uncrystallised pot + 25% tax-free, achievable at ≤ 20% marginal.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 30_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
        },
      })
    );

    expect(result.totalNetIncomeAchieved).toBeCloseTo(30_000, 1);
    expect(result.marginalTaxRate).toBeLessThanOrEqual(20);
    expect(result.taxPaidOnPension).toBeGreaterThanOrEqual(0);
  });

  it('keeps effective tax rate under 20% when entire need is within basic band', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
        },
      })
    );

    expect(result.effectiveTaxRate).toBeLessThanOrEqual(20);
  });

  it('does not draw from ISA or Cash when pension basic band covers the need', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 25_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primarySsIsaPot: 100_000,
          primaryCashGiaPot: 50_000,
        },
      })
    );

    expect(result.isaDrawdown).toBe(0);
    expect(result.cashGiaDrawdown).toBe(0);
  });

  it('reports marginalTaxRate as 20 for draws within the basic band', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 25_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
        },
      })
    );

    // Either 0 (still within PA) or 20 (into basic band)
    expect([0, 20]).toContain(result.marginalTaxRate);
  });
});

// ---------------------------------------------------------------------------
// 5. High income scenario – exhausts basic band, then Cash/GIA before ISA
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – High income scenario', () => {
  it('caps pension at basic rate ceiling and draws Cash/GIA for excess', () => {
    // Need £60,000 which exceeds single basic-rate capacity (~£50,270 gross → ~£42,730 net).
    // Solver should draw pension up to BR ceiling and fund the rest from Cash/GIA.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 60_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primaryCashGiaPot: 50_000,
          primarySsIsaPot: 100_000,
        },
      })
    );

    expect(result.cashGiaDrawdown).toBeGreaterThan(0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(60_000, 1);
    // Cash/GIA is drawn before ISA
    expect(result.isaDrawdown).toBe(0);
  });

  it('draws from ISA only after Cash/GIA is exhausted', () => {
    // Need enough to exhaust both pension BR band and small Cash/GIA.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 70_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primaryCashGiaPot: 5_000,
          primarySsIsaPot: 100_000,
        },
      })
    );

    expect(result.cashGiaDrawdown).toBeCloseTo(5_000, 1);
    expect(result.isaDrawdown).toBeGreaterThan(0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(70_000, 1);
  });

  it('pushes into higher-rate pension draw when ISA and Cash are both exhausted', () => {
    // Need far exceeds BR capacity, and no ISA/Cash to bridge.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 60_000,
        primaryTaxableGuaranteed: 0,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          // No ISA, no Cash
        },
      })
    );

    expect(result.marginalTaxRate).toBe(40);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(60_000, 0);
    expect(result.taxPaidOnPension).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Couple planning – equalizes draws across both partners
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Couple planning', () => {
  it('doubles effective PA utilization by splitting draws across two partners', () => {
    // Single PA = £12,570. Couple effective = ~£25,140.
    // Need £20,000 → should be tax-free by using both PAs.
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        partnerAge: 60,
        pensionAccessAge: 57,
        partnerPensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        primaryTaxableGuaranteed: 0,
        partnerTaxableGuaranteed: 0,
        isCouple: true,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
          partnerUncrystallisedPot: 200_000,
        },
      })
    );

    expect(result.taxPaidOnPension).toBeCloseTo(0, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(20_000, 1);
    // Both partners should contribute draws
    expect(result.primaryGrossPensionDraw).toBeGreaterThan(0);
    expect(result.partnerGrossPensionDraw).toBeGreaterThan(0);
  });

  it('uses partner pension when only partner has pension and is above access age', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 52,
        partnerAge: 60,
        pensionAccessAge: 57,
        partnerPensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        isCouple: true,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000, // can't access – age 52 < 57
          partnerUncrystallisedPot: 200_000, // accessible
        },
      })
    );

    expect(result.primaryGrossPensionDraw).toBe(0);
    expect(result.partnerGrossPensionDraw).toBeGreaterThan(0);
    expect(result.taxPaidOnPension).toBeCloseTo(0, 1);
  });

  it('fills both partners basic-rate bands for higher income needs', () => {
    // Need £60,000. Couple can fill two basic-rate bands (2 × £50,270 = £100,540 gross).
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        partnerAge: 60,
        pensionAccessAge: 57,
        partnerPensionAccessAge: 57,
        netIncomeNeeded: 60_000,
        primaryTaxableGuaranteed: 0,
        partnerTaxableGuaranteed: 0,
        isCouple: true,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 400_000,
          partnerUncrystallisedPot: 400_000,
        },
      })
    );

    expect(result.totalNetIncomeAchieved).toBeCloseTo(60_000, 1);
    expect(result.marginalTaxRate).toBeLessThanOrEqual(20);
    expect(result.primaryGrossPensionDraw).toBeGreaterThan(0);
    expect(result.partnerGrossPensionDraw).toBeGreaterThan(0);
  });

  it('uses partner ISA and Cash/GIA pots in couple mode', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 50,
        partnerAge: 50,
        pensionAccessAge: 57,
        partnerPensionAccessAge: 57,
        netIncomeNeeded: 25_000,
        isCouple: true,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 10_000,
          partnerCashGiaPot: 10_000,
          primarySsIsaPot: 20_000,
          partnerSsIsaPot: 20_000,
        },
      })
    );

    // Both pre-pension, so total available Cash/GIA = 20k, ISA = 40k → enough
    expect(result.cashGiaDrawdown).toBeCloseTo(20_000, 1); // both GIA pots
    expect(result.isaDrawdown).toBeCloseTo(5_000, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(25_000, 1);
    expect(result.totalGrossPensionDraw).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Edge case: pension pot is zero, only ISA/Cash available
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Zero pension pot, ISA/Cash only', () => {
  it('funds entirely from Cash/GIA when pension is zero and age >= pension access age', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 65,
        pensionAccessAge: 57,
        netIncomeNeeded: 15_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 30_000,
        },
      })
    );

    // With zero pension, PA fill evaluates to 0 net → falls through to high-income path
    // which draws Cash/GIA first.
    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.cashGiaDrawdown).toBeCloseTo(15_000, 1);
    expect(result.taxPaidOnPension).toBe(0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(15_000, 1);
  });

  it('uses ISA after Cash/GIA is exhausted when pension is zero', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 65,
        pensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 5_000,
          primarySsIsaPot: 50_000,
        },
      })
    );

    expect(result.cashGiaDrawdown).toBeCloseTo(5_000, 1);
    expect(result.isaDrawdown).toBeCloseTo(15_000, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(20_000, 1);
  });
});

// ---------------------------------------------------------------------------
// 8. Edge case: all pots are zero
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – All pots zero', () => {
  it('returns zero income achieved when all pots are empty', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        pots: { ...ZERO_POTS },
      })
    );

    expect(result.totalNetIncomeAchieved).toBeCloseTo(0, 1);
    expect(result.totalGrossPensionDraw).toBe(0);
    expect(result.isaDrawdown).toBe(0);
    expect(result.cashGiaDrawdown).toBe(0);
    expect(result.taxPaidOnPension).toBe(0);
  });

  it('returns zero when pre-pension age with all pots zero', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 50,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        pots: { ...ZERO_POTS },
      })
    );

    expect(result.totalNetIncomeAchieved).toBe(0);
    expect(result.cashGiaDrawdown).toBe(0);
    expect(result.isaDrawdown).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Invariant: tax paid is never negative
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Tax paid invariant', () => {
  const scenarios: Array<{ label: string; overrides: Partial<TaxOptimizerAnnualInput> }> = [
    {
      label: 'small draw within PA',
      overrides: {
        age: 60, pensionAccessAge: 57, netIncomeNeeded: 5_000,
        pots: { ...ZERO_POTS, primaryUncrystallisedPot: 100_000 },
      },
    },
    {
      label: 'draw exceeding basic band (single)',
      overrides: {
        age: 60, pensionAccessAge: 57, netIncomeNeeded: 55_000,
        pots: { ...ZERO_POTS, primaryUncrystallisedPot: 500_000 },
      },
    },
    {
      label: 'pre-pension age ISA/Cash draw',
      overrides: {
        age: 50, pensionAccessAge: 57, netIncomeNeeded: 20_000,
        pots: { ...ZERO_POTS, primaryCashGiaPot: 30_000 },
      },
    },
    {
      label: 'couple draw with guaranteed income',
      overrides: {
        age: 60, partnerAge: 60, pensionAccessAge: 57, partnerPensionAccessAge: 57,
        isCouple: true, netIncomeNeeded: 30_000,
        primaryTaxableGuaranteed: 10_000, partnerTaxableGuaranteed: 5_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
          partnerUncrystallisedPot: 200_000,
        },
      },
    },
    {
      label: 'very large draw (higher-rate territory)',
      overrides: {
        age: 65, pensionAccessAge: 57, netIncomeNeeded: 100_000,
        pots: { ...ZERO_POTS, primaryUncrystallisedPot: 1_000_000 },
      },
    },
    {
      label: 'zero income needed',
      overrides: { netIncomeNeeded: 0 },
    },
  ];

  scenarios.forEach(({ label, overrides }) => {
    it(`tax paid >= 0 for: ${label}`, () => {
      const result = solveTaxOptimalAnnualDrawdown(makeInput(overrides));
      expect(result.taxPaidOnPension).toBeGreaterThanOrEqual(0);
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Invariant: totalNetIncomeAchieved == netPensionProduced + isaDrawdown + cashGiaDrawdown
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – totalNetIncomeAchieved consistency', () => {
  const scenarios: Array<{ label: string; overrides: Partial<TaxOptimizerAnnualInput> }> = [
    {
      label: 'pension-only draw within PA',
      overrides: {
        age: 60, pensionAccessAge: 57, netIncomeNeeded: 10_000,
        pots: { ...ZERO_POTS, primaryUncrystallisedPot: 200_000 },
      },
    },
    {
      label: 'pension + Cash/GIA blend',
      overrides: {
        age: 60, pensionAccessAge: 57, netIncomeNeeded: 60_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primaryCashGiaPot: 30_000,
        },
      },
    },
    {
      label: 'pension + Cash/GIA + ISA blend',
      overrides: {
        age: 60, pensionAccessAge: 57, netIncomeNeeded: 70_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
          primaryCashGiaPot: 5_000,
          primarySsIsaPot: 100_000,
        },
      },
    },
    {
      label: 'pre-pension Cash/GIA + ISA bridge',
      overrides: {
        age: 50, pensionAccessAge: 57, netIncomeNeeded: 30_000,
        pots: {
          ...ZERO_POTS,
          primaryCashGiaPot: 10_000,
          primarySsIsaPot: 50_000,
        },
      },
    },
    {
      label: 'couple high-income blend',
      overrides: {
        age: 60, partnerAge: 60, pensionAccessAge: 57, partnerPensionAccessAge: 57,
        isCouple: true, netIncomeNeeded: 80_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 400_000,
          partnerUncrystallisedPot: 400_000,
          primaryCashGiaPot: 20_000,
        },
      },
    },
    {
      label: 'zero need',
      overrides: { netIncomeNeeded: 0 },
    },
  ];

  scenarios.forEach(({ label, overrides }) => {
    it(`totalNetIncomeAchieved == netPensionProduced + isaDrawdown + cashGiaDrawdown for: ${label}`, () => {
      const result = solveTaxOptimalAnnualDrawdown(makeInput(overrides));
      const expectedTotal = result.netPensionProduced + result.isaDrawdown + result.cashGiaDrawdown;
      expect(result.totalNetIncomeAchieved).toBeCloseTo(expectedTotal, 1);
    });
  });
});

// ---------------------------------------------------------------------------
// Additional edge cases – LSA exhausted, crystallised-only, inflation
// ---------------------------------------------------------------------------
describe('solveTaxOptimalAnnualDrawdown – Additional edge cases', () => {
  it('handles LSA exhausted (no more tax-free from uncrystallised)', () => {
    // When LSA is fully used, uncrystallised draws are 100% taxable (no 25% tax-free).
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 65,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        primaryCumulativeTaxFreeDrawn: 268_275, // full LSA used
        primaryMaxLsa: 268_275,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
        },
      })
    );

    expect(result.primaryTaxFreePensionCash).toBeCloseTo(0, 1);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(10_000, 1);
  });

  it('handles crystallised-only pot (all draws are taxable, no 25% tax-free split)', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 65,
        pensionAccessAge: 57,
        netIncomeNeeded: 10_000,
        pots: {
          ...ZERO_POTS,
          primaryCrystallisedPot: 200_000,
        },
      })
    );

    expect(result.primaryTaxFreePensionCash).toBeCloseTo(0, 1);
    expect(result.taxPaidOnPension).toBeCloseTo(0, 1); // still within PA
    expect(result.totalNetIncomeAchieved).toBeCloseTo(10_000, 1);
  });

  it('indexes tax bands with inflationFactor > 1', () => {
    // 10% inflation: PA effectively becomes £12,570 * 1.1 = £13,827
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 13_000,
        inflationFactor: 1.1,
        indexTaxBands: true,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 300_000,
        },
      })
    );

    // With indexed PA = £13,827, a £13,000 draw should be tax-free
    expect(result.taxPaidOnPension).toBeCloseTo(0, 0);
    expect(result.totalNetIncomeAchieved).toBeCloseTo(13_000, 1);
  });

  it('correctly produces totalTaxFreePensionCash from uncrystallised draws', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 20_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
        },
      })
    );

    // 25% of uncrystallised draws should be tax-free
    expect(result.totalTaxFreePensionCash).toBeGreaterThan(0);
    expect(result.totalTaxFreePensionCash).toBeCloseTo(
      result.primaryTaxFreePensionCash + result.partnerTaxFreePensionCash,
      1
    );
  });

  it('totalGrossPensionDraw equals sum of primary + partner gross draws', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        partnerAge: 60,
        pensionAccessAge: 57,
        partnerPensionAccessAge: 57,
        isCouple: true,
        netIncomeNeeded: 25_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 200_000,
          partnerUncrystallisedPot: 200_000,
        },
      })
    );

    expect(result.totalGrossPensionDraw).toBeCloseTo(
      result.primaryGrossPensionDraw + result.partnerGrossPensionDraw,
      1
    );
  });

  it('net pension produced = gross pension draw - tax paid', () => {
    const result = solveTaxOptimalAnnualDrawdown(
      makeInput({
        age: 60,
        pensionAccessAge: 57,
        netIncomeNeeded: 40_000,
        pots: {
          ...ZERO_POTS,
          primaryUncrystallisedPot: 500_000,
        },
      })
    );

    expect(result.netPensionProduced).toBeCloseTo(
      result.totalGrossPensionDraw - result.taxPaidOnPension,
      1
    );
  });
});
