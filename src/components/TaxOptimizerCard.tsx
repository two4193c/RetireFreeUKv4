import React, { useState, useMemo } from 'react';
import { TaxCalculationResult, UserProfile, InvestmentPots } from '../types';
import { calculateUKTax, calculatePartnerUKTax } from '../utils/ukTaxEngine';
import { generateProjections } from '../utils/projectionEngine';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from '../utils/defaultData';
import {
  AlertTriangle,
  Sparkles,
  Users,
  User,
  Heart,
  TrendingUp,
  Sliders,
  Coins,
  ShieldCheck,
  PiggyBank,
} from 'lucide-react';

interface TaxOptimizerCardProps {
  taxResult: TaxCalculationResult;
  profile: UserProfile;
  pots: InvestmentPots;
  onOptimizeTaxTrap?: (additionalPensionAmount: number, target?: 'primary' | 'partner') => void;
}

export const TaxOptimizerCard: React.FC<TaxOptimizerCardProps> = ({
  taxResult: primaryTaxResult,
  profile,
  pots,
  onOptimizeTaxTrap,
}) => {
  if (!primaryTaxResult) {
    return null;
  }

  const isCouple = Boolean(profile.isCouplePlanning);
  const partnerTaxResult = isCouple ? calculatePartnerUKTax(profile, profile.partnerPots) : null;

  const [activeView, setActiveView] = useState<'combined' | 'primary' | 'partner'>('combined');
  const [showAllTaxYears, setShowAllTaxYears] = useState(false);

  // Determine current effective tax result to show for single-mode or specific view tab
  const currentView = isCouple ? activeView : 'primary';

  // Calculate combined metrics
  const primaryPensionLimit = primaryTaxResult?.pensionAnnualAllowanceLimit || 60000;
  const partnerPensionLimit = partnerTaxResult?.pensionAnnualAllowanceLimit || 60000;
  const combinedPensionAllowanceLimit = primaryPensionLimit + (isCouple ? partnerPensionLimit : 0);
  const combinedTotalTaxRelief = primaryTaxResult.totalPensionTaxRelief + (partnerTaxResult?.totalPensionTaxRelief || 0);
  const combinedPersonalAllowance = primaryTaxResult.personalAllowance + (partnerTaxResult?.personalAllowance || 0);
  const combinedPensionAllowanceUsed = primaryTaxResult.pensionAnnualAllowanceUsed + (partnerTaxResult?.pensionAnnualAllowanceUsed || 0);
  const combinedIsaAllowanceUsed = primaryTaxResult.isaAllowanceUsed + (partnerTaxResult?.isaAllowanceUsed || 0);

  // Personal Savings Allowance & Interest Tax metrics
  const primaryPsa = primaryTaxResult.personalSavingsAllowance ?? 1000;
  const primaryInterest = primaryTaxResult.savingsInterestEarned ?? 0;
  const primarySavingsTax = primaryTaxResult.savingsInterestTax ?? 0;

  const partnerPsa = partnerTaxResult?.personalSavingsAllowance ?? 1000;
  const partnerInterest = partnerTaxResult?.savingsInterestEarned ?? 0;
  const partnerSavingsTax = partnerTaxResult?.savingsInterestTax ?? 0;

  const combinedPsa = primaryPsa + (isCouple ? partnerPsa : 0);
  const combinedInterest = primaryInterest + (isCouple ? partnerInterest : 0);
  const combinedSavingsTax = primarySavingsTax + (isCouple ? partnerSavingsTax : 0);

  // Allowance percentage usages
  const primaryPensionPct = primaryPensionLimit > 0 ? Math.min(100, (primaryTaxResult.pensionAnnualAllowanceUsed / primaryPensionLimit) * 100) : 0;
  const partnerPensionPct = (partnerTaxResult && partnerPensionLimit > 0) ? Math.min(100, (partnerTaxResult.pensionAnnualAllowanceUsed / partnerPensionLimit) * 100) : 0;
  const combinedPensionPct = combinedPensionAllowanceLimit > 0 ? Math.min(100, (combinedPensionAllowanceUsed / combinedPensionAllowanceLimit) * 100) : 0;

  const primaryIsaPct = Math.min(100, (primaryTaxResult.isaAllowanceUsed / primaryTaxResult.isaAllowanceLimit) * 100);
  const partnerIsaPct = partnerTaxResult ? Math.min(100, (partnerTaxResult.isaAllowanceUsed / partnerTaxResult.isaAllowanceLimit) * 100) : 0;
  const combinedIsaPct = Math.min(100, (combinedIsaAllowanceUsed / 40000) * 100);

  const activePensionPct =
    currentView === 'combined'
      ? combinedPensionPct
      : currentView === 'partner'
      ? partnerPensionPct
      : primaryPensionPct;

  const activeIsaPct =
    currentView === 'combined'
      ? combinedIsaPct
      : currentView === 'partner'
      ? partnerIsaPct
      : primaryIsaPct;

  // Yearly Tax & Allowances Breakdown Calculation until Retirement
  const yearlyTaxBreakdown = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const isCouplePlanning = Boolean(profile.isCouplePlanning);

    const primaryAge = Math.max(18, profile.currentAge || 40);
    const primaryRetAge = Math.max(primaryAge, profile.targetRetirementAge || 60);
    const primaryYears = Math.max(0, primaryRetAge - primaryAge);

    const partnerAge = isCouplePlanning ? Math.max(18, profile.partnerCurrentAge || profile.currentAge || 38) : 0;
    const partnerRetAge = isCouplePlanning ? Math.max(partnerAge, profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60) : 0;
    const partnerYears = isCouplePlanning ? Math.max(0, partnerRetAge - partnerAge) : 0;

    const totalYears = isCouplePlanning ? Math.max(primaryYears, partnerYears, 1) : Math.max(primaryYears, 1);

    const pPots = sanitizePots(pots, DEFAULT_POTS);
    const partnerPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

    const basePrimarySalary = profile.grossAnnualSalary || 0;
    const basePartnerSalary = isCouplePlanning ? (profile.partnerGrossAnnualSalary || 0) : 0;

    const projections = generateProjections(profile, pots);

    const rows = [];

    for (let i = 0; i < totalYears; i++) {
      const yearNum = currentYear + i;
      const pAgeAtYear = primaryAge + i;
      const partAgeAtYear = isCouplePlanning ? partnerAge + i : 0;

      const pAccumulating = pAgeAtYear < primaryRetAge;
      const partAccumulating = isCouplePlanning ? partAgeAtYear < partnerRetAge : false;

      const proj = projections.find(p => p.year === yearNum);

      const pPotsThisYear = proj ? {
        ...pPots,
        cashSavingsBalance: proj.primaryCashSavingsPot ?? pPots.cashSavingsBalance,
        giaBalance: proj.primaryGiaPot ?? pPots.giaBalance,
      } : pPots;

      const partnerPotsThisYear = proj ? {
        ...partnerPots,
        cashSavingsBalance: proj.partnerCashSavingsPot ?? partnerPots.cashSavingsBalance,
        giaBalance: proj.partnerGiaPot ?? partnerPots.giaBalance,
      } : partnerPots;

      // Primary
      const pSalary = pAccumulating ? basePrimarySalary : 0;
      const partSalary = partAccumulating ? basePartnerSalary : 0;

      // Personal Allowance & Tax calculations for Primary
      const pTaxYr = calculateUKTax(profile, pPotsThisYear, false, pAgeAtYear);
      const pPersonalAllowance = pTaxYr?.personalAllowance || 12570;
      const pIsTaxTrap = pTaxYr?.is60PercentTaxTrap || false;
      const pTaxReliefGained = pAccumulating ? (pTaxYr?.totalPensionTaxRelief || 0) : 0;
      const pGrossPensionAnnual = pAccumulating ? (pTaxYr?.totalPensionContributionsAnnual || 0) : 0;
      const pIsaAnnual = pAccumulating ? (pTaxYr?.totalIsaContributionsAnnual || 0) : 0;
      const pPensionLimit = pTaxYr?.actualPensionAllowance || 60000;

      // Personal Allowance & Tax calculations for Partner
      const partTaxYr = profile.isCouplePlanning ? calculatePartnerUKTax(profile, partnerPotsThisYear, partAgeAtYear) : null;
      const partPersonalAllowance = partTaxYr?.personalAllowance || (profile.isCouplePlanning ? 12570 : 0);
      const partIsTaxTrap = partTaxYr?.is60PercentTaxTrap || false;
      const partTaxReliefGained = (profile.isCouplePlanning && partAccumulating) ? (partTaxYr?.totalPensionTaxRelief || 0) : 0;
      const partGrossPensionAnnual = (profile.isCouplePlanning && partAccumulating) ? (partTaxYr?.totalPensionContributionsAnnual || 0) : 0;
      const partIsaAnnual = (profile.isCouplePlanning && partAccumulating) ? (partTaxYr?.totalIsaContributionsAnnual || 0) : 0;
      const partPensionLimit = partTaxYr?.actualPensionAllowance || 60000;

      rows.push({
        yearNum,
        taxYear: `${yearNum}/${(yearNum + 1).toString().slice(2)}`,
        pAgeAtYear,
        partAgeAtYear,
        pAccumulating,
        partAccumulating,
        pSalary,
        partSalary,
        combinedSalary: pSalary + partSalary,
        // Primary
        pGrossPensionAnnual,
        pIsaAnnual,
        pPersonalAllowance,
        pTaxReliefGained,
        pSavingsTax: pTaxYr?.savingsInterestTax || 0,
        pIsTaxTrap,
        pPensionLimit,
        pIsaLimit: 20000,
        // Partner
        partGrossPensionAnnual,
        partIsaAnnual,
        partPersonalAllowance,
        partTaxReliefGained,
        partSavingsTax: partTaxYr?.savingsInterestTax || 0,
        partIsTaxTrap,
        partPensionLimit,
        partIsaLimit: 20000,
        // Combined
        combinedGrossPensionAnnual: pGrossPensionAnnual + partGrossPensionAnnual,
        combinedIsaAnnual: pIsaAnnual + partIsaAnnual,
        combinedPersonalAllowance: pPersonalAllowance + partPersonalAllowance,
        combinedTaxReliefGained: pTaxReliefGained + partTaxReliefGained,
        combinedSavingsTax: (pTaxYr?.savingsInterestTax || 0) + (partTaxYr?.savingsInterestTax || 0),
        combinedIsTaxTrap: pIsTaxTrap || partIsTaxTrap,
        combinedPensionLimit: pPensionLimit + partPensionLimit,
        combinedIsaLimit: 40000,
      });
    }

    return rows;
  }, [profile, pots]);

  return (
    <div className="space-y-4">
      {/* 60% TAX TRAP ALERTS (PRIMARY & PARTNER) */}
      <div className="space-y-3">
        {/* Primary 60% Tax Trap Alert */}
        {primaryTaxResult.is60PercentTaxTrap && (
          <div className="bg-indigo-600 text-white rounded-3xl p-5 shadow-lg border border-indigo-500/50 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight">
                      60% UK Tax Trap Active ({profile.name || 'Primary User'})
                    </h3>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                      Live Insight
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-2xl">
                    Adjusted net income is <strong>£{(primaryTaxResult.adjustedNetIncome || 0).toLocaleString()}</strong>.
                    Increasing pension contributions by £{Math.round(primaryTaxResult.recommendedTaxTrapPensionContribution || 0).toLocaleString()} restores the full £12,570 Personal Allowance and saves up to 60% in tax.
                  </p>
                </div>
              </div>

              {onOptimizeTaxTrap && primaryTaxResult.recommendedTaxTrapPensionContribution > 0 && (
                <button
                  onClick={() => onOptimizeTaxTrap(primaryTaxResult.recommendedTaxTrapPensionContribution, 'primary')}
                  className="shrink-0 bg-white text-indigo-600 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>Apply Primary Strategy (+£{Math.round((primaryTaxResult.recommendedTaxTrapPensionContribution || 0) / 12).toLocaleString()}/mo)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Partner 60% Tax Trap Alert */}
        {isCouple && partnerTaxResult?.is60PercentTaxTrap && (
          <div className="bg-rose-600 text-white rounded-3xl p-5 shadow-lg border border-rose-500/50 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight">
                      60% UK Tax Trap Active ({profile.partnerName || 'Partner'})
                    </h3>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                      Partner Insight
                    </span>
                  </div>
                  <p className="text-xs text-rose-100 mt-1 leading-relaxed max-w-2xl">
                    Partner adjusted net income is <strong>£{(partnerTaxResult.adjustedNetIncome || 0).toLocaleString()}</strong>.
                    Increasing partner pension contributions by £{Math.round(partnerTaxResult.recommendedTaxTrapPensionContribution || 0).toLocaleString()} restores partner Personal Allowance and saves up to 60% in tax.
                  </p>
                </div>
              </div>

              {onOptimizeTaxTrap && partnerTaxResult.recommendedTaxTrapPensionContribution > 0 && (
                <button
                  onClick={() => onOptimizeTaxTrap(partnerTaxResult.recommendedTaxTrapPensionContribution, 'partner')}
                  className="shrink-0 bg-white text-rose-600 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  <span>Apply Partner Strategy (+£{Math.round((partnerTaxResult.recommendedTaxTrapPensionContribution || 0) / 12).toLocaleString()}/mo)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Pension Exceeds Eligible Income Alert */}
        {primaryTaxResult.exceedsEligibleIncome && (
          <div className="bg-amber-600 text-white rounded-3xl p-5 shadow-lg border border-amber-500/50 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    Pension Contributions Exceed Eligible Income ({profile.name || 'Primary User'})
                  </h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                    Review Required
                  </span>
                </div>
                <p className="text-xs text-amber-100 mt-1 leading-relaxed max-w-3xl">
                  Total annual pension contributions of <strong>£{Math.round(primaryTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}</strong> exceed your eligible UK earnings of <strong>£{Math.round(primaryTaxResult.eligibleEarnings).toLocaleString()}</strong>. HMRC tax relief on personal pension contributions is capped at 100% of your relevant UK earnings (or £3,600 if higher). Please review your contributions as excess amounts will not qualify for tax relief.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Primary Pension Exceeds Annual Allowance Limit (Carry Forward Notice) */}
        {primaryTaxResult.exceedsAnnualAllowanceOnly && (
          <div className="bg-indigo-700 text-white rounded-3xl p-5 shadow-lg border border-indigo-600/50 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    Annual Allowance Limit Exceeded (£{Math.round(primaryTaxResult.pensionAnnualAllowanceLimit / 1000)}k) — Carry Forward Available ({profile.name || 'Primary User'})
                  </h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                    Allowance Notice
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-3xl">
                  Total annual pension contributions of <strong>£{Math.round(primaryTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}</strong> exceed the annual allowance limit of <strong>£{Math.round(primaryTaxResult.pensionAnnualAllowanceLimit).toLocaleString()}</strong>, but are within your eligible UK earnings of <strong>£{Math.round(primaryTaxResult.eligibleEarnings).toLocaleString()}</strong>. You can utilize Carry Forward of unused pension allowances from up to 3 previous tax years (2022/23, 2023/24, 2024/25) to avoid an Annual Allowance tax charge, provided you were a member of a registered pension scheme in those years.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Primary Pension Annual Allowance Tapering Alert (£200k+ Threshold Income / £260k+ Adjusted Income) */}
        {primaryTaxResult?.isTaperedAnnualAllowance && (
          <div className="bg-amber-900 text-white rounded-3xl p-5 shadow-lg border border-amber-700/80 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-800/80 flex items-center justify-center shrink-0 border border-amber-600">
                <Sliders className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight text-amber-100">
                    Pension Annual Allowance Tapered to £{primaryTaxResult.pensionAnnualAllowanceLimit.toLocaleString()} ({profile.name || 'Primary User'})
                  </h3>
                  <span className="bg-amber-800 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-amber-600">
                    HMRC Taper Active
                  </span>
                </div>
                <p className="text-xs text-amber-200 mt-1 leading-relaxed max-w-3xl">
                  Your <strong>Threshold Income</strong> is <strong>£{primaryTaxResult.thresholdIncome.toLocaleString()}</strong> (&gt; £200,000 threshold) and <strong>Adjusted Income</strong> is <strong>£{primaryTaxResult.adjustedIncome.toLocaleString()}</strong> (&gt; £260,000 threshold).
                  Under HMRC rules, your £60,000 Pension Annual Allowance is reduced by £1 for every £2 of Adjusted Income over £260,000 (reduced by £{primaryTaxResult.taperedReduction.toLocaleString()}).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Partner Pension Exceeds Eligible Income Alert */}
        {isCouple && partnerTaxResult?.exceedsEligibleIncome && (
          <div className="bg-amber-600 text-white rounded-3xl p-5 shadow-lg border border-amber-500/50 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    Partner Contributions Exceed Eligible Income ({profile.partnerName || 'Partner'})
                  </h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                    Review Required
                  </span>
                </div>
                <p className="text-xs text-amber-100 mt-1 leading-relaxed max-w-3xl">
                  Partner total annual pension contributions of <strong>£{Math.round(partnerTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}</strong> exceed partner eligible UK earnings of <strong>£{Math.round(partnerTaxResult.eligibleEarnings).toLocaleString()}</strong>. HMRC tax relief on personal pension contributions is capped at 100% of relevant UK earnings (or £3,600 if higher). Please review partner contributions as excess amounts will not qualify for tax relief.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Partner Pension Exceeds Annual Allowance Limit (Carry Forward Notice) */}
        {isCouple && partnerTaxResult?.exceedsAnnualAllowanceOnly && (
          <div className="bg-indigo-700 text-white rounded-3xl p-5 shadow-lg border border-indigo-600/50 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base tracking-tight">
                    Partner Annual Allowance Limit Exceeded (£{Math.round(partnerTaxResult.pensionAnnualAllowanceLimit / 1000)}k) — Carry Forward Available ({profile.partnerName || 'Partner'})
                  </h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                    Allowance Notice
                  </span>
                </div>
                <p className="text-xs text-indigo-100 mt-1 leading-relaxed max-w-3xl">
                  Partner total annual pension contributions of <strong>£{Math.round(partnerTaxResult.pensionAnnualAllowanceUsed).toLocaleString()}</strong> exceed the annual allowance limit of <strong>£{Math.round(partnerTaxResult.pensionAnnualAllowanceLimit).toLocaleString()}</strong>, but are within partner eligible UK earnings of <strong>£{Math.round(partnerTaxResult.eligibleEarnings).toLocaleString()}</strong>. Partner can utilize Carry Forward of unused pension allowances from up to 3 previous tax years (2022/23, 2023/24, 2024/25) to avoid an Annual Allowance tax charge, provided partner was a member of a registered pension scheme in those years.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VIEW SWITCHER TABS (COUPLE PLANNING MODE) */}
      {isCouple && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 pl-2">
            <Users className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
            <div>
              <span className="text-xs font-black tracking-tight block">Tax & Allowance Perspective</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Switch views to inspect joint household totals or individual partner allowances</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700/80 w-full sm:w-auto justify-stretch sm:justify-start">
            <button
              onClick={() => setActiveView('combined')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeView === 'combined'
                  ? 'bg-primary-500 text-slate-950 shadow-sm font-extrabold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Household</span>
            </button>

            <button
              onClick={() => setActiveView('primary')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeView === 'primary'
                  ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
            </button>

            <button
              onClick={() => setActiveView('partner')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeView === 'partner'
                  ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>{profile.partnerName || 'Partner'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAX RELIEF DASHBOARD & ALLOWANCES BENTO GRID (5 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">

        {/* CARD 1: TOTAL TAX RELIEF GAINED */}
        <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tax Relief Gained</span>
              <span className="bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-400 font-bold text-[10px] px-2 py-0.5 rounded-full border border-primary-300 dark:border-primary-500/30">
                {currentView === 'combined' && partnerTaxResult
                  ? `${primaryTaxResult.marginalTaxRate}% / ${partnerTaxResult.marginalTaxRate}%`
                  : currentView === 'partner' && partnerTaxResult
                  ? `${partnerTaxResult.marginalTaxRate}% Tax Rate`
                  : `${primaryTaxResult.marginalTaxRate}% Tax Rate`}
              </span>
            </div>
            <div className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
              £{
                currentView === 'combined'
                  ? (combinedTotalTaxRelief || 0).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.totalPensionTaxRelief || 0).toLocaleString()
                  : (primaryTaxResult?.totalPensionTaxRelief || 0).toLocaleString()
              }
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              HMRC tax relief + NI saved on contributions
            </p>
          </div>

          <div className="space-y-1.5 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2.5">
            {currentView === 'combined' && partnerTaxResult ? (
              <>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    <span>{profile.name || 'Primary'}:</span>
                  </span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">£{(primaryTaxResult?.totalPensionTaxRelief || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-600/20 dark:fill-rose-400/20" />
                    <span>{profile.partnerName || 'Partner'}:</span>
                  </span>
                  <span className="font-bold text-rose-700 dark:text-rose-300">£{(partnerTaxResult?.totalPensionTaxRelief || 0).toLocaleString()}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Basic Relief + NI:</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    £{
                      (((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.pensionBasicRateTaxRelief || 0) +
                       ((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.salarySacrificeNicSavedEmployee || 0)).toLocaleString()
                    }
                  </span>
                </div>
                {((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.pensionHigherRateTaxReliefClaimable || 0) > 0 && (
                  <div className="flex justify-between text-amber-700 dark:text-amber-300 font-semibold">
                    <span>Higher Rate Relief:</span>
                    <span>+£{((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.pensionHigherRateTaxReliefClaimable || 0).toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CARD 2: PERSONAL ALLOWANCE */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-100">
              <span>Personal Allowance</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                {currentView === 'combined' ? '£25,140 Dual Limit' : '£12,570 Limit'}
              </span>
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              £{
                currentView === 'combined'
                  ? (combinedPersonalAllowance || 0).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.personalAllowance || 0).toLocaleString()
                  : (primaryTaxResult?.personalAllowance || 0).toLocaleString()
              }
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {currentView === 'combined' && partnerTaxResult ? (
                <>Combined annual tax-free income allowance across both partners</>
              ) : ((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.adjustedNetIncome || 0) > 100000 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Tapered by £{Math.round(12570 - ((currentView === 'partner' && partnerTaxResult ? partnerTaxResult : primaryTaxResult)?.personalAllowance || 12570)).toLocaleString()} (£100k+ income)
                </span>
              ) : (
                <>Full 100% tax-free income allowance active</>
              )}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
            {currentView === 'combined' && partnerTaxResult ? (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{profile.name || 'Primary'}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    £{(primaryTaxResult?.personalAllowance || 0).toLocaleString()} {(primaryTaxResult?.adjustedNetIncome || 0) > 100000 && '(Tapered)'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>{profile.partnerName || 'Partner'}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    £{(partnerTaxResult?.personalAllowance || 0).toLocaleString()} {(partnerTaxResult?.adjustedNetIncome || 0) > 100000 && '(Tapered)'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-500 dark:text-slate-400 font-semibold text-[10px]">
                <span>Tax Year 2024/25</span>
                <span>Income Tax Exemption</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: PENSION ANNUAL ALLOWANCE */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-100">
              <span>Pension Allowance</span>
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-2 py-0.5 rounded-full">
                {currentView === 'combined'
                  ? `Actual Cap £${(( (primaryTaxResult?.actualPensionAllowance || 0) + (partnerTaxResult?.actualPensionAllowance || 0) ) / 1000).toFixed(1).replace('.0', '')}k | Limit £${((combinedPensionAllowanceLimit) / 1000).toFixed(1).replace('.0', '')}k`
                  : `Actual Cap £${(( (currentView === 'partner' ? partnerTaxResult?.actualPensionAllowance : primaryTaxResult?.actualPensionAllowance) || 0 ) / 1000).toFixed(1).replace('.0', '')}k | Limit £${((currentView === 'partner' ? partnerPensionLimit : primaryPensionLimit) / 1000).toFixed(1).replace('.0', '')}k`}
              </span>
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              £{
                currentView === 'combined'
                  ? (combinedPensionAllowanceUsed || 0).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.pensionAnnualAllowanceUsed || 0).toLocaleString()
                  : (primaryTaxResult?.pensionAnnualAllowanceUsed || 0).toLocaleString()
              }
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              £{
                currentView === 'combined'
                  ? Math.max(0, (primaryTaxResult?.actualPensionAllowanceRemaining || 0) + (partnerTaxResult?.actualPensionAllowanceRemaining || 0)).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.actualPensionAllowanceRemaining || 0).toLocaleString()
                  : (primaryTaxResult?.actualPensionAllowanceRemaining || 0).toLocaleString()
              } remaining of Actual Cap
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activePensionPct > 90 ? 'bg-amber-500' : 'bg-primary-600 dark:bg-primary-500'
                }`}
                style={{ width: `${activePensionPct}%` }}
              />
            </div>
            {currentView === 'combined' && partnerTaxResult ? (
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>P1 Actual Cap: £{(primaryTaxResult?.actualPensionAllowance || 0).toLocaleString()} (Limit £{(primaryPensionLimit/1000).toFixed(0)}k)</span>
                <span>P2 Actual Cap: £{(partnerTaxResult?.actualPensionAllowance || 0).toLocaleString()} (Limit £{(partnerPensionLimit/1000).toFixed(0)}k)</span>
              </div>
            ) : (
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Actual Cap (Earnings): £{((currentView === 'partner' ? partnerTaxResult?.actualPensionAllowance : primaryTaxResult?.actualPensionAllowance) || 0).toLocaleString()}</span>
                <span>Statutory Limit: £{((currentView === 'partner' ? partnerPensionLimit : primaryPensionLimit) || 0).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: ISA ANNUAL ALLOWANCE (£20k / £40k) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-100">
              <span>ISA Allowance</span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                {currentView === 'combined' ? '£40k Dual Limit' : '£20k Limit'}
              </span>
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              £{
                currentView === 'combined'
                  ? (combinedIsaAllowanceUsed || 0).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.isaAllowanceUsed || 0).toLocaleString()
                  : (primaryTaxResult?.isaAllowanceUsed || 0).toLocaleString()
              }
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              £{
                currentView === 'combined'
                  ? Math.max(0, 40000 - combinedIsaAllowanceUsed).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerTaxResult.isaAllowanceRemaining || 0).toLocaleString()
                  : (primaryTaxResult?.isaAllowanceRemaining || 0).toLocaleString()
              } remaining
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={activeIsaPct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeIsaPct > 90 ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${activeIsaPct}%` }}
              />
            </div>
            {currentView === 'combined' && partnerTaxResult ? (
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                <span>P1: £{(primaryTaxResult?.isaAllowanceUsed || 0).toLocaleString()}</span>
                <span>P2: £{(partnerTaxResult?.isaAllowanceUsed || 0).toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>{(activeIsaPct || 0).toFixed(0)}% Used</span>
                <span>Resets April 5th</span>
              </div>
            )}
          </div>
        </div>

        {/* CARD 5: PERSONAL SAVINGS ALLOWANCE & SAVINGS INTEREST TAX */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-100">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Savings Interest Tax</span>
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                {currentView === 'combined'
                  ? `£${combinedPsa.toLocaleString()} PSA`
                  : currentView === 'partner' && partnerTaxResult
                  ? `£${partnerPsa.toLocaleString()} PSA`
                  : `£${primaryPsa.toLocaleString()} PSA`}
              </span>
            </div>
            <div className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              £{
                currentView === 'combined'
                  ? (combinedSavingsTax || 0).toLocaleString()
                  : currentView === 'partner' && partnerTaxResult
                  ? (partnerSavingsTax || 0).toLocaleString()
                  : (primarySavingsTax || 0).toLocaleString()
              }
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">/yr tax</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Gross Interest: £{(currentView === 'combined' ? combinedInterest : currentView === 'partner' && partnerTaxResult ? partnerInterest : primaryInterest).toLocaleString()}/yr
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span>Personal Allowance:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                £{(currentView === 'combined' ? combinedPsa : currentView === 'partner' && partnerTaxResult ? partnerPsa : primaryPsa).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[10px]">
              <span>Tax Rate on Excess:</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400">
                {currentView === 'combined'
                  ? `${Math.round(primaryTaxResult.savingsInterestTaxRate * 100)}% / ${Math.round((partnerTaxResult?.savingsInterestTaxRate || 0.2) * 100)}%`
                  : `${Math.round(((currentView === 'partner' && partnerTaxResult ? partnerTaxResult.savingsInterestTaxRate : primaryTaxResult.savingsInterestTaxRate) || 0.2) * 100)}%`}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Year-by-Year Tax & Allowances Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xl transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>Year-by-Year Tax Relief & Allowances Breakdown</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Accumulation phase breakdown of tax relief gained, pension allowance used (£60k/£120k), ISA limit (£20k/£40k), and personal allowance.
            </p>
          </div>

          {yearlyTaxBreakdown.length > 7 && (
            <button
              onClick={() => setShowAllTaxYears(!showAllTaxYears)}
              className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              {showAllTaxYears ? 'Show First 7 Years' : `Show All ${yearlyTaxBreakdown.length} Accumulation Years`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Tax Year</th>
                <th className="py-2.5 px-3">Age(s)</th>
                <th className="py-2.5 px-3">Tax Relief Gained</th>
                <th className="py-2.5 px-3">Savings Tax</th>
                <th className="py-2.5 px-3">Pension Allowance</th>
                <th className="py-2.5 px-3">ISA Allowance</th>
                <th className="py-2.5 px-3">Personal Allowance</th>
                <th className="py-2.5 px-3 text-right">Tax Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-800 dark:text-slate-200">
              {(showAllTaxYears ? yearlyTaxBreakdown : yearlyTaxBreakdown.slice(0, 7)).map((row) => {
                const taxRelief =
                  currentView === 'combined'
                    ? row.combinedTaxReliefGained
                    : currentView === 'partner'
                    ? row.partTaxReliefGained
                    : row.pTaxReliefGained;

                const savingsTax =
                  currentView === 'combined'
                    ? row.combinedSavingsTax
                    : currentView === 'partner'
                    ? row.partSavingsTax
                    : row.pSavingsTax;

                const pensionUsed =
                  currentView === 'combined'
                    ? row.combinedGrossPensionAnnual
                    : currentView === 'partner'
                    ? row.partGrossPensionAnnual
                    : row.pGrossPensionAnnual;

                const pensionLimit =
                  currentView === 'combined'
                    ? row.combinedPensionLimit
                    : currentView === 'partner'
                    ? row.partPensionLimit
                    : row.pPensionLimit;

                const isaUsed =
                  currentView === 'combined'
                    ? row.combinedIsaAnnual
                    : currentView === 'partner'
                    ? row.partIsaAnnual
                    : row.pIsaAnnual;

                const isaLimit =
                  currentView === 'combined'
                    ? row.combinedIsaLimit
                    : currentView === 'partner'
                    ? row.partIsaLimit
                    : row.pIsaLimit;

                const personalAllowance =
                  currentView === 'combined'
                    ? row.combinedPersonalAllowance
                    : currentView === 'partner'
                    ? row.partPersonalAllowance
                    : row.pPersonalAllowance;

                const isTaxTrap =
                  currentView === 'combined'
                    ? row.combinedIsTaxTrap
                    : currentView === 'partner'
                    ? row.partIsTaxTrap
                    : row.pIsTaxTrap;

                const isRetiredThisYear =
                  currentView === 'combined'
                    ? !row.pAccumulating && !row.partAccumulating
                    : currentView === 'partner'
                    ? !row.partAccumulating
                    : !row.pAccumulating;

                return (
                  <tr key={row.yearNum} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {row.taxYear}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {isCouple ? (
                        <span>
                          P: <strong className="text-slate-900 dark:text-white">{row.pAgeAtYear}</strong> | Part: <strong className="text-slate-900 dark:text-white">{row.partAgeAtYear}</strong>
                        </span>
                      ) : (
                        <span>Age {row.pAgeAtYear}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-extrabold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                      +£{Math.round(taxRelief).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {savingsTax > 0 ? (
                        <span className="font-bold text-amber-400">
                          -£{Math.round(savingsTax).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-500">£0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100">
                          £{Math.round(pensionUsed).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          / {pensionLimit >= 10000 && pensionLimit % 1000 === 0 ? `£${(pensionLimit / 1000).toFixed(0)}k` : `£${Math.round(pensionLimit).toLocaleString()}`} ({pensionLimit > 0 ? Math.min(100, Math.round((pensionUsed / pensionLimit) * 100)) : 0}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-300">
                          £{Math.round(isaUsed).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          / £{(isaLimit / 1000).toFixed(0)}k ({Math.min(100, Math.round((isaUsed / isaLimit) * 100))}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      £{Math.round(personalAllowance).toLocaleString()}
                      {personalAllowance < (currentView === 'combined' ? 25140 : 12570) && (
                        <span className="text-amber-400 text-[10px] ml-1 font-bold">(Tapered)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {isRetiredThisYear ? (
                        <span className="text-slate-500 font-semibold">Retired</span>
                      ) : isTaxTrap ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-[10px] px-2 py-0.5 rounded-md">
                          60% Tax Trap Active
                        </span>
                      ) : (
                        <span className="bg-primary-500/20 text-primary-300 border border-primary-500/30 font-bold text-[10px] px-2 py-0.5 rounded-md">
                          Tax Efficient
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isCouple && (
          <div className="flex justify-end mt-4">
            <div className="flex items-center gap-1.5 bg-slate-200 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-300 dark:border-slate-700/80 w-full sm:w-auto justify-stretch sm:justify-start">
              <button
                onClick={() => setActiveView('combined')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeView === 'combined'
                    ? 'bg-primary-500 text-slate-950 shadow-sm font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Household</span>
              </button>

              <button
                onClick={() => setActiveView('primary')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeView === 'primary'
                    ? 'bg-indigo-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{profile.name || 'Primary'}</span>
              </button>

              <button
                onClick={() => setActiveView('partner')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeView === 'partner'
                    ? 'bg-rose-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>{profile.partnerName || 'Partner'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
