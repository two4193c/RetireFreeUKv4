import React, { useState, useEffect } from 'react';
import { Calendar, User, Clock, ArrowRightLeft } from 'lucide-react';
import {
  calculateRetirementDateFromAge,
  calculateAgeFromRetirementDate,
  formatDisplayDate,
} from '../utils/dateAgeUtils';

export interface RetirementTargetInputProps {
  id?: string;
  label?: string;
  dob?: string;
  currentAge: number;
  targetAge: number;
  targetDate?: string;
  initialMode?: 'age' | 'date';
  accentColor?: 'primary' | 'indigo';
  onChange: (newAge: number, newDate: string, mode: 'age' | 'date') => void;
}

export const RetirementTargetInput: React.FC<RetirementTargetInputProps> = ({
  id = 'retire-target',
  label = 'Target Retirement',
  dob,
  currentAge,
  targetAge,
  targetDate,
  initialMode = 'age',
  accentColor = 'primary',
  onChange,
}) => {
  const [mode, setMode] = useState<'age' | 'date'>(initialMode);

  // Sync mode with props if initialMode changes
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Derived or fallback retirement date
  const effectiveDate = targetDate || calculateRetirementDateFromAge(dob, currentAge, targetAge || 60);

  // Derived or fallback retirement age details from effectiveDate
  const ageDetails = calculateAgeFromRetirementDate(dob, currentAge, effectiveDate);

  // Display date calculated from targetAge when in age mode
  const dateFromAge = calculateRetirementDateFromAge(dob, currentAge, targetAge || 60);
  const formattedDateFromAge = formatDisplayDate(dateFromAge, 'short');

  const yearsAway = Math.max(0, (targetAge || 60) - currentAge);

  const isPrimary = accentColor === 'primary';
  const badgeBg = isPrimary
    ? 'bg-primary-50 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border-primary-200/60 dark:border-primary-800/60'
    : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60';

  const ringFocus = isPrimary
    ? 'focus:ring-primary-500/20 focus:border-primary-500'
    : 'focus:ring-indigo-500/20 focus:border-indigo-500';

  const activeToggleClass = isPrimary
    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs'
    : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs';

  const handleModeSwitch = (newMode: 'age' | 'date') => {
    setMode(newMode);
    if (newMode === 'date') {
      // Ensure targetDate is synced
      onChange(targetAge || ageDetails.targetAge, dateFromAge, 'date');
    } else {
      // Ensure targetAge is synced
      onChange(ageDetails.targetAge, effectiveDate, 'age');
    }
  };

  const handleAgeChange = (raw: string) => {
    if (raw === '') {
      onChange('' as any, effectiveDate, 'age');
      return;
    }
    const val = Number(raw);
    if (!isNaN(val)) {
      const newComputedDate = calculateRetirementDateFromAge(dob, currentAge, val);
      onChange(val, newComputedDate, 'age');
    }
  };

  const handleAgeBlur = (raw: string) => {
    let val = Number(raw);
    const minAge = currentAge + 1;
    if (isNaN(val) || raw === '' || val < minAge) {
      val = minAge;
    }
    val = Math.min(95, val);
    const newComputedDate = calculateRetirementDateFromAge(dob, currentAge, val);
    onChange(val, newComputedDate, 'age');
  };

  const handleDateChange = (newDateStr: string) => {
    if (!newDateStr) return;
    const computed = calculateAgeFromRetirementDate(dob, currentAge, newDateStr);
    const clampedAge = Math.min(95, Math.max(currentAge + 1, computed.targetAge));
    onChange(clampedAge, newDateStr, 'date');
  };

  // Min and max date calculation for date picker
  const minDate = calculateRetirementDateFromAge(dob, currentAge, currentAge + 1);
  const maxDate = calculateRetirementDateFromAge(dob, currentAge, 95);

  return (
    <div className="space-y-1.5">
      {/* Label and Mode Toggle Bar */}
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={`${id}-${mode}`} className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
          <span>{label}</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
            ({mode === 'age' ? 'by Age' : 'by Date'})
          </span>
        </label>

        {/* Segmented Mode Control: Age | Date */}
        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => handleModeSwitch('age')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              mode === 'age' ? activeToggleClass : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Enter retirement by target age"
          >
            Age
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('date')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
              mode === 'date' ? activeToggleClass : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title="Enter retirement by exact date"
          >
            Date
          </button>
        </div>
      </div>

      {/* Input Field according to active mode */}
      <div className="relative">
        {mode === 'age' ? (
          <div>
            <input
              id={`${id}-age`}
              type="number"
              min={currentAge + 1}
              max="95"
              step="1"
              value={targetAge ?? ''}
              onChange={(e) => handleAgeChange(e.target.value)}
              onBlur={(e) => handleAgeBlur(e.target.value)}
              placeholder="e.g. 60"
              className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${ringFocus}`}
            />
          </div>
        ) : (
          <div>
            <input
              id={`${id}-date`}
              type="date"
              min={minDate}
              max={maxDate}
              value={effectiveDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className={`w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${ringFocus} cursor-pointer`}
            />
          </div>
        )}
      </div>

      {/* Reciprocal Display: If entering age -> display retirement date. If entering date -> display age */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors ${badgeBg}`}>
        {mode === 'age' ? (
          <div className="flex items-center gap-1.5 w-full justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span>Retirement Date:</span>
              <strong className="font-extrabold">{formattedDateFromAge}</strong>
            </span>
            <span className="text-[10px] font-semibold opacity-75 shrink-0">
              ({yearsAway}y away)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 w-full justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span>Retirement Age:</span>
              <strong className="font-extrabold">
                Age {targetAge || ageDetails.targetAge}
                {ageDetails.exactMonths > 0 ? ` (${ageDetails.exactYears}y ${ageDetails.exactMonths}m)` : ''}
              </strong>
            </span>
            <span className="text-[10px] font-semibold opacity-75 shrink-0">
              ({yearsAway}y away)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
