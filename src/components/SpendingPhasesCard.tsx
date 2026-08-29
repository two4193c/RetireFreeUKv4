import React from 'react';
import { UserProfile, SpendingPhasesConfig, SpendingAgeRange, AppMode } from '../types';
import { getPensionAccessAge } from '../utils/ukTaxEngine';
import {
  Sparkles,
  Zap,
  Plus,
  Trash2,
  TrendingUp,
  RotateCcw,
  Calendar,
  Sliders,
  CheckCircle2,
  Landmark,
  Coins,
  ArrowRight,
  Info,
  Scale,
} from 'lucide-react';

interface SpendingPhasesCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
  onOpenMaximizedSpendModal?: () => void;
  appMode?: AppMode;
}

// Color palettes for up to 6 custom ranges
const RANGE_COLORS = [
  {
    badgeBg: 'bg-primary-100 dark:bg-primary-950',
    badgeText: 'text-primary-900 dark:text-primary-200',
    border: 'border-primary-200 dark:border-primary-800/80',
    barBg: 'bg-primary-500',
    accentText: 'text-primary-600 dark:text-primary-400',
    focusRing: 'focus:ring-primary-500/20 focus:border-primary-500',
    lightBg: 'bg-primary-50/50 dark:bg-primary-950/20',
  },
  {
    badgeBg: 'bg-amber-100 dark:bg-amber-950',
    badgeText: 'text-amber-900 dark:text-amber-200',
    border: 'border-amber-200 dark:border-amber-800/80',
    barBg: 'bg-amber-500',
    accentText: 'text-amber-600 dark:text-amber-400',
    focusRing: 'focus:ring-amber-500/20 focus:border-amber-500',
    lightBg: 'bg-amber-50/50 dark:bg-amber-950/20',
  },
  {
    badgeBg: 'bg-indigo-100 dark:bg-indigo-950',
    badgeText: 'text-indigo-900 dark:text-indigo-200',
    border: 'border-indigo-200 dark:border-indigo-800/80',
    barBg: 'bg-indigo-500',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    focusRing: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    lightBg: 'bg-indigo-50/50 dark:bg-indigo-950/20',
  },
  {
    badgeBg: 'bg-purple-100 dark:bg-purple-950',
    badgeText: 'text-purple-900 dark:text-purple-200',
    border: 'border-purple-200 dark:border-purple-800/80',
    barBg: 'bg-purple-500',
    accentText: 'text-purple-600 dark:text-purple-400',
    focusRing: 'focus:ring-purple-500/20 focus:border-purple-500',
    lightBg: 'bg-purple-50/50 dark:bg-purple-950/20',
  },
  {
    badgeBg: 'bg-rose-100 dark:bg-rose-950',
    badgeText: 'text-rose-900 dark:text-rose-200',
    border: 'border-rose-200 dark:border-rose-800/80',
    barBg: 'bg-rose-500',
    accentText: 'text-rose-600 dark:text-rose-400',
    focusRing: 'focus:ring-rose-500/20 focus:border-rose-500',
    lightBg: 'bg-rose-50/50 dark:bg-rose-950/20',
  },
  {
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950',
    badgeText: 'text-cyan-900 dark:text-cyan-200',
    border: 'border-cyan-200 dark:border-cyan-800/80',
    barBg: 'bg-cyan-500',
    accentText: 'text-cyan-600 dark:text-cyan-400',
    focusRing: 'focus:ring-cyan-500/20 focus:border-cyan-500',
    lightBg: 'bg-cyan-50/50 dark:bg-cyan-950/20',
  },
];

