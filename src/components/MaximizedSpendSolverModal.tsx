import React, { useState, useMemo } from 'react';
import { UserProfile, InvestmentPots } from '../types';
import { solveMaximizedSpend, SolveMaximizedSpendResult, createCandidateProfile } from '../utils/maximizedSpendSolver';
import {
  X,
  Sparkles,
  TrendingUp,
  Check,
  Zap,
  HelpCircle,
  Sliders,
  DollarSign,
  ShieldCheck,
  Flame,
  ArrowRight,
  Info,
  Layers,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface MaximizedSpendSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  pots: InvestmentPots;
  onApplyMaximizedSpend: (updatedProfile: UserProfile) => void;
}

export const MaximizedSpendSolverModal: React.FC<MaximizedSpendSolverModalProps> = ({
  isOpen,
  onClose,
  profile,
  pots,
  onApplyMaximizedSpend,
}) => {
  if (!isOpen) return null;

  const currentRetirementAge = profile.targetRetirementAge || 60;
  const initialEndAge = profile.lifeExpectancyAge || 95;
  const pensionAccessAge = profile.protectedPensionAccessAge || 57;

  const [targetEndAge, setTargetEndAge] = useState<number>(Math.max(currentRetirementAge + 5, initialEndAge));
  const [targetLegacyBuffer, setTargetLegacyBuffer] = useState<number>(0);
  const [spendingPattern, setSpendingPattern] = useState<'uniform' | 'proportional_phases' | 'front_loaded'>(() => {
    if (profile.spendingPhases?.customRanges && profile.spendingPhases.customRanges.length > 0) {
      return 'proportional_phases';
    }
    if (profile.spendingPhases?.enabled) {
      return 'proportional_phases';
    }
    return 'uniform';
  });

  // Compute solver result dynamically on parameter changes
  const solverResult: SolveMaximizedSpendResult = useMemo(() => {
    return solveMaximizedSpend({
      profile,
      pots,
      targetEndAge,
      targetLegacyBuffer,
      spendingPattern,
    });
  }, [profile, pots, targetEndAge, targetLegacyBuffer, spendingPattern]);

  const {
    maxAnnualIncome,
    bridgeAnnualIncome,
    originalAnnualIncome,
    extraAnnualSpend,
    extraLifetimeSpend,
    boostPercentage,
    finalPotAtTargetAge,
    bestCandidateProfile,
    projectionsWithMaxSpend,
    phaseIncomes,
  } = solverResult;

  // Format currency helpers
  const fmt = (v: number) => `£${Math.round(v).toLocaleString()}`;

  // Prepare chart comparison data
  const chartData = useMemo(() => {
    if (!projectionsWithMaxSpend || projectionsWithMaxSpend.length === 0) return [];
    
    return projectionsWithMaxSpend
      .filter((p) => p.age >= currentRetirementAge && p.age <= targetEndAge)
      .map((p) => ({
        age: p.age,
        year: p.year,
        maximizedPot: Math.round(p.totalPot || 0),
        maximizedIncome: Math.round(p.netRetirementIncome || 0),
      }));
  }, [projectionsWithMaxSpend, currentRetirementAge, targetEndAge]);

  const handleApply = () => {
    onApplyMaximizedSpend(bestCandidateProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-amber-950/40 dark:via-indigo-950/40 dark:to-emerald-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <Zap className="w-5.5 h-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Maximized Spend Solver</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800/80 whitespace-nowrap">
                    Die With Zero Engine
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Calculates the highest sustainable drawdown budget that depletes your wealth exactly by target age without running out early.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TOP KPI HIGHLIGHT GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: MAXIMIZED ANNUAL SPEND */}
            <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 space-y-1 relative overflow-hidden shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>{bridgeAnnualIncome !== undefined ? 'Post-Access Target Income' : 'Maximized Target Income'}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {fmt(maxAnnualIncome)}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/yr</span>
              </div>
              <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                {bridgeAnnualIncome !== undefined
                  ? `Bridge (Ages ${currentRetirementAge}-${pensionAccessAge - 1}): ${fmt(bridgeAnnualIncome)}/yr`
                  : `${fmt(Math.round(maxAnnualIncome / 12))}/mo spendable`}
              </div>
            </div>

            {/* KPI 2: ANNUAL BOOST */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>Annual Income Boost</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {extraAnnualSpend >= 0 ? `+${fmt(extraAnnualSpend)}` : fmt(extraAnnualSpend)}
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">/yr</span>
              </div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                {boostPercentage >= 0 ? `+${boostPercentage}%` : `${boostPercentage}%`} vs Current ({fmt(originalAnnualIncome)}/yr)
              </div>
            </div>

            {/* KPI 3: LIFETIME EXTRA CASH */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                <span>Lifetime Extra Cash Unlocked</span>
                <Flame className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
                +{fmt(extraLifetimeSpend)}
              </div>
              <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Across {targetEndAge - currentRetirementAge} retirement years
              </div>
            </div>

            {/* KPI 4: FINAL POT BALANCE */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Remainder @ Age {targetEndAge}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
                {fmt(finalPotAtTargetAge)}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {targetLegacyBuffer > 0 ? `Matches £${targetLegacyBuffer.toLocaleString()} legacy buffer` : 'True Die With Zero (£0)'}
              </div>
            </div>
          </div>

          {/* PARAMETER CONTROLS GRID */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            {currentRetirementAge < pensionAccessAge && (
              <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Early Retirement Bridge Constraint (Ages {currentRetirementAge} to {pensionAccessAge})
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    You plan to retire at age <strong>{currentRetirementAge}</strong>, but private pensions are locked until age <strong>{pensionAccessAge}</strong>. Spending during these bridge years is funded solely from ISA/cash.
                    {spendingPattern === 'uniform' && finalPotAtTargetAge > 50000 && (
                      <span className="block font-medium mt-1 text-amber-700 dark:text-amber-300">
                        Flat spend is capped at <strong>{fmt(maxAnnualIncome)}/yr</strong> to avoid running out of ISA/cash before age {pensionAccessAge}. Switch to <strong>"Scale Active Spending Phases"</strong> to allow higher spending once pensions unlock!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Solver Optimization Parameters</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Live Dynamic Calculation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CONTROL 1: TARGET PLAN END AGE */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Target Plan End Age</span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400">Age {targetEndAge}</span>
                </label>
                <input
                  type="range"
                  min={currentRetirementAge + 1}
                  max={100}
                  step={1}
                  value={targetEndAge}
                  onChange={(e) => setTargetEndAge(parseInt(e.target.value) || 95)}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Age {currentRetirementAge + 1}</span>
                  <div className="flex gap-1">
                    {[85, 90, 95, 100].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setTargetEndAge(Math.max(currentRetirementAge + 1, age))}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          targetEndAge === age
                            ? 'bg-indigo-600 text-white font-black'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                  <span>Age 100</span>
                </div>
              </div>

              {/* CONTROL 2: TARGET LEGACY BUFFER */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Target Legacy Buffer</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{fmt(targetLegacyBuffer)}</span>
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: '£0 (Zero)', val: 0 },
                    { label: '£25k', val: 25000 },
                    { label: '£50k', val: 50000 },
                    { label: '£100k', val: 100000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setTargetLegacyBuffer(preset.val)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        targetLegacyBuffer === preset.val
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Amount retained in pots at Age {targetEndAge} for heirs or emergency buffer.
                </p>
              </div>

              {/* CONTROL 3: SPENDING PATTERN */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Drawdown Spending Pattern</span>
                </label>
                <select
                  value={spendingPattern}
                  onChange={(e) => setSpendingPattern(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="uniform">🎯 Uniform Flat Real Spend (Equal every year)</option>
                  <option value="front_loaded">🚀 Front-Loaded Go-Go Heavy (+20% early, -20% late)</option>
                  <option value="proportional_phases">📊 Scale Active Spending Phases Proportionally</option>
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {spendingPattern === 'front_loaded' && phaseIncomes && (
                    <span>Go-Go: {fmt(phaseIncomes.goGoIncome)}/yr • Slow-Go: {fmt(phaseIncomes.slowGoIncome)}/yr • No-Go: {fmt(phaseIncomes.noGoIncome)}/yr</span>
                  )}
                  {spendingPattern === 'uniform' && 'Maintains consistent real purchasing power throughout retirement.'}
                  {spendingPattern === 'proportional_phases' && 'Scales your existing custom spending phase targets upwards.'}
                </p>
              </div>
            </div>
          </div>

          {/* VISUAL WEALTH TRAJECTORY CHART */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Maximized Portfolio Trajectory (Retirement Age {currentRetirementAge} to {targetEndAge})</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Pots glide down to exactly {fmt(targetLegacyBuffer)} @ Age {targetEndAge}
              </span>
            </div>

            <div className="h-64 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMaxPot" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `£${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`£${Math.round(val || 0).toLocaleString()}`, 'Portfolio Wealth']}
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="maximizedPot"
                    name="Maximized Wealth Pot"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMaxPot)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Applying this solver will set your plan target annual retirement spend to <strong className="font-bold text-amber-600 dark:text-amber-400">{fmt(maxAnnualIncome)}/yr</strong>.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Apply Maximized Spend ({fmt(maxAnnualIncome)}/yr)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
