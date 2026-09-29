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
import { getLsaLimit, getPartnerLsaLimit } from '../utils/ukTaxEngine';

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

  // Initial reference DC pot
  const referenceDcPot = useMemo(() => {
    if (isPartner) {
      return (pots.partnerWorkplacePension || 0) + (pots.partnerSipp || 0);
    }
    return (pots.workplacePension || 0) + (pots.sipp || 0);
  }, [isPartner, pots]);

  // LSA and DB lump sum
  const lsaLimit = useMemo(() => {
    return isPartner ? getPartnerLsaLimit(profile) : getLsaLimit(profile);
  }, [isPartner, profile]);

  const dbLumpSum = useMemo(() => {
    return (profile.dbPensions || [])
      .filter((p) => p.enabled && (isPartner ? p.owner === 'partner' : (p.owner || 'primary') !== 'partner'))
      .reduce((sum, p) => sum + (p.taxFreeLumpSum || 0), 0);
  }, [isPartner, profile.dbPensions]);

  const effectiveLsaLimitForDc = Math.max(0, lsaLimit - dbLumpSum);

  // Compute calculated metrics per tranche
  const trancheDetails = useMemo(() => {
    let runningCumulativeTfc = dbLumpSum;
    let runningUncrystallisedPot = referenceDcPot;
    let runningCrystallisedPot = 0;

    return activeTranches.map((t, idx) => {
      const gross = t.amount || 0;
      const pclsPct = Math.min(25, Math.max(0, t.pclsPercent ?? 25)) / 100;
      const isRecurring = t.frequency === 'recurring';
      const endAge = isRecurring && t.endAge && t.endAge >= t.age ? t.endAge : t.age;
      const yearsCount = isRecurring ? Math.max(1, endAge - t.age + 1) : 1;

      // Single year breakdown
      const annualGross = gross;
      const remainingLsaBeforeThis = Math.max(0, lsaLimit - runningCumulativeTfc);
      const annualTfc = Math.min(Math.round(annualGross * pclsPct), remainingLsaBeforeThis);
      const annualResidualDrawdown = Math.max(0, annualGross - annualTfc);

      // Total across recurring span
      const totalTrancheGross = annualGross * yearsCount;
      const totalTrancheTfc = Math.min(annualTfc * yearsCount, remainingLsaBeforeThis);
      const totalTrancheResidualDrawdown = Math.max(0, totalTrancheGross - totalTrancheTfc);

      runningCumulativeTfc += totalTrancheTfc;
      runningUncrystallisedPot = Math.max(0, runningUncrystallisedPot - totalTrancheGross);
      runningCrystallisedPot += totalTrancheResidualDrawdown;

      const trancheCalendarYear = currentYear + Math.max(0, t.age - currentAge);

      return {
        tranche: t,
        idx,
        age: t.age,
        endAge,
        isRecurring,
        yearsCount,
        calendarYear: trancheCalendarYear,
        annualGross,
        annualTfc,
        annualResidualDrawdown,
        totalTrancheGross,
        totalTrancheTfc,
        totalTrancheResidualDrawdown,
        tfcPercentage: t.pclsPercent ?? 25,
        targetPot: t.targetPot || 'stocks_and_shares_isa',
        runningCumulativeTfc,
        remainingLsaAfterThis: Math.max(0, lsaLimit - runningCumulativeTfc),
        runningUncrystallisedPot,
        runningCrystallisedPot,
      };
    });
  }, [activeTranches, dbLumpSum, lsaLimit, referenceDcPot, currentYear, currentAge]);

  // Aggregate totals
  const totalGrossCrystallised = trancheDetails.reduce((sum, d) => sum + d.totalTrancheGross, 0);
  const totalTfcFromTranches = trancheDetails.reduce((sum, d) => sum + d.totalTrancheTfc, 0);
  const totalResidualToDrawdown = trancheDetails.reduce((sum, d) => sum + d.totalTrancheResidualDrawdown, 0);
  const totalAllTfc = totalTfcFromTranches + dbLumpSum;
  const isLsaExceeded = totalAllTfc > lsaLimit;
  const lsaHeadroomRemaining = Math.max(0, lsaLimit - totalAllTfc);

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

      {/* Defined Benefit Scheme LSA Deduction Callout */}
      {dbLumpSum > 0 && (
        <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-black text-amber-950 dark:text-amber-100">
                Defined Benefit (DB) Pension Lump Sum Offset Included
              </span>
              <span className="font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-900/70 px-2 py-0.5 rounded text-[11px]">
                DB Lump Sum: £{dbLumpSum.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Under HMRC rules, your DB scheme tax-free lump sum of <strong>£{dbLumpSum.toLocaleString()}</strong> reduces your <strong>£{lsaLimit.toLocaleString()}</strong> Lifetime Lump Sum Allowance (LSA). This leaves <strong>£{effectiveLsaLimitForDc.toLocaleString()}</strong> of tax-free headroom specifically available for your DC phased crystallisation tranches.
            </p>
          </div>
        </div>
      )}

      {/* LSA Exceeded Warning */}
      {isLsaExceeded && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-rose-950 dark:text-rose-100">Lump Sum Allowance (LSA) Capped:</strong>
            <span>
              Total tax-free cash across tranches (£{totalTfcFromTranches.toLocaleString()}) and DB lump sum (£{dbLumpSum.toLocaleString()}) reaches <strong>£{totalAllTfc.toLocaleString()}</strong>, exceeding the £{lsaLimit.toLocaleString()} limit by £{(totalAllTfc - lsaLimit).toLocaleString()}. Under HMRC rules, any excess lump sum is subject to income tax at your marginal rate.
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
            <span>Remaining LSA Headroom</span>
            <PieChart className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
            £{lsaHeadroomRemaining.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">
            Of £{lsaLimit.toLocaleString()} LSA limit
          </div>
        </div>
      </div>

      {/* Lifetime Allowance Usage Progress Gauge */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Lifetime Lump Sum Allowance (LSA) Allocation</span>
          </span>
          <span className="font-mono text-[11px]">
            £{totalAllTfc.toLocaleString()} / £{lsaLimit.toLocaleString()} ({Math.min(100, Math.round((totalAllTfc / (lsaLimit || 1)) * 100))}%)
          </span>
        </div>

        {/* Segmented Bar */}
        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
          {/* DB Lump Sum segment */}
          {dbLumpSum > 0 && (
            <div
              style={{ width: `${Math.min(100, (dbLumpSum / lsaLimit) * 100)}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`DB Scheme Lump Sum: £${dbLumpSum.toLocaleString()}`}
            />
          )}
          {/* DC Tranches TFC segment */}
          <div
            style={{ width: `${Math.min(100 - (dbLumpSum / lsaLimit) * 100, (totalTfcFromTranches / lsaLimit) * 100)}%` }}
            className="bg-emerald-500 h-full transition-all"
            title={`DC Tranches Tax-Free Cash: £${totalTfcFromTranches.toLocaleString()}`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-4 flex-wrap">
            {dbLumpSum > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>DB Lump Sum: £{dbLumpSum.toLocaleString()}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>DC Phased Tranches: £{totalTfcFromTranches.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span>Headroom: £{lsaHeadroomRemaining.toLocaleString()}</span>
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
              const tfcRatio = item.annualGross > 0 ? (item.annualTfc / item.annualGross) * 100 : 25;
              const drawdownRatio = item.annualGross > 0 ? (item.annualResidualDrawdown / item.annualGross) * 100 : 75;

              return (
                <div
                  key={item.tranche.id}
                  className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                >
                  {/* Tranche Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                          {item.tranche.name || `Tranche ${item.idx + 1}`}
                        </span>
                        {item.isRecurring && (
                          <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 rounded text-[9px] font-black uppercase">
                            Annual
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
                        £{item.annualGross.toLocaleString()}{item.isRecurring ? '/yr' : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Gross Crystallised
                      </span>
                    </div>
                  </div>

                  {/* Stacked Proportional Bar */}
                  <div className="space-y-1">
                    <div className="h-6 w-full rounded-xl overflow-hidden flex bg-slate-200 dark:bg-slate-700 shadow-inner">
                      {/* 25% Tax-Free Cash */}
                      <div
                        style={{ width: `${tfcRatio}%` }}
                        className="bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight"
                        title={`Tax-Free Cash: £${item.annualTfc.toLocaleString()}`}
                      >
                        {tfcRatio > 15 ? `£${Math.round(item.annualTfc / 1000)}k` : ''}
                      </div>
                      {/* 75% Residual to Drawdown */}
                      <div
                        style={{ width: `${drawdownRatio}%` }}
                        className="bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight"
                        title={`Residual into Drawdown: £${item.annualResidualDrawdown.toLocaleString()}`}
                      >
                        {drawdownRatio > 25 ? `£${Math.round(item.annualResidualDrawdown / 1000)}k (75%)` : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                        TFC: £{item.annualTfc.toLocaleString()}{item.isRecurring ? '/yr' : ''}
                      </span>
                      <span className="text-indigo-700 dark:text-indigo-300 font-bold">
                        Drawdown: £{item.annualResidualDrawdown.toLocaleString()}{item.isRecurring ? '/yr' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Destination & Impact Breakdown */}
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-[10px]">
                      <span>Cash Destination:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {TARGET_POT_LABELS[item.targetPot]?.split(' ')[0] || 'ISA'}
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
                    <th className="py-2.5 px-3 text-emerald-700 dark:text-emerald-300">Tax-Free Lump Sum (TFC)</th>
                    <th className="py-2.5 px-3 text-indigo-700 dark:text-indigo-300">Residual into Drawdown</th>
                    <th className="py-2.5 px-3">TFC Target Pot</th>
                    <th className="py-2.5 px-3 text-right">LSA Headroom Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                  {trancheDetails.map((d) => (
                    <tr key={d.tranche.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                        {d.tranche.name || `Tranche ${d.idx + 1}`}
                        {d.isRecurring && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded text-[9px] font-black">
                            Annual
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {d.isRecurring ? `Ages ${d.age}–${d.endAge}` : `Age ${d.age} (${d.calendarYear})`}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        £{d.annualGross.toLocaleString()}{d.isRecurring ? '/yr' : ''}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        £{d.annualTfc.toLocaleString()} ({d.tfcPercentage}%){d.isRecurring ? '/yr' : ''}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        £{d.annualResidualDrawdown.toLocaleString()}{d.isRecurring ? '/yr' : ''}
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
                    <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400">£{totalTfcFromTranches.toLocaleString()}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-700 dark:text-indigo-400">£{totalResidualToDrawdown.toLocaleString()}</td>
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
