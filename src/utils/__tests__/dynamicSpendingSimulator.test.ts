import { describe, it, expect } from 'vitest';
import {
  simulateGuytonKlinger,
  getGuaranteedIncomeForAge,
  DynamicSimulationInputs,
} from '../dynamicSpendingSimulator';
import { UserProfile } from '../../types';

const baseRules = {
  enabled: true,
  capitalPreservationThresholdPercent: 20,
  capitalPreservationCutPercent: 10,
  prosperityThresholdPercent: 20,
  prosperityIncreasePercent: 10,
  skipInflationOnNegativeReturn: false,
  phaseAwareGuardrails: true,
  suspendCutsInLateRetirement: false,
};

const makeInputs = (over: Partial<DynamicSimulationInputs> = {}): DynamicSimulationInputs => ({
  startingWealth: 1_000_000,
  retAge: 60,
  endAge: 95,
  inflationRate: 0.025,
  isAdjustedReal: true,
  returnSeries: [0.025], // 0% real
  scaleFactor: 1,
  rules: baseRules,
  getPlanSpendAtAge: () => 40000,
  getFloorAtAge: () => 20000,
  getGuaranteedIncomeAtAge: () => 0,
  ...over,
});

describe('simulateGuytonKlinger', () => {
  it('draws only the net-of-guaranteed-income amount from the pot (#1)', () => {
    const res = simulateGuytonKlinger(
      makeInputs({ getGuaranteedIncomeAtAge: (a) => (a >= 67 ? 12000 : 0) })
    );
    const at67 = res.points.find((p) => p.age === 67)!;
    expect(at67.portfolioWithdrawal).toBe(at67.dynamicIncome - 12000);
  });

  it('does not trigger a false prosperity raise when State Pension starts, when phase-aware (#1/#2)', () => {
    const res = simulateGuytonKlinger(
      makeInputs({ getGuaranteedIncomeAtAge: (a) => (a >= 67 ? 20000 : 0) })
    );
    const raiseAt67 = res.points.find((p) => p.age === 67)?.event;
    expect(raiseAt67).not.toBe('raise');
  });

  it('does not cut on a planned phase step-up when phase-aware (#2)', () => {
    const plan = (a: number) => (a >= 65 ? 50000 : 40000);
    const sustainable = [1.04 * 1.025 - 1]; // 4% real keeps the pot roughly flat
    const aware = simulateGuytonKlinger(makeInputs({ getPlanSpendAtAge: plan, returnSeries: sustainable }));
    expect(aware.points.find((p) => p.age === 65)?.event).toBeUndefined();

    const naive = simulateGuytonKlinger(
      makeInputs({ getPlanSpendAtAge: plan, returnSeries: sustainable, rules: { ...baseRules, phaseAwareGuardrails: false } })
    );
    expect(naive.points.find((p) => p.age === 65)?.event).toBe('cut');
  });

  it('suspends capital preservation cuts late in retirement (#3)', () => {
    const crash = [0.025, ...Array(60).fill(-0.15)];
    const res = simulateGuytonKlinger(
      makeInputs({ returnSeries: crash, rules: { ...baseRules, suspendCutsInLateRetirement: true } })
    );
    const lateCuts = res.points.filter((p) => (p.age >= 80 || 95 - p.age <= 15) && (p.event === 'cut' || p.event === 'floor_protected'));
    expect(lateCuts).toHaveLength(0);
  });

  it('feeds spending cuts back into the pot (#5)', () => {
    const series = [-0.2, -0.2, 0.025];
    const withRules = simulateGuytonKlinger(makeInputs({ returnSeries: series }));
    const noRules = simulateGuytonKlinger(makeInputs({ returnSeries: series, rules: { ...baseRules, enabled: false } }));
    expect(withRules.points[10].portfolio).toBeGreaterThan(noRules.points[10].portfolio);
  });

  it('reports depletion and floor breaches instead of hiding them (#6)', () => {
    const res = simulateGuytonKlinger(makeInputs({ startingWealth: 100_000, rules: { ...baseRules, enabled: false } }));
    expect(res.kpis.depletedAge).not.toBeNull();
    expect(res.kpis.floorBreaches).toBeGreaterThan(0);
  });

  it('never raises spending when a cut hits the floor (#14)', () => {
    const res = simulateGuytonKlinger(makeInputs({ returnSeries: [-0.3, -0.3, -0.3, 0.025] }));
    for (let i = 1; i < res.points.length; i++) {
      const p = res.points[i];
      if (p.event === 'floor_protected' || p.event === 'cut') {
        expect(p.dynamicIncome).toBeLessThanOrEqual(res.points[i - 1].dynamicIncome);
      }
    }
  });

  it('triggers Guyton-Klinger inflation freeze on negative return years when rate exceeds initial rate', () => {
    const series = [-0.15, 0.05];
    const res = simulateGuytonKlinger(
      makeInputs({
        returnSeries: series,
        rules: { ...baseRules, skipInflationOnNegativeReturn: true, capitalPreservationThresholdPercent: 50 }, // wide threshold so it freezes rather than cuts
      })
    );
    const yr1 = res.points.find((p) => p.yearIndex === 1);
    expect(yr1?.event).toBe('freeze');
    expect(res.kpis.freezes).toBeGreaterThanOrEqual(1);
  });

  it('supports nominal mode when isAdjustedReal is false', () => {
    const res = simulateGuytonKlinger(
      makeInputs({
        isAdjustedReal: false,
        inflationRate: 0.03,
        returnSeries: [0.06],
      })
    );
    expect(res.points.length).toBeGreaterThan(0);
    // Future nominal baseline spend inflates with time
    const yr10 = res.points.find((p) => p.yearIndex === 10)!;
    expect(yr10.baselineIncome).toBeGreaterThan(40000);
  });
});

