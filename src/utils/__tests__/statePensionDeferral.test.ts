import { describe, it, expect } from 'vitest';
import { generateProjections } from '../projectionEngine';
import { computePlanInsights } from '../planInsightsEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('State Pension Deferral Functionality', () => {
  it('correctly models 0 deferral (standard claim at SPA 67)', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 65,
      targetRetirementAge: 65,
      statePensionAge: 67,
      statePensionDeferralYears: 0,
      includeStatePension: true,
      enableTripleLock: false,
      statePensionAmountAnnual: 12547.60,
      expectedInflationRate: 0,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const projections = generateProjections(profile, pots);

    const at66 = projections.find((p) => p.age === 66);
    const at67 = projections.find((p) => p.age === 67);

    expect(at66?.statePensionReceived).toBe(0);
    expect(at67?.statePensionReceived).toBe(12548);
  });

  it('correctly delays claiming and applies 5.8%/yr boost for 2-year deferral', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 65,
      targetRetirementAge: 65,
      statePensionAge: 67,
      statePensionDeferralYears: 2,
      includeStatePension: true,
      enableTripleLock: false,
      statePensionAmountAnnual: 10000, // clean round number
      expectedInflationRate: 0,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const projections = generateProjections(profile, pots);

    const at67 = projections.find((p) => p.age === 67);
    const at68 = projections.find((p) => p.age === 68);
    const at69 = projections.find((p) => p.age === 69);

    // Should receive £0 at ages 67 and 68 (during the 2-year delay period)
    expect(at67?.statePensionReceived).toBe(0);
    expect(at68?.statePensionReceived).toBe(0);

    // At age 69 (67 + 2), should receive 10,000 * (1 + 0.058 * 2) = 11,160
    expect(at69?.statePensionReceived).toBe(11160);
    expect(at69?.primaryStatePensionReceived).toBe(11160);
  });

  it('correctly handles partner state pension deferral independently', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 65,
      targetRetirementAge: 65,
      statePensionAge: 67,
      statePensionDeferralYears: 0,
      includeStatePension: true,
      enableTripleLock: false,
      statePensionAmountAnnual: 10000,

      isCouplePlanning: true,
      partnerCurrentAge: 65,
      partnerTargetRetirementAge: 65,
      partnerStatePensionAge: 67,
      partnerStatePensionDeferralYears: 3, // partner defers 3 years to age 70 (+17.4%)
      partnerIncludeStatePension: true,
      partnerEnableTripleLock: false,
      partnerStatePensionAmountAnnual: 10000,
      expectedInflationRate: 0,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const projections = generateProjections(profile, pots);

    const at67 = projections.find((p) => p.age === 67);
    const at68 = projections.find((p) => p.age === 68);
    const at70 = projections.find((p) => p.age === 70);

    // At age 67: Primary receives 10,000, Partner receives 0
    expect(at67?.primaryStatePensionReceived).toBe(10000);
    expect(at67?.partnerStatePensionReceived).toBe(0);
    expect(at67?.statePensionReceived).toBe(10000);

    // At age 68: Primary receives 10,000, Partner receives 0
    expect(at68?.primaryStatePensionReceived).toBe(10000);
    expect(at68?.partnerStatePensionReceived).toBe(0);

    // At age 70: Partner kicks in with +17.4% boost: 10,000 * 1.174 = 11,740
    // Total = 10,000 + 11,740 = 21,740
    expect(at70?.primaryStatePensionReceived).toBe(10000);
    expect(at70?.partnerStatePensionReceived).toBe(11740);
    expect(at70?.statePensionReceived).toBe(21740);
  });

  it('reflects deferral boost in Plan Insights guaranteed floor', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      statePensionAge: 67,
      statePensionDeferralYears: 1, // +5.8% boost
      includeStatePension: true,
      statePensionAmountAnnual: 10000,
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const projections = generateProjections(profile, pots);
    const insights = computePlanInsights(profile, pots, projections);

    // Guaranteed floor should factor in 10,000 * 1.058 = 10,580
    expect(insights.scorecard.guaranteedFloorAmount).toBe(10580);
  });
});
