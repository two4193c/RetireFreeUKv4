/**
 * Guyton-Klinger dynamic spending simulator (pure, UI-free).
 *
 * Models a single portfolio path year-by-year where:
 *  - Spending = planned spend (scaled to the chosen SWR baseline) × GK multiplier, clamped at the essential floor.
 *  - Only the NET withdrawal (spending − guaranteed income such as State Pension / DB) is drawn from the pot.
 *  - The pot is driven recursively by the dynamic withdrawals so cuts/raises feed back into the pot.
 *  - Guardrails compare the current net withdrawal rate against the initial net withdrawal rate.
 */
import { UserProfile } from '../types';

export type DynamicSpendingEvent = 'cut' | 'raise' | 'freeze' | 'floor_protected';

export interface DynamicSpendingRulesInput {
  enabled: boolean;
  capitalPreservationThresholdPercent?: number;
  capitalPreservationCutPercent?: number;
  prosperityThresholdPercent?: number;
  prosperityIncreasePercent?: number;
  skipInflationOnNegativeReturn?: boolean;
  phaseAwareGuardrails?: boolean;
  suspendCutsInLateRetirement?: boolean;
}

export interface DynamicSimulationInputs {
  startingWealth: number;
  retAge: number;
  endAge: number;
  inflationRate: number; // decimal, e.g. 0.025
  isAdjustedReal: boolean; // true → all £ figures in today's money
  returnSeries: number[]; // nominal annual returns (decimal)
  scaleFactor: number; // chosen SWR baseline spend / plan spend
  rules: DynamicSpendingRulesInput;
  /** Planned spending at age (today's money). */
  getPlanSpendAtAge: (age: number) => number;
  /** Essential spending floor at age (today's money). */
  getFloorAtAge: (age: number) => number;
  /** Guaranteed (non-portfolio) income at age (today's money). */
  getGuaranteedIncomeAtAge: (age: number) => number;
  /** Fallback initial rate (%) when the year-0 net withdrawal is zero. */
  fallbackInitialRatePercent?: number;
}

export interface DynamicSimulationPoint {
  age: number;
  yearIndex: number;
  portfolio: number;
  baselineIncome: number; // user's plan income requirement
  swrBaselineIncome: number; // plan requirement scaled to the selected SWR baseline
  dynamicIncome: number;
  essentialFloor: number;
  discretionarySpend: number;
  guaranteedIncome: number;
  portfolioWithdrawal: number;
  withdrawalRate: number; // net withdrawal / portfolio (%)
  returnRate: number;
  event?: DynamicSpendingEvent;
  eventNote?: string;
  diffFromBaseline: number; // vs SWR baseline (pure GK rule effect)
  diffFromPlan: number; // vs user's plan requirement
  depleted: boolean;
}

export interface DynamicSimulationKpis {
  cuts: number;
  raises: number;
  freezes: number;
  floorProtectedCount: number;
  totalSaved: number;
  totalBonus: number;
  minSpend: number;
  maxSpend: number;
  floorBreaches: number;
  depletedAge: number | null;
}

export interface DynamicSimulationResult {
  points: DynamicSimulationPoint[];
  kpis: DynamicSimulationKpis;
  initialNetRatePercent: number;
}

export const LATE_RETIREMENT_YEARS_REMAINING = 15;
export const LATE_RETIREMENT_AGE = 80;

/** Guaranteed income (State Pension + DB) at a primary-person age, in today's money. */
export function getGuaranteedIncomeForAge(profile: UserProfile, age: number): number {
  let total = 0;
  const partnerOffset =
    profile.isCouplePlanning && profile.partnerCurrentAge !== undefined
      ? profile.partnerCurrentAge - (profile.currentAge || 0)
      : 0;
  const partnerAge = age + partnerOffset;

  if (profile.includeStatePension !== false) {
    const spa = (profile.statePensionAge ?? 67) + (profile.statePensionDeferralYears ?? 0);
    if (age >= spa) total += Math.max(0, profile.statePensionAmountAnnual ?? 0);
  }
  if (profile.isCouplePlanning && profile.partnerIncludeStatePension !== false) {
    const pspa = (profile.partnerStatePensionAge ?? 67) + (profile.partnerStatePensionDeferralYears ?? 0);
    if (partnerAge >= pspa) total += Math.max(0, profile.partnerStatePensionAmountAnnual ?? 0);
  }
  for (const db of profile.dbPensions || []) {
    if (!db.enabled) continue;
    const isPartner = db.owner === 'partner';
    if (isPartner && !profile.isCouplePlanning) continue;
    const ownerAge = isPartner ? partnerAge : age;
    if (ownerAge < db.startAge) continue;
    if (db.durationOption === 'until_age' && db.endAge !== undefined && ownerAge > db.endAge) continue;
    total += Math.max(0, db.annualIncome || 0);
  }
  return Math.round(total);
}

