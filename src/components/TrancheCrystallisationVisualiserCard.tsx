import React, { useState, useMemo } from 'react';
import {
  Layers,
  Coins,
  ShieldCheck,
  TrendingUp,
  Building2,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  CheckCircle2,
  Wallet,
  Users,
  PieChart,
  Split,
  ChevronRight
} from 'lucide-react';
import { UserProfile, InvestmentPots, YearProjection, CrystallisationTranche } from '../types';
import { getLsaLimit, getPartnerLsaLimit, getProjectedPensionAtTakeAge } from '../utils/ukTaxEngine';

interface TrancheCrystallisationVisualiserCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections?: YearProjection[];
  onChange?: (profile: UserProfile) => void;
}

const TARGET_POT_LABELS: Record<string, string> = {
  stocks_and_shares_isa: 'Stocks & Shares ISA',
  cash_isa: 'Cash ISA',
  cash_savings: 'Cash Savings',
  gia: 'General Investment Account (GIA)',
  spend_clear_debt: 'Spend / Clear Liabilities',
};

export const TrancheCrystallisationVisualiserCard: React.FC<TrancheCrystallisationVisualiserCardProps> = ({
  profile,
  pots,
  projections = [],
  onChange,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [selectedOwner, setSelectedOwner] = useState<'primary' | 'partner'>('primary');

  const isPartner = isCouple && selectedOwner === 'partner';
  const personName = isPartner ? (profile.partnerName || 'Partner') : (profile.name || 'Primary');
  const currentAge = isPartner ? (profile.partnerCurrentAge || profile.currentAge || 35) : profile.currentAge;
  const currentYear = new Date().getFullYear();

  // Mode and Tranches
  const mode = isPartner
    ? (profile.partnerCrystallisationMode || (profile.partnerTakeLumpSumAtStart ? 'upfront' : 'ufpls'))
    : (profile.crystallisationMode || (profile.takeLumpSumAtStart ? 'upfront' : 'ufpls'));

  const rawTranches = useMemo(() => {
    if (isPartner) {
      return (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter(
        (t) => t.owner === 'partner'
      );
    }
    return (profile.crystallisationTranches || []).filter(
      (t) => (t.owner || 'primary') !== 'partner'
    );
  }, [isPartner, profile.partnerCrystallisationTranches, profile.crystallisationTranches]);

  const activeTranches = useMemo(() => rawTranches.filter((t) => t.enabled), [rawTranches]);

  // Initial reference DC pot (current today)
  const initialCurrentDcPot = useMemo(() => {
    if (isPartner) {
      return (
        (pots.partnerWorkplacePensionBalance ?? profile.partnerWorkplacePensionBalance ?? 0) +
        (pots.partnerSippBalance ?? profile.partnerSippBalance ?? 0)
      );
    }
    return (
      (pots.workplacePensionBalance ?? profile.workplacePensionBalance ?? 0) +
      (pots.sippBalance ?? profile.sippBalance ?? 0)
    );
  }, [isPartner, pots, profile]);

  // LSA and DB lump sum
  const lsaLimit = useMemo(() => {
    return isPartner ? getPartnerLsaLimit(profile) : getLsaLimit(profile);
  }, [isPartner, profile]);

  // Active DB pensions and total lump sum for this owner
  const ownerDbPensions = useMemo(() => {
    return (profile.dbPensions || []).filter(
      (p) => p.enabled && (isPartner ? p.owner === 'partner' : (p.owner || 'primary') !== 'partner') && (p.taxFreeLumpSum || 0) > 0
    );
  }, [isPartner, profile.dbPensions]);

  const dbLumpSum = useMemo(() => {
    return ownerDbPensions.reduce((sum, p) => sum + (p.taxFreeLumpSum || 0), 0);
  }, [ownerDbPensions]);

  // DB lump sums taken prior to current age
  const priorDbLumpSum = useMemo(() => {
    return ownerDbPensions
      .filter((p) => (p.startAge || 65) < currentAge)
      .reduce((sum, p) => sum + (p.taxFreeLumpSum || 0), 0);
  }, [ownerDbPensions, currentAge]);

  // Phased crystallisation tranches display the full allowance, not minus DB pension lump sum
  const effectiveLsaLimitForDc = lsaLimit;
  const partnerAgeOffset = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;

  // Sorted active tranches by age for chronological tracking
  const sortedActiveTranches = useMemo(() => {
    return [...activeTranches].sort((a, b) => Number(a.age) - Number(b.age));
  }, [activeTranches]);

  // Reference starting DC pot at the beginning of phased crystallisation
  const referenceStartingPot = useMemo(() => {
    const firstTrancheAge = sortedActiveTranches.length > 0 ? Number(sortedActiveTranches[0].age) : Math.max(57, currentAge);
    const primaryLookupAge = isPartner ? firstTrancheAge - partnerAgeOffset : firstTrancheAge;

    if (projections && projections.length > 0) {
      const projAtStart = projections.find((p) => p.age === primaryLookupAge);
      if (projAtStart) {
        const val = isPartner
          ? (projAtStart.partnerPensionPotBeforePcls ?? (projAtStart.partnerPensionPotBeforeAnnuity ?? projAtStart.partnerPensionPot))
          : (projAtStart.primaryPensionPotBeforePcls ?? (projAtStart.primaryPensionPotBeforeAnnuity ?? projAtStart.primaryPensionPot));
        if (val !== undefined && val > 0) return val;
      }
    }
    const projectedAtFirstAge = getProjectedPensionAtTakeAge(profile, pots, firstTrancheAge, isPartner);
    if (projectedAtFirstAge > 0) return projectedAtFirstAge;

    if (initialCurrentDcPot > 0 && firstTrancheAge > currentAge) {
      const years = firstTrancheAge - currentAge;
      const returnRate = (profile.expectedInvestmentReturn ?? 6.5) / 100;
      return Math.round(initialCurrentDcPot * Math.pow(1 + returnRate, years));
    }
    return initialCurrentDcPot;
  }, [sortedActiveTranches, currentAge, isPartner, partnerAgeOffset, projections, profile, pots, initialCurrentDcPot]);

  // Combine user-defined active DC tranches with any unmatched DB pension lump sum milestones
  const allScheduledTranches = useMemo(() => {
    const list: Array<{
      tranche: CrystallisationTranche;
      isDbOnlyMilestone?: boolean;
      dbPension?: (typeof ownerDbPensions)[0];
    }> = sortedActiveTranches.map((t) => ({ tranche: t, isDbOnlyMilestone: false }));

    // Find any DB pensions that do not have an exact matching DC tranche
    ownerDbPensions.forEach((db) => {
      const dbAge = Number(db.startAge || 60);
      if (dbAge < currentAge) return; // already drawn in past
      const hasExactDcMatch = sortedActiveTranches.some(
        (t) => Number(t.age) === dbAge || (t.frequency === 'recurring' && dbAge >= Number(t.age) && dbAge <= Number(t.endAge || t.age))
      );
      if (!hasExactDcMatch) {
        // Create matching DB lump sum milestone at dbAge
        const syntheticTranche: CrystallisationTranche = {
          id: `db-milestone-${db.id}`,
          name: `${db.name || 'Defined Benefit Scheme'} Lump Sum`,
          owner: isPartner ? 'partner' : 'primary',
          age: dbAge,
          amount: 0,
          pclsPercent: 0,
          targetPot: 'stocks_and_shares_isa',
          enabled: true,
          frequency: 'one_off',
        };
        list.push({ tranche: syntheticTranche, isDbOnlyMilestone: true, dbPension: db });
      }
    });

    return list.sort((a, b) => Number(a.tranche.age) - Number(b.tranche.age));
  }, [sortedActiveTranches, ownerDbPensions, currentAge, isPartner]);

  // DB pensions with lump sums that do not have a matching user DC tranche yet
  const unmatchedDbPensions = useMemo(() => {
    return ownerDbPensions.filter((db) => {
      const dbAge = Number(db.startAge || 60);
      if (dbAge < currentAge) return false;
      const hasMatch = sortedActiveTranches.some(
        (t) => Number(t.age) === dbAge || (t.frequency === 'recurring' && dbAge >= Number(t.age) && dbAge <= Number(t.endAge || t.age))
      );
      return !hasMatch;
    });
  }, [ownerDbPensions, currentAge, sortedActiveTranches]);

  // Compute calculated metrics per tranche with chronologically accurate DB lump sum allocation
  const trancheDetails = useMemo(() => {
    let runningCumulativeDcTfc = 0;
    let runningCumulativeTfc = priorDbLumpSum;
    let runningCumulativeGross = 0;
    let runningCumulativeDrawdown = 0;
    const accountedDbIds = new Set<string>();

    return allScheduledTranches.map((item, idx) => {
      const { tranche: t, isDbOnlyMilestone, dbPension } = item;
      const gross = Number(t.amount || 0);
      const pclsPct = Math.min(25, Math.max(0, Number(t.pclsPercent ?? 25))) / 100;
      const isRecurring = t.frequency === 'recurring';
      const endAge = isRecurring && t.endAge && Number(t.endAge) >= Number(t.age) ? Number(t.endAge) : Number(t.age);
      const yearsCount = isRecurring ? Math.max(1, endAge - Number(t.age) + 1) : 1;
      const targetAge = endAge;

      // Match DB pensions that are drawn in or associated with this tranche
      // ONLY match if:
      // 1. Synthetic milestone for this DB pension
      // 2. OR exact match with tranche start age: Number(db.startAge) === Number(t.age)
      // 3. OR recurring tranche and dbStartAge spans [t.age, endAge]
      const matchingDbPensions = isDbOnlyMilestone && dbPension
        ? [dbPension]
        : ownerDbPensions.filter((db) => {
            const dbAge = Number(db.startAge || 60);
            if (dbAge < currentAge) return false;
            if (accountedDbIds.has(db.id)) return false;

            if (dbAge === Number(t.age)) return true;
            if (isRecurring && dbAge >= Number(t.age) && dbAge <= endAge) return true;

            return false;
          });

      matchingDbPensions.forEach((db) => accountedDbIds.add(db.id));
      const matchingDbLumpSum = matchingDbPensions.reduce((sum, db) => sum + (db.taxFreeLumpSum || 0), 0);
      const matchingDbAges = matchingDbPensions.map((db) => db.startAge || 60).join(', ');
      const matchingDbNames = matchingDbPensions.map((db) => db.name || 'Defined Benefit Scheme').join(', ');

      // Single year DC breakdown
      // User requirement: "in Phased Crystallisation Tranches Breakdown the tax-free cash (TFC) should display full allowance not any db peison lump sum"
      const annualGross = isDbOnlyMilestone ? 0 : gross;
      const remainingLsaForDc = Math.max(0, lsaLimit - runningCumulativeDcTfc);
      const annualTfc = isDbOnlyMilestone ? 0 : Math.min(Math.round(annualGross * pclsPct), remainingLsaForDc);
      const annualResidualDrawdown = isDbOnlyMilestone ? 0 : Math.max(0, annualGross - annualTfc);

      // Total across recurring span
      const totalTrancheGross = annualGross * yearsCount;
      const totalTrancheDcTfc = isDbOnlyMilestone ? 0 : Math.min(annualTfc * yearsCount, remainingLsaForDc);
      const totalTrancheResidualDrawdown = isDbOnlyMilestone ? 0 : Math.max(0, totalTrancheGross - totalTrancheDcTfc);

      // Combined tax-free cash for this milestone
      const combinedAnnualTfc = annualTfc + matchingDbLumpSum;
      const combinedMilestoneTfc = totalTrancheDcTfc + matchingDbLumpSum;

      // Update cumulative trackers chronologically
      // Notice: DB lump sum is ONLY added to cumulative TFC in the tranche where it is taken (age 60)!
      runningCumulativeDcTfc += totalTrancheDcTfc;
      runningCumulativeTfc += totalTrancheDcTfc + matchingDbLumpSum;
      runningCumulativeGross += totalTrancheGross;
      runningCumulativeDrawdown += totalTrancheResidualDrawdown;

      const trancheCalendarYear = currentYear + Math.max(0, Number(t.age) - currentAge);

      const primaryLookupAge = isPartner ? targetAge - partnerAgeOffset : targetAge;
      const projYear = projections?.find((p) => p.age === primaryLookupAge);

      const engineUncryst = isPartner ? projYear?.partnerUncrystallisedPot : projYear?.primaryUncrystallisedPot;
      const engineCryst = isPartner ? projYear?.partnerCrystallisedPot : projYear?.primaryCrystallisedPot;

      // Chronological Pot Tracker
      // User requirement: "Uncrystallised Pot Remaining is incorrect", "Each tranche should include the crysaliised pot balance"
      const runningUncrystallisedPot = (mode === 'phased_tranches' && engineUncryst !== undefined && (engineUncryst > 0 || projYear?.potDepleted))
        ? engineUncryst
        : Math.max(0, referenceStartingPot - runningCumulativeGross);
      const runningCrystallisedPot = (mode === 'phased_tranches' && engineCryst !== undefined)
        ? engineCryst
        : runningCumulativeDrawdown;

      return {
        tranche: t,
        idx,
        age: Number(t.age),
        endAge,
        isRecurring,
        yearsCount,
        calendarYear: trancheCalendarYear,
        annualGross,
        annualTfc,
        annualResidualDrawdown,
        totalTrancheGross,
        totalTrancheTfc: totalTrancheDcTfc,
        totalTrancheResidualDrawdown,
        tfcPercentage: t.pclsPercent ?? 25,
        targetPot: t.targetPot || 'stocks_and_shares_isa',
        matchingDbLumpSum,
        matchingDbAges,
        matchingDbNames,
        matchingDbPensions,
        combinedAnnualTfc,
        combinedMilestoneTfc,
        isDbOnlyMilestone: Boolean(isDbOnlyMilestone),
        runningCumulativeDcTfc,
        runningCumulativeTfc,
        remainingLsaAfterThis: Math.max(0, lsaLimit - runningCumulativeDcTfc),
        runningUncrystallisedPot,
        runningCrystallisedPot,
      };
    });
  }, [
    allScheduledTranches,
    ownerDbPensions,
    priorDbLumpSum,
    lsaLimit,
    currentYear,
    currentAge,
    referenceStartingPot,
    mode,
    projections,
    partnerAgeOffset,
    isPartner,
  ]);

  // Aggregate totals
  const totalGrossCrystallised = trancheDetails.reduce((sum, d) => sum + d.totalTrancheGross, 0);
  const totalTfcFromTranches = trancheDetails.reduce((sum, d) => sum + d.totalTrancheTfc, 0);
  const totalResidualToDrawdown = trancheDetails.reduce((sum, d) => sum + d.totalTrancheResidualDrawdown, 0);
  const totalAllTfc = totalTfcFromTranches + dbLumpSum;
  const isLsaExceeded = totalTfcFromTranches > lsaLimit;
  const lsaHeadroomRemaining = Math.max(0, lsaLimit - totalTfcFromTranches);

  // Maximum gross for bar scaling
  const maxGrossBar = useMemo(() => {
    if (trancheDetails.length === 0) return 100000;
    const maxVal = Math.max(...trancheDetails.map((d) => d.annualGross));
    return Math.max(100000, maxVal);
  }, [trancheDetails]);

  // 1-Click activate phased crystallisation mode
  const handleActivatePhasedMode = () => {
    if (!onChange) return;
    if (isPartner) {
      onChange({
        ...profile,
        partnerCrystallisationMode: 'phased_tranches',
        partnerTakeLumpSumAtStart: false,
      });
    } else {
      onChange({
        ...profile,
        crystallisationMode: 'phased_tranches',
        takeLumpSumAtStart: false,
      });
    }
  };

  // Add sample tranche if none exists
  const handleAddSampleTranche = () => {
    if (!onChange) return;
    const newTranche: CrystallisationTranche = {
      id: `tranche-${Date.now()}`,
      name: 'Sample Tranche 1',
      owner: isPartner ? 'partner' : 'primary',
      age: Math.max(57, currentAge),
      amount: Math.min(100000, effectiveLsaLimitForDc > 0 ? effectiveLsaLimitForDc * 4 : 100000),
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    const currentAll = profile.crystallisationTranches || [];
    const updated = [...currentAll, newTranche];

    if (isPartner) {
      onChange({
        ...profile,
        partnerCrystallisationMode: 'phased_tranches',
        partnerTakeLumpSumAtStart: false,
        partnerCrystallisationTranches: updated.filter((t) => t.owner === 'partner'),
        crystallisationTranches: updated,
      });
    } else {
      onChange({
        ...profile,
        crystallisationMode: 'phased_tranches',
        takeLumpSumAtStart: false,
        crystallisationTranches: updated,
      });
    }
  };

  // Add a tranche specifically matching a DB pension lump sum age
  const handleAddMatchingTranche = (targetAge: number) => {
    if (!onChange) return;
    const availableLsa = Math.max(0, effectiveLsaLimitForDc - totalTfcFromTranches);
    const maxGrossForLsa = Math.floor(availableLsa * 4);
    const defaultAmount = Math.min(100000, maxGrossForLsa > 0 ? maxGrossForLsa : 100000);

    const newTranche: CrystallisationTranche = {
      id: `tranche-${Date.now()}`,
      name: `Crystallisation Tranche (Age ${targetAge})`,
      owner: isPartner ? 'partner' : 'primary',
      age: targetAge,
      amount: defaultAmount,
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    const currentAll = profile.crystallisationTranches || [];
    const updated = [...currentAll, newTranche];

    if (isPartner) {
      onChange({
        ...profile,
        partnerCrystallisationMode: 'phased_tranches',
        partnerTakeLumpSumAtStart: false,
        partnerCrystallisationTranches: updated.filter((t) => t.owner === 'partner'),
        crystallisationTranches: updated,
      });
    } else {
      onChange({
        ...profile,
        crystallisationMode: 'phased_tranches',
        takeLumpSumAtStart: false,
        crystallisationTranches: updated,
      });
    }
  };

  return (
    <div id="card-tranche-visualisation" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
            <Split className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Phased Crystallisation Tranches Breakdown
              </h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                mode === 'phased_tranches'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}>
                {mode === 'phased_tranches' ? 'Phased Tranches Active' : `Current Mode: ${mode.toUpperCase()}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualising calculated 25% Tax-Free Cash (TFC) and 75% residual Flexi-Access Drawdown pension designation per tranche
            </p>
          </div>
        </div>

        {/* Partner / Primary Selector */}
        {isCouple && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedOwner('primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedOwner === 'primary'
                  ? 'bg-white dark:bg-slate-700 text-primary-700 dark:text-primary-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedOwner('partner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedOwner === 'partner'
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{profile.partnerName || 'Partner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mode Advisory Notice if not phased */}
      {mode !== 'phased_tranches' && (
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-950 dark:text-amber-100">
                Plan is currently set to &ldquo;{mode === 'upfront' ? 'Full Upfront PCLS' : 'UFPLS / Drip-Feed'}&rdquo;
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                The visual breakdown below displays your configured crystallisation tranches. To apply this split pot strategy to your main decumulation projections, activate Phased Crystallisation mode.
              </p>
            </div>
          </div>
          {onChange && (
            <button
              type="button"
              onClick={handleActivatePhasedMode}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              Activate Phased Tranches Mode
            </button>
          )}
        </div>
      )}

      {/* Defined Benefit Scheme Information Banner */}
      {dbLumpSum > 0 && (
        <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/60 rounded-xl text-blue-700 dark:text-blue-300 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-black text-blue-950 dark:text-blue-100">
                Defined Benefit (DB) Pension Lump Sum Scheduled
              </span>
              <span className="font-mono font-bold text-blue-900 dark:text-blue-200 bg-blue-200/70 dark:bg-blue-900/70 px-2 py-0.5 rounded text-[11px]">
                DB Lump Sum: £{dbLumpSum.toLocaleString()} at Age {ownerDbPensions.map((p) => p.startAge || 60).join(', ')}
              </span>
            </div>
            <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 leading-relaxed">
              Your phased crystallisation tranches display your <strong>full £{lsaLimit.toLocaleString()}</strong> Tax-Free Cash (TFC) allowance without deduction of your DB scheme lump sum. Your Defined Benefit scheme pays <strong>£{dbLumpSum.toLocaleString()}</strong> tax-free at age {ownerDbPensions.map((p) => p.startAge || 60).join(', ')}, which is taken in its matching tranche milestone.
            </p>
          </div>
        </div>
      )}

      {/* Unmatched DB Scheme Lump Sum Banner with 1-Click Add Tranche */}
      {unmatchedDbPensions.length > 0 && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-950 dark:text-amber-100">
                DB Pension Lump Sum Scheduled at {unmatchedDbPensions.map((u) => `Age ${u.startAge || 60} (£${(u.taxFreeLumpSum || 0).toLocaleString()})`).join(', ')}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Your Defined Benefit scheme lump sum is taken at age {unmatchedDbPensions.map((u) => u.startAge || 60).join(', ')}, independent of earlier DC access ages. To pair your DC crystallisation with this lump sum, add a matching tranche at that age.
              </p>
            </div>
          </div>
          {onChange && (
            <div className="flex items-center gap-2 shrink-0">
              {unmatchedDbPensions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleAddMatchingTranche(Number(u.startAge || 60))}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Add Tranche at Age {u.startAge || 60}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LSA Exceeded Warning */}
      {isLsaExceeded && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-rose-950 dark:text-rose-100">Lump Sum Allowance (LSA) Capped:</strong>
            <span>
              Total tax-free cash across tranches (£{totalTfcFromTranches.toLocaleString()}) exceeds your full £{lsaLimit.toLocaleString()} allowance by £{(totalTfcFromTranches - lsaLimit).toLocaleString()}. Under HMRC rules, any excess lump sum is subject to income tax at your marginal rate.
            </span>
          </div>
        </div>
      )}

      {/* Executive KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Gross */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Scheduled Gross</span>
            <Coins className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
            £{totalGrossCrystallised.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            {activeTranches.length} active {activeTranches.length === 1 ? 'tranche' : 'tranches'}
          </div>
        </div>

        {/* Metric 2: Tax-Free Cash (TFC 25%) */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>Tax-Free Cash (TFC)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
            £{totalTfcFromTranches.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
            25% PCLS into ISAs / Savings
          </div>
        </div>

        {/* Metric 3: Residual into Drawdown (75%) */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1">
          <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
            <span>Residual to Drawdown</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">
            £{totalResidualToDrawdown.toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium">
            75% Flexi-Access Drawdown Pot
          </div>
        </div>

        {/* Metric 4: LSA Headroom */}
        <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1">
          <div className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center justify-between">
            <span>Remaining TFC Headroom</span>
            <PieChart className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
            £{lsaHeadroomRemaining.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
            Of £{lsaLimit.toLocaleString()} full allowance
          </div>
        </div>
      </div>

      {/* Lifetime Allowance Usage Progress Gauge */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tax-Free Cash (TFC) Full Allowance Allocation</span>
          </span>
          <span className="font-mono text-[11px]">
            £{totalTfcFromTranches.toLocaleString()} / £{lsaLimit.toLocaleString()} ({Math.min(100, Math.round((totalTfcFromTranches / (lsaLimit || 1)) * 100))}%)
          </span>
        </div>

        {/* Segmented Bar */}
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
          {/* DC Tranches TFC segment */}
          <div
            style={{ width: `${Math.min(100, (totalTfcFromTranches / lsaLimit) * 100)}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`DC Tranches Tax-Free Cash: £${totalTfcFromTranches.toLocaleString()} of £${lsaLimit.toLocaleString()} full allowance`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Phased Tranches TFC: £{totalTfcFromTranches.toLocaleString()}</span>
            </span>
            {dbLumpSum > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>DB Lump Sum: £{dbLumpSum.toLocaleString()} (Age {ownerDbPensions.map((p) => p.startAge || 60).join(', ')})</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Remaining Headroom: £{lsaHeadroomRemaining.toLocaleString()}</span>
            </span>
          </div>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            HMRC Cap: £{lsaLimit.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Main Visual: Waterfall / Stacked Bars per Tranche */}
      {trancheDetails.length === 0 ? (
        <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Crystallisation Tranches Defined for {personName}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Phased crystallisation allows you to split your pension into uncrystallised assets (which continue growing tax-free) and crystallised flexi-access drawdown, taking 25% tax-free lump sums systematically over time.
          </p>
          {onChange && (
            <button
              type="button"
              onClick={handleAddSampleTranche}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <Coins className="w-4 h-4" />
              <span>Add Initial Phased Crystallisation Tranche (£100k)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Tranche-by-Tranche Stacked Visualisation</span>
            </h4>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>25% Tax-Free Cash (TFC)</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400">
                <span className="w-2.5 h-2.5 rounded bg-indigo-600" />
                <span>75% Residual to Drawdown</span>
              </span>
            </div>
          </div>

          {/* Visual Bars Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {trancheDetails.map((item) => {
              const totalMilestoneGross = item.isDbOnlyMilestone ? item.matchingDbLumpSum : item.annualGross;
              const tfcRatio = totalMilestoneGross > 0 ? (item.annualTfc / totalMilestoneGross) * 100 : 25;
              const drawdownRatio = totalMilestoneGross > 0 ? (item.annualResidualDrawdown / totalMilestoneGross) * 100 : 75;

              return (
                <div
                  key={item.tranche.id}
                  className={`rounded-2xl border p-4 space-y-3 shadow-xs transition-colors ${
                    item.matchingDbLumpSum > 0
                      ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/80 hover:border-amber-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  {/* Tranche Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {item.tranche.name || `Tranche ${item.idx + 1}`}
                        </span>
                        {item.isDbOnlyMilestone && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded text-[9px] font-black border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>DB Scheme Lump Sum</span>
                          </span>
                        )}
                        {item.isRecurring && (
                          <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded text-[9px] font-black uppercase">
                            Annual
                          </span>
                        )}
                        {item.matchingDbLumpSum > 0 && !item.isDbOnlyMilestone && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded text-[9px] font-black border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>+£{(item.matchingDbLumpSum / 1000)}k DB</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          {item.isRecurring
                            ? `Ages ${item.age}–${item.endAge} (${item.yearsCount} yrs)`
                            : `Age ${item.age} (${item.calendarYear})`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white block">
                        {item.isDbOnlyMilestone
                          ? `£${item.matchingDbLumpSum.toLocaleString()}`
                          : `£${item.annualGross.toLocaleString()}${item.isRecurring ? '/yr' : ''}`}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.isDbOnlyMilestone ? 'DB Tax-Free Lump Sum' : 'Gross Crystallised'}
                      </span>
                    </div>
                  </div>

                  {/* Note advising DB pension lump sum is being taken in this tranche */}
                  {item.matchingDbLumpSum > 0 && (
                    <div className="p-3 bg-amber-100/90 dark:bg-amber-950/80 rounded-xl border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-[11px] flex items-start gap-2.5 shadow-xs">
                      <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 flex-1">
                        <div className="font-extrabold flex items-center justify-between flex-wrap gap-1">
                          <span>DB Pension Lump Sum Taken in this Tranche</span>
                          <span className="bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 px-1.5 py-0.2 rounded text-[10px] font-black">
                            +£{item.matchingDbLumpSum.toLocaleString()} at Age {item.matchingDbAges}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-900 dark:text-amber-300 leading-snug">
                          <strong>Note:</strong> {item.matchingDbNames} pays a <strong>£{item.matchingDbLumpSum.toLocaleString()}</strong> tax-free lump sum at scheme start age {item.matchingDbAges}. This DB pension lump sum is taken in this tranche milestone at age {item.matchingDbAges}{item.annualTfc > 0 ? ` alongside your DC 25% tax-free cash allowance (£${item.annualTfc.toLocaleString()})` : ''}.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Stacked Proportional Bar */}
                  <div className="space-y-1">
                    <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-200 dark:bg-slate-700 shadow-inner">
                      {item.isDbOnlyMilestone ? (
                        <div
                          style={{ width: '100%' }}
                          className="bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center text-[10px] font-bold text-amber-950 tracking-tight"
                          title={`DB Tax-Free Lump Sum: £${item.matchingDbLumpSum.toLocaleString()}`}
                        >
                          DB Tax-Free Lump Sum: £{item.matchingDbLumpSum.toLocaleString()}
                        </div>
                      ) : (
                        <>
                          {/* DC 25% Tax-Free Cash */}
                          <div
                            style={{ width: `${tfcRatio}%` }}
                            className="bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight"
                            title={`Tax-Free Cash (Full Allowance): £${item.annualTfc.toLocaleString()}`}
                          >
                            {tfcRatio > 12 ? `25% TFC: £${Math.round(item.annualTfc / 1000)}k` : ''}
                          </div>
                          {/* 75% Residual to Drawdown */}
                          <div
                            style={{ width: `${drawdownRatio}%` }}
                            className="bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight"
                            title={`Residual into Drawdown: £${item.annualResidualDrawdown.toLocaleString()}`}
                          >
                            {drawdownRatio > 20 ? `75% Drawdown: £${Math.round(item.annualResidualDrawdown / 1000)}k` : ''}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-0.5 flex-wrap gap-1">
                      {item.isDbOnlyMilestone ? (
                        <span className="text-amber-800 dark:text-amber-300 font-bold">
                          DB Lump Sum: £{item.matchingDbLumpSum.toLocaleString()}
                        </span>
                      ) : (
                        <>
                          <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                            TFC: £{item.annualTfc.toLocaleString()} (Full {item.tfcPercentage}% Allowance){item.isRecurring ? '/yr' : ''}
                          </span>
                          <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                            Drawdown: £{item.annualResidualDrawdown.toLocaleString()}{item.isRecurring ? '/yr' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Destination & Impact Breakdown */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>Cash Destination:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {TARGET_POT_LABELS[item.targetPot]?.split(' ')[0] || 'Stocks & Shares ISA'}
                      </span>
                    </div>
                    {!item.isDbOnlyMilestone && (
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                        <span>Tax-Free Cash (Full Allowance):</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                          £{item.annualTfc.toLocaleString()} ({item.tfcPercentage}%){item.isRecurring ? '/yr' : ''}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>Crystallised Pot Balance:</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        £{item.runningCrystallisedPot.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>Uncrystallised Pot Remaining:</span>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        £{item.runningUncrystallisedPot.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>Cumulative TFC Drawn:</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        £{item.runningCumulativeTfc.toLocaleString()}
                        {item.matchingDbLumpSum > 0 && (
                          <span className="text-[9px] font-normal text-amber-700 dark:text-amber-400 ml-1">
                            (incl. £{item.matchingDbLumpSum.toLocaleString()} DB)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px] pt-0.5 border-t border-slate-100 dark:border-slate-800">
                      <span>LSA Headroom After:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        £{item.remainingLsaAfterThis.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Tabular Ledger */}
          <div className="mt-4 pt-2">
            <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              <span>Detailed Tranche Ledger Table</span>
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Tranche</th>
                    <th className="py-2.5 px-3">Age / Year</th>
                    <th className="py-2.5 px-3">Gross Crystallised</th>
                    <th className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300">Tax-Free Cash (TFC)</th>
                    <th className="py-2.5 px-3 text-indigo-700 dark:text-indigo-300">Residual into Drawdown</th>
                    <th className="py-2.5 px-3 text-indigo-700 dark:text-indigo-300">Crystallised Pot Balance</th>
                    <th className="py-2.5 px-3 text-purple-700 dark:text-purple-300">Uncrystallised Pot Remaining</th>
                    <th className="py-2.5 px-3">Cumulative TFC Drawn</th>
                    <th className="py-2.5 px-3">TFC Target Pot</th>
                    <th className="py-2.5 px-3 text-right">LSA Headroom Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  {trancheDetails.map((d) => (
                    <tr key={d.tranche.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        {d.tranche.name || `Tranche ${d.idx + 1}`}
                        {d.isDbOnlyMilestone && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[9px] font-black border border-amber-300 dark:border-amber-800">
                            DB Scheme Milestone
                          </span>
                        )}
                        {d.isRecurring && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded text-[9px] font-black">
                            Annual
                          </span>
                        )}
                        {d.matchingDbLumpSum > 0 && !d.isDbOnlyMilestone && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded text-[9px] font-black border border-amber-300 dark:border-amber-800">
                            +DB Lump Sum (Age {d.matchingDbAges})
                          </span>
                        )}
                        {d.matchingDbLumpSum > 0 && (
                          <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Note: Defined Benefit pension lump sum (£{d.matchingDbLumpSum.toLocaleString()}) is taken at age {d.matchingDbAges} in this tranche</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {d.isRecurring ? `Ages ${d.age}–${d.endAge}` : `Age ${d.age} (${d.calendarYear})`}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {d.isDbOnlyMilestone
                          ? `£${d.matchingDbLumpSum.toLocaleString()} (DB)`
                          : `£${d.annualGross.toLocaleString()}${d.isRecurring ? '/yr' : ''}`}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {/* Display full allowance, NOT any DB pension lump sum */}
                        {d.isDbOnlyMilestone ? (
                          <span className="text-amber-800 dark:text-amber-300">
                            £{d.matchingDbLumpSum.toLocaleString()} (DB Lump Sum)
                          </span>
                        ) : (
                          <span>
                            £{d.annualTfc.toLocaleString()} ({d.tfcPercentage}%){d.isRecurring ? '/yr' : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        £{d.annualResidualDrawdown.toLocaleString()}{d.isRecurring ? '/yr' : ''}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        £{d.runningCrystallisedPot.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-purple-700 dark:text-purple-300">
                        £{d.runningUncrystallisedPot.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        £{d.runningCumulativeTfc.toLocaleString()}
                        {d.matchingDbLumpSum > 0 && (
                          <span className="block text-[9px] font-normal text-amber-700 dark:text-amber-400">
                            (incl. £{d.matchingDbLumpSum.toLocaleString()} DB)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[10px]">
                        {TARGET_POT_LABELS[d.targetPot] || 'Stocks & Shares ISA'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                        £{d.remainingLsaAfterThis.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-black text-slate-900 dark:text-white border-t-2 border-slate-200 dark:border-slate-700">
                    <td className="py-2.5 px-3">Total Across Tranches</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-semibold">{trancheDetails.length} active</td>
                    <td className="py-2.5 px-3 font-mono">£{totalGrossCrystallised.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400">
                      £{totalTfcFromTranches.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-indigo-700 dark:text-indigo-400">£{totalResidualToDrawdown.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-700 dark:text-indigo-400">
                      £{(trancheDetails[trancheDetails.length - 1]?.runningCrystallisedPot || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-purple-700 dark:text-purple-300">
                      £{(trancheDetails[trancheDetails.length - 1]?.runningUncrystallisedPot || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400">
                      £{totalAllTfc.toLocaleString()}
                      {dbLumpSum > 0 && (
                        <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-400">
                          (£{totalTfcFromTranches.toLocaleString()} DC + £{dbLumpSum.toLocaleString()} DB)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-normal">--</td>
                    <td className="py-2.5 px-3 text-right font-mono text-purple-700 dark:text-purple-300">£{lsaHeadroomRemaining.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