export function getInitialSpendingRanges(profile: UserProfile): SpendingAgeRange[] {
  const retAge = profile.targetRetirementAge || 60;
  const baseTarget = profile.targetRetirementIncomeAnnual || 35000;
  const pensionAccessAge = getPensionAccessAge(profile);

  if (profile.spendingPhases?.customRanges && profile.spendingPhases.customRanges.length > 0) {
    return profile.spendingPhases.customRanges;
  }

  // Legacy phases conversion
  if (profile.spendingPhases && profile.spendingPhases.goGoEndAge) {
    const sp = profile.spendingPhases;
    const goGoEnd = sp.goGoEndAge || 74;
    const slowGoEnd = sp.slowGoEndAge || 84;

    if (retAge < pensionAccessAge) {
      const bridgeEnd = pensionAccessAge - 1;
      const goGoStart = pensionAccessAge;
      const goGoEndAge = Math.max(goGoStart, goGoEnd);
      const slowGoStart = goGoEndAge + 1;
      const slowGoEndAge = Math.max(slowGoStart, slowGoEnd);
      const noGoStart = slowGoEndAge + 1;

      return [
        {
          id: 'range-isa-bridge',
          name: 'ISA Bridge Years',
          startAge: retAge,
          endAge: bridgeEnd,
          annualTargetIncome: baseTarget,
          description: `Bridge funding from ISA & Cash prior to private pension access age (${pensionAccessAge})`,
        },
        {
          id: 'range-1',
          name: 'Go-Go Years (Active)',
          startAge: goGoStart,
          endAge: goGoEndAge,
          annualTargetIncome: sp.goGoIncomeAnnual || baseTarget,
          description: 'Active travel, hobbies & lifestyle',
        },
        {
          id: 'range-2',
          name: 'Slow-Go Years (Paced)',
          startAge: slowGoStart,
          endAge: slowGoEndAge,
          annualTargetIncome: sp.slowGoIncomeAnnual || Math.round(baseTarget * 0.8),
          description: 'Slower pace & reduced routine travel',
        },
        {
          id: 'range-3',
          name: 'No-Go Years (Home/Quiet)',
          startAge: noGoStart,
          endAge: undefined,
          annualTargetIncome: sp.noGoIncomeAnnual || Math.round(baseTarget * 0.65),
          description: 'Home-centric quiet living',
        },
      ];
    }

    return [
      {
        id: 'range-1',
        name: 'Go-Go Years (Active)',
        startAge: retAge,
        endAge: goGoEnd,
        annualTargetIncome: sp.goGoIncomeAnnual || baseTarget,
        description: 'Active travel, hobbies & lifestyle',
      },
      {
        id: 'range-2',
        name: 'Slow-Go Years (Paced)',
        startAge: goGoEnd + 1,
        endAge: slowGoEnd,
        annualTargetIncome: sp.slowGoIncomeAnnual || Math.round(baseTarget * 0.8),
        description: 'Slower pace & reduced routine travel',
      },
      {
        id: 'range-3',
        name: 'No-Go Years (Home/Quiet)',
        startAge: slowGoEnd + 1,
        endAge: undefined,
        annualTargetIncome: sp.noGoIncomeAnnual || Math.round(baseTarget * 0.65),
        description: 'Home-centric quiet living',
      },
    ];
  }

  // Default Spending Ranges when no customRanges exist:
  // If targetRetirementAge < pensionAccessAge, add ISA Bridge Years range starting at retirement age to private pension access age
  if (retAge < pensionAccessAge) {
    const bridgeEndAge = pensionAccessAge - 1;
    const goGoStartAge = pensionAccessAge;
    const goGoEndAge = Math.max(goGoStartAge, 74);
    const slowGoStartAge = goGoEndAge + 1;
    const slowGoEndAge = Math.max(slowGoStartAge, 84);
    const noGoStartAge = slowGoEndAge + 1;

    return [
      {
        id: 'range-isa-bridge',
        name: 'ISA Bridge Years',
        startAge: retAge,
        endAge: bridgeEndAge,
        annualTargetIncome: baseTarget,
        description: `Bridge funding from ISA & Cash prior to private pension access age (${pensionAccessAge})`,
      },
      {
        id: 'range-gogo',
        name: 'Go-Go Years (Active)',
        startAge: goGoStartAge,
        endAge: goGoEndAge,
        annualTargetIncome: baseTarget,
        description: 'Active travel, hobbies & discretionary spending',
      },
      {
        id: 'range-slowgo',
        name: 'Slow-Go Years (Paced)',
        startAge: slowGoStartAge,
        endAge: slowGoEndAge,
        annualTargetIncome: Math.round(baseTarget * 0.8),
        description: 'Slower pace & lower routine expenses',
      },
      {
        id: 'range-nogo',
        name: 'No-Go Years (Home/Quiet)',
        startAge: noGoStartAge,
        endAge: undefined,
        annualTargetIncome: Math.round(baseTarget * 0.65),
        description: 'Home-centric quiet living & essential costs',
      },
    ];
  }

  // If retirement age is on or after private pension access age (retAge >= pensionAccessAge):
  // ISA Bridge Years should NOT be added as a default income requirement range!
  const goGoStartAge = retAge;
  const goGoEndAge = Math.max(goGoStartAge, 74);
  const slowGoStartAge = goGoEndAge + 1;
  const slowGoEndAge = Math.max(slowGoStartAge, 84);
  const noGoStartAge = slowGoEndAge + 1;

  return [
    {
      id: 'range-gogo',
      name: 'Go-Go Years (Active)',
      startAge: goGoStartAge,
      endAge: goGoEndAge,
      annualTargetIncome: baseTarget,
      description: 'Active travel, hobbies & discretionary spending',
    },
    {
      id: 'range-slowgo',
      name: 'Slow-Go Years (Paced)',
      startAge: slowGoStartAge,
      endAge: slowGoEndAge,
      annualTargetIncome: Math.round(baseTarget * 0.8),
      description: 'Slower pace & lower routine expenses',
    },
    {
      id: 'range-nogo',
      name: 'No-Go Years (Home/Quiet)',
      startAge: noGoStartAge,
      endAge: undefined,
      annualTargetIncome: Math.round(baseTarget * 0.65),
      description: 'Home-centric quiet living & essential costs',
    },
  ];
}