export function simulateGuytonKlinger(inputs: DynamicSimulationInputs): DynamicSimulationResult {
  const {
    startingWealth,
    retAge,
    endAge,
    inflationRate,
    isAdjustedReal,
    returnSeries,
    scaleFactor,
    rules,
  } = inputs;

  const presThresh = 1 + (rules.capitalPreservationThresholdPercent ?? 20) / 100;
  const presCut = (rules.capitalPreservationCutPercent ?? 10) / 100;
  const prospThresh = 1 - (rules.prosperityThresholdPercent ?? 20) / 100;
  const prospInc = (rules.prosperityIncreasePercent ?? 10) / 100;
  const phaseAware = rules.phaseAwareGuardrails !== false;
  const suspendLateCuts = rules.suspendCutsInLateRetirement !== false;

  const toNominal = (v: number, yr: number) => (isAdjustedReal ? v : v * Math.pow(1 + inflationRate, yr));
  const plannedNetWithdrawal = (age: number) =>
    Math.max(0, inputs.getPlanSpendAtAge(age) * scaleFactor - inputs.getGuaranteedIncomeAtAge(age));

  const plannedNetAtRet = plannedNetWithdrawal(retAge);
  const initialNetRate =
    startingWealth > 0 && plannedNetAtRet > 0
      ? plannedNetAtRet / startingWealth
      : (inputs.fallbackInitialRatePercent ?? 4) / 100;

  const points: DynamicSimulationPoint[] = [];
  let spendingMultiplier = 1.0;
  let pot = Math.max(0, startingWealth);
  let prevWithdrawal = 0;
  let depletedAge: number | null = null;
  let floorBreaches = 0;

  for (let yr = 0; retAge + yr <= endAge; yr++) {
    const age = retAge + yr;
    const ret = yr > 0 ? returnSeries.length > 0 ? returnSeries[(yr - 1) % returnSeries.length] ?? 0.05 : 0.05 : 0;

    if (yr > 0) {
      const growth = isAdjustedReal ? (1 + ret) / (1 + inflationRate) - 1 : ret;
      pot = Math.max(0, (pot - prevWithdrawal) * (1 + growth));
    }

    const planSpend = toNominal(inputs.getPlanSpendAtAge(age), yr);
    const swrBaseline = planSpend * scaleFactor;
    const floor = toNominal(inputs.getFloorAtAge(age), yr);
    const guaranteed = toNominal(inputs.getGuaranteedIncomeAtAge(age), yr);

    let event: DynamicSpendingEvent | undefined;
    let eventNote: string | undefined;

    if (yr > 0 && rules.enabled && pot > 0 && initialNetRate > 0 && swrBaseline > 0) {
      const rawNet = Math.max(0, swrBaseline * spendingMultiplier - guaranteed);
      // Phase-aware: normalise the withdrawal back to the retirement-age plan shape so that planned
      // phase steps and State Pension/DB start dates do not register as guardrail breaches.
      const plannedNetNow = toNominal(plannedNetWithdrawal(age), yr);
      const plannedNetRet = toNominal(plannedNetAtRet, yr);
      let effectiveNet = rawNet;
      let skipGuardrails = false;
      if (phaseAware) {
        if (plannedNetNow > 0 && plannedNetRet > 0) effectiveNet = rawNet * (plannedNetRet / plannedNetNow);
        else skipGuardrails = true;
      }
      const currentRate = effectiveNet / pot;
      const yearsRemaining = endAge - age;
      const cutsSuspended = suspendLateCuts && (yearsRemaining <= LATE_RETIREMENT_YEARS_REMAINING || age >= LATE_RETIREMENT_AGE);

      // GK Inflation rule: skip inflation after a negative return year when the rate exceeds the initial rate.
      // Applied independently of the guardrails (it can coincide with a cut).
      let froze = false;
      if (rules.skipInflationOnNegativeReturn && ret < 0 && currentRate > initialNetRate) {
        spendingMultiplier /= 1 + inflationRate;
        froze = true;
      }

      if (!skipGuardrails && currentRate > initialNetRate * presThresh && !cutsSuspended) {
        const floorMultiplier = floor / swrBaseline;
        const cutMultiplier = spendingMultiplier * (1 - presCut);
        if (cutMultiplier < floorMultiplier) {
          const newMult = Math.min(spendingMultiplier, Math.max(0.2, floorMultiplier));
          spendingMultiplier = newMult;
          event = 'floor_protected';
          eventNote = `Capital Preservation triggered (withdrawal rate ${(currentRate * 100).toFixed(1)}% vs initial ${(initialNetRate * 100).toFixed(1)}%), but the cut was cushioned at your Essential Floor (£${Math.round(floor).toLocaleString()}/yr).`;
        } else {
          spendingMultiplier = cutMultiplier;
          event = 'cut';
          eventNote = `Capital Preservation triggered: withdrawal rate hit ${(currentRate * 100).toFixed(1)}% (+${((currentRate / initialNetRate - 1) * 100).toFixed(0)}% vs initial ${(initialNetRate * 100).toFixed(1)}%). Spending cut by ${Math.round(presCut * 100)}%.`;
        }
      } else if (!skipGuardrails && currentRate < initialNetRate * prospThresh) {
        spendingMultiplier *= 1 + prospInc;
        event = 'raise';
        eventNote = `Prosperity Rule triggered: withdrawal rate fell to ${(currentRate * 100).toFixed(1)}% (-${((1 - currentRate / initialNetRate) * 100).toFixed(0)}% vs initial ${(initialNetRate * 100).toFixed(1)}%). Spending raised by ${Math.round(prospInc * 100)}%.`;
      } else if (froze) {
        event = 'freeze';
        eventNote = `Inflation Freeze triggered: negative return (${(ret * 100).toFixed(1)}%) skipped the +${(inflationRate * 100).toFixed(1)}% inflation adjustment.`;
      }
    }

    let dynamicSpend = Math.round(swrBaseline * spendingMultiplier);
    if (dynamicSpend < floor) dynamicSpend = Math.round(floor);

    // Fund spending: guaranteed income first, then the pot. If the pot can't cover it, spending is limited.
    let withdrawal = Math.max(0, dynamicSpend - guaranteed);
    let depleted = false;
    if (withdrawal > pot) {
      withdrawal = pot;
      dynamicSpend = Math.round(guaranteed + pot);
      depleted = true;
      if (depletedAge === null) depletedAge = age;
    }
    if (dynamicSpend < Math.round(floor)) floorBreaches++;
    prevWithdrawal = withdrawal;

    points.push({
      age,
      yearIndex: yr,
      portfolio: Math.round(pot),
      baselineIncome: Math.round(planSpend),
      swrBaselineIncome: Math.round(swrBaseline),
      dynamicIncome: dynamicSpend,
      essentialFloor: Math.round(floor),
      discretionarySpend: Math.max(0, dynamicSpend - Math.round(floor)),
      guaranteedIncome: Math.round(guaranteed),
      portfolioWithdrawal: Math.round(withdrawal),
      withdrawalRate: pot > 0 ? Number(((withdrawal / pot) * 100).toFixed(2)) : 0,
      returnRate: Number((ret * 100).toFixed(1)),
      event,
      eventNote,
      diffFromBaseline: Math.round(dynamicSpend - swrBaseline),
      diffFromPlan: Math.round(dynamicSpend - planSpend),
      depleted,
    });
  }

  const kpis: DynamicSimulationKpis = {
    cuts: 0,
    raises: 0,
    freezes: 0,
    floorProtectedCount: 0,
    totalSaved: 0,
    totalBonus: 0,
    minSpend: 0,
    maxSpend: 0,
    floorBreaches,
    depletedAge,
  };
  for (const p of points) {
    if (p.event === 'cut') kpis.cuts++;
    if (p.event === 'raise') kpis.raises++;
    if (p.event === 'freeze') kpis.freezes++;
    if (p.event === 'floor_protected') {
      kpis.cuts++;
      kpis.floorProtectedCount++;
    }
    if (p.diffFromBaseline < 0) kpis.totalSaved += -p.diffFromBaseline;
    else kpis.totalBonus += p.diffFromBaseline;
  }
  if (points.length > 0) {
    kpis.minSpend = Math.min(...points.map((p) => p.dynamicIncome));
    kpis.maxSpend = Math.max(...points.map((p) => p.dynamicIncome));
  }

  return { points, kpis, initialNetRatePercent: initialNetRate * 100 };
}
