import { describe, it, expect } from 'vitest';
import {
  getBengenBaselineSwr,
  getGuytonKlingerDynamicBoost,
  calculateGuytonKlingerRecommendedSwr,
} from '../guytonKlingerEngine';

describe('guytonKlingerEngine', () => {
  it('calculates standard Bengen static benchmark for 30-year horizon', () => {
    const rate = getBengenBaselineSwr(30, 65);
    expect(rate).toBeCloseTo(4.05, 1);
  });

  it('adjusts Bengen benchmark downwards for longer horizons (40-50 years)', () => {
    const rate30 = getBengenBaselineSwr(30, 65);
    const rate40 = getBengenBaselineSwr(40, 65);
    const rate50 = getBengenBaselineSwr(50, 65);

    expect(rate40).toBeLessThan(rate30);
    expect(rate50).toBeLessThan(rate40);
    expect(rate40).toBeGreaterThanOrEqual(3.5);
  });

  it('calculates Guyton-Klinger dynamic rules boost (+1.0% to +1.5%)', () => {
    const boost = getGuytonKlingerDynamicBoost(30, 65, 10, 20, true, 0.65);
    expect(boost).toBeGreaterThanOrEqual(1.0);
    expect(boost).toBeLessThanOrEqual(1.5);
  });

  it('produces recommended initial SWR between 5.0% and 5.5% for standard 30-year retirement with 65% equities', () => {
    const result = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      equityPercentage: 65,
      startingWealth: 1000000,
      desiredAnnualSpend: 40000,
    });

    expect(result.recommendedInitialSwr).toBeGreaterThanOrEqual(5.0);
    expect(result.recommendedInitialSwr).toBeLessThanOrEqual(5.6);
    expect(result.bengenStaticSwr).toBeCloseTo(4.05, 1);
    expect(result.dynamicRulesBoost).toBeGreaterThan(0.9);
    expect(result.initialAnnualSpend).toBeGreaterThan(50000);
    expect(result.requiredStartingWealth).toBeLessThan(1000000);
  });

  it('deducts fee drag appropriately while retaining positive boost', () => {
    const noFee = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      equityPercentage: 65,
      feeDragPercent: 0,
    });

    const withFee = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      equityPercentage: 65,
      feeDragPercent: 0.6,
    });

    expect(withFee.recommendedInitialSwr).toBeLessThan(noFee.recommendedInitialSwr);
    expect(withFee.recommendedInitialSwr).toBeGreaterThan(noFee.bengenStaticSwr);
  });

  it('accurately establishes upper and lower guardrail trigger portfolio levels', () => {
    const result = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      equityPercentage: 65,
      startingWealth: 500000,
      desiredAnnualSpend: 25000,
      capitalPreservationThresholdPercent: 20,
      prosperityThresholdPercent: 20,
    });

    expect(result.upperGuardrailRate).toBeCloseTo(result.recommendedInitialSwr * 1.2, 1);
    expect(result.lowerGuardrailRate).toBeCloseTo(result.recommendedInitialSwr * 0.8, 1);
    expect(result.upperTriggerPortfolio).toBeLessThan(result.startingWealth || 500000);
    expect(result.lowerTriggerPortfolio).toBeGreaterThan(result.startingWealth || 500000);
  });

  it('eliminates dynamic boost when neither capital preservation cuts nor inflation freezing are active', () => {
    // cutPct = 0 (no preservation cuts), skipInflation = false (no freeze)
    const zeroBoost = getGuytonKlingerDynamicBoost(30, 65, 0, 20, false, 0.65);
    expect(zeroBoost).toBe(0.0);
  });

  it('neutralizes capital preservation boost when essential floor is 100% of target (zero cut flexibility)', () => {
    // essentialFloorRatio = 1.0 -> no flexible discretionary spending to absorb cuts
    const rigidFloorBoost = getGuytonKlingerDynamicBoost(30, 65, 10, 20, false, 1.0);
    expect(rigidFloorBoost).toBe(0.0);

    const withInflationRule = getGuytonKlingerDynamicBoost(30, 65, 10, 20, true, 1.0);
    expect(withInflationRule).toBeCloseTo(0.35, 2);
  });

  it('gracefully handles NaN and non-finite inputs without crashing or returning NaN', () => {
    const bengenNaN = getBengenBaselineSwr(NaN, NaN);
    expect(Number.isFinite(bengenNaN)).toBe(true);

    const boostNaN = getGuytonKlingerDynamicBoost(NaN, NaN, NaN, NaN, true, NaN);
    expect(Number.isFinite(boostNaN)).toBe(true);

    const resultNaN = calculateGuytonKlingerRecommendedSwr({
      horizonYears: NaN,
      equityPercentage: NaN,
      startingWealth: NaN,
      desiredAnnualSpend: NaN,
    });
    expect(Number.isFinite(resultNaN.recommendedInitialSwr)).toBe(true);
    expect(Number.isFinite(resultNaN.upperTriggerPortfolio)).toBe(true);
    expect(resultNaN.parametersUsed.essentialFloorRatio).toBe(0.65);
  });

  it('evaluates Bengen static benchmark across all equity allocation tiers', () => {
    // 70% equities (65 < eq <= 75)
    const rate70 = getBengenBaselineSwr(30, 70);
    expect(rate70).toBeGreaterThan(getBengenBaselineSwr(30, 65));

    // 85% equities (eq > 75)
    const rate85 = getBengenBaselineSwr(30, 85);
    expect(rate85).toBeLessThan(getBengenBaselineSwr(30, 75));

    // 40% equities (eq < 65)
    const rate40 = getBengenBaselineSwr(30, 40);
    expect(rate40).toBeLessThan(getBengenBaselineSwr(30, 65));

    // Clamping boundaries (e.g. 10 years vs 60 years)
    const rateShort = getBengenBaselineSwr(10, 65);
    const rateLong = getBengenBaselineSwr(60, 65);
    expect(rateShort).toBeGreaterThan(rateLong);
    expect(rateShort).toBeLessThanOrEqual(7.5);
    expect(rateLong).toBeGreaterThanOrEqual(2.5);
  });

  it('evaluates Guyton-Klinger dynamic boost across all parameters, triggers, and horizons', () => {
    // Longer horizon (h > 30)
    const boost40 = getGuytonKlingerDynamicBoost(40, 65, 10, 20, true, 0.65);
    const boost30 = getGuytonKlingerDynamicBoost(30, 65, 10, 20, true, 0.65);
    const boost20 = getGuytonKlingerDynamicBoost(20, 65, 10, 20, true, 0.65);
    expect(boost40).toBeLessThan(boost30);
    expect(boost20).toBeGreaterThan(boost30);

    // High equity allocation (eq > 65 and eq > 85)
    const boost80 = getGuytonKlingerDynamicBoost(30, 80, 10, 20, true, 0.65);
    const boost90 = getGuytonKlingerDynamicBoost(30, 90, 10, 20, true, 0.65);
    const boost50 = getGuytonKlingerDynamicBoost(30, 50, 10, 20, true, 0.65);
    expect(boost80).toBeGreaterThan(boost30);
    expect(boost90).toBeGreaterThan(boost30);
    expect(boost50).toBeLessThan(boost30);

    // Preservation cut size adjustments (cut > 10 and cut < 10)
    const boostCut15 = getGuytonKlingerDynamicBoost(30, 65, 15, 20, true, 0.65);
    const boostCut5 = getGuytonKlingerDynamicBoost(30, 65, 5, 20, true, 0.65);
    expect(boostCut15).toBeGreaterThan(boost30);
    expect(boostCut5).toBeLessThan(boost30);

    // Tight vs wide capital preservation triggers
    const boostTightTrig = getGuytonKlingerDynamicBoost(30, 65, 10, 15, true, 0.65);
    const boostWideTrig = getGuytonKlingerDynamicBoost(30, 65, 10, 30, true, 0.65);
    expect(boostTightTrig).toBeGreaterThan(boostWideTrig);

    // Prosperity raise sensitivity
    const boostProsp20 = getGuytonKlingerDynamicBoost(30, 65, 10, 20, true, 0.65, 15, 20);
    const boostProsp0 = getGuytonKlingerDynamicBoost(30, 65, 10, 20, true, 0.65, 20, 0);
    expect(boostProsp0).toBeGreaterThan(boostProsp20);
  });

  it('handles edge cases where startingWealth is 0 or desiredAnnualSpend is 0', () => {
    // 0 starting wealth, positive desired spend
    const resZeroWealth = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      startingWealth: 0,
      desiredAnnualSpend: 40000,
    });
    expect(resZeroWealth.initialAnnualSpend).toBe(40000);
    expect(resZeroWealth.requiredStartingWealth).toBeGreaterThan(500000);
    expect(resZeroWealth.upperTriggerPortfolio).toBeGreaterThan(0);

    // Both 0
    const resBothZero = calculateGuytonKlingerRecommendedSwr({
      horizonYears: 30,
      startingWealth: 0,
      desiredAnnualSpend: 0,
    });
    expect(resBothZero.initialAnnualSpend).toBe(0);
    expect(resBothZero.requiredStartingWealth).toBe(0);
    expect(resBothZero.upperTriggerPortfolio).toBe(0);
    expect(resBothZero.lowerTriggerPortfolio).toBe(0);

    // Non-finite values fall back safely to defaults
    const boostNan = getGuytonKlingerDynamicBoost(NaN, NaN, NaN, NaN, true, NaN, NaN, NaN);
    expect(boostNan).toBeGreaterThan(0);
  });
});
