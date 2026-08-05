import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { YearProjection, UserProfile, TaxCalculationResult } from '../types';
import {
  Table,
  Search,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Receipt,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  ArrowDownRight,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface AnnualBreakdownTableProps {
  projections: YearProjection[];
  profile: UserProfile;
  taxResult: TaxCalculationResult;
  onChange?: (updatedProfile: UserProfile) => void;
}

export const AnnualBreakdownTable: React.FC<AnnualBreakdownTableProps> = ({
  projections,
  profile,
  taxResult,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'accumulation' | 'retirement' | 'failure'>('all');
  const adjustInflation = profile.adjustForInflation ?? false;
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15); // 15 or 0 for All
  const [showTaxBreakdownModal, setShowTaxBreakdownModal] = useState<YearProjection | null>(null);

  // Inflation rate
  const inflationRate = (profile.expectedInflationRate || 2.5) / 100;

  // Format currency helper
  const formatCurrency = (val: number, isReal = false, yearOffset = 0) => {
    let finalVal = val;
    if (isReal && yearOffset > 0) {
      finalVal = val / Math.pow(1 + inflationRate, yearOffset);
    }
    return `£${Math.round((finalVal) || 0).toLocaleString()}`;
  };

  // Identify shortfall & failure years
  const shortfallYears = useMemo(() => {
    return projections.filter((p) => p.isRetired && (p.incomeShortfall || 0) > 0);
  }, [projections]);

  const shortfallYearsCount = shortfallYears.length;
  const firstShortfallAge = shortfallYears[0]?.age;

  // Filtered projections based on phase filter and search
  const filteredProjections = useMemo(() => {
    return projections.filter((p) => {
      // Phase check
      if (phaseFilter === 'accumulation' && p.isRetired) return false;
      if (phaseFilter === 'retirement' && !p.isRetired) return false;
      if (phaseFilter === 'failure' && (!p.isRetired || (p.incomeShortfall || 0) <= 0)) return false;

      // Search check (age or year)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.trim().toLowerCase();
        const matchesAge = p.age.toString().includes(term);
        const matchesYear = p.year.toString().includes(term);
        return matchesAge || matchesYear;
      }

      return true;
    });
  }, [projections, phaseFilter, searchTerm]);

  // Pagination calculation
  const totalRows = filteredProjections.length;
  const isAllRows = rowsPerPage === 0;
  const totalPages = isAllRows ? 1 : Math.ceil(totalRows / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProjections = useMemo(() => {
    if (isAllRows) return filteredProjections;
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredProjections.slice(start, start + rowsPerPage);
  }, [filteredProjections, isAllRows, safeCurrentPage, rowsPerPage]);

  // Aggregate KPI summary calculations across full projected lifespan
  const kpiSummary = useMemo(() => {
    let totalGrowth = 0;
    let totalWithdrawals = 0;
    let totalTaxWithdrawals = 0;
    let totalContributions = 0;

    projections.forEach((p) => {
      const yearOffset = p.age - profile.currentAge;
      const scale = adjustInflation ? 1 / Math.pow(1 + inflationRate, yearOffset) : 1;

      totalGrowth += (p.estimatedPotGrowth || 0) * scale;
      totalWithdrawals += (p.totalWithdrawalAmount || 0) * scale;
      totalTaxWithdrawals += (p.taxOnWithdrawal || 0) * scale;
      totalContributions += (p.annualContributionTotal || 0) * scale;
    });

    const finalPot = projections[projections.length - 1]?.totalPot || 0;
    const finalPotScaled = adjustInflation
      ? finalPot / Math.pow(1 + inflationRate, projections.length - 1)
      : finalPot;

    return {
      totalGrowth: Math.round(totalGrowth),
      totalWithdrawals: Math.round(totalWithdrawals),
      totalTaxWithdrawals: Math.round(totalTaxWithdrawals),
      totalContributions: Math.round(totalContributions),
      finalPot: Math.round(finalPotScaled),
    };
  }, [projections, profile.currentAge, adjustInflation, inflationRate]);

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'Age',
      'Year',
      'Phase',
      'Plan Status',
      'Ending Pot (£)',
      'Estimated Growth (£)',
      'Total Withdrawals (£)',
      'Tax on Withdrawals (£)',
      'Net Retirement Income (£)',
      'Target Income Requirement (£)',
      'Income Shortfall (£)',
      'State Pension (£)',
      'DB Pension (£)',
      'Annuity Payout (£)',
      'Contributions (£)',
    ];

    const csvRows = projections.map((p) => {
      const yearOffset = p.age - profile.currentAge;
      const scale = adjustInflation ? 1 / Math.pow(1 + inflationRate, yearOffset) : 1;

      return [
        p.age,
        p.year,
        p.isRetired ? 'Retirement' : 'Accumulation',
        p.isRetired ? ((p.incomeShortfall || 0) > 0 ? 'Plan Failure' : 'On Track') : 'Accumulating',
        Math.round(p.totalPot * scale),
        Math.round((p.estimatedPotGrowth || 0) * scale),
        Math.round((p.totalWithdrawalAmount || 0) * scale),
        Math.round((p.taxOnWithdrawal || 0) * scale),
        Math.round((p.netRetirementIncome || 0) * scale),
        Math.round((p.targetRetirementIncome || 0) * scale),
        Math.round((p.incomeShortfall || 0) * scale),
        Math.round((p.statePensionReceived || 0) * scale),
        Math.round((p.dbPensionIncomeReceived || 0) * scale),
        Math.round((p.annuityIncomeReceived || 0) * scale),
        Math.round((p.annualContributionTotal || 0) * scale),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `uk_retirement_annual_breakdown_age_${profile.currentAge}_to_100.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors"
    >
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60">
            <Table className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Annual Breakdown Table
              </h2>
              <span className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/80">
                Age {profile.currentAge} → 100
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Year-by-year projections, target income requirements, and plan feasibility
            </p>
          </div>
        </div>

        {/* Top Actions: Real/Nominal toggle & Export CSV */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-bold cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <input
              type="checkbox"
              checked={adjustInflation}
              onChange={(e) => onChange?.({ ...profile, adjustForInflation: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <span>Today's £ (Real Terms)</span>
          </label>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Plan Status KPI Tile */}
        <div className={`p-3.5 rounded-2xl border ${
          shortfallYearsCount > 0
            ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
            : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-500 dark:text-slate-400">
            {shortfallYearsCount > 0 ? (
              <AlertTriangle className="w-3 h-3 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            )}
            <span>Plan Feasibility</span>
          </div>
          <div className={`text-base font-black mt-0.5 ${
            shortfallYearsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {shortfallYearsCount > 0 ? 'Plan Failure' : 'Plan Success'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
            {shortfallYearsCount > 0
              ? `${shortfallYearsCount} deficit yr${shortfallYearsCount > 1 ? 's' : ''} (Age ${firstShortfallAge}+)`
              : '100% target income met'}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span>Total Lifetime Growth</span>
          </div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            +£{(kpiSummary.totalGrowth || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Compound interest earned
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-indigo-500" />
            <span>Total Drawdown</span>
          </div>
          <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            £{(kpiSummary.totalWithdrawals || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Total pot withdrawals
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <Receipt className="w-3 h-3 text-rose-500" />
            <span>Withdrawal Tax</span>
          </div>
          <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-0.5">
            £{(kpiSummary.totalTaxWithdrawals || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            HMRC tax on pension
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
          <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <PiggyBank className="w-3 h-3 text-amber-500" />
            <span>Age 100 Estate</span>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
            £{(kpiSummary.finalPot || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {kpiSummary.finalPot > 0 ? 'Remaining balance' : 'Pot depleted'}
          </p>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Phase Filter Buttons */}
        <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              setPhaseFilter('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              phaseFilter === 'all'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Years ({projections.length})
          </button>
          <button
            onClick={() => {
              setPhaseFilter('accumulation');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              phaseFilter === 'accumulation'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Accumulation
          </button>
          <button
            onClick={() => {
              setPhaseFilter('retirement');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              phaseFilter === 'retirement'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Retirement
          </button>
          {shortfallYearsCount > 0 && (
            <button
              onClick={() => {
                setPhaseFilter('failure');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                phaseFilter === 'failure'
                  ? 'bg-rose-600 text-white shadow-xs font-black'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Plan Failure ({shortfallYearsCount})</span>
            </button>
          )}
        </div>

        {/* Search Input & Pagination Row Count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search age or year..."
              aria-label="Search projections"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <option value={15}>15 rows/pg</option>
            <option value={30}>30 rows/pg</option>
            <option value={0}>Show All</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold">
              <th scope="col" className="py-3 px-3.5 sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">Age & Year</th>
              <th scope="col" className="py-3 px-3.5">Phase / Status</th>
              <th scope="col" className="py-3 px-3.5 text-right">Ending Pot Balance</th>
              <th scope="col" className="py-3 px-3.5 text-right text-emerald-600 dark:text-emerald-400">
                Est. Pot Growth
              </th>
              <th scope="col" className="py-3 px-3.5 text-right text-indigo-600 dark:text-indigo-400">
                Total Withdrawals
              </th>
              <th scope="col" className="py-3 px-3.5 text-right text-rose-600 dark:text-rose-400">
                Income Tax (Retirement / Salary)
              </th>
              <th scope="col" className="py-3 px-3.5 text-right">Net Income vs Target</th>
              <th scope="col" className="py-3 px-3.5 text-right text-teal-600 dark:text-teal-400">Annual Surplus (£/yr)</th>
              <th scope="col" className="py-3 px-3.5 text-right text-teal-700 dark:text-teal-300">Cumulative Surplus (£)</th>
              <th scope="col" className="py-3 px-2 text-center">Info</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
            {paginatedProjections.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                  No projection years match your search criteria.
                </td>
              </tr>
            ) : (
              paginatedProjections.map((p) => {
                const yearOffset = p.age - profile.currentAge;
                const isRetireYear = p.age === profile.targetRetirementAge;
                const isCouple = Boolean(profile.isCouplePlanning);
                const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
                const partnerSpaPrimaryAge = (profile.partnerStatePensionAge || 67) - partnerAgeDiff;
                const isPrimarySpYear = (profile.includeStatePension ?? true) && p.age === (profile.statePensionAge || 67);
                const isPartnerSpYear = isCouple && (profile.partnerIncludeStatePension ?? true) && p.age === partnerSpaPrimaryAge;
                const isStatePensionYear = isPrimarySpYear || isPartnerSpYear;
                const hasShortfall = p.isRetired && (p.incomeShortfall || 0) > 0;

                return (
                  <tr
                    key={p.age}
                    className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      hasShortfall
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-l-4 border-l-rose-500 font-bold'
                        : isRetireYear
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                        : p.potDepleted
                        ? 'bg-rose-50/30 dark:bg-rose-950/20'
                        : ''
                    }`}
                  >
                    {/* Age & Year */}
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 border-r border-slate-200/80 dark:border-slate-800">
                      <span>Age {p.age}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1.5 font-normal">
                        ({p.year})
                      </span>
                    </td>

                    {/* Phase / Status Badge */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {hasShortfall ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 dark:text-rose-200 bg-rose-100 dark:bg-rose-950 px-2.5 py-1 rounded-md border border-rose-300 dark:border-rose-800 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span>Plan Failure (-{formatCurrency(p.incomeShortfall || 0, adjustInflation, yearOffset)})</span>
                        </span>
                      ) : p.potDepleted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Pot Depleted</span>
                        </span>
                      ) : p.isRetired ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60">
                            <span>Retirement</span>
                            {isPrimarySpYear && isPartnerSpYear && <span>(State Pension - Both)</span>}
                            {isPrimarySpYear && !isPartnerSpYear && <span>({isCouple ? `${profile.name || 'Primary'} State Pension` : 'State Pension'})</span>}
                            {!isPrimarySpYear && isPartnerSpYear && <span>({profile.partnerName || 'Partner'} State Pension)</span>}
                          </span>
                          {p.annuityPurchasedThisYear ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-950 px-2 py-0.5 rounded-md border border-pink-300 dark:border-pink-800">
                              🌸 Annuity Purchased ({formatCurrency(p.annuityIncomeReceived, adjustInflation, yearOffset)}/yr)
                            </span>
                          ) : (p.annuityIncomeReceived || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/70 px-2 py-0.5 rounded-md border border-pink-200 dark:border-pink-800/60">
                              🌸 Annuity Active ({formatCurrency(p.annuityIncomeReceived, adjustInflation, yearOffset)}/yr)
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                          <span>Accumulation</span>
                        </span>
                      )}
                    </td>

                    {/* Ending Pot Balance */}
                    <td className="py-3 px-3.5 text-right font-extrabold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(p.totalPot, adjustInflation, yearOffset)}
                    </td>

                    {/* Estimated Pot Growth */}
                    <td className="py-3 px-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      +{(p.estimatedPotGrowth || 0) > 0 ? formatCurrency(p.estimatedPotGrowth, adjustInflation, yearOffset) : '£0'}
                    </td>

                    {/* Total Withdrawals & Annuity Income */}
                    <td className="py-3 px-3.5 text-right font-extrabold whitespace-nowrap">
                      {p.isRetired ? (
                        <div className="flex flex-col text-right">
                          {p.totalWithdrawalAmount > 0 && (
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(p.totalWithdrawalAmount, adjustInflation, yearOffset)}
                            </span>
                          )}
                          {(p.annuityIncomeReceived || 0) > 0 && (
                            <span className="text-pink-600 dark:text-pink-400 text-[11px] font-bold">
                              +{formatCurrency(p.annuityIncomeReceived, adjustInflation, yearOffset)} (Annuity)
                            </span>
                          )}
                          {p.totalWithdrawalAmount === 0 && (p.annuityIncomeReceived || 0) === 0 && (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* Tax (Withdrawals or Salary) */}
                    <td className="py-3 px-3.5 text-right font-bold whitespace-nowrap">
                      {p.isRetired ? (
                        p.taxOnWithdrawal > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatCurrency(p.taxOnWithdrawal, adjustInflation, yearOffset)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            £0 (Tax-Free)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px]" title="Income tax + NI on gross salary in accumulation">
                          {formatCurrency(p.totalTaxPaid || 0, adjustInflation, yearOffset)}
                        </span>
                      )}
                    </td>

                    {/* Net Income vs Target */}
                    <td className="py-3 px-3.5 text-right font-semibold whitespace-nowrap">
                      {p.isRetired ? (
                        <div className="flex flex-col text-right">
                          <span className={hasShortfall ? "text-rose-600 dark:text-rose-400 font-extrabold" : "text-slate-900 dark:text-slate-100 font-bold"}>
                            {formatCurrency(p.netRetirementIncome, adjustInflation, yearOffset)} /yr
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                            Target: {formatCurrency(p.targetRetirementIncome || 0, adjustInflation, yearOffset)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          +{formatCurrency(p.annualContributionTotal, adjustInflation, yearOffset)} /yr
                        </span>
                      )}
                    </td>

                    {/* Annual Surplus (£/yr) */}
                    <td className="py-3 px-3.5 text-right font-extrabold whitespace-nowrap">
                      {p.isRetired && (p.annualIncomeExcess || 0) > 0 ? (
                        <span className="text-teal-600 dark:text-teal-400">
                          +{formatCurrency(p.annualIncomeExcess || 0, adjustInflation, yearOffset)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">£0</span>
                      )}
                    </td>

                    {/* Cumulative Surplus (£) */}
                    <td className="py-3 px-3.5 text-right font-black whitespace-nowrap">
                      {p.isRetired && (p.cumulativeExcessIncome || 0) > 0 ? (
                        <span className="text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-lg border border-teal-200 dark:border-teal-800">
                          {formatCurrency(p.cumulativeExcessIncome || 0, adjustInflation, yearOffset)}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">£0</span>
                      )}
                    </td>

                    {/* Info Modal Trigger */}
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => setShowTaxBreakdownModal(p)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="View Detailed Breakdown"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isAllRows && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {(safeCurrentPage - 1) * rowsPerPage + 1} to{' '}
            {Math.min(safeCurrentPage * rowsPerPage, totalRows)} of {totalRows} projection years
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-bold text-slate-800 dark:text-slate-200">
              Page {safeCurrentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detailed Year Inspection Modal */}
      <AnimatePresence>
        {showTaxBreakdownModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Age {showTaxBreakdownModal.age} Breakdown ({showTaxBreakdownModal.year})
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {showTaxBreakdownModal.isRetired ? 'Retirement Phase' : 'Accumulation Phase'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTaxBreakdownModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Sub-breakdown details */}
              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex justify-between">
                    <span>Portfolio Pots Breakdown</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      Total £{(showTaxBreakdownModal.totalPot || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 font-bold">Pension</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        £{(showTaxBreakdownModal.pensionPot || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 font-bold">ISA</div>
                      <div className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        £{(showTaxBreakdownModal.isaPot || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-400 font-bold">Cash/GIA</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                        £{(showTaxBreakdownModal.cashGiaPot || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Pot Growth (1yr):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      +£{(showTaxBreakdownModal.estimatedPotGrowth || 0).toLocaleString()}
                    </span>
                  </div>

                  {showTaxBreakdownModal.isRetired ? (
                    <>
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">State Pension:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          £{(showTaxBreakdownModal.statePensionReceived || 0).toLocaleString()}
                        </span>
                      </div>

                      {(showTaxBreakdownModal.annuityCapitalAllocated || 0) > 0 && (
                        <div className="p-3 bg-pink-50 dark:bg-pink-950/70 border border-pink-200 dark:border-pink-800/80 rounded-2xl text-pink-900 dark:text-pink-100 space-y-1 my-2">
                          <div className="font-extrabold text-xs flex items-center gap-1 text-pink-700 dark:text-pink-300">
                            <span>🌸 Annuity Purchase Event</span>
                          </div>
                          <div className="text-xs flex justify-between">
                            <span>Pension Capital Converted:</span>
                            <span className="font-bold">£{(showTaxBreakdownModal.annuityCapitalAllocated || 0).toLocaleString()}</span>
                          </div>
                          <div className="text-xs flex justify-between font-extrabold text-pink-600 dark:text-pink-300">
                            <span>Starting Guaranteed Income:</span>
                            <span>£{(showTaxBreakdownModal.annuityIncomeReceived || 0).toLocaleString()}/yr (£{Math.round((showTaxBreakdownModal.annuityIncomeReceived || 0) / 12).toLocaleString()}/mo)</span>
                          </div>
                        </div>
                      )}

                      {(showTaxBreakdownModal.annuityIncomeReceived || 0) > 0 && (
                        <div className="py-2 flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Guaranteed Annuity Income:</span>
                          <span className="font-bold text-pink-600 dark:text-pink-400">
                            £{(showTaxBreakdownModal.annuityIncomeReceived || 0).toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">DB Pension / Fixed Income:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          £{((showTaxBreakdownModal.dbPensionIncomeReceived || 0) + (showTaxBreakdownModal.taxableFixedIncomeReceived || 0) + (showTaxBreakdownModal.taxFreeFixedIncomeReceived || 0)).toLocaleString()}
                        </span>
                      </div>

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Pension Drawdown (Taxable):</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          £{(showTaxBreakdownModal.pensionDrawdownTaxable || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">ISA / Cash Drawdown (Tax-Free):</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          £{((showTaxBreakdownModal.isaDrawdown || 0) + (showTaxBreakdownModal.cashDrawdown || 0) + (showTaxBreakdownModal.pensionDrawdownTaxFree || 0)).toLocaleString()}
                        </span>
                      </div>

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Income Tax Liability (Annuity, State & Pension):</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          -£{(showTaxBreakdownModal.taxOnWithdrawal || 0).toLocaleString()}
                        </span>
                      </div>

                      {(showTaxBreakdownModal.savingsInterestTax || 0) > 0 && (
                        <div className="py-2 flex justify-between items-center">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Savings Interest Tax (above PSA):</span>
                          <span className="font-extrabold text-amber-600 dark:text-amber-400">
                            -£{(showTaxBreakdownModal.savingsInterestTax || 0).toLocaleString()}
                          </span>
                        </div>
                      )}

                      <div className="py-2 flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700 font-extrabold text-sm">
                        <span className="text-slate-900 dark:text-white">Net Retirement Income:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          £{(showTaxBreakdownModal.netRetirementIncome || 0).toLocaleString()} /yr
                        </span>
                      </div>

                      {showTaxBreakdownModal.incomeShortfall && showTaxBreakdownModal.incomeShortfall > 0 && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-900 dark:text-rose-100 space-y-1 mt-2">
                          <div className="font-extrabold text-xs flex items-center gap-1 text-rose-600 dark:text-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Plan Failure: Income Shortfall</span>
                          </div>
                          <div className="text-xs flex justify-between">
                            <span>Target Requirement:</span>
                            <span className="font-bold">£{(showTaxBreakdownModal.targetRetirementIncome || 0).toLocaleString()}</span>
                          </div>
                          <div className="text-xs flex justify-between font-extrabold text-rose-600 dark:text-rose-400">
                            <span>Deficit Shortfall:</span>
                            <span>-£{(showTaxBreakdownModal.incomeShortfall || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Annual Pot Contributions:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +£{(showTaxBreakdownModal.annualContributionTotal || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Pension Tax Relief Gained:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          +£{(showTaxBreakdownModal.annualTaxReliefTotal || (0) || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="py-2 flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Income Tax & NI on Salary:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          £{(showTaxBreakdownModal.totalTaxPaid || (0) || 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowTaxBreakdownModal(null)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Close Detail View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
