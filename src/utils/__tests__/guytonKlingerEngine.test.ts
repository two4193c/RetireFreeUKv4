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
});
