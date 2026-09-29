import React, { useMemo } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { calculateMaxPcls, calculatePartnerMaxPcls, getProjectedPensionAtTakeAge, getLumpSumTakeAge, getPartnerLumpSumTakeAge } from '../utils/ukTaxEngine';
import { STRATEGY_DEFINITIONS } from './QuickDrawdownStrategyBar';

import { User, Heart, TrendingUp, ShieldCheck, Zap, Sparkles, Banknote, Building2 } from 'lucide-react';

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

  const primaryStratId = profile.drawdownStrategy || 'isa_first';
  const primaryStratDef = STRATEGY_DEFINITIONS.find((s) => s.id === primaryStratId) || STRATEGY_DEFINITIONS[3];

  const partnerStratId = profile.partnerDrawdownStrategy || primaryStratId;
  const partnerStratDef = STRATEGY_DEFINITIONS.find((s) => s.id === partnerStratId) || primaryStratDef;

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
    const { maxTaxFreeCash, maxDcPcls, dbLumpSum, lsaLimit, pclsPercent } = calculateMaxPcls(projectedPensionAtTake, profile);
    return {
      takeAge,
      projectedPensionAtTake,
      taxFreeCashTaken: Math.round(maxDcPcls ?? maxTaxFreeCash),
      totalTaxFreeCash: Math.round(maxTaxFreeCash),
      dbLumpSum: Math.round(dbLumpSum ?? 0),
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
    const { maxTaxFreeCash, maxDcPcls, dbLumpSum, lsaLimit, pclsPercent } = calculatePartnerMaxPcls(projectedPensionAtTake, profile);
    return {
      takeAge,
      projectedPensionAtTake,
      taxFreeCashTaken: Math.round(maxDcPcls ?? maxTaxFreeCash),
      totalTaxFreeCash: Math.round(maxTaxFreeCash),
      dbLumpSum: Math.round(dbLumpSum ?? 0),
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
          <div className="p-2 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 rounded-xl border border-primary-200 dark:border-primary-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm tracking-tight flex items-center gap-2">
              <span>Retirement Drawdown Strategy &amp; State Pension Summary</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-500/30 px-2 py-0.5 rounded-full">
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
            <span className="text-sm font-black text-primary-600 dark:text-primary-400">
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
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              {profile.name || 'Primary'} Drawdown Strategy
            </span>
            <span className="text-[10px] font-extrabold text-primary-800 dark:text-primary-400 bg-primary-100 dark:bg-primary-950/80 px-2 py-0.5 rounded-md">
              Retire @ Age {profile.targetRetirementAge}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            {/* Active Strategy Detail Box */}
            <div className="p-2.5 bg-primary-50 dark:bg-primary-950/60 rounded-lg border border-primary-200 dark:border-primary-800/60 space-y-1 my-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-primary-800 dark:text-primary-300 uppercase tracking-wider">
                  Active Strategy: {primaryStratDef.title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-primary-200 dark:bg-primary-900 text-primary-900 dark:text-primary-100">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-primary-800/90 dark:text-primary-300/80 leading-snug">
                {primaryStratDef.description}
              </p>
            </div>
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
              <span className="font-bold text-primary-700 dark:text-primary-300 capitalize">
                {profile.drawdownStrategy === 'tax_optimizer' ? 'Tax Optimizer (Dynamic Solver)'
                  : profile.drawdownStrategy === 'isa_first' ? 'ISA First'
                  : profile.drawdownStrategy === 'pension_first' ? 'Pension First'
                  : profile.drawdownStrategy === 'cash_first' ? 'Cash/GIA First'
                  : profile.drawdownStrategy === 'pro_rata' ? 'Pro Rata'
                  : profile.drawdownStrategy === 'tax_free_bracket' ? 'Fill Tax-Free Allowance'
                  : profile.drawdownStrategy === 'basic_rate_bracket' ? 'Fill Basic Rate Band'
                  : profile.drawdownStrategy === 'higher_rate_bracket' ? 'Fill Higher Rate Band'
                  : 'Tax Optimizer (Dynamic Solver)'}
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
            {profile.crystallisationMode === 'phased_tranches' ? (
              <>
                {(() => {
                  const priTranches = (profile.crystallisationTranches || []).filter(t => t.enabled && (t.owner || 'primary') !== 'partner');
                  const priTranchesPcls = priTranches.reduce((sum, t) => {
                    const mult = t.frequency === 'recurring' ? Math.max(1, (t.endAge || t.age) - t.age + 1) : 1;
                    return sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)) * mult;
                  }, 0);
                  const priTotalTaxFreeWithDb = Math.min(priTranchesPcls + primaryPclsInfo.dbLumpSum, primaryPclsInfo.lsaLimit);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Phased Tranches PCLS:</span>
                        <span className="font-bold text-primary-700 dark:text-primary-400">
                          £{priTranchesPcls.toLocaleString()} ({priTranches.length} active tranches)
                        </span>
                      </div>
                      {primaryPclsInfo.dbLumpSum > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Total Tax-Free Cash (Tranches + DB):</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            £{priTotalTaxFreeWithDb.toLocaleString()} / £{primaryPclsInfo.lsaLimit.toLocaleString()} LSA
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">DC Pension PCLS (SIPP / Workplace):</span>
                  <span className="font-bold text-primary-700 dark:text-primary-400">
                    £{primaryPclsInfo.taxFreeCashTaken.toLocaleString()} ({primaryPclsInfo.pclsPercent}% at age {primaryPclsInfo.takeAge})
                  </span>
                </div>
                {primaryPclsInfo.dbLumpSum > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Total Tax-Free Cash (DC + DB):</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">
                      £{primaryPclsInfo.totalTaxFreeCash.toLocaleString()} / £{primaryPclsInfo.lsaLimit.toLocaleString()} LSA
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">DC Pension Access Age (NMPA):</span>
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
              {/* Active Strategy Detail Box */}
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800/60 space-y-1 my-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    Active Strategy: {partnerStratDef.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100">
                    Active
                  </span>
                </div>
                <p className="text-[10px] text-indigo-800/90 dark:text-indigo-300/80 leading-snug">
                  {partnerStratDef.description}
                </p>
              </div>
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
                    return strat === 'tax_optimizer' ? 'Tax Optimizer (Dynamic Solver)'
                      : strat === 'isa_first' ? 'ISA First'
                      : strat === 'pension_first' ? 'Pension First'
                      : strat === 'cash_first' ? 'Cash/GIA First'
                      : strat === 'pro_rata' ? 'Pro Rata'
                      : strat === 'tax_free_bracket' ? 'Fill Tax-Free Allowance'
                      : strat === 'basic_rate_bracket' ? 'Fill Basic Rate Band'
                      : strat === 'higher_rate_bracket' ? 'Fill Higher Rate Band'
                      : 'Tax Optimizer (Dynamic Solver)';
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
              {profile.partnerCrystallisationMode === 'phased_tranches' ? (
                <>
                  {(() => {
                    const partTranches = (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter(t => t.enabled && t.owner === 'partner');
                    const partTranchesPcls = partTranches.reduce((sum, t) => {
                      const mult = t.frequency === 'recurring' ? Math.max(1, (t.endAge || t.age) - t.age + 1) : 1;
                      return sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)) * mult;
                    }, 0);
                    const partTotalTaxFreeWithDb = Math.min(partTranchesPcls + partnerPclsInfo.dbLumpSum, partnerPclsInfo.lsaLimit);
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Partner Phased Tranches PCLS:</span>
                          <span className="font-bold text-indigo-700 dark:text-indigo-300">
                            £{partTranchesPcls.toLocaleString()} ({partTranches.length} active tranches)
                          </span>
                        </div>
                        {partnerPclsInfo.dbLumpSum > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">Total Tax-Free Cash (Tranches + DB):</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400">
                              £{partTotalTaxFreeWithDb.toLocaleString()} / £{partnerPclsInfo.lsaLimit.toLocaleString()} LSA
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">DC Pension PCLS (SIPP / Workplace):</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      £{partnerPclsInfo.taxFreeCashTaken.toLocaleString()} ({partnerPclsInfo.pclsPercent}% at age {partnerPclsInfo.takeAge})
                    </span>
                  </div>
                  {partnerPclsInfo.dbLumpSum > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Total Tax-Free Cash (DC + DB):</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400">
                        £{partnerPclsInfo.totalTaxFreeCash.toLocaleString()} / £{partnerPclsInfo.lsaLimit.toLocaleString()} LSA
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">DC Pension Access Age (NMPA):</span>
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
            {(() => {
              const priDef = profile.statePensionDeferralYears || 0;
              const priSpa = (profile.statePensionAge || 67) + priDef;
              const priBoost = 1 + (0.058 * priDef);
              const priBase = profile.statePensionAmountAnnual ?? 12547.60;
              const priFinal = Math.round(priBase * priBoost * 100) / 100;
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{profile.name || 'Primary'} SP Age:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Age {priSpa} {priDef > 0 && `(Deferred +${priDef}y)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{profile.name || 'Primary'} Entitlement:</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {profile.includeStatePension
                        ? (profile.qualifyingYears ?? 35) < 10
                          ? `£0/yr (${profile.qualifyingYears ?? 0}/35 Yrs - Min 10 Yrs Required)`
                          : `£${priFinal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr ${priDef > 0 ? `(+${(priDef * 5.8).toFixed(1)}%)` : `(${profile.qualifyingYears ?? 35}/35 Yrs)`}`
                        : 'Excluded'}
                    </span>
                  </div>
                </>
              );
            })()}
            {isCouple && (() => {
              const partDef = profile.partnerStatePensionDeferralYears || 0;
              const partSpa = (profile.partnerStatePensionAge || 67) + partDef;
              const partBoost = 1 + (0.058 * partDef);
              const partBase = profile.partnerStatePensionAmountAnnual ?? 12547.60;
              const partFinal = Math.round(partBase * partBoost * 100) / 100;
              return (
                <>
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1">
                    <span className="text-slate-500 dark:text-slate-400">{profile.partnerName || 'Partner'} SP Age:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Age {partSpa} {partDef > 0 && `(Deferred +${partDef}y)`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{profile.partnerName || 'Partner'} Entitlement:</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">
                      {(profile.partnerIncludeStatePension ?? true)
                        ? (profile.partnerQualifyingYears ?? 35) < 10
                          ? `£0/yr (${profile.partnerQualifyingYears ?? 0}/35 Yrs - Min 10 Yrs Required)`
                          : `£${partFinal.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr ${partDef > 0 ? `(+${(partDef * 5.8).toFixed(1)}%)` : `(${profile.partnerQualifyingYears ?? 35}/35 Yrs)`}`
                        : 'Excluded'}
                    </span>
                  </div>
                </>
              );
            })()}
            <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1">
              <span className="text-slate-500 dark:text-slate-400">Inflation Indexing:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {(profile.enableTripleLock ?? true) ? `Triple Lock (${profile.expectedInflationRate || 2.5}% CPI)` : 'Disabled (Flat Nominal £)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Defined Benefit (DB) Pensions Callout (if active) */}
      {(() => {
        const activeDbs = (profile.dbPensions || []).filter(
          (p) => p.enabled && (isCouple || (p.owner || 'primary') === 'primary')
        );
        if (activeDbs.length === 0) return null;

        return (
          <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-300 dark:border-amber-700/60 space-y-2 text-xs shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 dark:border-amber-800/60 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="font-extrabold text-amber-950 dark:text-amber-100 text-xs">
                  Defined Benefit (DB) Schemes &amp; Lump Sums
                </span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/70 dark:bg-amber-900/70 px-2 py-0.5 rounded">
                Paid at Scheme Start Age (Independent of DC Age 57)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {activeDbs.map((db, idx) => {
                const isPart = db.owner === 'partner';
                const ownerName = isPart ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');
                const targetPotName = (db.targetPot || 'cash_savings').replace(/_/g, ' ');
                return (
                  <div key={db.id || idx} className="bg-white/80 dark:bg-slate-900/70 p-3 rounded-lg border border-amber-200/80 dark:border-amber-800/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{db.name || `DB Scheme ${idx + 1}`}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                        {ownerName} • Starts Age {db.startAge || 65}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Annual Income:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        £{Math.round(db.annualIncome).toLocaleString()}/yr {db.inflationLinked ? '(CPI-linked)' : '(fixed)'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Scheme Tax-Free Lump Sum:</span>
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        {db.taxFreeLumpSum && db.taxFreeLumpSum > 0
                          ? `£${Math.round(db.taxFreeLumpSum).toLocaleString()} at Age ${db.startAge || 65} (into ${targetPotName})`
                          : 'None'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 italic pt-0.5">
              * Note: Defined Benefit scheme lump sums are paid directly by the scheme upon commencing at scheme start age ({activeDbs.map(d => `Age ${d.startAge || 65}`).join(', ')}). They are completely distinct from private DC pension 25% PCLS (drawn at age 57).
            </p>
          </div>
        );
      })()}

      {/* Gilt Ladder Strategy Callout (if active) */}
      {profile.giltLadderConfig?.enabled && (
        <div className="bg-primary-50 dark:bg-primary-950/40 p-3.5 rounded-xl border border-primary-300 dark:border-primary-700/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 rounded-lg">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-primary-950 dark:text-primary-100 block">
                Active UK Gilt Ladder ({profile.giltLadderConfig.durationYears} Years from Age {profile.giltLadderConfig.startAge})
              </span>
              <span className="text-[11px] text-primary-800/80 dark:text-primary-300/80">
                Delivers £{(profile.giltLadderConfig.targetAnnualIncome || 0).toLocaleString()}/yr guaranteed cashflow via 0% CGT arbitrage ({profile.giltLadderConfig.fundingSource?.toUpperCase()} pot).
              </span>
            </div>
          </div>
          <span className="bg-primary-200 dark:bg-primary-900 text-primary-900 dark:text-primary-100 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
            Locked
          </span>
        </div>
      )}
      </div>
    </div>
  );
};