describe('getGuaranteedIncomeForAge (#11)', () => {
  const profile = {
    currentAge: 55,
    includeStatePension: true,
    statePensionAge: 67,
    statePensionAmountAnnual: 0,
    dbPensions: [
      { id: '1', name: 'DB', startAge: 62, annualIncome: 8000, taxFreeLumpSum: 0, inflationLinked: true, enabled: true },
    ],
  } as unknown as UserProfile;

  it('respects an explicit £0 State Pension and SPA/DB start ages', () => {
    expect(getGuaranteedIncomeForAge(profile, 60)).toBe(0);
    expect(getGuaranteedIncomeForAge(profile, 62)).toBe(8000);
    expect(getGuaranteedIncomeForAge(profile, 70)).toBe(8000);
  });

  it('honours includeStatePension=false', () => {
    const p = { ...profile, statePensionAmountAnnual: 11502, includeStatePension: false } as UserProfile;
    expect(getGuaranteedIncomeForAge(p, 70)).toBe(8000);
  });

  it('factors in partner State Pension and partner DB pension with age offset and until_age duration', () => {
    const coupleProfile = {
      currentAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 58, // 2 years younger
      includeStatePension: true,
      statePensionAge: 67,
      statePensionAmountAnnual: 11500,
      partnerIncludeStatePension: true,
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 10500,
      dbPensions: [
        {
          id: 'db-partner',
          name: 'Partner DB Bridge',
          owner: 'partner',
          startAge: 60,
          endAge: 65,
          durationOption: 'until_age',
          annualIncome: 5000,
          enabled: true,
        },
      ],
    } as unknown as UserProfile;

    // At primary age 60, partner is 58 (no State Pension, DB startAge 60 not reached)
    expect(getGuaranteedIncomeForAge(coupleProfile, 60)).toBe(0);

    // At primary age 62, partner is 60 (partner DB bridge active: £5,000)
    expect(getGuaranteedIncomeForAge(coupleProfile, 62)).toBe(5000);

    // At primary age 67, primary SP starts (£11,500), partner is 65 (DB bridge active through age 65: £11,500 + £5,000 = £16,500)
    expect(getGuaranteedIncomeForAge(coupleProfile, 67)).toBe(16500);

    // At primary age 68, partner is 66 (DB bridge has ended after age 65): £11,500
    expect(getGuaranteedIncomeForAge(coupleProfile, 68)).toBe(11500);

    // At primary age 69, partner reaches 67 (partner SP starts: £11,500 + £10,500 = £22,000)
    expect(getGuaranteedIncomeForAge(coupleProfile, 69)).toBe(22000);
  });

  it('handles fallback initial rate when starting wealth or planned withdrawal is 0', () => {
    const res = simulateGuytonKlinger({
      startingWealth: 0,
      retAge: 60,
      endAge: 65,
      inflationRate: 0.02,
      isAdjustedReal: true,
      returnSeries: [],
      scaleFactor: 1.0,
      rules: { enabled: false },
      getPlanSpendAtAge: () => 0,
      getFloorAtAge: () => 0,
      getGuaranteedIncomeAtAge: () => 0,
      fallbackInitialRatePercent: 4.5,
    });

    expect(res.initialNetRatePercent).toBe(4.5);
    expect(res.points.length).toBe(6);
    expect(res.points[0].portfolio).toBe(0);
  });
});
