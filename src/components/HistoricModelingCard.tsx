import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { UserProfile, InvestmentPots, TaxCalculationResult } from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import {
  runHistoricSimulation,
  AssetAllocation,
  HistoricRunResult,
  HistoricYearSnapshot,
} from '../utils/historicModelingEngine';
import { HISTORIC_MARKET_DATA } from '../data/historicMarketData';
import {
  History,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Calendar,
  Sliders,
  Info,
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen,
  BarChart2,
  Zap,
} from 'lucide-react';

interface HistoricModelingCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  onChange?: (updatedProfile: UserProfile) => void;
}

export const HistoricModelingCard: React.FC<HistoricModelingCardProps> = ({
  profile,
  pots,
  taxResult,
}) => {
  // Asset Allocation State (default 75% equity, 15% bond, 10% cash)
  const [allocation, setAllocation] = useState<AssetAllocation>({
    equityPercent: 75,
    bondPercent: 15,
    cashPercent: 10,
  });

  const [maxAge, setMaxAge] = useState<number>(95);
  const [adjustReal, setAdjustReal] = useState<boolean>(true); // Inflation adjusted
  const [activeTab, setActiveTab] = useState<'trajectories' | 'sequences_chart' | 'heatmap' | 'table' | 'market_data'>('sequences_chart');
  const [sequenceSubView, setSequenceSubView] = useState<'spaghetti' | 'bar'>('spaghetti');
  const [reverseSequence, setReverseSequence] = useState<boolean>(false);

  
  // Selected start year for deep dive inspection (default to worst start year or 1975)
  const [selectedStartYear, setSelectedStartYear] = useState<number | null>(null);

  // Search filter for table view
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isCouple = Boolean(profile.isCouplePlanning);
  const primarySpEnabled = profile.includeStatePension ?? true;
  const partnerSpEnabled = isCouple && (profile.partnerIncludeStatePension ?? true);
  const primarySpa = profile.statePensionAge || 67;
  const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
  const partnerSpaPrimaryAge = (profile.partnerStatePensionAge || 67) - partnerAgeDiff;
  const isSameSpaYear = primarySpEnabled && partnerSpEnabled && (primarySpa === partnerSpaPrimaryAge);

  const primaryRetireAge = profile.targetRetirementAge || 60;
  const partnerRetirePrimaryAge = (profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60) - partnerAgeDiff;
  const isSameRetireYear = isCouple && (primaryRetireAge === partnerRetirePrimaryAge);

  const primaryAccessAge = getPensionAccessAge(profile);
  const partnerAccessAgeRaw = getPartnerPensionAccessAge(profile);
  const partnerAccessPrimaryAge = partnerAccessAgeRaw - partnerAgeDiff;
  const isSameAccessYear = isCouple && (primaryAccessAge === partnerAccessPrimaryAge);

  // Run the 50-year historic simulation
  const simSummary = useMemo(() => {
    return runHistoricSimulation(profile, pots, taxResult, maxAge, allocation, reverseSequence);
  }, [profile, pots, taxResult, allocation, maxAge, reverseSequence]);

  // Set default selected start year once computed
  React.useEffect(() => {
    if (selectedStartYear === null && simSummary.worstStartYear) {
      setSelectedStartYear(simSummary.worstStartYear.startYear);
    }
  }, [simSummary]);

  const selectedRun = useMemo(() => {
    if (!selectedStartYear) return simSummary.worstStartYear;
    return simSummary.runResults.find((r) => r.startYear === selectedStartYear) || simSummary.worstStartYear;
  }, [simSummary, selectedStartYear]);

  // Handle asset allocation slider changes
  const handleEquityChange = (eq: number) => {
    const newEq = Math.min(100, Math.max(0, eq));
    const remaining = 100 - newEq;
    const currentNonEq = allocation.bondPercent + allocation.cashPercent;
    let newBond = 0;
    let newCash = 0;
    if (currentNonEq > 0) {
      newBond = Math.round((allocation.bondPercent / currentNonEq) * remaining);
      newCash = remaining - newBond;
    } else {
      newBond = Math.round(remaining * 0.6);
      newCash = remaining - newBond;
    }
    setAllocation({ equityPercent: newEq, bondPercent: newBond, cashPercent: newCash });
  };

  const handleBondChange = (bd: number) => {
    const newBd = Math.min(100, Math.max(0, bd));
    const remaining = 100 - newBd;
    const currentNonBd = allocation.equityPercent + allocation.cashPercent;
    let newEq = 0;
    let newCash = 0;
    if (currentNonBd > 0) {
      newEq = Math.round((allocation.equityPercent / currentNonBd) * remaining);
      newCash = remaining - newEq;
    } else {
      newEq = Math.round(remaining * 0.8);
      newCash = remaining - newEq;
    }
    setAllocation({ equityPercent: newEq, bondPercent: newBd, cashPercent: newCash });
  };

  const handleCashChange = (cs: number) => {
    const newCs = Math.min(100, Math.max(0, cs));
    const remaining = 100 - newCs;
    const currentNonCs = allocation.equityPercent + allocation.bondPercent;
    let newEq = 0;
    let newBd = 0;
    if (currentNonCs > 0) {
      newEq = Math.round((allocation.equityPercent / currentNonCs) * remaining);
      newBd = remaining - newEq;
    } else {
      newEq = Math.round(remaining * 0.8);
      newBd = remaining - newEq;
    }
    setAllocation({ equityPercent: newEq, bondPercent: newBd, cashPercent: newCs });
  };

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(2)}M`;
    if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${val.toLocaleString()}`;
  };

  // Prepare chart data for trajectories
  const chartData = useMemo(() => {
    return simSummary.aggregateTrajectory.map((point, i) => {
      const selectedVal = selectedRun && selectedRun.trajectory[i]
        ? (adjustReal ? selectedRun.trajectory[i].totalPotReal : selectedRun.trajectory[i].totalPot)
        : null;

      return {
        age: point.age,
        calendarYear: point.calendarYear,
        p10: adjustReal ? point.p10RealPot : point.p10TotalPot,
        p50: adjustReal ? point.p50RealPot : point.p50TotalPot,
        p90: adjustReal ? point.p90RealPot : point.p90TotalPot,
        selectedYearPot: selectedVal,
      };
    });
  }, [simSummary, adjustReal, selectedRun]);

  // Prepare data for 75 Sequences Bar Chart (Start Year vs Final Wealth)
  const all50BarData = useMemo(() => {
    return simSummary.runResults.map((run) => {
      const finalVal = adjustReal ? run.finalRealBalance : run.finalNominalBalance;
      return {
        startYear: run.startYear,
        event: run.startEvent,
        finalWealth: Math.max(0, finalVal),
        minWealth: run.minPotBalance,
        retirementPot: run.retirementPotBalance,
        isSuccess: run.isSuccess,
        depletedAtAge: run.depletedAtAge,
        fillColor: !run.isSuccess
          ? '#ef4444'
          : finalVal < 200000
          ? '#f59e0b'
          : '#10b981',
      };
    });
  }, [simSummary.runResults, adjustReal]);

  // Prepare data for All 75 Overlaid Sequence Trajectories (Age vs Wealth across all 75 sequences)
  const all50OverlaidTrajectories = useMemo(() => {
    if (!simSummary.runResults || simSummary.runResults.length === 0) return [];
    const firstRun = simSummary.runResults[0];
    if (!firstRun || !firstRun.trajectory) return [];

    return firstRun.trajectory.map((_, ageIndex) => {
      const point: Record<string, any> = {
        age: firstRun.trajectory[ageIndex].age,
        calendarYear: firstRun.trajectory[ageIndex].calendarYear,
      };
      simSummary.runResults.forEach((run) => {
        const snap = run.trajectory[ageIndex];
        if (snap) {
          point[`run_${run.startYear}`] = adjustReal ? snap.totalPotReal : snap.totalPot;
        }
      });
      return point;
    });
  }, [simSummary.runResults, adjustReal]);

  // Filtered start years for table
  const filteredRuns = useMemo(() => {
    if (!searchQuery.trim()) return simSummary.runResults;
    const q = searchQuery.toLowerCase();
    return simSummary.runResults.filter(
      (r) =>
        r.startYear.toString().includes(q) ||
        r.startEvent.toLowerCase().includes(q) ||
        (r.isSuccess ? 'success' : 'failed').includes(q)
    );
  }, [simSummary, searchQuery]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base flex items-center gap-2">
                <span>Historic Market Data Modeling (75-Year Backtest)</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                  1950 – 2024
                </span>
              </h2>
              {profile.maximizedSpendConfig?.enabled && (
                <span className="text-[10px] font-extrabold bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                  Max Spend Solver Active (£{(profile.maximizedSpendConfig.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0).toLocaleString()}/yr)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulates your exact strategy 75 times across every historical 75-year sequence starting from 1950 to 2024 (looping data for long horizons).
            </p>
          </div>
        </div>

        {/* Global Controls: Real vs Nominal & Max Age */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setAdjustReal(true)}
              className={`px-3 py-1 rounded-lg transition-all ${
                adjustReal
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Today's £ (Real)
            </button>
            <button
              onClick={() => setAdjustReal(false)}
              className={`px-3 py-1 rounded-lg transition-all ${
                !adjustReal
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Future £ (Nominal)
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span>Target Max Age:</span>
            <select
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-2.5 py-1 text-xs font-bold outline-none"
            >
              <option value={85}>85</option>
              <option value={90}>90</option>
              <option value={95}>95</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
            <input
              type="checkbox"
              id="reverseSequence"
              checked={reverseSequence}
              onChange={(e) => setReverseSequence(e.target.checked)}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="reverseSequence" className="cursor-pointer">Reverse Sequence (Stress Test)</label>
          </div>
        </div>
      </div>

      {/* Max Spend Solver Active Banner */}
      {profile.maximizedSpendConfig?.enabled && (() => {
        const solvedTarget = profile.maximizedSpendConfig.targetAnnualIncome || profile.targetRetirementIncomeAnnual || 0;
        const baselineTarget = profile.maximizedSpendConfig.baselineTargetAnnualIncome || 0;
        const delta = solvedTarget - baselineTarget;
        return (
          <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                    Max Spend Solver Data (75-Year Historic Backtest)
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    Die With Zero
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80 font-medium">
                  Historic backtesting is simulated using your solved target of{' '}
                  <strong className="font-extrabold text-amber-950 dark:text-amber-100">
                    £{solvedTarget.toLocaleString()}/yr
                  </strong>
                  {baselineTarget > 0 && delta > 0 && (
                    <> (unlocked <strong className="text-emerald-700 dark:text-emerald-300">+£{delta.toLocaleString()}/yr</strong> vs baseline)</>
                  )}
                  .
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/60 px-3 py-1.5 rounded-xl border border-amber-300/60 dark:border-amber-800 shrink-0 self-end sm:self-auto">
              Target Horizon: Age {profile.maximizedSpendConfig.targetEndAge || profile.lifeExpectancyAge || 95}
            </div>
          </div>
        );
      })()}

      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Success Rate */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Historic Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {simSummary.successRate}%
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {simSummary.successfulRuns} of {simSummary.totalRuns} start years lasted to age {maxAge}
          </p>
        </div>

        {/* Median Final Portfolio */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Median Wealth (Age {maxAge})</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
            {formatCurrency(adjustReal ? simSummary.medianFinalReal : simSummary.medianFinalNominal)}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            50th percentile outcome across 50 market cycles
          </p>
        </div>

        {/* Worst Start Year */}
        <div
          onClick={() => simSummary.worstStartYear && setSelectedStartYear(simSummary.worstStartYear.startYear)}
          className="bg-amber-50/60 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-1 cursor-pointer hover:border-amber-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>Worst Start Year</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <span>{simSummary.worstStartYear?.startYear}</span>
            {simSummary.worstStartYear?.depletedAtAge ? (
              <span className="text-xs bg-rose-200 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 font-bold px-2 py-0.5 rounded-md">
                Failed at Age {simSummary.worstStartYear.depletedAtAge}
              </span>
            ) : (
              <span className="text-xs bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 font-bold px-2 py-0.5 rounded-md">
                Min {formatCurrency(simSummary.worstStartYear?.minPotBalance || 0)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 truncate">
            {simSummary.worstStartYear?.startEvent}
          </p>
        </div>

        {/* Best Start Year */}
        <div
          onClick={() => simSummary.bestStartYear && setSelectedStartYear(simSummary.bestStartYear.startYear)}
          className="bg-emerald-50/60 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-1 cursor-pointer hover:border-emerald-400 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span>Best Start Year</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
            {simSummary.bestStartYear?.startYear}
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
            Final: {formatCurrency(adjustReal ? simSummary.bestStartYear?.finalRealBalance || 0 : simSummary.bestStartYear?.finalNominalBalance || 0)}
          </p>
        </div>

      </div>

      {/* Asset Allocation Quick Sliders */}
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <span>Tested Backtest Asset Mix</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
            <span>Equities: <strong className="text-emerald-600 dark:text-emerald-400">{allocation.equityPercent}%</strong></span>
            <span>Bonds: <strong className="text-indigo-600 dark:text-indigo-400">{allocation.bondPercent}%</strong></span>
            <span>Cash: <strong className="text-amber-600 dark:text-amber-400">{allocation.cashPercent}%</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Equity Weighting</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{allocation.equityPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={allocation.equityPercent}
              onChange={(e) => handleEquityChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Bond Weighting</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{allocation.bondPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={allocation.bondPercent}
              onChange={(e) => handleBondChange(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400">
              <span>Cash Weighting</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{allocation.cashPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={allocation.cashPercent}
              onChange={(e) => handleCashChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('sequences_chart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sequences_chart'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>75 Sequences Start Year Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('trajectories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'trajectories'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Historical Trajectories Chart</span>
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'heatmap'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>75 Start Years Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('table')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'table'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Start Year Breakdown Table</span>
        </button>

        <button
          onClick={() => setActiveTab('market_data')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'market_data'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>75-Year Market Dataset (1950-2024)</span>
        </button>
      </div>

      {/* TAB 0: 75 SEQUENCES START YEAR PLOT CHART */}
      {activeTab === 'sequences_chart' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              <span>
                Comparing outcome across all 75 historical sequence start years (1950–2024). Click any bar to inspect.
              </span>
              {selectedRun && (
                <span className="font-bold text-pink-600 dark:text-pink-400 ml-2 inline-block">
                  Selected: {selectedRun.startYear} ({selectedRun.startEvent})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setSequenceSubView('spaghetti')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sequenceSubView === 'spaghetti'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  All 75 Paths Overlaid
                </button>
                <button
                  onClick={() => setSequenceSubView('bar')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    sequenceSubView === 'bar'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Ending Wealth Bar Plot
                </button>
              </div>
            </div>
          </div>

          {/* Subview 1: Bar Chart plotting each of the 75 Start Years */}
          {sequenceSubView === 'bar' && (
            <div className="space-y-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={all50BarData}
                    margin={{ top: 15, right: 10, left: 10, bottom: 25 }}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        const clickedYear = state.activePayload[0].payload.startYear;
                        if (clickedYear) setSelectedStartYear(clickedYear);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="startYear"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-60}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 text-slate-100 p-3 rounded-xl shadow-xl text-xs space-y-1 z-50">
                              <div className="font-extrabold text-amber-400 flex items-center justify-between gap-4">
                                <span>Start Year {data.startYear}</span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    !data.isSuccess
                                      ? 'bg-rose-500/30 text-rose-300'
                                      : 'bg-emerald-500/30 text-emerald-300'
                                  }`}
                                >
                                  {data.isSuccess ? 'Succeeded' : `Failed at Age ${data.depletedAtAge}`}
                                </span>
                              </div>
                              <div className="text-slate-300 font-medium text-[11px]">{data.event}</div>
                              <div className="pt-1.5 border-t border-slate-800 flex justify-between gap-4">
                                <span className="text-slate-400">Ending Wealth (Age {maxAge}):</span>
                                <strong className="text-emerald-400">{formatCurrency(data.finalWealth)}</strong>
                              </div>
                              <div className="flex justify-between gap-4 text-[11px]">
                                <span className="text-slate-400">Lowest Balance:</span>
                                <strong className="text-amber-300">{formatCurrency(data.minWealth)}</strong>
                              </div>
                              <div className="text-[10px] text-pink-400 font-semibold pt-1">
                                Click bar to select & inspect full details
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={adjustReal ? simSummary.medianFinalReal : simSummary.medianFinalNominal}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: `Median (${formatCurrency(adjustReal ? simSummary.medianFinalReal : simSummary.medianFinalNominal)})`,
                        fill: '#10b981',
                        fontSize: 11,
                        position: 'top',
                      }}
                    />
                    <Bar dataKey="finalWealth" name="Ending Wealth (£)" radius={[3, 3, 0, 0]} className="cursor-pointer">
                      {all50BarData.map((entry) => (
                        <Cell
                          key={`cell-${entry.startYear}`}
                          fill={entry.startYear === selectedStartYear ? '#ec4899' : entry.fillColor}
                          stroke={entry.startYear === selectedStartYear ? '#f472b6' : undefined}
                          strokeWidth={entry.startYear === selectedStartYear ? 2.5 : 0}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend & Summary Footer */}
              <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] pt-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span> Strong (&gt;£200k)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span> Low (&lt;£200k)
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span> Depleted Early
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-md bg-pink-500 inline-block"></span> Selected Year
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Total sequences evaluated: <strong>75 start years (1950–2024)</strong>
                </div>
              </div>
            </div>
          )}

          {/* Subview 2: All 75 Sequence Trajectories Overlaid (Age vs Wealth) */}
          {sequenceSubView === 'spaghetti' && (
            <div className="space-y-2">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={all50OverlaidTrajectories} margin={{ top: 54, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="age" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        formatCurrency(Number(value) || 0),
                        name.replace('run_', 'Start Year '),
                      ]}
                      labelFormatter={(label) => `Age ${label}`}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    {isSameRetireYear || !isCouple ? (
                      <ReferenceLine
                        x={primaryRetireAge}
                        stroke="#10b981"
                        strokeDasharray="4 4"
                        label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                      />
                    ) : (
                      <>
                        <ReferenceLine
                          x={primaryRetireAge}
                          stroke="#10b981"
                          strokeDasharray="4 4"
                          label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                        />
                        <ReferenceLine
                          x={partnerRetirePrimaryAge}
                          stroke="#059669"
                          strokeDasharray="4 4"
                          label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                        />
                      </>
                    )}

                    {isSameAccessYear ? (
                      <ReferenceLine
                        x={primaryAccessAge}
                        stroke="#0284c7"
                        strokeDasharray="3 3"
                        label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                      />
                    ) : (
                      <>
                        <ReferenceLine
                          x={primaryAccessAge}
                          stroke="#0284c7"
                          strokeDasharray="3 3"
                          label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                        />
                        {isCouple && (
                          <ReferenceLine
                            x={partnerAccessPrimaryAge}
                            stroke="#38bdf8"
                            strokeDasharray="3 3"
                            label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                          />
                        )}
                      </>
                    )}

                    {isSameSpaYear ? (
                      <ReferenceLine
                        x={primarySpa}
                        stroke="#8b5cf6"
                        strokeDasharray="4 4"
                        label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                      />
                    ) : (
                      <>
                        {primarySpEnabled && (
                          <ReferenceLine
                            x={primarySpa}
                            stroke="#8b5cf6"
                            strokeDasharray="4 4"
                            label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                          />
                        )}
                        {partnerSpEnabled && (
                          <ReferenceLine
                            x={partnerSpaPrimaryAge}
                            stroke="#ec4899"
                            strokeDasharray="4 4"
                            label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                          />
                        )}
                      </>
                    )}

                    {simSummary.runResults.map((run) => {
                      const isSelected = selectedStartYear === run.startYear;
                      return (
                        <Line
                          key={run.startYear}
                          type="monotone"
                          dataKey={`run_${run.startYear}`}
                          name={`Start Year ${run.startYear}`}
                          stroke={isSelected ? '#ec4899' : run.isSuccess ? '#94a3b8' : '#f87171'}
                          strokeWidth={isSelected ? 3.5 : 0.8}
                          strokeOpacity={isSelected ? 1 : run.isSuccess ? 0.25 : 0.6}
                          dot={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>
                  Every line represents one of the 75 historic sequence paths. Pink line highlights your currently selected start year ({selectedStartYear}).
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'trajectories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Showing Median (50th), 90th Best, 10th Worst paths across all 75 historic sequences.
              {selectedRun && (
                <span className="font-bold text-amber-600 dark:text-amber-400 ml-2">
                  Highlighted Path: Start Year {selectedRun.startYear} ({selectedRun.startEvent})
                </span>
              )}
            </span>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 54, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="age" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    formatCurrency(Number(value) || 0),
                    name === 'p90'
                      ? '90th Percentile (Strong Growth)'
                      : name === 'p50'
                      ? '50th Percentile (Median)'
                      : name === 'p10'
                      ? '10th Percentile (Weak Growth)'
                      : `Start Year ${selectedRun?.startYear} Trajectory`,
                  ]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                {isSameRetireYear || !isCouple ? (
                  <ReferenceLine
                    x={primaryRetireAge}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryRetireAge}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                    />
                    <ReferenceLine
                      x={partnerRetirePrimaryAge}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                    />
                  </>
                )}

                {isSameAccessYear ? (
                  <ReferenceLine
                    x={primaryAccessAge}
                    stroke="#0284c7"
                    strokeDasharray="3 3"
                    label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryAccessAge}
                      stroke="#0284c7"
                      strokeDasharray="3 3"
                      label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                    />
                    {isCouple && (
                      <ReferenceLine
                        x={partnerAccessPrimaryAge}
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                      />
                    )}
                  </>
                )}

                {isSameSpaYear ? (
                  <ReferenceLine
                    x={primarySpa}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    {primarySpEnabled && (
                      <ReferenceLine
                        x={primarySpa}
                        stroke="#8b5cf6"
                        strokeDasharray="4 4"
                        label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                      />
                    )}
                    {partnerSpEnabled && (
                      <ReferenceLine
                        x={partnerSpaPrimaryAge}
                        stroke="#ec4899"
                        strokeDasharray="4 4"
                        label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                      />
                    )}
                  </>
                )}

                <Line type="monotone" dataKey="p90" name="90th Percentile" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="p50" name="Median (50th)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="p10" name="10th Percentile" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                
                {selectedRun && (
                  <Line
                    type="monotone"
                    dataKey="selectedYearPot"
                    name={`Start Year ${selectedRun.startYear}`}
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: START YEARS HEATMAP GRID */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Click any of the 75 historical start year tiles below to inspect its trajectory and timeline.
            </span>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span> Succeeded (&gt;£200k)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block"></span> Succeeded (&lt;£200k)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span> Failed Early
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {simSummary.runResults.map((run) => {
              const isSelected = selectedStartYear === run.startYear;
              let bgClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800';
              
              if (!run.isSuccess) {
                bgClass = 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-800';
              } else if (run.finalRealBalance < 200000) {
                bgClass = 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800';
              }

              return (
                <button
                  key={run.startYear}
                  onClick={() => {
                    setSelectedStartYear(run.startYear);
                    setActiveTab('trajectories');
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer hover:scale-105 ${bgClass} ${
                    isSelected ? 'ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-slate-900 font-black' : 'font-semibold'
                  }`}
                >
                  <div className="text-xs font-bold">{run.startYear}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    {run.isSuccess ? formatCurrency(adjustReal ? run.finalRealBalance : run.finalNominalBalance) : `Age ${run.depletedAtAge}`}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: START YEAR BREAKDOWN TABLE */}
      {activeTab === 'table' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search year or event (e.g. 1987, Crash, 2008)..."
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filteredRuns.length} of 75 Start Years
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Start Year</th>
                  <th className="p-3">Historical Context Event</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Retirement Pot</th>
                  <th className="p-3 text-right">Lowest Pot</th>
                  <th className="p-3 text-right">Ending Wealth (Age {maxAge})</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRuns.map((run) => (
                  <tr
                    key={run.startYear}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      selectedStartYear === run.startYear ? 'bg-amber-50/50 dark:bg-amber-950/30' : ''
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{run.startYear}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{run.startEvent}</td>
                    <td className="p-3 font-bold">
                      {run.isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Succeeded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> Depleted at Age {run.depletedAtAge}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(run.retirementPotBalance)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(run.minPotBalance)}</td>
                    <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-100">
                      {formatCurrency(adjustReal ? run.finalRealBalance : run.finalNominalBalance)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedStartYear(run.startYear);
                          setActiveTab('trajectories');
                        }}
                        className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 text-amber-900 dark:text-amber-200 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STORED 75-YEAR MARKET DATASET */}
      {activeTab === 'market_data' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Stored UK & Global Market Dataset (1950 – 2024). Source: Historical Market Indexes & UK RPI/CPI.</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96">
            <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                <tr>
                  <th className="p-3">Year</th>
                  <th className="p-3 text-right">Equity Return</th>
                  <th className="p-3 text-right">Bond Return</th>
                  <th className="p-3 text-right">Cash Yield</th>
                  <th className="p-3 text-right">UK Inflation</th>
                  <th className="p-3">Historical Context & Economic Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {HISTORIC_MARKET_DATA.map((row) => (
                  <tr key={row.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{row.year}</td>
                    <td className={`p-3 text-right font-bold ${row.equityReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.equityReturn >= 0 ? '+' : ''}{row.equityReturn}%
                    </td>
                    <td className={`p-3 text-right font-semibold ${row.bondReturn >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {row.bondReturn >= 0 ? '+' : ''}{row.bondReturn}%
                    </td>
                    <td className="p-3 text-right font-semibold text-amber-600 dark:text-amber-400">{row.cashReturn}%</td>
                    <td className={`p-3 text-right font-bold ${row.inflation > 5.0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {row.inflation}%
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 font-medium">{row.event}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SELECTED START YEAR INSPECTOR BANNER */}
      {selectedRun && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-sm shrink-0">
                {selectedRun.startYear}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                  <span>Start Year {selectedRun.startYear} Strategy Deep-Dive</span>
                  {selectedRun.isSuccess ? (
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Succeeded to Age {maxAge}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md">
                      Depleted at Age {selectedRun.depletedAtAge}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedRun.startEvent}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold self-end sm:self-auto">
              <div>
                <span className="text-slate-400">Retirement Pot: </span>
                <strong className="text-slate-100">{formatCurrency(selectedRun.retirementPotBalance)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Final Wealth: </span>
                <strong className="text-emerald-400">{formatCurrency(adjustReal ? selectedRun.finalRealBalance : selectedRun.finalNominalBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Timeline First 5 Sequence Years Highlight */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sequence Execution Highlights (First 5 Years of Plan)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {selectedRun.trajectory.slice(0, 5).map((snap, idx) => (
                <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>{snap.calendarYear} (Age {snap.age})</span>
                    <span className="text-pink-400 font-extrabold">{snap.histYear}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Eq: <strong className={snap.histEquityReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{snap.histEquityReturn >= 0 ? '+' : ''}{snap.histEquityReturn}%</strong> | Inf: <strong className="text-amber-400">{snap.histInflation}%</strong>
                  </div>
                  <div className="font-bold text-slate-100 text-xs pt-1 border-t border-slate-800/80">
                    Pot: {formatCurrency(adjustReal ? snap.totalPotReal : snap.totalPot)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
