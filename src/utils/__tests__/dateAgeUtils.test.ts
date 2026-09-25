import { describe, it, expect } from 'vitest';
import {
  calculateRetirementDateFromAge,
  calculateAgeFromRetirementDate,
  formatDisplayDate,
} from '../dateAgeUtils';

describe('dateAgeUtils', () => {
  describe('calculateRetirementDateFromAge', () => {
    it('calculates the exact birthday for target retirement age with valid DOB', () => {
      const dob = '1989-06-15';
      const currentAge = 35;
      const targetAge = 60;
      const retDate = calculateRetirementDateFromAge(dob, currentAge, targetAge);
      expect(retDate).toBe('2049-06-15');
    });

    it('handles leap day (Feb 29) to non-leap year by clamping to Feb 28', () => {
      const dob = '1992-02-29'; // 1992 is leap year
      const currentAge = 32;
      const targetAge = 61; // 1992 + 61 = 2053 (non-leap year)
      const retDate = calculateRetirementDateFromAge(dob, currentAge, targetAge);
      expect(retDate).toBe('2053-02-28');
    });

    it('handles leap day (Feb 29) to leap year', () => {
      const dob = '1992-02-29';
      const currentAge = 32;
      const targetAge = 60; // 1992 + 60 = 2052 (leap year)
      const retDate = calculateRetirementDateFromAge(dob, currentAge, targetAge);
      expect(retDate).toBe('2052-02-29');
    });

    it('provides a sensible fallback date if DOB is missing', () => {
      const currentAge = 40;
      const targetAge = 65;
      const retDate = calculateRetirementDateFromAge(undefined, currentAge, targetAge);
      expect(retDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const year = parseInt(retDate.split('-')[0], 10);
      const thisYear = new Date().getFullYear();
      expect(year).toBe(thisYear + 25);
    });
  });

  describe('calculateAgeFromRetirementDate', () => {
    const dob = '1989-06-15';
    const currentAge = 35;

    it('calculates exact age on birthday', () => {
      const result = calculateAgeFromRetirementDate(dob, currentAge, '2049-06-15');
      expect(result.targetAge).toBe(60);
      expect(result.exactYears).toBe(60);
      expect(result.exactMonths).toBe(0);
      expect(result.formattedDate).toBe('15 Jun 2049');
    });

    it('calculates completed age when date is before birthday in that calendar year', () => {
      const result = calculateAgeFromRetirementDate(dob, currentAge, '2049-03-01');
      // Birthday is June 15, so on March 1, 2049, they are 59 years old (59y 8m)
      expect(result.targetAge).toBe(59);
      expect(result.exactYears).toBe(59);
      expect(result.exactMonths).toBe(8);
      expect(result.formattedDate).toBe('1 Mar 2049');
    });

    it('calculates completed age when date is after birthday in that calendar year', () => {
      const result = calculateAgeFromRetirementDate(dob, currentAge, '2049-09-15');
      // Birthday is June 15, so on Sept 15, 2049, they are 60 years and 3 months old
      expect(result.targetAge).toBe(60);
      expect(result.exactYears).toBe(60);
      expect(result.exactMonths).toBe(3);
      expect(result.formattedDate).toBe('15 Sep 2049');
    });

    it('handles missing DOB using current age offset', () => {
      const result = calculateAgeFromRetirementDate(undefined, 35, '2049-06-15');
      expect(result.targetAge).toBeGreaterThanOrEqual(18);
      expect(result.formattedDate).toBe('15 Jun 2049');
    });
  });

  describe('formatDisplayDate', () => {
    it('formats short and long dates', () => {
      expect(formatDisplayDate('2049-06-15', 'short')).toBe('15 Jun 2049');
      expect(formatDisplayDate('2049-06-15', 'long')).toBe('15 June 2049');
      expect(formatDisplayDate('2032-01-01', 'short')).toBe('1 Jan 2032');
    });

    it('returns raw string if not matching date format', () => {
      expect(formatDisplayDate('')).toBe('');
      expect(formatDisplayDate('invalid')).toBe('invalid');
    });
  });
});
