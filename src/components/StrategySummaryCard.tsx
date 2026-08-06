import React, { useMemo } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { calculateMaxPcls, calculatePartnerMaxPcls, getProjectedPensionAtTakeAge, getLumpSumTakeAge, getPartnerLumpSumTakeAge } from '../utils/ukTaxEngine';

import { User, Heart, TrendingUp, ShieldCheck, Zap, Sparkles } from 'lucide-react';

interface StrategySummaryCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections?: YearProjection[];
  onOpenMaximizedSpendModal?: () => void;
  onChange?: (updatedProfile: UserProfile) => void;
}

export const StrategySummaryCard: React.FC<StrategySummaryCardProps> = ({
  profile,
  pots,
  taxResult,
  projections,
  onOpenMaximizedSpendModal,
  onChange,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);

  // Helper to get projected pension pot before PCLS extraction from canonical projections
  const getPotFromProjections = (targetAge: number, isPartner: boolean = false): number | undefined => {
    if (!projections || projections.length === 0) return undefined;
    if (isPartner) {
      const partnerAgeOffset = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
      const targetPrimaryAge = targetAge - partnerAgeOffset;
      const found = projections.find((p) => p.age === targetPrimaryAge);
      if (found) {
        return found.partnerPensionPotBeforePcls ?? (found.partnerPensionPotBeforeAnnuity ?? found.partnerPensionPot);
      }
    } else {
      const found = projections.find((p) => p.age === targetAge);
      if (found) {
        return found.primaryPensionPotBeforePcls ?? (found.primaryPensionPotBeforeAnnuity ?? found.primaryPensionPot);
      }
    }
    return undefined;
  };

  // Compute Primary PCLS tax-free cash taken at lump sum access age
  const primaryPclsInfo = useMemo(() => {
    const takeAge = getLumpSumTakeAge(profile);
    let projectedPensionAtTake = getPotFromProjections(takeAge, false);
    if (projectedPensionAtTake === undefined) {
      projectedPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, takeAge, false);
    }
    const { maxTaxFreeCash, lsaLimit, pclsPercent } = calculateMaxPcls(projectedPensionAtTake, profile);
    return {
      takeAge,
      projectedPensionAtTake,
      taxFreeCashTaken: Math.round(maxTaxFreeCash),
      lsaLimit,
      pclsPercent,
    };
  }, [profile, pots, projections]);

  // Compute Partner PCLS tax-free cash taken at lump sum access age
  const partnerPclsInfo = useMemo(() => {
    if (!isCouple) return null;
    const takeAge = getPartnerLumpSumTakeAge(profile);
    let projectedPensionAtTake = getPotFromProjections(takeAge, true);
    if (projectedPensionAtTake === undefined) {
      projectedPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, takeAge, true);
    }
    const { maxTaxFreeCash, lsaLimit, pclsPercent } = calculatePartnerMaxPcls(projectedPensionAtTake, profile);
    return {
      takeAge,
      projectedPensionAtTake,
      taxFreeCashTaken: Math.round(maxTaxFreeCash),
      lsaLimit,
      pclsPercent,
    };
  }, [profile, pots, isCouple, projections]);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-slate-900 dark:text-white rounded-2xl p-4 sm:p-5 border border-indigo-200 dark:border-indigo-900/60 shadow-lg space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-200 dark:border-indigo-800/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
              <span>Retirement Drawdown Strategy &amp; State Pension Summary</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                Decumulation Overview
              </span>
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-indigo-200/80">
              Detailed decumulation rules, PCLS tax-free cash taken, product choices, and state pension parameters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase tracking-wider">Target Household Income</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              £{(profile.targetRetirementIncomeAnnual || 0).toLocaleString()}/yr
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Primary Drawdown Strategy */}
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {profile.name || 'Primary'} Drawdown Strategy
            </span>
            <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
              Retire @ Age {profile.targetRetirementAge}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Product Option:</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">
                {profile.incomeProductOption === 'flexi_drawdown' ? 'Flexi Drawdown'
                  : profile.incomeProductOption === 'annuity' ? 'Full Annuity Purchase'
                  : profile.incomeProductOption === 'hybrid' ? 'Hybrid (Drawdown + Annuity)'
                  : 'Flexi Drawdown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Drawdown Ordering:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 capitalize">
                {profile.drawdownStrategy === 'isa_first' ? 'ISA First'
                  : profile.drawdownStrategy === 'pension_first' ? 'Pension First'
                  : profile.drawdownStrategy === 'cash_first' ? 'Cash/GIA First'
                  : profile.drawdownStrategy === 'pro_rata' ? 'Pro Rata'
                  : profile.drawdownStrategy === 'tax_free_bracket' ? 'Fill Tax-Free Allowance'
                  : profile.drawdownStrategy === 'basic_rate_bracket' ? 'Fill Basic Rate Band'
                  : profile.drawdownStrategy === 'higher_rate_bracket' ? 'Fill Higher Rate Band'
                  : 'ISA First'}
              </span>
            </div>
            {profile.incomeProductOption === 'hybrid' && (profile.annuityTranches || []).filter(t => t.enabled && (!t.owner || t.owner === 'primary')).length > 0 && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                <span className="text-slate-500 dark:text-slate-400 font-semibold block">Annuity Tranches:</span>
                {(profile.annuityTranches || []).filter(t => t.enabled && (!t.owner || t.owner === 'primary')).map((t, i) => (
                  <div key={t.id} className="flex justify-between pl-2">
                    <span className="text-slate-500 dark:text-slate-400">{t.name || `Tranche ${i + 1}`} (Age {t.purchaseAge}):</span>
                    <span className="font-bold text-amber-700 dark:text-amber-300">{t.allocationPercent}% @ {t.annuityRatePercent}% rate</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">PCLS Tax-Free Cash Taken:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                £{primaryPclsInfo.taxFreeCashTaken.toLocaleString()} ({primaryPclsInfo.pclsPercent}% at age {primaryPclsInfo.takeAge})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">PCLS Access Age:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">Age {primaryPclsInfo.takeAge}</span>
            </div>
          </div>
        </div>

        {/* Partner Drawdown Strategy (if couple mode active) */}
        {isCouple && partnerPclsInfo ? (
          <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/60 pb-2">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 text-xs">
                <Heart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {profile.partnerName || 'Partner'} Drawdown Strategy
              </span>
              <span className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                Retire @ Age {profile.partnerTargetRetirementAge || profile.targetRetirementAge}
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Product Option:</span>
                <span className="font-bold text-indigo-900 dark:text-indigo-200 capitalize">
                  {(() => {
                    const opt = profile.partnerIncomeProductOption || profile.incomeProductOption;
                    return opt === 'flexi_drawdown' ? 'Flexi Drawdown'
                      : opt === 'annuity' ? 'Full Annuity Purchase'
                      : opt === 'hybrid' ? 'Hybrid (Drawdown + Annuity)'
                      : 'Flexi Drawdown';
                  })()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Drawdown Ordering:</span>
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {(() => {
                    const strat = profile.partnerDrawdownStrategy || profile.drawdownStrategy;
                    return strat === 'isa_first' ? 'ISA First'
                      : strat === 'pension_first' ? 'Pension First'
                      : strat === 'cash_first' ? 'Cash/GIA First'
                      : strat === 'pro_rata' ? 'Pro Rata'
                      : strat === 'tax_free_bracket' ? 'Fill Tax-Free Allowance'
                      : strat === 'basic_rate_bracket' ? 'Fill Basic Rate Band'
                      : strat === 'higher_rate_bracket' ? 'Fill Higher Rate Band'
                      : 'ISA First';
                  })()}
                </span>
              </div>
              {(profile.partnerIncomeProductOption || profile.incomeProductOption) === 'hybrid' && (profile.partnerAnnuityTranches || profile.annuityTranches || []).filter(t => t.enabled && (!t.owner || t.owner === 'partner')).length > 0 && (
                <div className="pt-1 border-t border-indigo-100 dark:border-indigo-700/60 space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block">Annuity Tranches:</span>
                  {(profile.partnerAnnuityTranches || profile.annuityTranches || []).filter(t => t.enabled && (!t.owner || t.owner === 'partner')).map((t, i) => (
                    <div key={t.id} className="flex justify-between pl-2">
                      <span className="text-slate-500 dark:text-slate-400">{t.name || `Tranche ${i + 1}`} (Age {t.purchaseAge}):</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">{t.allocationPercent}% @ {t.annuityRatePercent}% rate</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">PCLS Tax-Free Cash Taken:</span>
                <span className="font-bold text-indigo-700 dark:text-indigo-300">
                  £{partnerPclsInfo.taxFreeCashTaken.toLocaleString()} ({partnerPclsInfo.pclsPercent}% at age {partnerPclsInfo.takeAge})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">PCLS Access Age:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">Age {partnerPclsInfo.takeAge}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center space-y-1.5 shadow-sm">
            <User className="w-6 h-6 text-slate-400 opacity-60" />
            <span className="font-bold text-slate-800 dark:text-slate-300">Single Planning Mode</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">
              Drawdown &amp; income strategy configured exclusively for primary member.
            </p>
          </div>
        )}

        {/* State Pension Overview */}
        <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              UK State Pension Strategy
            </span>
            <span className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
              Full Rate £12,547.60
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{profile.name || 'Primary'} SP Age:</span>
              <span className="font-bold text-slate-900 dark:text-white">Age {profile.statePensionAge || 67}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{profile.name || 'Primary'} Entitlement:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {profile.includeStatePension
                  ? (profile.qualifyingYears ?? 35) < 10
                    ? `£0/yr (${profile.qualifyingYears ?? 0}/35 Yrs - Min 10 Yrs Required)`
                    : `£${(profile.statePensionAmountAnnual ?? 12547.60).toLocaleString()}/yr (${profile.qualifyingYears ?? 35}/35 Yrs)`
                  : 'Excluded'}
              </span>
            </div>
            {isCouple && (
              <>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1">
                  <span className="text-slate-500 dark:text-slate-400">{profile.partnerName || 'Partner'} SP Age:</span>
                  <span className="font-bold text-slate-900 dark:text-white">Age {profile.partnerStatePensionAge || 67}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{profile.partnerName || 'Partner'} Entitlement:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    {(profile.partnerIncludeStatePension ?? true)
                      ? (profile.partnerQualifyingYears ?? 35) < 10
                        ? `£0/yr (${profile.partnerQualifyingYears ?? 0}/35 Yrs - Min 10 Yrs Required)`
                        : `£${(profile.partnerStatePensionAmountAnnual ?? 12547.60).toLocaleString()}/yr (${profile.partnerQualifyingYears ?? 35}/35 Yrs)`
                      : 'Excluded'}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1">
              <span className="text-slate-500 dark:text-slate-400">Inflation Indexing:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {(profile.enableTripleLock ?? true) ? `Triple Lock (${profile.expectedInflationRate || 2.5}% CPI)` : 'Disabled (Flat Nominal £)'}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
