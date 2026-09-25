/**
 * Utility functions for converting between Target Retirement Age and Target Retirement Date,
 * maintaining bidirectional synchronization and formatting for clear UI display.
 */

export interface RetirementAgeResult {
  targetAge: number;
  exactYears: number;
  exactMonths: number;
  yearsAway: number;
  formattedDate: string;
}

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format a 'YYYY-MM-DD' string to a human-readable date e.g. '15 Jun 2049'
 */
export function formatDisplayDate(dateStr: string, format: 'short' | 'long' = 'short'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return dateStr;
  }

  const monthName = format === 'long' ? MONTH_NAMES_LONG[monthIdx] : MONTH_NAMES_SHORT[monthIdx];
  return `${day} ${monthName} ${year}`;
}

/**
 * Given a Date of Birth and Target Retirement Age, compute the exact calendar date (YYYY-MM-DD)
 * when the person reaches that age.
 */
export function calculateRetirementDateFromAge(
  dobStr: string | undefined,
  currentAge: number,
  targetAge: number
): string {
  if (dobStr && /^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
    const [yStr, mStr, dStr] = dobStr.split('-');
    const birthYear = parseInt(yStr, 10);
    const birthMonth = parseInt(mStr, 10);
    const birthDay = parseInt(dStr, 10);

    if (!isNaN(birthYear) && !isNaN(birthMonth) && !isNaN(birthDay)) {
      const retYear = birthYear + targetAge;
      // Get max days in the target month (handles Feb 29 leap year cases)
      const maxDays = new Date(retYear, birthMonth, 0).getDate();
      const retDay = Math.min(birthDay, maxDays);

      return `${retYear}-${String(birthMonth).padStart(2, '0')}-${String(retDay).padStart(2, '0')}`;
    }
  }

  // Fallback if DOB is not provided or invalid
  const today = new Date();
  const currentYear = today.getFullYear();
  const yearsAway = Math.max(0, targetAge - (currentAge || 35));
  const retYear = currentYear + yearsAway;
  const retMonth = today.getMonth() + 1;
  const maxDays = new Date(retYear, retMonth, 0).getDate();
  const retDay = Math.min(today.getDate(), maxDays);

  return `${retYear}-${String(retMonth).padStart(2, '0')}-${String(retDay).padStart(2, '0')}`;
}

/**
 * Given a Date of Birth, Current Age, and a Target Retirement Date (YYYY-MM-DD),
 * compute the corresponding age in completed years, exact months, and years away from today.
 */
export function calculateAgeFromRetirementDate(
  dobStr: string | undefined,
  currentAge: number,
  retirementDateStr: string
): RetirementAgeResult {
  const formattedDate = formatDisplayDate(retirementDateStr, 'short');
  const today = new Date();
  const currentYear = today.getFullYear();

  if (!retirementDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(retirementDateStr)) {
    return {
      targetAge: Math.max((currentAge || 35) + 1, 60),
      exactYears: 60,
      exactMonths: 0,
      yearsAway: Math.max(1, 60 - (currentAge || 35)),
      formattedDate,
    };
  }

  const [retYear, retMonth, retDay] = retirementDateStr.split('-').map(Number);

  if (dobStr && /^\d{4}-\d{2}-\d{2}$/.test(dobStr)) {
    const [birthYear, birthMonth, birthDay] = dobStr.split('-').map(Number);
    
    let completedYears = retYear - birthYear;
    if (retMonth < birthMonth || (retMonth === birthMonth && retDay < birthDay)) {
      completedYears--;
    }

    let totalMonths = (retYear - birthYear) * 12 + (retMonth - birthMonth);
    if (retDay < birthDay) {
      totalMonths--;
    }

    const exactMonths = Math.max(0, totalMonths % 12);
    // Years away from current age
    const yearsAway = Math.max(0, completedYears - (currentAge || 0));

    return {
      targetAge: Math.max(18, completedYears),
      exactYears: Math.max(18, completedYears),
      exactMonths,
      yearsAway,
      formattedDate,
    };
  }

  // Fallback if DOB is missing
  const estimatedBirthYear = currentYear - (currentAge || 35);
  const completedYears = Math.max(18, retYear - estimatedBirthYear);
  const yearsAway = Math.max(0, retYear - currentYear);

  return {
    targetAge: completedYears,
    exactYears: completedYears,
    exactMonths: 0,
    yearsAway,
    formattedDate,
  };
}