export const SpendingPhasesCard: React.FC<SpendingPhasesCardProps> = ({
  profile,
  onChange,
  onOpenMaximizedSpendModal,
  appMode = 'basic',
  isStudioMode,
}) => {
  const isStudio = Boolean(isStudioMode || appMode === 'studio');
  const retAge = profile.targetRetirementAge || 60;
  const baseTarget = profile.targetRetirementIncomeAnnual || 35000;

  const phasesConfig: SpendingPhasesConfig = profile.spendingPhases || {
    enabled: false,
  };

  const ranges = getInitialSpendingRanges(profile);

  // Helper to update profile fields
  const handleTargetIncomeChange = (val: number) => {
    const cleanVal = Math.max(0, val);
    const updatedMaxConfig = profile.maximizedSpendConfig
      ? {
          ...profile.maximizedSpendConfig,
          baselineTargetAnnualIncome: cleanVal,
        }
      : undefined;

    onChange({
      ...profile,
      targetRetirementIncomeAnnual: cleanVal,
      maximizedSpendConfig: updatedMaxConfig,
    });
  };

  // Sync ranges and profile state
  const savePhases = (enabled: boolean, updatedRanges: SpendingAgeRange[], customBaseIncome?: number) => {
    const sorted = [...updatedRanges].sort((a, b) => a.startAge - b.startAge);
    
    // Sync legacy 3-phase fields for full backwards compatibility
    const r1 = sorted[0];
    const r2 = sorted[1];
    const r3 = sorted[2];

    const currentBase = customBaseIncome !== undefined ? customBaseIncome : profile.targetRetirementIncomeAnnual;

    const updatedConfig: SpendingPhasesConfig = {
      enabled,
      customRanges: sorted,
      goGoEndAge: r1?.endAge || 74,
      goGoIncomeAnnual: r1?.annualTargetIncome || currentBase,
      slowGoEndAge: r2?.endAge || 84,
      slowGoIncomeAnnual: r2?.annualTargetIncome || Math.round(currentBase * 0.8),
      noGoIncomeAnnual: r3?.annualTargetIncome || Math.round(currentBase * 0.65),
    };

    const updatedMaxConfig = profile.maximizedSpendConfig
      ? {
          ...profile.maximizedSpendConfig,
          baselineTargetAnnualIncome: currentBase,
          baselineSpendingPhases: updatedConfig,
        }
      : undefined;

    onChange({
      ...profile,
      targetRetirementIncomeAnnual: currentBase,
      spendingPhases: updatedConfig,
      maximizedSpendConfig: updatedMaxConfig,
    });
  };

  const handleToggleEnabled = (enabled: boolean) => {
    savePhases(enabled, ranges);
  };

  const handleUpdateRange = (id: string, updates: Partial<SpendingAgeRange>) => {
    const updated = ranges.map((r) => (r.id === id ? { ...r, ...updates } : r));

    // Sort by startAge to maintain correct sequence
    updated.sort((a, b) => a.startAge - b.startAge);

    // Auto-adjust adjacent bounds if endAge or startAge changed
    const targetIdx = updated.findIndex((r) => r.id === id);
    if (targetIdx !== -1) {
      const current = updated[targetIdx];

      // If endAge was modified to a valid number
      if (updates.endAge !== undefined && updates.endAge !== null && updates.endAge > 0) {
        if (targetIdx < updated.length - 1) {
          const next = updated[targetIdx + 1];
          if (next.startAge <= current.endAge) {
            next.startAge = current.endAge + 1;
            if (next.endAge !== undefined && next.endAge !== null && next.endAge <= next.startAge) {
              next.endAge = next.startAge + 5;
            }
          }
        }
      }

      // If startAge was modified
      if (updates.startAge !== undefined) {
        if (targetIdx > 0) {
          const prev = updated[targetIdx - 1];
          if (prev.endAge === undefined || prev.endAge >= current.startAge) {
            prev.endAge = Math.max(prev.startAge, current.startAge - 1);
          }
        }
      }
    }

    savePhases(phasesConfig.enabled, updated);
  };

  const handleAddRange = () => {
    const sorted = [...ranges].sort((a, b) => a.startAge - b.startAge);
    const lastRange = sorted[sorted.length - 1];

    let newStartAge = retAge;
    if (lastRange) {
      if (lastRange.endAge !== undefined && lastRange.endAge !== null && lastRange.endAge > 0) {
        newStartAge = lastRange.endAge + 1;
      } else {
        lastRange.endAge = lastRange.startAge + 5;
        newStartAge = lastRange.endAge + 1;
      }
    }

    const newRange: SpendingAgeRange = {
      id: `range-${Date.now()}`,
      name: `Age Range ${ranges.length + 1}`,
      startAge: newStartAge,
      endAge: undefined, // default to ongoing
      annualTargetIncome: lastRange ? Math.round(lastRange.annualTargetIncome * 0.85) : baseTarget,
      description: 'Custom spending requirements',
    };

    const updated = [...sorted, newRange];
    savePhases(phasesConfig.enabled, updated);
  };

  const handleRemoveRange = (id: string) => {
    if (ranges.length <= 1) return; // Keep at least 1 range
    const updated = ranges.filter((r) => r.id !== id);
    savePhases(phasesConfig.enabled, updated);
  };

  const handleAutoAlign = () => {
    const sorted = [...ranges].sort((a, b) => a.startAge - b.startAge);

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.endAge === undefined || current.endAge === null || current.endAge <= current.startAge) {
        current.endAge = current.startAge + 5;
      }
      next.startAge = current.endAge + 1;
    }

    if (sorted.length > 0) {
      sorted[sorted.length - 1].endAge = undefined;
    }

    savePhases(phasesConfig.enabled, sorted);
  };

  const handleApplyPreset = (presetType: 'gogo' | 'early55' | 'twostage' | 'decades' | 'constant') => {
    let presetRanges: SpendingAgeRange[] = [];

    if (presetType === 'early55') {
      const start = Math.min(retAge, 55);
      presetRanges = [
        {
          id: 'preset-1',
          name: 'Stage 1: Start to Age 55',
          startAge: start,
          endAge: 55,
          annualTargetIncome: baseTarget,
          description: 'Early retirement spending through age 55',
        },
        {
          id: 'preset-2',
          name: 'Stage 2: Age 56 to 65',
          startAge: 56,
          endAge: 65,
          annualTargetIncome: Math.round(baseTarget * 0.85),
          description: 'Mid retirement active lifestyle',
        },
        {
          id: 'preset-3',
          name: 'Stage 3: Age 66+ (Ongoing)',
          startAge: 66,
          endAge: undefined,
          annualTargetIncome: Math.round(baseTarget * 0.70),
          description: 'Late retirement baseline',
        },
      ];
    } else if (presetType === 'gogo') {
      const pensionAccessAge = getPensionAccessAge(profile);
      if (retAge < pensionAccessAge) {
        const bridgeEnd = pensionAccessAge - 1;
        const goGoStart = pensionAccessAge;
        const goGoEnd = Math.max(goGoStart, 74);
        const slowGoStart = goGoEnd + 1;
        const slowGoEnd = Math.max(slowGoStart, 84);
        const noGoStart = slowGoEnd + 1;

        presetRanges = [
          {
            id: 'preset-isa-bridge',
            name: 'ISA Bridge Years',
            startAge: retAge,
            endAge: bridgeEnd,
            annualTargetIncome: baseTarget,
            description: `Bridge funding from ISA & Cash prior to private pension access age (${pensionAccessAge})`,
          },
          {
            id: 'preset-1',
            name: 'Go-Go Years (Active)',
            startAge: goGoStart,
            endAge: goGoEnd,
            annualTargetIncome: baseTarget,
            description: 'High active travel & discretionary leisure',
          },
          {
            id: 'preset-2',
            name: 'Slow-Go Years (Paced)',
            startAge: slowGoStart,
            endAge: slowGoEnd,
            annualTargetIncome: Math.round(baseTarget * 0.8),
            description: 'Slower pace & lower routine living costs',
          },
          {
            id: 'preset-3',
            name: 'No-Go Years (Home/Quiet)',
            startAge: noGoStart,
            endAge: undefined,
            annualTargetIncome: Math.round(baseTarget * 0.65),
            description: 'Home-centric quiet living & essential expenses',
          },
        ];
      } else {
        const goGoStart = retAge;
        const goGoEnd = Math.max(goGoStart, 74);
        const slowGoStart = goGoEnd + 1;
        const slowGoEnd = Math.max(slowGoStart, 84);
        const noGoStart = slowGoEnd + 1;

        presetRanges = [
          {
            id: 'preset-1',
            name: 'Go-Go Years (Active)',
            startAge: goGoStart,
            endAge: goGoEnd,
            annualTargetIncome: baseTarget,
            description: 'High active travel & discretionary leisure',
          },
          {
            id: 'preset-2',
            name: 'Slow-Go Years (Paced)',
            startAge: slowGoStart,
            endAge: slowGoEnd,
            annualTargetIncome: Math.round(baseTarget * 0.8),
            description: 'Slower pace & lower routine living costs',
          },
          {
            id: 'preset-3',
            name: 'No-Go Years (Home/Quiet)',
            startAge: noGoStart,
            endAge: undefined,
            annualTargetIncome: Math.round(baseTarget * 0.65),
            description: 'Home-centric quiet living & essential expenses',
          },
        ];
      }
    } else if (presetType === 'twostage') {
      presetRanges = [
        {
          id: 'preset-1',
          name: 'Phase 1: Early Retirement',
          startAge: retAge,
          endAge: 70,
          annualTargetIncome: baseTarget,
          description: 'Higher initial lifestyle & mortgage/loan clearance',
        },
        {
          id: 'preset-2',
          name: 'Phase 2: Core Living',
          startAge: 71,
          endAge: undefined,
          annualTargetIncome: Math.round(baseTarget * 0.75),
          description: 'Baseline long-term retirement requirement',
        },
      ];
    } else if (presetType === 'decades') {
      presetRanges = [
        {
          id: 'preset-1',
          name: 'Age 50s/60s (Active)',
          startAge: retAge,
          endAge: 69,
          annualTargetIncome: baseTarget,
          description: 'Peak active retirement spending',
        },
        {
          id: 'preset-2',
          name: 'Age 70s (Moderate)',
          startAge: 70,
          endAge: 79,
          annualTargetIncome: Math.round(baseTarget * 0.85),
          description: 'Slight reduction in travel & major purchases',
        },
        {
          id: 'preset-3',
          name: 'Age 80s (Quiet)',
          startAge: 80,
          endAge: 89,
          annualTargetIncome: Math.round(baseTarget * 0.7),
          description: 'Reduced mobility & home focus',
        },
        {
          id: 'preset-4',
          name: 'Age 90+ (Late Stage)',
          startAge: 90,
          endAge: undefined,
          annualTargetIncome: Math.round(baseTarget * 0.6),
          description: 'Core living expenses & essential care',
        },
      ];
    } else if (presetType === 'constant') {
      presetRanges = [
        {
          id: 'preset-1',
          name: 'Constant Annual Target',
          startAge: retAge,
          endAge: undefined,
          annualTargetIncome: baseTarget,
          description: 'Uniform target income requirement across all years',
        },
      ];
    }

    savePhases(true, presetRanges);
  };

  const sortedRanges = [...ranges].sort((a, b) => a.startAge - b.startAge);
  const monthlyIncome = Math.round((profile.targetRetirementIncomeAnnual || 0) / 12);
  const weeklyIncome = Math.round((profile.targetRetirementIncomeAnnual || 0) / 52);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-5 transition-all shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 flex items-center justify-center shrink-0 border border-primary-200/60 dark:border-primary-800/60">
            <Landmark className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Retirement Income Requirement
              </h3>
              {!isStudio && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-900 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50">
                  Income Strategy
                </span>
              )}
            </div>
            {!isStudio && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Specify your annual household income requirement in today's money, choosing between flat spending or flexible age-based options.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Spending Mode Options (Flat Spending vs Flexible Age-Based) */}
      {true && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Flat Spending */}
          <button
            type="button"
            onClick={() => handleToggleEnabled(false)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
              !phasesConfig.enabled
                ? 'bg-white dark:bg-slate-800 border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
                : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${!phasesConfig.enabled ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              <Coins className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1 pr-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Flat Annual Spending
                </span>
                {!phasesConfig.enabled && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                )}
              </div>
              {!isStudio && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Single constant target income across all retirement years.
                </p>
              )}
            </div>
          </button>

          {/* Option 2: Flexible Age-Based Spending */}
          <button
            type="button"
            onClick={() => handleToggleEnabled(true)}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 relative ${
              phasesConfig.enabled
                ? 'bg-white dark:bg-slate-800 border-primary-500 ring-2 ring-primary-500/20 shadow-xs'
                : 'bg-white/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${phasesConfig.enabled ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              <Sliders className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1 pr-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Flexible Age-Based Spending
                </span>
                {phasesConfig.enabled && (
                  <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                )}
              </div>
              {!isStudio && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  Varying annual target incomes across custom age stages (e.g. Start to 55, 56–74, 75+).
                </p>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Target Annual Household Income Field */}
      <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <span>Target Annual Household Income</span>
            {!isStudio && <span className="text-[10px] text-slate-400 font-normal">(In today's £)</span>}
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-xl border border-primary-200/60 dark:border-primary-800/60">
              £{monthlyIncome.toLocaleString()}/month
            </span>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-xl">
              £{weeklyIncome.toLocaleString()}/week
            </span>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-3.5 top-2.5 text-slate-400 dark:text-slate-500 font-extrabold text-base">
            £
          </span>
          <input
            type="number"
            step="1000"
            min="0"
            value={profile.targetRetirementIncomeAnnual}
            onChange={(e) => handleTargetIncomeChange(Number(e.target.value))}
            placeholder="e.g. 35000"
            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-extrabold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {!isStudio && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary-500 shrink-0" />
            <span>
              {phasesConfig.enabled
                ? 'This baseline income target serves as the default benchmark when configuring flexible age ranges.'
                : 'This flat target will be automatically adjusted for expected inflation across all retirement years.'}
            </span>
          </p>
        )}

        {true && (
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              <span>Annual Increase</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={profile.incomeIncreaseMode || 'inflation'}
                onChange={(e) => onChange({ ...profile, incomeIncreaseMode: e.target.value as 'inflation' | 'custom' })}
                className="w-full sm:w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
              >
                <option value="inflation">Inline with Inflation</option>
                <option value="custom">Custom Fixed %</option>
              </select>
              
              {profile.incomeIncreaseMode === 'custom' && (
                <div className="flex items-center gap-2 w-full sm:w-1/2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      value={profile.customIncomeIncreasePercent ?? 0}
                      onChange={(e) => onChange({ ...profile, customIncomeIncreasePercent: Number(e.target.value) })}
                      className="w-full pl-3 pr-6 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => onChange({ ...profile, customIncomeIncreasePercent: 0 })} className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:text-primary-700 dark:hover:text-primary-300 transition-colors cursor-pointer">0%</button>
                    <button type="button" onClick={() => onChange({ ...profile, customIncomeIncreasePercent: 1 })} className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:text-primary-700 dark:hover:text-primary-300 transition-colors cursor-pointer">1%</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Flexible Age-Based Configuration Section (Shown when Flexible Age-Based is selected) */}
      {phasesConfig.enabled ? (
        <div className="space-y-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
          {/* Quick Presets Toolbar */}
          {!isStudio && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                <span>Quick Presets:</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('early55')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900 transition-all cursor-pointer border border-primary-300 dark:border-primary-800"
                >
                  ★ Start to Age 55
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('gogo')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-primary-100 dark:hover:bg-primary-950 hover:text-primary-800 dark:hover:text-primary-300 transition-all cursor-pointer"
                >
                  Go / Slow / No-Go (74 / 84 / 85+)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('twostage')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-100 dark:hover:bg-indigo-950 hover:text-indigo-800 dark:hover:text-indigo-300 transition-all cursor-pointer"
                >
                  2-Stage (Early vs Core)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('decades')}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-100 dark:hover:bg-purple-950 hover:text-purple-800 dark:hover:text-purple-300 transition-all cursor-pointer"
                >
                  Decade Step-Downs
                </button>
                <button
                  type="button"
                  onClick={handleAutoAlign}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900 transition-all cursor-pointer flex items-center gap-1 ml-auto sm:ml-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Auto-Align Ages</span>
                </button>
              </div>
            </div>
          )}

          {/* Visual Timeline Bar */}
          {!isStudio && (
            <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-primary-500" />
                  <span>Age Spending Timeline</span>
                </span>
                <span className="text-slate-400 text-[10px]">Today's £ values</span>
              </div>

              <div className="flex w-full h-8 rounded-xl overflow-hidden p-0.5 bg-slate-100 dark:bg-slate-900 gap-0.5 border border-slate-200/60 dark:border-slate-700/60">
                {sortedRanges.map((range, index) => {
                  const color = RANGE_COLORS[index % RANGE_COLORS.length];
                  const start = range.startAge;
                  const end = range.endAge || 100;
                  const span = Math.max(1, end - start + 1);

                  return (
                    <div
                      key={range.id}
                      className={`h-full ${color.barBg} flex items-center justify-between px-2 text-white font-black text-[10px] transition-all relative group rounded-md`}
                      style={{ flex: span }}
                      title={`${range.name}: Age ${start} to ${range.endAge ? range.endAge : '100+'} - £${(range.annualTargetIncome || 0).toLocaleString()}/yr`}
                    >
                      <span className="truncate max-w-[120px]">{range.name}</span>
                      <span className="bg-black/30 px-1.5 py-0.5 rounded text-[9px] shrink-0 font-extrabold">
                        £{Math.round(range.annualTargetIncome / 1000)}k/yr
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of Custom Age Ranges */}
          <div className="space-y-3">
            {sortedRanges.map((range, index) => {
              const color = RANGE_COLORS[index % RANGE_COLORS.length];
              const isOngoing = range.endAge === undefined || range.endAge === null || range.endAge <= 0;

              return (
                <div
                  key={range.id}
                  className={`bg-white dark:bg-slate-800/90 p-4 rounded-2xl border ${color.border} shadow-xs space-y-3 transition-all relative`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${color.badgeBg} ${color.badgeText}`}>
                        Stage {index + 1}
                      </span>
                      <input
                        type="text"
                        value={range.name}
                        onChange={(e) => handleUpdateRange(range.id, { name: e.target.value })}
                        placeholder="Phase Name (e.g. Start to 55)"
                        className="font-extrabold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-primary-500 focus:outline-none px-1 py-0.5 w-full max-w-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-extrabold ${color.accentText} bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-nowrap`}>
                        Age {range.startAge} – {isOngoing ? 'Ongoing (Late Retirement)' : range.endAge}
                      </span>
                      {sortedRanges.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRange(range.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer shrink-0"
                          title="Delete Age Range"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Range Inputs Grid - Clean flex / aligned grid layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
                    {/* Start Age */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center h-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <label htmlFor={`range-start-${range.id}`} className="cursor-pointer">Start Age</label>
                      </div>
                      <input
                        id={`range-start-${range.id}`}
                        type="number"
                        min={18}
                        max={100}
                        value={range.startAge ?? ''}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          const num = valStr === '' ? ('' as any) : Number(valStr);
                          handleUpdateRange(range.id, { startAge: num });
                        }}
                        onBlur={(e) => {
                          let val = Number(e.target.value);
                          if (isNaN(val) || e.target.value === '') val = 18;
                          val = Math.max(18, Math.min(120, val));
                          handleUpdateRange(range.id, { startAge: val });
                        }}
                        className={`w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none ${color.focusRing}`}
                      />
                    </div>

                    {/* End Age */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between h-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <label htmlFor={`range-end-${range.id}`} className="cursor-pointer">End Age</label>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isOngoing}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleUpdateRange(range.id, { endAge: undefined });
                              } else {
                                handleUpdateRange(range.id, { endAge: range.startAge + 5 });
                              }
                            }}
                            className="w-3.5 h-3.5 text-primary-600 rounded border-slate-300 dark:border-slate-700 focus:ring-primary-500 cursor-pointer"
                          />
                          <span>Ongoing</span>
                        </label>
                      </div>

                      <div className="relative">
                        <input
                          id={`range-end-${range.id}`}
                          type="number"
                          min={range.startAge}
                          max={100}
                          placeholder={isOngoing ? "Ongoing (100+)" : "e.g. 55"}
                          disabled={isOngoing}
                          value={isOngoing ? '' : (range.endAge ?? '')}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === '') {
                              handleUpdateRange(range.id, { endAge: undefined });
                            } else {
                              const num = Number(valStr);
                              handleUpdateRange(range.id, { endAge: num });
                            }
                          }}
                          onBlur={(e) => {
                            if (isOngoing || e.target.value === '') return;
                            let val = Number(e.target.value);
                            if (isNaN(val)) val = range.startAge;
                            if (val < range.startAge) val = range.startAge;
                            val = Math.min(120, val);
                            handleUpdateRange(range.id, { endAge: val });
                          }}
                          className={`w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${color.focusRing}`}
                        />
                      </div>
                    </div>

                    {/* Annual Target Income */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center h-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <label htmlFor={`range-target-${range.id}`} className="cursor-pointer whitespace-nowrap">Annual Target</label>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none select-none">£</span>
                        <input
                          id={`range-target-${range.id}`}
                          type="number"
                          step={1000}
                          min={0}
                          value={range.annualTargetIncome ?? ''}
                          onChange={(e) =>
                            handleUpdateRange(range.id, {
                              annualTargetIncome: e.target.value === '' ? ('' as any) : Math.max(0, Number(e.target.value)),
                            })
                          }
                          onBlur={(e) => {
                            let val = Number(e.target.value);
                            if (isNaN(val) || e.target.value === '') val = 0;
                            val = Math.max(0, val);
                            handleUpdateRange(range.id, { annualTargetIncome: val });
                          }}
                          className={`w-full h-10 pl-8 pr-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-900 dark:text-slate-100 focus:outline-none ${color.focusRing}`}
                        />
                      </div>
                    </div>

                    {/* Description / Notes */}
                    <div className="space-y-1.5">
                      <div className="flex items-center h-5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <label htmlFor={`range-desc-${range.id}`} className="cursor-pointer">Notes</label>
                      </div>
                      <input
                        id={`range-desc-${range.id}`}
                        type="text"
                        value={range.description || ''}
                        onChange={(e) => handleUpdateRange(range.id, { description: e.target.value })}
                        placeholder="e.g. Active travel & lifestyle"
                        className={`w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none ${color.focusRing}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Range Button & Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleAddRange}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Spending Age Range</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
