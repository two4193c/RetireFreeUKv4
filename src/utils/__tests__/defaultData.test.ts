import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE,
  DEFAULT_POTS,
  DEFAULT_PARTNER_POTS,
  DEFAULT_MORTGAGE,
  ZERO_POTS,
  sanitizePots,
  sanitizeProfile,
  createBlankScenario,
} from '../defaultData';

describe('defaultData utils', () => {
  describe('DEFAULT_PROFILE & DEFAULT_POTS', () => {
    it('DEFAULT_PROFILE should contain expected keys', () => {
      expect(DEFAULT_PROFILE).toBeDefined();
      expect(DEFAULT_PROFILE.grossAnnualSalary).toBe(65000);
      expect(DEFAULT_PROFILE.mortgage).toEqual(DEFAULT_MORTGAGE);
    });

    it('DEFAULT_POTS should have basic values set', () => {
      expect(DEFAULT_POTS).toBeDefined();
      expect(DEFAULT_POTS.workplacePensionBalance).toBe(45000);
      expect(DEFAULT_POTS.giaBalance).toBe(0);
    });

    it('ZERO_POTS should have all zeroes', () => {
      expect(ZERO_POTS.workplacePensionBalance).toBe(0);
      expect(ZERO_POTS.stocksAndSharesIsaBalance).toBe(0);
      expect(ZERO_POTS.workplacePensionMonthlyEmployeeType).toBe('percent');
    });
  });

  describe('sanitizePots()', () => {
    it('should return default fallback if pots is null or undefined', () => {
      expect(sanitizePots(null)).toEqual(DEFAULT_POTS);
      expect(sanitizePots(undefined)).toEqual(DEFAULT_POTS);
      // @ts-ignore
      expect(sanitizePots('invalid')).toEqual(DEFAULT_POTS);
    });

    it('should fall back to default values for missing keys', () => {
      const result = sanitizePots({ workplacePensionBalance: 1000 });
      expect(result.workplacePensionBalance).toBe(1000);
      // Default value
      expect(result.sippBalance).toBe(DEFAULT_POTS.sippBalance);
    });

    it('should use provided defaultFallback', () => {
      const result = sanitizePots(undefined, DEFAULT_PARTNER_POTS);
      expect(result).toEqual(DEFAULT_PARTNER_POTS);
    });

    it('should handle NaN or undefined gracefully to number or 0', () => {
      const result = sanitizePots({
        // @ts-ignore
        workplacePensionBalance: 'not a number',
        sippBalance: undefined,
      });
      // workplacePensionBalance will become 0 if Number('not a number') || 0
      expect(result.workplacePensionBalance).toBe(0);
      // sippBalance falls back to default fallback
      expect(result.sippBalance).toBe(DEFAULT_POTS.sippBalance);
    });

    it('should handle workplacePensionMonthlyEmployeeType properly', () => {
      const result = sanitizePots({ workplacePensionMonthlyEmployeeType: 'fixed' });
      expect(result.workplacePensionMonthlyEmployeeType).toBe('fixed');

      const result2 = sanitizePots({ workplacePensionMonthlyEmployeeType: '' as any });
      expect(result2.workplacePensionMonthlyEmployeeType).toBe('percent');
    });
  });

  describe('sanitizeProfile()', () => {
    it('should handle undefined or null profile', () => {
      const result = sanitizeProfile(null);
      expect(result.targetRetirementAge).toBe(DEFAULT_PROFILE.targetRetirementAge);
      expect(result.mortgage).toEqual(DEFAULT_MORTGAGE);
    });

    it('should calculate state pension dynamically correctly for 35+ years', () => {
      const result = sanitizeProfile({
        qualifyingYears: 36, // clamped to 35
        fullStatePensionAmount: 10000,
        statePensionAmountAnnual: undefined,
      });
      expect(result.statePensionAmountAnnual).toBe(10000);
    });

    it('should calculate state pension dynamically correctly for < 10 years', () => {
      const result = sanitizeProfile({
        qualifyingYears: 9,
        statePensionAmountAnnual: undefined,
      });
      expect(result.statePensionAmountAnnual).toBe(0);
      expect(result.qualifyingYears).toBe(9);
    });

    it('should calculate state pension correctly for intermediate years (e.g., 20 years)', () => {
      const result = sanitizeProfile({
        qualifyingYears: 17.5,
        fullStatePensionAmount: 10000,
        statePensionAmountAnnual: undefined,
      });
      expect(result.statePensionAmountAnnual).toBe(5000);
    });

    it('should calculate partner state pension dynamically correctly for 35+ years', () => {
      const result = sanitizeProfile({
        partnerQualifyingYears: 40,
        partnerFullStatePensionAmount: 12000,
        partnerStatePensionAmountAnnual: undefined,
      });
      expect(result.partnerStatePensionAmountAnnual).toBe(12000);
    });

    it('should calculate partner state pension dynamically correctly for < 10 years', () => {
      const result = sanitizeProfile({
        partnerQualifyingYears: 8,
      });
      expect(result.partnerStatePensionAmountAnnual).toBe(0);
    });

    it('should preserve provided statePensionAmountAnnual if years >= 10', () => {
      const result = sanitizeProfile({
        qualifyingYears: 20,
        statePensionAmountAnnual: 8000,
      });
      expect(result.statePensionAmountAnnual).toBe(8000);
    });

    it('should enforce 0 statePensionAmountAnnual if years < 10 even if provided', () => {
      const result = sanitizeProfile({
        qualifyingYears: 5,
        statePensionAmountAnnual: 8000, // Should be overridden to 0
      });
      expect(result.statePensionAmountAnnual).toBe(0);
    });

    it('should handle partner triple lock logic', () => {
      const result = sanitizeProfile({
        enableTripleLock: true,
        // missing partnerEnableTripleLock, should fallback to tripleLockVal
      });
      expect(result.enableTripleLock).toBe(true);
      expect(result.partnerEnableTripleLock).toBe(true);
    });

    it('should sanitize partnerPots', () => {
      const result = sanitizeProfile({
        partnerPots: { workplacePensionBalance: 999 } as any,
      });
      expect(result.partnerPots.workplacePensionBalance).toBe(999);
      expect(result.partnerPots.sippBalance).toBe(DEFAULT_PARTNER_POTS.sippBalance);
    });

    it('should sanitize mortgage if provided', () => {
      const result = sanitizeProfile({
        mortgage: { currentBalance: 50000 } as any,
      });
      expect(result.mortgage.currentBalance).toBe(50000);
      expect(result.mortgage.propertyValue).toBe(DEFAULT_MORTGAGE.propertyValue);
    });
  });

  describe('createBlankScenario()', () => {
    it('should create a blank scenario with zeroes and zero pots', () => {
      const scenario = createBlankScenario('s1', 'Test Blank');
      expect(scenario.id).toBe('s1');
      expect(scenario.name).toBe('Test Blank');
      expect(scenario.pots).toEqual(ZERO_POTS);
      expect(scenario.profile.grossAnnualSalary).toBe(0);
      expect(scenario.profile.partnerPots).toEqual(ZERO_POTS);
    });
  });
});
