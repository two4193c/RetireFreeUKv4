import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { UserProfile, InvestmentPots, InvestmentFeeConfig, PerPersonPotFees, SinglePotFeeConfig } from '../types';
import { DEFAULT_INVESTMENT_FEES, DEFAULT_SINGLE_POT_FEE } from '../utils/defaultData';
import { getTotalFeePercent, getPotFeePercent } from '../utils/assetAllocation';
import { generateProjections } from '../utils/projectionEngine';
import {
  Receipt,
  User,
  Users,
  Sliders,
  Layers,
  Sparkles,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  AlertCircle,
  ArrowDownRight,
  ShieldCheck,
  PieChart,
  Wallet,
} from 'lucide-react';

interface InvestmentFeesCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  pots?: InvestmentPots;
  onChange: (updatedProfile: UserProfile) => void;
}

export const InvestmentFeesCard: React.FC<InvestmentFeesCardProps> = ({ profile, pots, onChange ,
  isStudioMode}) => {
  const feeConfig: InvestmentFeeConfig = profile.investmentFees || DEFAULT_INVESTMENT_FEES;
  const isEnabled = Boolean(feeConfig.enabled);
  const perPotFeesEnabled = Boolean(feeConfig.perPotFeesEnabled);

  const [activePersonTab, setActivePersonTab] = useState<'primary' | 'partner'>('primary');
  const [chartViewMode, setChartViewMode] = useState<'trajectory' | 'breakdown'>('trajectory');

  const preReturn = profile.expectedInvestmentReturn ?? 6.5;
  const postReturn = profile.postRetirementReturn ?? 4.5;
  const globalFeePercent = getTotalFeePercent(feeConfig, pots || profile.pots, profile.partnerPots);

  const updateFeeConfig = (updated: InvestmentFeeConfig) => {
    onChange({
      ...profile,
      investmentFees: updated,
    });
  };

  const getPersonPots = (person: 'primary' | 'partner'): PerPersonPotFees => {
    const defaultPots = DEFAULT_INVESTMENT_FEES.primaryPots;
    if (person === 'primary') {
      return {
        workplacePension: feeConfig.primaryPots?.workplacePension || defaultPots?.workplacePension || DEFAULT_SINGLE_POT_FEE,
        sipp: feeConfig.primaryPots?.sipp || defaultPots?.sipp || DEFAULT_SINGLE_POT_FEE,
        stocksAndSharesIsa: feeConfig.primaryPots?.stocksAndSharesIsa || defaultPots?.stocksAndSharesIsa || DEFAULT_SINGLE_POT_FEE,
        cashIsa: feeConfig.primaryPots?.cashIsa || defaultPots?.cashIsa || { platformFeePercent: 0, fundFeePercent: 0, advisorFeePercent: 0 },
        gia: feeConfig.primaryPots?.gia || defaultPots?.gia || DEFAULT_SINGLE_POT_FEE,
      };
    } else {
      const defaultPartnerPots = DEFAULT_INVESTMENT_FEES.partnerPots;
      return {
        workplacePension: feeConfig.partnerPots?.workplacePension || defaultPartnerPots?.workplacePension || DEFAULT_SINGLE_POT_FEE,
        sipp: feeConfig.partnerPots?.sipp || defaultPartnerPots?.sipp || DEFAULT_SINGLE_POT_FEE,
        stocksAndSharesIsa: feeConfig.partnerPots?.stocksAndSharesIsa || defaultPartnerPots?.stocksAndSharesIsa || DEFAULT_SINGLE_POT_FEE,
        cashIsa: feeConfig.partnerPots?.cashIsa || defaultPartnerPots?.cashIsa || { platformFeePercent: 0, fundFeePercent: 0, advisorFeePercent: 0 },
        gia: feeConfig.partnerPots?.gia || defaultPartnerPots?.gia || DEFAULT_SINGLE_POT_FEE,
      };
    }
  };

  const updateSinglePotFee = (
    person: 'primary' | 'partner',
    potKey: keyof PerPersonPotFees,
    field: keyof SinglePotFeeConfig,
    val: number
  ) => {
    const currentPersonPots = getPersonPots(person);
    const updatedSinglePot: SinglePotFeeConfig = {
      ...(currentPersonPots[potKey] || DEFAULT_SINGLE_POT_FEE),
      [field]: Math.max(0, Math.min(5, val)),
    };

    const updatedPersonPots: PerPersonPotFees = {
      ...currentPersonPots,
      [potKey]: updatedSinglePot,
    };

    if (person === 'primary') {
      updateFeeConfig({
        ...feeConfig,
        primaryPots: updatedPersonPots,
      });
    } else {
      updateFeeConfig({
        ...feeConfig,
        partnerPots: updatedPersonPots,
      });
    }
  };

  // Balances
  const primaryWorkplaceBal = pots?.workplacePensionBalance ?? profile.workplacePensionBalance ?? 0;
  const primarySippBal = pots?.sippBalance ?? profile.sippBalance ?? 0;
  const primaryIsaBal = pots?.stocksAndSharesIsaBalance ?? profile.stocksAndSharesIsaBalance ?? 0;
  const primaryLisaBal = pots?.lisaBalance ?? profile.lisaBalance ?? 0;
  const primaryCashIsaBal = pots?.cashIsaBalance ?? profile.cashIsaBalance ?? 0;
  const primaryGiaBal = pots?.giaBalance ?? profile.giaBalance ?? 0;
  const primaryCashSavingsBal = pots?.cashSavingsBalance ?? profile.cashSavingsBalance ?? 0;

  const partnerPotsObj = profile.partnerPots;
  const partnerWorkplaceBal = partnerPotsObj?.workplacePensionBalance ?? profile.partnerWorkplacePensionBalance ?? 0;
  const partnerSippBal = partnerPotsObj?.sippBalance ?? profile.partnerSippBalance ?? 0;
  const partnerIsaBal = partnerPotsObj?.stocksAndSharesIsaBalance ?? profile.partnerIsaBalance ?? 0;
  const partnerLisaBal = partnerPotsObj?.lisaBalance ?? 0;
  const partnerCashIsaBal = partnerPotsObj?.cashIsaBalance ?? profile.partnerCashIsaBalance ?? 0;
  const partnerGiaBal = partnerPotsObj?.giaBalance ?? profile.partnerGiaBalance ?? 0;
  const partnerCashSavingsBal = partnerPotsObj?.cashSavingsBalance ?? 0;

  // Calculate annual drag for all pots
  const calculatePotDragPounds = (balance: number, feePercent: number) => Math.round((balance || 0) * (feePercent / 100));

  const primaryWorkplaceFee = getPotFeePercent(feeConfig, 'primary', 'workplacePension');
  const primarySippFee = getPotFeePercent(feeConfig, 'primary', 'sipp');
  const primaryIsaFee = getPotFeePercent(feeConfig, 'primary', 'stocksAndSharesIsa');
  const primaryLisaFee = getPotFeePercent(feeConfig, 'primary', 'stocksAndSharesIsa');
  const primaryCashIsaFee = getPotFeePercent(feeConfig, 'primary', 'cashIsa');
  const primaryGiaFee = getPotFeePercent(feeConfig, 'primary', 'gia');
  const primaryCashSavingsFee = getPotFeePercent(feeConfig, 'primary', 'cashIsa');

  const partnerWorkplaceFee = getPotFeePercent(feeConfig, 'partner', 'workplacePension');
  const partnerSippFee = getPotFeePercent(feeConfig, 'partner', 'sipp');
  const partnerIsaFee = getPotFeePercent(feeConfig, 'partner', 'stocksAndSharesIsa');
  const partnerLisaFee = getPotFeePercent(feeConfig, 'partner', 'stocksAndSharesIsa');
  const partnerCashIsaFee = getPotFeePercent(feeConfig, 'partner', 'cashIsa');
  const partnerGiaFee = getPotFeePercent(feeConfig, 'partner', 'gia');
  const partnerCashSavingsFee = getPotFeePercent(feeConfig, 'partner', 'cashIsa');

  const primaryWorkplaceDrag = calculatePotDragPounds(primaryWorkplaceBal, primaryWorkplaceFee);
  const primarySippDrag = calculatePotDragPounds(primarySippBal, primarySippFee);
  const primaryIsaDrag = calculatePotDragPounds(primaryIsaBal, primaryIsaFee);
  const primaryLisaDrag = calculatePotDragPounds(primaryLisaBal, primaryLisaFee);
  const primaryCashIsaDrag = calculatePotDragPounds(primaryCashIsaBal, primaryCashIsaFee);
  const primaryGiaDrag = calculatePotDragPounds(primaryGiaBal, primaryGiaFee);
  const primaryCashSavingsDrag = calculatePotDragPounds(primaryCashSavingsBal, primaryCashSavingsFee);

  const partnerWorkplaceDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerWorkplaceBal, partnerWorkplaceFee) : 0;
  const partnerSippDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerSippBal, partnerSippFee) : 0;
  const partnerIsaDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerIsaBal, partnerIsaFee) : 0;
  const partnerLisaDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerLisaBal, partnerLisaFee) : 0;
  const partnerCashIsaDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerCashIsaBal, partnerCashIsaFee) : 0;
  const partnerGiaDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerGiaBal, partnerGiaFee) : 0;
  const partnerCashSavingsDrag = profile.isCouplePlanning ? calculatePotDragPounds(partnerCashSavingsBal, partnerCashSavingsFee) : 0;

  const totalAnnualFeeDragPounds =
    primaryWorkplaceDrag + primarySippDrag + primaryIsaDrag + primaryLisaDrag + primaryCashIsaDrag + primaryGiaDrag + primaryCashSavingsDrag +
    partnerWorkplaceDrag + partnerSippDrag + partnerIsaDrag + partnerLisaDrag + partnerCashIsaDrag + partnerGiaDrag + partnerCashSavingsDrag;

  const totalInvestedPots =
    primaryWorkplaceBal +
    primarySippBal +
    primaryIsaBal +
    primaryLisaBal +
    primaryCashIsaBal +
    primaryGiaBal +
    primaryCashSavingsBal +
    (profile.isCouplePlanning
      ? partnerWorkplaceBal + partnerSippBal + partnerIsaBal + partnerLisaBal + partnerCashIsaBal + partnerGiaBal + partnerCashSavingsBal
      : 0);

  const averageOverallFeePercent = totalInvestedPots > 0 ? (totalAnnualFeeDragPounds / totalInvestedPots) * 100 : globalFeePercent;

  const activePots = getPersonPots(activePersonTab);
  const personName = activePersonTab === 'primary' ? (profile.name || 'Primary Person') : (profile.partnerName || 'Partner');

  const potDefinitions: { key: keyof PerPersonPotFees; label: string; icon: string; desc: string; balance: number }[] = [
    {
      key: 'workplacePension',
      label: 'Workplace Pension',
      icon: '💼',
      desc: 'Employer workplace scheme platform & fund fees (often capped at 0.75% or discounted).',
      balance: activePersonTab === 'primary' ? primaryWorkplaceBal : partnerWorkplaceBal,
    },
    {
      key: 'sipp',
      label: 'SIPP (Personal Pension)',
      icon: '🏛️',
      desc: 'Self-Invested Personal Pension platform admin, underlying fund OCF, and adviser fees.',
      balance: activePersonTab === 'primary' ? primarySippBal : partnerSippBal,
    },
    {
      key: 'stocksAndSharesIsa',
      label: 'Stocks & Shares ISA',
      icon: '📈',
      desc: 'S&S ISA custody charge and fund OCF / AMC.',
      balance: activePersonTab === 'primary' ? primaryIsaBal : partnerIsaBal,
    },
    {
      key: 'cashIsa',
      label: 'Cash ISA',
      icon: '💵',
      desc: 'Cash ISA account charges (usually 0.00% unless managed).',
      balance: activePersonTab === 'primary' ? primaryCashIsaBal : partnerCashIsaBal,
    },
    {
      key: 'gia',
      label: 'General Investment Account (GIA)',
      icon: '🏢',
      desc: 'Taxable investment account custody and fund management charges.',
      balance: activePersonTab === 'primary' ? primaryGiaBal : partnerGiaBal,
    },
  ];

  // Fee Drag Trajectory & Impact Analytics (Comparative Projections)
  const { trajectoryData, potBreakdownData, kpis } = useMemo(() => {
    // 1. Gross Baseline Projections (0% Fees)
    const baselineProfile: UserProfile = {
      ...profile,
      investmentFees: {
        ...feeConfig,
        enabled: false,
      },
    };
    const baselineProjs = generateProjections(baselineProfile, pots);

    // 2. Active Projections (With Fees Deducted)
    const activeProjs = isEnabled
      ? generateProjections(profile, pots)
      : baselineProjs;

    let cumulativeDragSum = 0;
    let totalLifetimeFeePayments = 0;

    const trajectory = (activeProjs || []).map((p, idx) => {
      const baseP = baselineProjs[idx] || p;
      const grossPot = Math.max(0, Math.round(baseP.totalPot || 0));
      const netPot = Math.max(0, Math.round(p.totalPot || 0));
      const annualFee = Math.max(0, Math.round(p.estimatedInvestmentFees || 0));
      const potGap = Math.max(0, grossPot - netPot);

      totalLifetimeFeePayments += annualFee;
      cumulativeDragSum = potGap;

      return {
        age: p.age,
        year: p.year,
        grossPot,
        netPot,
        dragGap: potGap,
        annualFee,
        isRetired: p.isRetired,
      };
    });

    // Retirement milestone
    const targetAge = profile.targetRetirementAge || 60;
    const retPoint = trajectory.find((t) => t.age === targetAge) || trajectory[0];
    const endPoint = trajectory[trajectory.length - 1] || retPoint;

    const terminalGross = endPoint?.grossPot || 0;
    const terminalNet = endPoint?.netPot || 0;
    const terminalDragPounds = Math.max(0, terminalGross - terminalNet);
    const terminalDragPercent = terminalGross > 0 ? (terminalDragPounds / terminalGross) * 100 : 0;

    const retirementGross = retPoint?.grossPot || 0;
    const retirementNet = retPoint?.netPot || 0;
    const retirementDragPounds = Math.max(0, retirementGross - retirementNet);
    const retirementDragPercent = retirementGross > 0 ? (retirementDragPounds / retirementGross) * 100 : 0;

    // Pot breakdown dataset for bar chart
    const breakdown = [
      {
        name: 'Workplace Pension',
        primaryDrag: primaryWorkplaceDrag,
        partnerDrag: partnerWorkplaceDrag,
        primaryFee: primaryWorkplaceFee,
        partnerFee: partnerWorkplaceFee,
        totalDrag: primaryWorkplaceDrag + partnerWorkplaceDrag,
      },
      {
        name: 'SIPP (Pension)',
        primaryDrag: primarySippDrag,
        partnerDrag: partnerSippDrag,
        primaryFee: primarySippFee,
        partnerFee: partnerSippFee,
        totalDrag: primarySippDrag + partnerSippDrag,
      },
      {
        name: 'Stocks & Shares ISA',
        primaryDrag: primaryIsaDrag,
        partnerDrag: partnerIsaDrag,
        primaryFee: primaryIsaFee,
        partnerFee: partnerIsaFee,
        totalDrag: primaryIsaDrag + partnerIsaDrag,
      },
      {
        name: 'Lifetime ISA',
        primaryDrag: primaryLisaDrag,
        partnerDrag: partnerLisaDrag,
        primaryFee: primaryLisaFee,
        partnerFee: partnerLisaFee,
        totalDrag: primaryLisaDrag + partnerLisaDrag,
      },
      {
        name: 'GIA (Taxable)',
        primaryDrag: primaryGiaDrag,
        partnerDrag: partnerGiaDrag,
        primaryFee: primaryGiaFee,
        partnerFee: partnerGiaFee,
        totalDrag: primaryGiaDrag + partnerGiaDrag,
      },
      {
        name: 'Cash / Savings',
        primaryDrag: primaryCashIsaDrag + primaryCashSavingsDrag,
        partnerDrag: partnerCashIsaDrag + partnerCashSavingsDrag,
        primaryFee: primaryCashIsaFee,
        partnerFee: partnerCashIsaFee,
        totalDrag: primaryCashIsaDrag + primaryCashSavingsDrag + partnerCashIsaDrag + partnerCashSavingsDrag,
      },
    ].filter((item) => item.totalDrag > 0 || totalInvestedPots === 0);

    return {
      trajectoryData: trajectory,
      potBreakdownData: breakdown,
      kpis: {
        terminalGross,
        terminalNet,
        terminalDragPounds,
        terminalDragPercent,
        retirementGross,
        retirementNet,
        retirementDragPounds,
        retirementDragPercent,
        totalLifetimeFeePayments,
      },
    };
  }, [profile, pots, feeConfig, isEnabled, totalInvestedPots, primaryWorkplaceDrag, primarySippDrag, primaryIsaDrag, primaryLisaDrag, primaryCashIsaDrag, primaryGiaDrag, primaryCashSavingsDrag, partnerWorkplaceDrag, partnerSippDrag, partnerIsaDrag, partnerLisaDrag, partnerCashIsaDrag, partnerGiaDrag, partnerCashSavingsDrag, primaryWorkplaceFee, primarySippFee, primaryIsaFee, primaryLisaFee, primaryCashIsaFee, primaryGiaFee, partnerWorkplaceFee, partnerSippFee, partnerIsaFee, partnerLisaFee, partnerCashIsaFee, partnerGiaFee]);

  const formatPounds = (val: number) => {
    if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(2)}M`;
    if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${Math.round(val)}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Investment, Platform & Adviser Fees
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Fee Drag Model & Visualiser
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Quantify and visualise the compound drag of platform custody, fund management (OCF/AMC), and ongoing adviser fees.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => updateFeeConfig({ ...feeConfig, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {isEnabled ? (
        <div className="space-y-6">
          {!isStudioMode && (
      <div className="fee-visualiser-wrapper">
        {/* ========================================================================= */}
          {/* VISUALISATION SECTION: COMPARATIVE TRAJECTORY & DRAG BREAKDOWN */}
          {/* ========================================================================= */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50 dark:from-slate-800/60 dark:via-indigo-950/20 dark:to-slate-800/60 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-4">
            {/* Visualiser Header & View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                  Interactive Fee Drag Impact Visualiser
                </h4>
                <span className="text-[10px] px-2 py-0.5 font-bold rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Gross 0% vs Net Comparison
                </span>
              </div>

              <div className="inline-flex p-0.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartViewMode('trajectory')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartViewMode === 'trajectory'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  Growth Trajectory (Gross vs Net)
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('breakdown')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    chartViewMode === 'breakdown'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Pot-by-Pot Annual Drag (£/yr)
                </button>
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                  Initial Annual Drag
                </span>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                  -£{totalAnnualFeeDragPounds.toLocaleString()}/yr
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Weighted Avg: {averageOverallFeePercent.toFixed(2)}% p.a.
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                  Retirement Pot Drag
                </span>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                  -£{Math.round(kpis.retirementDragPounds).toLocaleString()}
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  -{kpis.retirementDragPercent.toFixed(1)}% at Age {profile.targetRetirementAge || 60}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                  Terminal Wealth Drag
                </span>
                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  -£{Math.round(kpis.terminalDragPounds).toLocaleString()}
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  -{kpis.terminalDragPercent.toFixed(1)}% compounded loss
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                  Total Fees Deducted
                </span>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                  £{Math.round(kpis.totalLifetimeFeePayments).toLocaleString()}
                </p>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
                  Cumulative across life
                </span>
              </div>
            </div>

            {/* Visualiser Chart Area */}
            <div className="w-full h-64 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              {chartViewMode === 'trajectory' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trajectoryData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                    <XAxis
                      dataKey="age"
                      tickFormatter={(age) => `Age ${age}`}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatPounds}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const gapPct = data.grossPot > 0 ? ((data.dragGap / data.grossPot) * 100).toFixed(1) : '0.0';
                          return (
                            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5">
                              <div className="flex items-center justify-between gap-4 font-bold border-b border-slate-800 pb-1">
                                <span>Age {data.age} ({data.year})</span>
                                <span className={data.isRetired ? 'text-indigo-400' : 'text-emerald-400'}>
                                  {data.isRetired ? 'Retirement Phase' : 'Accumulation Phase'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-emerald-400 font-medium">Gross Pot (0% Baseline):</span>
                                <span className="font-bold">£{data.grossPot.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-indigo-400 font-medium">Net Pot (After Fees):</span>
                                <span className="font-bold">£{data.netPot.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 font-bold text-rose-400">
                                <span>Compounded Fee Drag:</span>
                                <span>-£{data.dragGap.toLocaleString()} (-{gapPct}%)</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px]">
                                <span>Annual Fee Paid in Year:</span>
                                <span>£{data.annualFee.toLocaleString()}/yr</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                      formatter={(val) => {
                        if (val === 'grossPot') return <span className="text-emerald-700 dark:text-emerald-400 font-bold">Gross Pot (0% Baseline)</span>;
                        if (val === 'netPot') return <span className="text-indigo-700 dark:text-indigo-400 font-bold">Net Pot (With Fees)</span>;
                        return val;
                      }}
                    />
                    <ReferenceLine
                      x={profile.targetRetirementAge || 60}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                      label={{ value: `Retire (Age ${profile.targetRetirementAge || 60})`, fill: '#d97706', fontSize: 10, position: 'top' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="grossPot"
                      fill="#10b981"
                      fillOpacity={0.12}
                      stroke="#10b981"
                      strokeWidth={2}
                      name="grossPot"
                    />
                    <Area
                      type="monotone"
                      dataKey="netPot"
                      fill="#6366f1"
                      fillOpacity={0.25}
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      name="netPot"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={potBreakdownData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9.5, fill: '#64748b' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `£${v}`}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      width={50}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-800 text-xs space-y-1.5">
                              <span className="font-bold block border-b border-slate-800 pb-1">{data.name}</span>
                              <div className="flex items-center justify-between gap-4 text-indigo-400">
                                <span>{profile.name || 'Primary'} Drag:</span>
                                <span className="font-bold">£{data.primaryDrag.toLocaleString()}/yr ({data.primaryFee.toFixed(2)}%)</span>
                              </div>
                              {profile.isCouplePlanning && (
                                <div className="flex items-center justify-between gap-4 text-purple-400">
                                  <span>{profile.partnerName || 'Partner'} Drag:</span>
                                  <span className="font-bold">£{data.partnerDrag.toLocaleString()}/yr ({data.partnerFee.toFixed(2)}%)</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 font-black text-rose-400">
                                <span>Total Account Drag:</span>
                                <span>£{data.totalDrag.toLocaleString()}/yr</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                      formatter={(val) => {
                        if (val === 'primaryDrag') return <span className="text-indigo-600 dark:text-indigo-400 font-bold">{profile.name || 'Primary'} Annual Drag (£/yr)</span>;
                        if (val === 'partnerDrag') return <span className="text-purple-600 dark:text-purple-400 font-bold">{profile.partnerName || 'Partner'} Annual Drag (£/yr)</span>;
                        return val;
                      }}
                    />
                    <Bar dataKey="primaryDrag" fill="#4f46e5" radius={[4, 4, 0, 0]} name="primaryDrag" />
                    {profile.isCouplePlanning && (
                      <Bar dataKey="partnerDrag" fill="#a855f7" radius={[4, 4, 0, 0]} name="partnerDrag" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
      </div>
    )}
          {/* Mode Selector: Uniform vs Per-Pot & Person */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="space-y-0.5">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                Fee Granularity Mode
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose between a simple uniform global fee or custom fees per pension pot and person.
              </p>
            </div>

            <div className="inline-flex p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => updateFeeConfig({ ...feeConfig, perPotFeesEnabled: false })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !perPotFeesEnabled
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Uniform Fee Across All Pots
              </button>
              <button
                type="button"
                onClick={() => updateFeeConfig({ ...feeConfig, perPotFeesEnabled: true })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  perPotFeesEnabled
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Custom Fees per Pot & Person
              </button>
            </div>
          </div>

          {!perPotFeesEnabled ? (
            /* UNIFORM GLOBAL FEE SECTION */
            <div className="space-y-4">
              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider block">
                  Quick Fee Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateFeeConfig({ ...feeConfig, enabled: true, platformFeePercent: 0.15, fundFeePercent: 0.15, advisorFeePercent: 0.0 })}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:border-indigo-300 transition-colors cursor-pointer"
                  >
                    ⚡ Low-Cost DIY Trackers (0.15% Plat + 0.15% Fund = 0.30% p.a.)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFeeConfig({ ...feeConfig, enabled: true, platformFeePercent: 0.25, fundFeePercent: 0.40, advisorFeePercent: 0.0 })}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    ⚖️ Typical DIY Active/Passive (0.25% Plat + 0.40% Fund = 0.65% p.a.)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFeeConfig({ ...feeConfig, enabled: true, platformFeePercent: 0.25, fundFeePercent: 0.45, advisorFeePercent: 0.75 })}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    💼 Advised Portfolio (0.25% Plat + 0.45% Fund + 0.75% Adviser = 1.45% p.a.)
                  </button>
                </div>
              </div>

              {/* 3 Fee Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                {/* Platform Fee */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Platform Admin Fee (% p.a.)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="5"
                      value={feeConfig.platformFeePercent}
                      onChange={(e) => updateFeeConfig({ ...feeConfig, platformFeePercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                      onBlur={(e) => updateFeeConfig({ ...feeConfig, platformFeePercent: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })}
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Platform custody fee e.g. Vanguard (0.15%), AJ Bell (0.25%), HL (0.45%).
                  </p>
                </div>

                {/* Fund Fee */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Fund Charge OCF/AMC (% p.a.)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="5"
                      value={feeConfig.fundFeePercent}
                      onChange={(e) => updateFeeConfig({ ...feeConfig, fundFeePercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                      onBlur={(e) => updateFeeConfig({ ...feeConfig, fundFeePercent: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })}
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Ongoing Charge Figure (OCF) / AMC for ETFs or active funds (0.05% - 0.85%).
                  </p>
                </div>

                {/* Adviser Fee */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Financial Adviser Fee (% p.a.)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="5"
                      value={feeConfig.advisorFeePercent}
                      onChange={(e) => updateFeeConfig({ ...feeConfig, advisorFeePercent: e.target.value === '' ? 0 : Number(e.target.value) })}
                      onBlur={(e) => updateFeeConfig({ ...feeConfig, advisorFeePercent: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })}
                      className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    Ongoing wealth adviser fee (0.0% if self-managed DIY).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* CUSTOM PER-POT & PERSON FEE SECTION */
            <div className="space-y-4">
              {/* Couple Person Tabs (if couple planning enabled) */}
              {profile.isCouplePlanning && (
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setActivePersonTab('primary')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      activePersonTab === 'primary'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    {profile.name || 'Primary Person'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePersonTab('partner')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      activePersonTab === 'partner'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    {profile.partnerName || 'Partner'}
                  </button>
                </div>
              )}

              {/* Header subtitle for selected person */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Account Fee Overrides for: <strong className="text-indigo-600 dark:text-indigo-400">{personName}</strong>
                </span>
                <span className="text-[10px] text-slate-400">
                  Set platform, fund OCF, and adviser fees for each specific account.
                </span>
              </div>

              {/* Pot Fee Cards List */}
              <div className="space-y-3">
                {potDefinitions.map((pot) => {
                  const currentPotConfig: SinglePotFeeConfig = activePots[pot.key] || DEFAULT_SINGLE_POT_FEE;
                  const totalFeeForPot = (currentPotConfig.platformFeePercent || 0) + (currentPotConfig.fundFeePercent || 0) + (currentPotConfig.advisorFeePercent || 0);
                  const annualDragPounds = calculatePotDragPounds(pot.balance, totalFeeForPot);

                  return (
                    <div
                      key={pot.key}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{pot.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                {pot.label}
                              </h4>
                              {pot.balance > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  £{pot.balance.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  No balance set
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {pot.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                            Total: {totalFeeForPot.toFixed(2)}% p.a.
                          </span>
                          {annualDragPounds > 0 && (
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              (~£{annualDragPounds.toLocaleString()}/yr)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Fee Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Platform Fee */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                            Platform Custody Fee (% p.a.)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              max="5"
                              value={currentPotConfig.platformFeePercent}
                              onChange={(e) => updateSinglePotFee(activePersonTab, pot.key, 'platformFeePercent', e.target.value === '' ? 0 : Number(e.target.value))}
                              onBlur={(e) => updateSinglePotFee(activePersonTab, pot.key, 'platformFeePercent', Number(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-400 font-bold">%</span>
                          </div>
                        </div>

                        {/* Fund Fee */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                            Fund Charge OCF / AMC (% p.a.)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              max="5"
                              value={currentPotConfig.fundFeePercent}
                              onChange={(e) => updateSinglePotFee(activePersonTab, pot.key, 'fundFeePercent', e.target.value === '' ? 0 : Number(e.target.value))}
                              onBlur={(e) => updateSinglePotFee(activePersonTab, pot.key, 'fundFeePercent', Number(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-400 font-bold">%</span>
                          </div>
                        </div>

                        {/* Adviser Fee */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                            Adviser Ongoing Fee (% p.a.)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              max="5"
                              value={currentPotConfig.advisorFeePercent}
                              onChange={(e) => updateSinglePotFee(activePersonTab, pot.key, 'advisorFeePercent', e.target.value === '' ? 0 : Number(e.target.value))}
                              onBlur={(e) => updateSinglePotFee(activePersonTab, pot.key, 'advisorFeePercent', Number(e.target.value) || 0)}
                              className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                            />
                            <span className="text-xs text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fee Impact Summary Banner */}
          <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/60 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">
                  {perPotFeesEnabled ? `Average Portfolio Fee Drag: ~${averageOverallFeePercent.toFixed(2)}% p.a.` : `Total Fee Drag: ${globalFeePercent.toFixed(2)}% p.a.`}
                </span>
                <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Deducted from Growth
                </span>
              </div>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                Gross Pre-Retirement: {preReturn}% p.a. • Gross Post-Retirement: {postReturn}% p.a.
              </p>
            </div>
            {totalAnnualFeeDragPounds > 0 && (
              <div className="px-3.5 py-2 bg-indigo-600 text-white font-extrabold rounded-xl text-xs shrink-0 shadow-xs">
                ~£{totalAnnualFeeDragPounds.toLocaleString()} / year total fee drag
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
          Fee drag modeling is currently disabled. Enable to subtract platform, fund, and adviser charges from net pot growth and view comparative wealth trajectory visualisations.
        </div>
      )}
    </div>
  );
};
