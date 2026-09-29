import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots } from '../types';
import {
  calculateSalarySacrificeComparison,
  calculateMarginalRates,
  getPlanContributionsInfo,
  CB_FIRST_CHILD_ANNUAL,
  CB_ADDITIONAL_CHILD_ANNUAL,
  HICBC_LOWER_THRESHOLD,
  HICBC_UPPER_THRESHOLD,
} from '../utils/salarySacrificeOptimizer';
import { EMPLOYER_NI_RATE, PENSION_ANNUAL_ALLOWANCE } from '../config/ukTaxRates';
import {
  Coins,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Info,
  CheckCircle2,
  Users,
  User,
  Sliders,
  Calendar,
  Percent,
  ChevronDown,
  ChevronUp,
  Briefcase,
  RefreshCw,
} from 'lucide-react';

interface SalarySacrificeOptimizerCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChange?: (updatedProfile: UserProfile) => void;
}

export const SalarySacrificeOptimizerCard: React.FC<SalarySacrificeOptimizerCardProps> = ({
  profile,
  pots,
  onChange,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [activePerson, setActivePerson] = useState<'primary' | 'partner'>('primary');

  // Extract baseline details based on active person
  const isPartner = isCouple && activePerson === 'partner';
  const personName = isPartner
    ? profile.partnerName || 'Partner'
    : profile.name || 'Primary User';

  const defaultSalary = isPartner
    ? (profile.partnerGrossAnnualSalary ?? 0)
    : (profile.grossAnnualSalary ?? 0);

  const currentAge = isPartner
    ? profile.partnerCurrentAge || 40
    : profile.currentAge || 40;

  const retAge = isPartner
    ? profile.partnerTargetRetirementAge || 60
    : profile.targetRetirementAge || 60;

  const defaultYearsToRetirement = Math.max(1, retAge - currentAge);

  // Derive plan contributions for the active person
  const planContributions = useMemo(() => {
    return getPlanContributionsInfo(profile, pots, activePerson);
  }, [profile, pots, activePerson]);

  // Component state - initialized by looking at actual plan contributions
  const [salary, setSalary] = useState<number>(defaultSalary);
  const [sacrificeAmount, setSacrificeAmount] = useState<number>(() => {
    const initialPlan = getPlanContributionsInfo(profile, pots, 'primary');
    if (initialPlan.hasWorkplaceContributions) {
      return Math.min(defaultSalary, initialPlan.employeeWorkplaceAnnual);
    }
    if (initialPlan.sippAnnual > 0) {
      return Math.min(defaultSalary, initialPlan.sippAnnual);
    }
    return Math.min(defaultSalary, Math.round(defaultSalary * 0.05));
  });
  const defaultPassThrough = isPartner
    ? (profile.partnerEmployerNiPassThroughPercent ?? 0)
    : (profile.employerNiPassThroughPercent ?? 0);
  const defaultNiRate = isPartner
    ? (profile.partnerEmployerNiRate ?? 0.138)
    : (profile.employerNiRate ?? 0.138);

  const [employerNiRate, setEmployerNiRate] = useState<number>(defaultNiRate); // 13.8% or 0.150 (15.0%)
  const [employerPassThroughPercent, setEmployerPassThroughPercent] = useState<number>(defaultPassThrough); // 0%, 50%, 100% (default 0%)
  const [claimChildBenefit, setClaimChildBenefit] = useState<boolean>(false);
  const [childBenefitChildren, setChildBenefitChildren] = useState<number>(2);
  const [isScottish, setIsScottish] = useState<boolean>(profile.taxRegion === 'scotland');
  const [expectedReturn, setExpectedReturn] = useState<number>(profile.expectedInvestmentReturn || 6.5);
  const [yearsToRetirement, setYearsToRetirement] = useState<number>(defaultYearsToRetirement);
  const [showProjectionTable, setShowProjectionTable] = useState<boolean>(false);
  const [appliedSuccessMessage, setAppliedSuccessMessage] = useState<string | null>(null);

  // Sync state when profile inputs change (e.g. from Capital Assets & Investments or ProfileInputs)
  React.useEffect(() => {
    setSalary(defaultSalary);
    if (planContributions.hasWorkplaceContributions) {
      setSacrificeAmount(Math.min(defaultSalary, planContributions.employeeWorkplaceAnnual));
    } else if (planContributions.sippAnnual > 0) {
      setSacrificeAmount(Math.min(defaultSalary, planContributions.sippAnnual));
    } else {
      setSacrificeAmount(Math.min(defaultSalary, Math.round(defaultSalary * 0.05)));
    }

    const currentPassThrough = isPartner
      ? (profile.partnerEmployerNiPassThroughPercent ?? 0)
      : (profile.employerNiPassThroughPercent ?? 0);
    setEmployerPassThroughPercent(currentPassThrough);

    const currentNiRate = isPartner
      ? (profile.partnerEmployerNiRate ?? 0.138)
      : (profile.employerNiRate ?? 0.138);
    setEmployerNiRate(currentNiRate);
  }, [
    defaultSalary,
    activePerson,
    isPartner,
    profile.employerNiPassThroughPercent,
    profile.partnerEmployerNiPassThroughPercent,
    profile.employerNiRate,
    profile.partnerEmployerNiRate,
  ]);

  const handlePassThroughChange = (newPercent: number) => {
    setEmployerPassThroughPercent(newPercent);
    if (onChange) {
      const isPartnerActive = isCouple && activePerson === 'partner';
      onChange({
        ...profile,
        ...(isPartnerActive
          ? { partnerEmployerNiPassThroughPercent: newPercent }
          : { employerNiPassThroughPercent: newPercent }),
      });
    }
  };

  const handleEmployerNiRateChange = (newRate: number) => {
    setEmployerNiRate(newRate);
    if (onChange) {
      const isPartnerActive = isCouple && activePerson === 'partner';
      onChange({
        ...profile,
        ...(isPartnerActive
          ? { partnerEmployerNiRate: newRate }
          : { employerNiRate: newRate }),
      });
    }
  };

  // Sync salary, contributions, and employer rebate settings when switching person
  const handlePersonSwitch = (person: 'primary' | 'partner') => {
    setActivePerson(person);
    const newSalary = person === 'partner'
      ? (profile.partnerGrossAnnualSalary ?? 0)
      : (profile.grossAnnualSalary ?? 0);
    const newCurrentAge = person === 'partner'
      ? profile.partnerCurrentAge || 40
      : profile.currentAge || 40;
    const newRetAge = person === 'partner'
      ? profile.partnerTargetRetirementAge || 60
      : profile.targetRetirementAge || 60;

    const chosenSalary = newSalary;
    setSalary(chosenSalary);

    // Calculate sacrifice amount directly by looking at that person's contributions in the plan
    const personPlan = getPlanContributionsInfo(profile, pots, person);
    if (personPlan.hasWorkplaceContributions) {
      setSacrificeAmount(Math.min(chosenSalary, personPlan.employeeWorkplaceAnnual));
    } else if (personPlan.sippAnnual > 0) {
      setSacrificeAmount(Math.min(chosenSalary, personPlan.sippAnnual));
    } else {
      setSacrificeAmount(Math.min(chosenSalary, Math.round(chosenSalary * 0.05)));
    }

    const personPassThrough = person === 'partner'
      ? (profile.partnerEmployerNiPassThroughPercent ?? 0)
      : (profile.employerNiPassThroughPercent ?? 0);
    setEmployerPassThroughPercent(personPassThrough);

    const personRate = person === 'partner'
      ? (profile.partnerEmployerNiRate ?? 0.138)
      : (profile.employerNiRate ?? 0.138);
    setEmployerNiRate(personRate);

    setYearsToRetirement(Math.max(1, newRetAge - newCurrentAge));
    setAppliedSuccessMessage(null);
  };

  // Run calculation engine
  const calculation = useMemo(() => {
    return calculateSalarySacrificeComparison({
      salary,
      sacrificeAmount,
      isScottish,
      employerNiRate,
      employerPassThroughPercent,
      claimChildBenefit,
      childBenefitChildren,
      yearsToRetirement,
      expectedReturn,
      currentPlanSacrifice: planContributions.employeeWorkplaceAnnual,
    });
  }, [
    salary,
    sacrificeAmount,
    isScottish,
    employerNiRate,
    employerPassThroughPercent,
    claimChildBenefit,
    childBenefitChildren,
    yearsToRetirement,
    expectedReturn,
    planContributions.employeeWorkplaceAnnual,
  ]);

  const {
    baseline,
    reliefAtSource: ras,
    salarySacrifice: smart,
    advantagesOverRas,
    marginalRates,
    trapOptimizations,
    compoundProjection,
    warnings,
  } = calculation;

  const sacrificePercentOfSalary = salary > 0 ? (sacrificeAmount / salary) * 100 : 0;

  // Handle Preset Clicks
  const handleApplyPreset = (recommendedSacrifice: number) => {
    setSacrificeAmount(recommendedSacrifice);
    setAppliedSuccessMessage(null);
  };

  // Handle Apply to Profile
  const handleApplyToProfile = () => {
    if (!onChange) return;
    const isPartnerActive = isCouple && activePerson === 'partner';
    const targetOwner = isPartnerActive ? 'partner' : 'primary';

    // Synchronize workplace pension contribution in oneOffContributions if changed
    let updatedOneOffs = [...(profile.oneOffContributions || [])];
    const existingWorkplaceIdx = updatedOneOffs.findIndex(
      (c) =>
        c.enabled !== false &&
        (c.owner || 'primary') === targetOwner &&
        c.frequency === 'regular_monthly' &&
        c.targetPot === 'workplace_pension'
    );

    if (existingWorkplaceIdx >= 0) {
      const item = updatedOneOffs[existingWorkplaceIdx];
      const monthly = Math.round(sacrificeAmount / 12);
      if (item.workplaceContributionType === 'percent' && salary > 0) {
        const newPct = Math.round(((sacrificeAmount / salary) * 100) * 10) / 10;
        updatedOneOffs[existingWorkplaceIdx] = {
          ...item,
          employeePercent: newPct,
        };
      } else {
        updatedOneOffs[existingWorkplaceIdx] = {
          ...item,
          employeeMonthlyAmount: monthly,
          grossAmount: monthly,
        };
      }
    } else if (sacrificeAmount > 0) {
      // Add a regular workplace contribution entry
      const monthly = Math.round(sacrificeAmount / 12);
      const newPct = salary > 0 ? Math.round(((sacrificeAmount / salary) * 100) * 10) / 10 : 5;
      updatedOneOffs.push({
        id: `contrib_${Date.now()}`,
        name: 'Workplace Pension Monthly Contribution',
        owner: targetOwner,
        targetPot: 'workplace_pension',
        frequency: 'regular_monthly',
        grossAmount: monthly,
        startAge: currentAge,
        endAge: retAge,
        workplaceContributionType: 'percent',
        employeePercent: newPct,
        employerPercent: 3,
        enabled: true,
        description: 'Monthly salary sacrifice / auto-enrolment pension',
      });
    }

    const updatedProfile: UserProfile = {
      ...profile,
      oneOffContributions: updatedOneOffs,
      ...(isPartnerActive
        ? {
            partnerPensionContributionMethod: 'salary_sacrifice',
            partnerEmployerNiPassThroughPercent: employerPassThroughPercent,
            partnerEmployerNiRate: employerNiRate,
          }
        : {
            pensionContributionMethod: 'salary_sacrifice',
            employerNiPassThroughPercent: employerPassThroughPercent,
            employerNiRate: employerNiRate,
          }),
    };

    onChange(updatedProfile);
    setAppliedSuccessMessage(
      `Success! Updated ${personName}'s plan to Salary Sacrifice (SMART Pensions) with £${sacrificeAmount.toLocaleString()}/yr (£${Math.round(sacrificeAmount / 12).toLocaleString()}/mo) contribution.`
    );
    setTimeout(() => setAppliedSuccessMessage(null), 6000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
              <Coins className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                  Salary Sacrifice & Employer NI Pass-Through Optimizer
                </h2>
                <span className="bg-emerald-400/25 border border-emerald-300/40 text-emerald-100 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  SMART Pension Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl leading-relaxed">
                Compare Relief at Source (RAS) against Salary Sacrifice, capture employee NI savings (8% / 2%),
                and amplify your pension with employer NI rebates (13.8% or 15.0%).
              </p>
            </div>
          </div>

          {/* Couple Planner Toggle */}
          {isCouple && (
            <div className="flex items-center gap-1.5 bg-black/20 p-1.5 rounded-xl border border-white/15 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => handlePersonSwitch('primary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePerson === 'primary'
                    ? 'bg-white text-emerald-900 shadow-md scale-102'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{profile.name || 'Primary'}</span>
              </button>
              <button
                type="button"
                onClick={() => handlePersonSwitch('partner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activePerson === 'partner'
                    ? 'bg-white text-emerald-900 shadow-md scale-102'
                    : 'text-emerald-100 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{profile.partnerName || 'Partner'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 sm:p-7 space-y-7">
        {/* Success Alert if applied */}
        {appliedSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{appliedSuccessMessage}</span>
          </div>
        )}

        {/* Warning messages */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Zero Salary Notice */}
        {salary === 0 && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              <strong>{personName}</strong> currently has an annual employment salary of £0. Salary sacrifice (SMART pensions) requires employment earnings paid via PAYE. If you earn an employment income, you can enter it below to explore tax and National Insurance savings.
            </span>
          </div>
        )}

        {/* Plan Contributions Detected Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-700 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  {personName}'s Current Plan Contributions
                </span>
                {planContributions.hasWorkplaceContributions ? (
                  <span className="bg-indigo-200/70 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                    {planContributions.sourceDescription}
                  </span>
                ) : (
                  <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                    No active workplace pension in plan
                  </span>
                )}
                {sacrificeAmount === planContributions.employeeWorkplaceAnnual && planContributions.hasWorkplaceContributions && (
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced to Plan Contributions
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  Workplace Employee Contribution:{' '}
                  <strong className="text-indigo-950 dark:text-white font-extrabold">
                    £{planContributions.employeeWorkplaceAnnual.toLocaleString()}/yr
                  </strong>{' '}
                  <span className="text-xs text-slate-500 font-medium">
                    (£{planContributions.employeeWorkplaceMonthly.toLocaleString()}/mo • {planContributions.employeePercentOfSalary}%)
                  </span>
                </span>
                {planContributions.employerWorkplaceAnnual > 0 && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Employer Match: <strong className="text-slate-800 dark:text-slate-200 font-bold">£{planContributions.employerWorkplaceAnnual.toLocaleString()}/yr</strong> ({planContributions.employerPercentOfSalary}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {planContributions.hasWorkplaceContributions && sacrificeAmount !== planContributions.employeeWorkplaceAnnual && (
            <button
              type="button"
              onClick={() => {
                setSacrificeAmount(planContributions.employeeWorkplaceAnnual);
                setAppliedSuccessMessage(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 self-start md:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Plan (£{planContributions.employeeWorkplaceAnnual.toLocaleString()}/yr)</span>
            </button>
          )}
        </div>

        {/* Marginal Rate & Trap Detection Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Current Top-Slice Marginal Deduction
                </span>
                {marginalRates.isInPaTaper && (
                  <span className="bg-rose-500/10 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    60% Personal Allowance Taper Trap
                  </span>
                )}
                {marginalRates.isInHicbcTaper && (
                  <span className="bg-amber-500/10 border border-amber-400/40 text-amber-600 dark:text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Child Benefit Clawback Zone (£60k–£80k)
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                  {marginalRates.totalMarginalRatePercent}%
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  effective marginal loss per extra £1 earned ({personName})
                </span>
              </div>
            </div>

            {/* Marginal Breakdown Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 shadow-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Income Tax</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{marginalRates.incomeTaxRatePercent}%</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 shadow-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Employee NI</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{marginalRates.employeeNiRatePercent}%</span>
              </div>
              {claimChildBenefit && marginalRates.hicbcClawbackRatePercent > 0 && (
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 shadow-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Child Benefit Clawback</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">+{marginalRates.hicbcClawbackRatePercent}%</span>
                </div>
              )}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 shadow-xs">
                <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] font-bold">Total Marginal Tax Saved</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{marginalRates.totalMarginalRatePercent}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 1-Click Trap Buster Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              1-Click Optimization Presets & Trap Busters
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Auto-calculate ideal salary sacrifice target
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {trapOptimizations.map((trap) => {
              const isSelected = sacrificeAmount === trap.recommendedSacrifice && trap.recommendedSacrifice > 0;
              return (
                <button
                  key={trap.id}
                  type="button"
                  onClick={() => handleApplyPreset(trap.recommendedSacrifice)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer active:scale-98 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/30'
                      : trap.isApplicable
                      ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:shadow-md'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                      {trap.badge}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                    {trap.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {trap.description}
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-500">Sacrifice Target:</span>
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      £{trap.recommendedSacrifice.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuration Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          {/* 1. Annual Gross Salary */}
          <div className="space-y-2">
            <label htmlFor="salary-gross-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Annual Gross Salary</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                Contractual earnings
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">£</span>
              <input
                id="salary-gross-input"
                type="number"
                min="0"
                step="1000"
                value={salary}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value) || 0);
                  setSalary(val);
                  if (sacrificeAmount > val) setSacrificeAmount(val);
                }}
                className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            {/* Quick Presets for Salary */}
            <div className="flex gap-1.5 flex-wrap pt-1">
              {[50000, 75000, 100000, 125000, 150000].map((quickSal) => (
                <button
                  key={quickSal}
                  type="button"
                  onClick={() => {
                    setSalary(quickSal);
                    if (sacrificeAmount > quickSal) setSacrificeAmount(quickSal);
                  }}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer ${
                    salary === quickSal
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  £{(quickSal / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* 2. Salary Sacrifice Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                Annual Salary Sacrificed
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                £{sacrificeAmount.toLocaleString()} ({sacrificePercentOfSalary.toFixed(1)}%)
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">£</span>
              <input
                type="number"
                min="0"
                max={salary}
                step="500"
                value={sacrificeAmount}
                onChange={(e) => setSacrificeAmount(Math.min(salary, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <input
              type="range"
              min="0"
              max={salary || 100000}
              step="250"
              value={sacrificeAmount}
              onChange={(e) => setSacrificeAmount(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            {/* Quick Percent Chips */}
            <div className="flex gap-1.5 flex-wrap items-center">
              {planContributions.hasWorkplaceContributions && (
                <button
                  type="button"
                  onClick={() => setSacrificeAmount(planContributions.employeeWorkplaceAnnual)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer flex items-center gap-1 ${
                    sacrificeAmount === planContributions.employeeWorkplaceAnnual
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <Briefcase className="w-2.5 h-2.5" />
                  <span>From Plan (£{planContributions.employeeWorkplaceAnnual.toLocaleString()})</span>
                </button>
              )}
              {[5, 10, 15, 20, 25, 30].map((pct) => {
                const target = Math.min(salary, Math.round((salary * pct) / 100));
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setSacrificeAmount(target)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer ${
                      Math.abs(sacrificePercentOfSalary - pct) < 0.5
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Employer NI Rate & Pass-Through % */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <span>Employer NI Rate</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  {(employerNiRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleEmployerNiRateChange(0.138)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    employerNiRate === 0.138
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  13.8% (Current)
                </button>
                <button
                  type="button"
                  onClick={() => handleEmployerNiRateChange(0.150)}
                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    employerNiRate === 0.150
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  15.0% (April 2025+)
                </button>
              </div>
            </div>

            {/* Employer NI Pass-Through Percentage */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Employer Rebate Pass-Through</span>
                <span className="text-teal-600 dark:text-teal-400 font-extrabold">
                  {employerPassThroughPercent}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={employerPassThroughPercent}
                onChange={(e) => handlePassThroughChange(Number(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
              <div className="flex items-center justify-between gap-1">
                {[0, 50, 100].map((presetPct) => (
                  <button
                    key={presetPct}
                    type="button"
                    onClick={() => handlePassThroughChange(presetPct)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer ${
                      employerPassThroughPercent === presetPct
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {presetPct === 0 ? '0% (Employer keeps)' : presetPct === 50 ? '50% (Shared)' : '100% (Full Pass-Through)'}
                  </button>
                ))}
              </div>
              {employerPassThroughPercent > 0 && sacrificeAmount > 0 && (
                <p className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  +£{Math.round(smart.employerRebateAdded).toLocaleString()}/yr (+£{Math.round(smart.employerRebateAdded / 12).toLocaleString()}/mo) extra employer bonus directly into pension!
                </p>
              )}
            </div>
          </div>

          {/* 4. Child Benefit Toggle & Children Count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Claiming Child Benefit?
              </label>
              <input
                type="checkbox"
                checked={claimChildBenefit}
                onChange={(e) => setClaimChildBenefit(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            {claimChildBenefit ? (
              <div className="space-y-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Children:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setChildBenefitChildren(cnt)}
                        className={`w-6 h-6 rounded-md text-xs font-bold border cursor-pointer ${
                          childBenefitChildren === cnt
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div>Annual Entitlement: £{Math.round(CB_FIRST_CHILD_ANNUAL + Math.max(0, childBenefitChildren - 1) * CB_ADDITIONAL_CHILD_ANNUAL).toLocaleString()}</div>
                  {salary > 60000 && (
                    <div className="text-amber-600 dark:text-amber-400 font-semibold">
                      Subject to HICBC clawback between £60k and £80k.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tick if your household receives UK Child Benefit to calculate High Income Child Benefit Charge (HICBC) clawback savings.
              </p>
            )}
          </div>

          {/* 5. Pre-Retirement Runway & Return */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Years to Retirement
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                {yearsToRetirement} yrs (Age {currentAge} → {currentAge + yearsToRetirement})
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={yearsToRetirement}
              onChange={(e) => setYearsToRetirement(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Expected Return:</span>
              <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-14 px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 text-center text-xs font-bold"
                />
                <span>% / yr</span>
              </div>
            </div>
          </div>

          {/* 6. Tax Region */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>Tax Region</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {isScottish ? 'Scottish Bands' : 'England, Wales & NI'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsScottish(false)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  !isScottish
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                rUK (20/40/45%)
              </button>
              <button
                type="button"
                onClick={() => setIsScottish(true)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                  isScottish
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Scotland (19-48%)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Big Impact KPI Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Net Take-Home Cost */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs relative overflow-hidden">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Take-Home Cost
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              -£{Math.round(smart.netCostToEmployee / 12).toLocaleString()}
              <span className="text-xs font-normal text-slate-500">/mo</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              £{Math.round(smart.netCostToEmployee).toLocaleString()}/yr actual reduction in paycheck
            </div>
          </div>

          {/* Tile 2: Total Added to Pension */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 shadow-xs relative overflow-hidden">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>Total Pension Added</span>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              +£{Math.round(smart.totalPensionAdded / 12).toLocaleString()}
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">/mo</span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              £{Math.round(smart.totalPensionAdded).toLocaleString()}/yr (£{Math.round(sacrificeAmount).toLocaleString()} + £{Math.round(smart.employerRebateAdded).toLocaleString()} rebate)
            </div>
          </div>

          {/* Tile 3: Immediate Amplification / ROI */}
          <div className="p-4 rounded-2xl bg-teal-500/10 dark:bg-teal-950/40 border border-teal-500/30 shadow-xs relative overflow-hidden">
            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center justify-between">
              <span>Instant 'ROI' / Uplift</span>
              <TrendingUp className="w-3.5 h-3.5 text-teal-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-300 mt-1">
              +{advantagesOverRas.immediateRoiPercent.toFixed(0)}%
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1 font-medium">
              Effective cost: £{smart.effectiveCostPer100InPension.toFixed(1)} per £100 in pension
            </div>
          </div>

          {/* Tile 4: Retirement Wealth Multiplier */}
          <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/30 shadow-xs relative overflow-hidden">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
              <span>Extra Wealth by Ret.</span>
              <Coins className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
              +£{Math.round(compoundProjection.extraRetirementWealth).toLocaleString()}
            </div>
            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
              Boost in {yearsToRetirement} yrs vs standard Relief at Source
            </div>
          </div>
        </div>

        {/* 3-Column Detailed Scenario Comparison */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Side-by-Side: Cash vs. Relief at Source (RAS) vs. SMART Salary Sacrifice
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Modeling Employee NI Savings (8% / 2%) & Employer Pass-Through
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                  <th className="py-3 px-4 font-bold">Metric / Component</th>
                  <th className="py-3 px-4 font-bold text-right text-slate-500 dark:text-slate-400">
                    1. No Sacrifice (Cash)
                  </th>
                  <th className="py-3 px-4 font-bold text-right text-blue-600 dark:text-blue-400">
                    2. Relief at Source (RAS)
                  </th>
                  <th className="py-3 px-4 font-bold text-right text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
                    3. Salary Sacrifice (SMART)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {/* Gross Contractual Salary */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">Contractual Gross Salary</td>
                  <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-bold">
                    £{Math.round(baseline.contractualSalary).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-bold">
                    £{Math.round(ras.contractualSalary).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">
                    £{Math.round(smart.contractualSalary).toLocaleString()}
                  </td>
                </tr>

                {/* Income Tax Paid */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">Income Tax (after relief)</td>
                  <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">
                    -£{Math.round(baseline.incomeTax).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">
                    -£{Math.round(ras.incomeTax).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                    -£{Math.round(smart.incomeTax).toLocaleString()}
                  </td>
                </tr>

                {/* Employee National Insurance */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    Employee National Insurance
                    <span className="block text-[10px] text-slate-400">Unchanged under RAS; reduced under SMART</span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                    -£{Math.round(baseline.employeeNi).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                    -£{Math.round(ras.employeeNi).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-teal-600 dark:text-teal-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">
                    -£{Math.round(smart.employeeNi).toLocaleString()}
                    <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-extrabold">
                      (Saves £{Math.round(advantagesOverRas.employeeNiSavedAnnual).toLocaleString()}/yr)
                    </span>
                  </td>
                </tr>

                {/* Child Benefit Retained */}
                {claimChildBenefit && (
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                      Child Benefit Retained (after HICBC)
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 dark:text-slate-400">
                      +£{Math.round(baseline.childBenefitRetained).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                      +£{Math.round(ras.childBenefitRetained).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">
                      +£{Math.round(smart.childBenefitRetained).toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Net Take-Home Pay */}
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 font-bold">
                  <td className="py-3 px-4 text-slate-900 dark:text-white">Annual Net Take-Home Pay</td>
                  <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                    £{Math.round(baseline.netTakeHomePay).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 dark:text-white">
                    £{Math.round(ras.netTakeHomePay).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50/60 dark:bg-emerald-950/30">
                    £{Math.round(smart.netTakeHomePay).toLocaleString()}
                    <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      (+£{Math.round(smart.netTakeHomePay - ras.netTakeHomePay).toLocaleString()} more take-home than RAS)
                    </span>
                  </td>
                </tr>

                {/* Net Cost to Employee */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    Net Take-Home Cost to You
                    <span className="block text-[10px] text-slate-400">Paycheck drop compared to cash</span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400">£0</td>
                  <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300 font-bold">
                    £{Math.round(ras.netCostToEmployee).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50/30 dark:bg-emerald-950/10">
                    £{Math.round(smart.netCostToEmployee).toLocaleString()}
                  </td>
                </tr>

                {/* Employee Pension Added */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">Employee Contribution to Pension</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">£0</td>
                  <td className="py-2.5 px-4 text-right text-slate-900 dark:text-white font-bold">
                    £{Math.round(ras.employeePensionAdded).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/30 dark:bg-emerald-950/10">
                    £{Math.round(smart.employeePensionAdded).toLocaleString()}
                  </td>
                </tr>

                {/* Employer NI Rebate Added */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    Employer NI Pass-Through Rebate
                    <span className="block text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                      {(employerNiRate * 100).toFixed(1)}% rate × {employerPassThroughPercent}% pass-through
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400">£0</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">£0 (No rebate)</td>
                  <td className="py-2.5 px-4 text-right text-teal-600 dark:text-teal-400 font-extrabold bg-emerald-50/30 dark:bg-emerald-950/10">
                    +£{Math.round(smart.employerRebateAdded).toLocaleString()}
                  </td>
                </tr>

                {/* Total Added to Pension */}
                <tr className="bg-emerald-50/80 dark:bg-emerald-950/40 font-extrabold text-emerald-900 dark:text-emerald-200">
                  <td className="py-3 px-4">Total Annual Pension Added</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-normal">£0</td>
                  <td className="py-3 px-4 text-right text-blue-700 dark:text-blue-300">
                    £{Math.round(ras.totalPensionAdded).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                    £{Math.round(smart.totalPensionAdded).toLocaleString()}
                    <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      (+£{Math.round(smart.totalPensionAdded - ras.totalPensionAdded).toLocaleString()} vs RAS)
                    </span>
                  </td>
                </tr>

                {/* Effective Cost per £100 in Pension */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                    Net Out-of-Pocket Cost per £100 in Pension
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-400">N/A</td>
                  <td className="py-2.5 px-4 text-right text-slate-700 dark:text-slate-300 font-bold">
                    £{ras.effectiveCostPer100InPension.toFixed(1)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50/30 dark:bg-emerald-950/10">
                    £{smart.effectiveCostPer100InPension.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Compound Accumulation Runway until Retirement */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-slate-800/60 dark:to-emerald-950/20 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Pre-Retirement Accumulation Runway ({yearsToRetirement} Years to Age {currentAge + yearsToRetirement})
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Compound growth at {expectedReturn}% p.a. comparing Salary Sacrifice + Rebate against standard Relief at Source.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowProjectionTable(!showProjectionTable)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer self-start sm:self-auto"
            >
              <span>{showProjectionTable ? 'Hide Annual Breakdown' : 'Show Annual Breakdown'}</span>
              {showProjectionTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Runway Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Relief at Source (RAS) Pot
              </span>
              <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                £{Math.round(compoundProjection.rasFinalPot).toLocaleString()}
              </div>
              <span className="text-[10px] text-slate-500">at retirement age</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Salary Sacrifice (SMART) Pot
              </span>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                £{Math.round(compoundProjection.smartFinalPot).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-600/80">includes employer pass-through</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Extra Retirement Wealth
              </span>
              <div className="text-lg font-black text-white mt-0.5">
                +£{Math.round(compoundProjection.extraRetirementWealth).toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-100">
                plus £{Math.round(compoundProjection.totalEmployeeNiSaved).toLocaleString()} saved NI
              </span>
            </div>
          </div>

          {/* Collapsible Annual Breakdown Table */}
          {showProjectionTable && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 mt-3 animate-fade-in">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <th className="py-2 px-3">Year / Age</th>
                    <th className="py-2 px-3 text-right">RAS Pot Balance</th>
                    <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">SMART Pot Balance</th>
                    <th className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">Extra Pot from SMART</th>
                    <th className="py-2 px-3 text-right">Cumulative NI Saved</th>
                    <th className="py-2 px-3 text-right text-teal-600 dark:text-teal-400">Cumulative Employer Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {compoundProjection.yearlyBreakdown.map((row) => (
                    <tr key={row.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                        Year {row.year} (Age {currentAge + row.year})
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        £{row.rasPotBalance.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                        £{row.smartPotBalance.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-300 font-extrabold">
                        +£{row.extraPotFromSmart.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                        £{row.cumulativeEmployeeNiSaved.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right text-teal-600 dark:text-teal-400 font-semibold">
                        £{row.cumulativeEmployerBonusContributed.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Button: Apply to Profile */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 text-white dark:bg-slate-800/90 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                Apply Salary Sacrifice to {personName}'s Plan
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Locks in SMART pension method in your financial plan to capture National Insurance savings.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyToProfile}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Apply SMART Method to Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
