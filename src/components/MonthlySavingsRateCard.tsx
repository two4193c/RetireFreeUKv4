import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, InvestmentPots } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from '../utils/defaultData';
import { isCurrentTaxYearContribution, calculateUKTax, calculatePartnerUKTax } from '../utils/ukTaxEngine';
import { PiggyBank, TrendingUp, Percent, Target, Sparkles, Building2, Wallet, ArrowUpRight, CheckCircle2, AlertCircle, Info, Users, User, Heart } from 'lucide-react';

interface MonthlySavingsRateCardProps {
  profile: UserProfile;
  pots?: InvestmentPots;
}

export const MonthlySavingsRateCard: React.FC<MonthlySavingsRateCardProps> = ({ profile, pots }) => {
  const [activeView, setActiveView] = useState<'combined' | 'primary' | 'partner'>('combined');

  const isCouple = Boolean(profile.isCouplePlanning);

  const p = sanitizePots(pots, DEFAULT_POTS);
  const partnerPots = sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS);

  const currentViewKey = !isCouple && activeView === 'partner' ? 'primary' : activeView;

  const {
    activeDisplay,
    halfYourAgeTarget,
    recommendedBenchmark,
    combinedSalary,
    primarySalary,
    partnerSalary,
    combinedMonthlySavings,
    combinedSavingsRate,
    totalMonthlySavings,
    totalSavingsRate,
    partnerTotalMonthlySavings,
    partnerTotalSavingsRate,
  } = useMemo(() => {
    // 1. One-off Gross Contributions for Current Tax Year (Primary & Partner)
    const primaryOneOffs = (profile.oneOffContributions || []).filter(
      (c) => c.enabled && (c.owner || 'primary') === 'primary' && c.frequency !== 'regular_monthly' && isCurrentTaxYearContribution(c)
    );

    let primaryOneOffWorkplaceGross = 0;
    let primaryOneOffSippGross = 0;
    let primaryOneOffIsaGross = 0;
    let primaryOneOffGiaCashGross = 0;

    primaryOneOffs.forEach((c) => {
      const amt = c.grossAmount || c.amount || 0;
      if (amt <= 0) return;
      switch (c.targetPot) {
        case 'workplace_pension':
          primaryOneOffWorkplaceGross += amt;
          break;
        case 'sipp':
          primaryOneOffSippGross += amt;
          break;
        case 'stocks_and_shares_isa':
        case 'cash_isa':
        case 'lisa':
          primaryOneOffIsaGross += amt;
          break;
        case 'gia':
        case 'cash_savings':
          primaryOneOffGiaCashGross += amt;
          break;
      }
    });

    const partnerOneOffs = isCouple
      ? (profile.oneOffContributions || []).filter(
          (c) => c.enabled && c.owner === 'partner' && c.frequency !== 'regular_monthly' && isCurrentTaxYearContribution(c)
        )
      : [];

    let partnerOneOffWorkplaceGross = 0;
    let partnerOneOffSippGross = 0;
    let partnerOneOffIsaGross = 0;
    let partnerOneOffGiaCashGross = 0;

    partnerOneOffs.forEach((c) => {
      const amt = c.grossAmount || c.amount || 0;
      if (amt <= 0) return;
      switch (c.targetPot) {
        case 'workplace_pension':
          partnerOneOffWorkplaceGross += amt;
          break;
        case 'sipp':
          partnerOneOffSippGross += amt;
          break;
        case 'stocks_and_shares_isa':
        case 'cash_isa':
        case 'lisa':
          partnerOneOffIsaGross += amt;
          break;
        case 'gia':
        case 'cash_savings':
          partnerOneOffGiaCashGross += amt;
          break;
      }
    });

    // Primary Monthly Calculations
    const grossSalary = profile.grossAnnualSalary || 0;
    const monthlyGrossSalary = grossSalary / 12;

    let employeePensionMonthly = 0;
    let employerPensionMonthly = 0;
    let sippMonthly = p.sippMonthlyContribution || 0;
    let totalIsaMonthly = (p.stocksAndSharesIsaMonthlyContribution || 0) + (p.cashIsaMonthlyContribution || 0) + (p.lisaMonthlyContribution || 0);
    let totalGiaCashMonthly = (p.giaMonthlyContribution || 0) + (p.cashSavingsMonthlyContribution || 0);

    const hasPrimaryWorkplaceInOneOff = (profile.oneOffContributions || []).some(
      (c) => c.enabled && (c.owner || 'primary') === 'primary' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
    );

    if (!hasPrimaryWorkplaceInOneOff) {
      if (p.workplacePensionMonthlyEmployeeType === 'percent') {
        employeePensionMonthly = (grossSalary * (p.workplacePensionMonthlyEmployee / 100)) / 12;
      } else {
        employeePensionMonthly = p.workplacePensionMonthlyEmployee;
      }
      const employerMatchPct = p.employerMatchPercentage || 0;
      employerPensionMonthly = (grossSalary * (employerMatchPct / 100)) / 12;
    }

    // Process primary regular monthly items
    (profile.oneOffContributions || [])
      .filter((c) => c.enabled && (c.owner || 'primary') === 'primary' && c.frequency === 'regular_monthly')
      .forEach((c) => {
        if (c.targetPot === 'workplace_pension') {
          if (c.workplaceContributionType === 'fixed') {
            employeePensionMonthly += c.employeeMonthlyAmount ?? c.grossAmount ?? 0;
            employerPensionMonthly += c.employerMonthlyAmount ?? 0;
          } else {
            employeePensionMonthly += (grossSalary * ((c.employeePercent ?? 5) / 100)) / 12;
            employerPensionMonthly += (grossSalary * ((c.employerPercent ?? 3) / 100)) / 12;
          }
        } else if (c.targetPot === 'sipp') {
          sippMonthly += c.grossAmount || 0;
        } else if (c.targetPot === 'stocks_and_shares_isa' || c.targetPot === 'cash_isa' || c.targetPot === 'lisa') {
          totalIsaMonthly += c.grossAmount || 0;
        } else if (c.targetPot === 'gia' || c.targetPot === 'cash_savings') {
          totalGiaCashMonthly += c.grossAmount || 0;
        }
      });

    employeePensionMonthly += primaryOneOffWorkplaceGross / 12;
    sippMonthly += primaryOneOffSippGross / 12;
    totalIsaMonthly += primaryOneOffIsaGross / 12;
    totalGiaCashMonthly += primaryOneOffGiaCashGross / 12;

    const totalMonthlySavings = employeePensionMonthly + employerPensionMonthly + sippMonthly + totalIsaMonthly + totalGiaCashMonthly;
    const personalMonthlySavings = employeePensionMonthly + sippMonthly + totalIsaMonthly + totalGiaCashMonthly;
    const totalAnnualSavings = totalMonthlySavings * 12;

    const totalSavingsRate = monthlyGrossSalary > 0 ? (totalMonthlySavings / monthlyGrossSalary) * 100 : 0;
    const employeeSavingsRate = monthlyGrossSalary > 0 ? (employeePensionMonthly / monthlyGrossSalary) * 100 : 0;
    const employerSavingsRate = monthlyGrossSalary > 0 ? (employerPensionMonthly / monthlyGrossSalary) * 100 : 0;

    // Partner Monthly Calculations
    const partnerSalary = isCouple ? (profile.partnerGrossAnnualSalary || 0) : 0;
    const partnerMonthlyGrossSalary = partnerSalary / 12;

    let partnerEmployeePensionMonthly = 0;
    let partnerEmployerPensionMonthly = 0;
    let partnerSippMonthly = partnerPots.sippMonthlyContribution || 0;
    let partnerTotalIsaMonthly = (partnerPots.stocksAndSharesIsaMonthlyContribution || 0) + (partnerPots.cashIsaMonthlyContribution || 0) + (partnerPots.lisaMonthlyContribution || 0);
    let partnerTotalGiaCashMonthly = (partnerPots.giaMonthlyContribution || 0) + (partnerPots.cashSavingsMonthlyContribution || 0);

    const hasPartnerWorkplaceInOneOff = (profile.oneOffContributions || []).some(
      (c) => c.enabled && c.owner === 'partner' && c.targetPot === 'workplace_pension' && c.frequency === 'regular_monthly'
    );

    if (isCouple && !hasPartnerWorkplaceInOneOff) {
      if (partnerPots.workplacePensionMonthlyEmployeeType === 'percent') {
        partnerEmployeePensionMonthly = (partnerSalary * (partnerPots.workplacePensionMonthlyEmployee / 100)) / 12;
      } else {
        partnerEmployeePensionMonthly = partnerPots.workplacePensionMonthlyEmployee;
      }
      const partnerEmployerMatchPct = partnerPots.employerMatchPercentage || 0;
      partnerEmployerPensionMonthly = (partnerSalary * (partnerEmployerMatchPct / 100)) / 12;
    }

    // Process partner regular monthly items
    if (isCouple) {
      (profile.oneOffContributions || [])
        .filter((c) => c.enabled && c.owner === 'partner' && c.frequency === 'regular_monthly')
        .forEach((c) => {
          if (c.targetPot === 'workplace_pension') {
            if (c.workplaceContributionType === 'fixed') {
              partnerEmployeePensionMonthly += c.employeeMonthlyAmount ?? c.grossAmount ?? 0;
              partnerEmployerPensionMonthly += c.employerMonthlyAmount ?? 0;
            } else {
              partnerEmployeePensionMonthly += (partnerSalary * ((c.employeePercent ?? 5) / 100)) / 12;
              partnerEmployerPensionMonthly += (partnerSalary * ((c.employerPercent ?? 3) / 100)) / 12;
            }
          } else if (c.targetPot === 'sipp') {
            partnerSippMonthly += c.grossAmount || 0;
          } else if (c.targetPot === 'stocks_and_shares_isa' || c.targetPot === 'cash_isa' || c.targetPot === 'lisa') {
            partnerTotalIsaMonthly += c.grossAmount || 0;
          } else if (c.targetPot === 'gia' || c.targetPot === 'cash_savings') {
            partnerTotalGiaCashMonthly += c.grossAmount || 0;
          }
        });

      partnerEmployeePensionMonthly += partnerOneOffWorkplaceGross / 12;
      partnerSippMonthly += partnerOneOffSippGross / 12;
      partnerTotalIsaMonthly += partnerOneOffIsaGross / 12;
      partnerTotalGiaCashMonthly += partnerOneOffGiaCashGross / 12;
    }

    const partnerTotalMonthlySavings =
      partnerEmployeePensionMonthly + partnerEmployerPensionMonthly + partnerSippMonthly + partnerTotalIsaMonthly + partnerTotalGiaCashMonthly;
    const partnerPersonalMonthlySavings = partnerEmployeePensionMonthly + partnerSippMonthly + partnerTotalIsaMonthly + partnerTotalGiaCashMonthly;
    const partnerTotalAnnualSavings = partnerTotalMonthlySavings * 12;

    const partnerTotalSavingsRate = partnerMonthlyGrossSalary > 0 ? (partnerTotalMonthlySavings / partnerMonthlyGrossSalary) * 100 : 0;
    const partnerEmployerSavingsRate = partnerMonthlyGrossSalary > 0 ? (partnerEmployerPensionMonthly / partnerMonthlyGrossSalary) * 100 : 0;

    // Combined Household Calculations
    const combinedSalary = grossSalary + partnerSalary;
    const combinedMonthlySavings = totalMonthlySavings + partnerTotalMonthlySavings;
    const combinedPersonalMonthly = personalMonthlySavings + partnerPersonalMonthlySavings;
    const combinedEmployerMonthly = employerPensionMonthly + partnerEmployerPensionMonthly;
    const combinedAnnualSavings = combinedMonthlySavings * 12;
    const combinedSavingsRate = combinedSalary > 0 ? ((combinedMonthlySavings * 12) / combinedSalary) * 100 : 0;

    // Active View Data Provider
    const viewData = {
      grossAnnualSalary:
        currentViewKey === 'combined'
          ? combinedSalary
          : currentViewKey === 'partner'
          ? partnerSalary
          : grossSalary,
      monthlyGrossSalary:
        currentViewKey === 'combined'
          ? combinedSalary / 12
          : currentViewKey === 'partner'
          ? partnerMonthlyGrossSalary
          : monthlyGrossSalary,
      totalMonthlySavings:
        currentViewKey === 'combined'
          ? combinedMonthlySavings
          : currentViewKey === 'partner'
          ? partnerTotalMonthlySavings
          : totalMonthlySavings,
      totalAnnualSavings:
        currentViewKey === 'combined'
          ? combinedAnnualSavings
          : currentViewKey === 'partner'
          ? partnerTotalAnnualSavings
          : totalAnnualSavings,
      personalMonthlySavings:
        currentViewKey === 'combined'
          ? combinedPersonalMonthly
          : currentViewKey === 'partner'
          ? partnerPersonalMonthlySavings
          : personalMonthlySavings,
      employerPensionMonthly:
        currentViewKey === 'combined'
          ? combinedEmployerMonthly
          : currentViewKey === 'partner'
          ? partnerEmployerPensionMonthly
          : employerPensionMonthly,
      savingsRate:
        currentViewKey === 'combined'
          ? combinedSavingsRate
          : currentViewKey === 'partner'
          ? partnerTotalSavingsRate
          : totalSavingsRate,
      employeePensionPct:
        currentViewKey === 'combined'
          ? combinedSalary > 0
            ? (((employeePensionMonthly + partnerEmployeePensionMonthly) * 12) / combinedSalary) * 100
            : 0
          : currentViewKey === 'partner'
          ? partnerSalary > 0
            ? ((partnerEmployeePensionMonthly * 12) / partnerSalary) * 100
            : 0
          : grossSalary > 0
          ? ((employeePensionMonthly * 12) / grossSalary) * 100
          : 0,
      employerPensionPct:
        currentViewKey === 'combined'
          ? combinedSalary > 0
            ? ((combinedEmployerMonthly * 12) / combinedSalary) * 100
            : 0
          : currentViewKey === 'partner'
          ? partnerEmployerSavingsRate
          : employerSavingsRate,
      sippPct:
        currentViewKey === 'combined'
          ? combinedSalary > 0
            ? (((sippMonthly + partnerSippMonthly) * 12) / combinedSalary) * 100
            : 0
          : currentViewKey === 'partner'
          ? partnerSalary > 0
            ? ((partnerSippMonthly * 12) / partnerSalary) * 100
            : 0
          : grossSalary > 0
          ? ((sippMonthly * 12) / grossSalary) * 100
          : 0,
      isaPct:
        currentViewKey === 'combined'
          ? combinedSalary > 0
            ? (((totalIsaMonthly + partnerTotalIsaMonthly) * 12) / combinedSalary) * 100
            : 0
          : currentViewKey === 'partner'
          ? partnerSalary > 0
            ? ((partnerTotalIsaMonthly * 12) / partnerSalary) * 100
            : 0
          : grossSalary > 0
          ? ((totalIsaMonthly * 12) / grossSalary) * 100
          : 0,
      giaCashPct:
        currentViewKey === 'combined'
          ? combinedSalary > 0
            ? (((totalGiaCashMonthly + partnerTotalGiaCashMonthly) * 12) / combinedSalary) * 100
            : 0
          : currentViewKey === 'partner'
          ? partnerSalary > 0
            ? ((partnerTotalGiaCashMonthly * 12) / partnerSalary) * 100
            : 0
          : grossSalary > 0
          ? ((totalGiaCashMonthly * 12) / grossSalary) * 100
          : 0,
    };

    // Benchmark logic (Half Your Age Rule or 15% standard)
    const halfAgeTarget = Math.max(10, Math.round(profile.currentAge / 2));
    const recBenchmark = Math.max(15, halfAgeTarget);

    return {
      activeDisplay: viewData,
      halfYourAgeTarget: halfAgeTarget,
      recommendedBenchmark: recBenchmark,
      combinedSalary,
      primarySalary: grossSalary,
      partnerSalary,
      combinedMonthlySavings,
      combinedSavingsRate,
      totalMonthlySavings,
      totalSavingsRate,
      partnerTotalMonthlySavings,
      partnerTotalSavingsRate,
    };
  }, [profile, p, partnerPots, isCouple, currentViewKey]);

  const [showAllYears, setShowAllYears] = useState(false);

  const accumulationBreakdown = useMemo(() => {
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

    const rows = [];

    for (let i = 0; i < totalYears; i++) {
      const yearNum = currentYear + i;
      const pAgeAtYear = primaryAge + i;
      const partAgeAtYear = isCouplePlanning ? partnerAge + i : 0;

      const pAccumulating = pAgeAtYear < primaryRetAge;
      const partAccumulating = isCouplePlanning ? partAgeAtYear < partnerRetAge : false;

      // Primary calculation
      let pSalary = 0;
      let pAnnualSaved = 0;
      let pTotalMo = 0;
      let pSavingsRate = 0;

      if (pAccumulating) {
        pSalary = basePrimarySalary;
        const pTax = calculateUKTax(profile, pPots, false, pAgeAtYear);
        const pensionContrib = pTax.regularPensionContributionsAnnual ?? pTax.totalPensionContributionsAnnual;
        const isaContrib = (pTax.regularIsaContributionsAnnual ?? pTax.totalIsaContributionsAnnual) + pTax.lisaGovernmentBonusAnnual;
        const giaCashContrib = pTax.regularCashGiaContributionsAnnual ?? pTax.totalCashGiaContributionsAnnual ?? 0;

        pAnnualSaved = pensionContrib + isaContrib + giaCashContrib;
        pTotalMo = pAnnualSaved / 12;
        pSavingsRate = pSalary > 0 ? (pAnnualSaved / pSalary) * 100 : 0;
      }

      // Partner calculation
      let partSalary = 0;
      let partAnnualSaved = 0;
      let partTotalMo = 0;
      let partSavingsRate = 0;

      if (isCouplePlanning && partAccumulating) {
        partSalary = basePartnerSalary;
        const partTax = calculatePartnerUKTax(profile, partnerPots, partAgeAtYear);
        const partPensionContrib = partTax.regularPensionContributionsAnnual ?? partTax.totalPensionContributionsAnnual;
        const partIsaContrib = (partTax.regularIsaContributionsAnnual ?? partTax.totalIsaContributionsAnnual) + partTax.lisaGovernmentBonusAnnual;
        const partGiaCashContrib = partTax.regularCashGiaContributionsAnnual ?? partTax.totalCashGiaContributionsAnnual ?? 0;

        partAnnualSaved = partPensionContrib + partIsaContrib + partGiaCashContrib;
        partTotalMo = partAnnualSaved / 12;
        partSavingsRate = partSalary > 0 ? (partAnnualSaved / partSalary) * 100 : 0;
      }

      const combinedSalary = pSalary + partSalary;
      const combinedAnnualSaved = pAnnualSaved + partAnnualSaved;
      const combinedTotalMo = combinedAnnualSaved / 12;
      const combinedSavingsRate = combinedSalary > 0 ? (combinedAnnualSaved / combinedSalary) * 100 : 0;

      rows.push({
        yearNum,
        taxYear: `${yearNum}/${(yearNum + 1).toString().slice(2)}`,
        pAgeAtYear,
        partAgeAtYear,
        pAccumulating,
        partAccumulating,
        pSalary,
        partSalary,
        combinedSalary,
        pAnnualSaved,
        partAnnualSaved,
        combinedAnnualSaved,
        pTotalMo,
        partTotalMo,
        combinedTotalMo,
        pSavingsRate,
        partSavingsRate,
        combinedSavingsRate,
      });
    }

    return rows;
  }, [profile, pots]);

  const displayedRows = showAllYears ? accumulationBreakdown : accumulationBreakdown.slice(0, 7);

  // Status Badge
  const getStatus = (rate: number) => {
    if (rate >= recommendedBenchmark) {
      return {
        label: 'Excellent Rate',
        bg: 'bg-primary-100 text-primary-800 border-primary-300',
        icon: CheckCircle2,
        desc: `Exceeds the ${recommendedBenchmark}% benchmark (${halfYourAgeTarget}% half-your-age rule)!`,
      };
    } else if (rate >= 10) {
      return {
        label: 'Solid Foundation',
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: TrendingUp,
        desc: `Close to the ${recommendedBenchmark}% recommended retirement target.`,
      };
    } else {
      return {
        label: 'Below Benchmark',
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: AlertCircle,
        desc: `Below the ${recommendedBenchmark}% target. Consider increasing pension or ISA contributions.`,
      };
    }
  };

  const status = getStatus(activeDisplay.savingsRate);
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-6 transition-colors"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-500/30 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">Savings Rate</h3>
              <span className="bg-primary-100 dark:bg-primary-500/20 text-primary-800 dark:text-primary-300 border border-primary-300 dark:border-primary-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Accumulation Phase
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of monthly savings rates and year-by-year accumulation breakdown until retirement start age
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <motion.div
          key={`status-${status.label}-${(activeDisplay.savingsRate || 0).toFixed(1)}`}
          initial={{ opacity: 0.6, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${status.bg} shrink-0`}
        >
          <StatusIcon className="w-4 h-4 shrink-0" />
          <span>{status.label}</span>
          <span className="opacity-75">({(activeDisplay.savingsRate || 0).toFixed(1)}%)</span>
        </motion.div>
      </div>

      {/* Couple Planning View Switcher Tabs */}
      {isCouple && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveView('combined')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeView === 'combined'
                ? 'bg-primary-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Combined Household</span>
            <span className="bg-slate-200 dark:bg-slate-950/40 text-primary-900 dark:text-primary-100 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
              £{Math.round(combinedMonthlySavings || 0).toLocaleString()}/mo ({(combinedSalary > 0 ? (combinedMonthlySavings / (combinedSalary / 12)) * 100 : 0).toFixed(1)}%)
            </span>
          </button>

          <button
            onClick={() => setActiveView('primary')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeView === 'primary'
                ? 'bg-indigo-600 text-white shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
            <span>{profile.name || 'Primary'}</span>
            <span className="bg-slate-200 dark:bg-slate-950/40 text-indigo-900 dark:text-indigo-100 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
              £{Math.round(totalMonthlySavings || 0).toLocaleString()}/mo ({(primarySalary > 0 ? (totalMonthlySavings / (primarySalary / 12)) * 100 : 0).toFixed(1)}%)
            </span>
          </button>

          <button
            onClick={() => setActiveView('partner')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeView === 'partner'
                ? 'bg-rose-600 text-white shadow-md font-extrabold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300 fill-rose-500 dark:fill-rose-300" />
            <span>{profile.partnerName || 'Partner'}</span>
            <span className="bg-slate-200 dark:bg-slate-950/40 text-rose-900 dark:text-rose-100 text-[10px] px-1.5 py-0.5 rounded-md font-bold">
              £{Math.round(partnerTotalMonthlySavings || 0).toLocaleString()}/mo ({(partnerSalary > 0 ? (partnerTotalMonthlySavings / (partnerSalary / 12)) * 100 : 0).toFixed(1)}%)
            </span>
          </button>
        </div>
      )}

      {/* Primary Highlight Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Total Monthly Savings */}
        <motion.div
          key={`m1-${activeDisplay.totalMonthlySavings}`}
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1"
        >
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              {currentViewKey === 'combined' ? 'Combined Monthly Inputs' : 'Total Monthly Savings'}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </span>
          <div className="text-xl font-extrabold text-primary-600 dark:text-primary-400">
            £{Math.round(activeDisplay.totalMonthlySavings || 0).toLocaleString()}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> /mo</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            £{Math.round(activeDisplay.totalAnnualSavings || 0).toLocaleString()} saved annually
          </div>
        </motion.div>

        {/* Metric 2: Total Savings Rate */}
        <motion.div
          key={`m2-${activeDisplay.savingsRate}`}
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1"
        >
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Overall Savings Rate</span>
            <Percent className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {(activeDisplay.savingsRate || 0).toFixed(1)}%
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> of gross income</span>
          </div>
          <div className="text-[10px] text-primary-600 dark:text-primary-400 font-medium">
            Personal {(activeDisplay.savingsRate - activeDisplay.employerPensionPct || 0).toFixed(1)}% + Employer {(activeDisplay.employerPensionPct || 0).toFixed(1)}%
          </div>
        </motion.div>

        {/* Metric 3: Personal Monthly Out-of-Pocket */}
        <motion.div
          key={`m3-${activeDisplay.personalMonthlySavings}`}
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1"
        >
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Personal Outlay</span>
            <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </span>
          <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300">
            £{Math.round(activeDisplay.personalMonthlySavings || 0).toLocaleString()}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> /mo</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            Out-of-pocket savings from net pay & SIPP/ISA
          </div>
        </motion.div>

        {/* Metric 4: Employer Match Contribution */}
        <motion.div
          key={`m4-${activeDisplay.employerPensionMonthly}`}
          initial={{ opacity: 0.7, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1"
        >
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Employer Top-Up</span>
            <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </span>
          <div className="text-xl font-extrabold text-teal-700 dark:text-teal-300">
            £{Math.round(activeDisplay.employerPensionMonthly || 0).toLocaleString()}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal"> /mo</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
            +{(activeDisplay.employerPensionPct || 0).toFixed(1)}% free employer contribution
          </div>
        </motion.div>
      </div>

      {/* Visual Stacked Progress Bar */}
      <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">Income Allocation Breakdown</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">({(activeDisplay.savingsRate || 0).toFixed(1)}% total saved)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
            <Target className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
            <span>Target Benchmark: <strong className="text-primary-600 dark:text-primary-400 font-bold">{recommendedBenchmark}%</strong> (Half-Age Rule)</span>
          </div>
        </div>

        {/* Multi-segment Animated Progress Bar */}
        <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-800">
          {/* Employee Workplace Pension */}
          {activeDisplay.employeePensionPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, activeDisplay.employeePensionPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-primary-500 h-full relative group cursor-pointer shrink-0"
              title={`Workplace Pension (Employee): ${(activeDisplay.employeePensionPct || 0).toFixed(1)}%`}
            />
          )}

          {/* Employer Pension Match */}
          {activeDisplay.employerPensionPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, activeDisplay.employerPensionPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-teal-400 h-full relative group cursor-pointer shrink-0"
              title={`Employer Pension Match: ${(activeDisplay.employerPensionPct || 0).toFixed(1)}%`}
            />
          )}

          {/* SIPP */}
          {activeDisplay.sippPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, activeDisplay.sippPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-purple-500 h-full relative group cursor-pointer shrink-0"
              title={`SIPP / Personal Pension: ${(activeDisplay.sippPct || 0).toFixed(1)}%`}
            />
          )}

          {/* ISAs */}
          {activeDisplay.isaPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, activeDisplay.isaPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-blue-500 h-full relative group cursor-pointer shrink-0"
              title={`ISAs (S&S, Cash, LISA): ${(activeDisplay.isaPct || 0).toFixed(1)}%`}
            />
          )}

          {/* GIA & Cash */}
          {activeDisplay.giaCashPct > 0 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, activeDisplay.giaCashPct)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="bg-amber-400 h-full relative group cursor-pointer shrink-0"
              title={`GIA & Cash Savings: ${(activeDisplay.giaCashPct || 0).toFixed(1)}%`}
            />
          )}
        </div>

        {/* Legend Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Workplace Employee</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Employer Match</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">SIPP Contribution</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">ISAs & LISA</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Cash & GIA</span>
          </div>
        </div>
      </div>

      {/* Guideline / Advice Banner */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        <Info className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-900 dark:text-white">UK Retirement Savings Rule of Thumb: </span>
          <span>
            {status.desc} According to the classic UK financial rule, aim to save a total percentage equal to <strong>half the age you started saving</strong> ({halfYourAgeTarget}% total rate for starting at age {profile.currentAge}).
            You can modify monthly workplace pension, SIPP, or ISA amounts in the <strong>Investment Pots & Monthly Inputs</strong> section below.
          </span>
        </div>
      </div>

      {/* Year-by-Year Accumulation Savings Breakdown Table */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700/60">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>Year-by-Year Savings Rate Breakdown (Until Retirement)</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Breakdown for each year during accumulation until retirement start age
              {isCouple && ` (Primary Age ${profile.targetRetirementAge || 60} / Partner Age ${profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60})`}.
            </p>
          </div>

          {accumulationBreakdown.length > 7 && (
            <button
              onClick={() => setShowAllYears(!showAllYears)}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer self-start sm:self-auto"
            >
              {showAllYears ? 'Show First 7 Years' : `Show All ${accumulationBreakdown.length} Accumulation Years`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Tax Year</th>
                <th className="py-2.5 px-3">Age(s)</th>
                <th className="py-2.5 px-3">Gross Salary</th>
                <th className="py-2.5 px-3">Annual Savings</th>
                <th className="py-2.5 px-3">Monthly Saved</th>
                <th className="py-2.5 px-3 text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {displayedRows.map((row) => {
                const salary =
                  currentViewKey === 'combined'
                    ? row.combinedSalary
                    : currentViewKey === 'partner'
                    ? row.partSalary
                    : row.pSalary;

                const annualSaved =
                  currentViewKey === 'combined'
                    ? row.combinedAnnualSaved
                    : currentViewKey === 'partner'
                    ? row.partAnnualSaved
                    : row.pAnnualSaved;

                const monthlySaved =
                  currentViewKey === 'combined'
                    ? row.combinedTotalMo
                    : currentViewKey === 'partner'
                    ? row.partTotalMo
                    : row.pTotalMo;

                const rate =
                  currentViewKey === 'combined'
                    ? row.combinedSavingsRate
                    : currentViewKey === 'partner'
                    ? row.partSavingsRate
                    : row.pSavingsRate;

                const isRetiredThisYear =
                  currentViewKey === 'combined'
                    ? !row.pAccumulating && !row.partAccumulating
                    : currentViewKey === 'partner'
                    ? !row.partAccumulating
                    : !row.pAccumulating;

                return (
                  <tr key={row.yearNum} className="hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors">
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
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {salary > 0 ? `£${Math.round(salary).toLocaleString()}` : <span className="text-slate-400 dark:text-slate-500">Retired</span>}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap">
                      £{Math.round(annualSaved).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      £{Math.round(monthlySaved).toLocaleString()}/mo
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {isRetiredThisYear ? (
                        <span className="text-slate-400 dark:text-slate-500 font-semibold">Retired</span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <span className={`font-bold ${rate >= recommendedBenchmark ? 'text-primary-600 dark:text-primary-400' : 'text-amber-600 dark:text-amber-300'}`}>
                            {rate.toFixed(1)}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${rate >= recommendedBenchmark ? 'bg-primary-500' : 'bg-amber-400'}`}
                              style={{ width: `${Math.min(100, (rate / 30) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export const SavingsRateCard = MonthlySavingsRateCard;
