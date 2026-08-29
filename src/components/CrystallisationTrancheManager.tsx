import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Split,
  Info,
  Coins,
  Percent,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  PieChart,
  TrendingUp,
  Wallet,
  Scale
} from 'lucide-react';
import {
  CrystallisationMode,
  CrystallisationTranche,
  LumpSumSplit,
  LumpSumTargetPot,
  UserProfile,
} from '../types';

interface CrystallisationTrancheManagerProps {
  owner: 'primary' | 'partner';
  personName: string;
  pensionAccessAge: number;
  projectedPotAtAccess: number;
  currentPotToday: number;
  lsaLimit: number;
  mode: CrystallisationMode;
  tranches: CrystallisationTranche[];
  onModeChange: (mode: CrystallisationMode) => void;
  onTranchesChange: (tranches: CrystallisationTranche[]) => void;
  accentColor?: 'emerald' | 'rose';
}

const TARGET_POT_LABELS: Record<LumpSumTargetPot, string> = {
  stocks_and_shares_isa: 'Stocks & Shares ISA (Tax-Free Shelter)',
  cash_isa: 'Cash ISA (Tax-Free Shelter)',
  cash_savings: 'Cash Savings Account',
  gia: 'General Investment Account (GIA)',
  spend_clear_debt: 'Spend / Clear Debt (Mortgage & Expenses)',
  split: 'Split across Multiple Pots...',
};

export const CrystallisationTrancheManager: React.FC<CrystallisationTrancheManagerProps> = ({
  owner,
  personName,
  pensionAccessAge,
  projectedPotAtAccess,
  currentPotToday,
  lsaLimit,
  mode,
  tranches = [],
  onModeChange,
  onTranchesChange,
  accentColor = 'emerald',
}) => {
  const [expandedTrancheId, setExpandedTrancheId] = useState<string | null>(null);

  const isRose = accentColor === 'rose';
  const borderActive = isRose
    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
    : 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/30';
  const textAccent = isRose ? 'text-rose-600 dark:text-rose-400' : 'text-primary-600 dark:text-primary-400';
  const bgBadge = isRose
    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
    : 'bg-primary-100 dark:bg-primary-900/60 text-primary-800 dark:text-primary-200';

  const handleAddTranche = () => {
    const nextAge = tranches.length > 0
      ? Math.max(...tranches.map((t) => t.age)) + 2
      : Math.max(pensionAccessAge, 58);

    const currentTotalPcls = tranches
      .filter((t) => t.enabled)
      .reduce((sum, t) => sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)), 0);
    const availableLsa = Math.max(0, lsaLimit - currentTotalPcls);
    const maxGrossForLsa = Math.floor(availableLsa * 4); // for 25% standard PCLS
    const defaultAmount = Math.min(100000, maxGrossForLsa);

    const newTranche: CrystallisationTranche = {
      id: `tranche-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `Tranche ${tranches.length + 1}`,
      owner,
      age: nextAge,
      amount: defaultAmount,
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
    };

    const updated = [...tranches, newTranche];
    onTranchesChange(updated);
    setExpandedTrancheId(newTranche.id);
  };

  const handleUpdateTranche = (id: string, updates: Partial<CrystallisationTranche>) => {
    const updated = tranches.map((t) => (t.id === id ? { ...t, ...updates } : t));
    onTranchesChange(updated);
  };

  const handleDeleteTranche = (id: string) => {
    const updated = tranches.filter((t) => t.id !== id);
    onTranchesChange(updated);
    if (expandedTrancheId === id) setExpandedTrancheId(null);
  };

  // Calculate total crystallised and total PCLS from tranches
  const totalCrystallised = tranches
    .filter((t) => t.enabled)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPclsFromTranches = tranches
    .filter((t) => t.enabled)
    .reduce((sum, t) => sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)), 0);
  const totalDrawdownFromTranches = totalCrystallised - totalPclsFromTranches;

  // Compute Uncrystallised balance and remaining LSA
  const referencePensionPot = projectedPotAtAccess > 0 ? projectedPotAtAccess : currentPotToday;
  const isLsaExceeded = totalPclsFromTranches > lsaLimit;
  const isPotExceeded = totalCrystallised > referencePensionPot && referencePensionPot > 0;

  return (
    <div className="space-y-4">
      {/* Strategy Mode Switcher */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className={`w-3.5 h-3.5 ${textAccent}`} />
            <span>Crystallisation &amp; PCLS Strategy ({personName})</span>
          </span>
        </label>

        {/* 3 Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* UFPLS / Drip-Feed */}
          <button
            type="button"
            onClick={() => onModeChange('ufpls')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'ufpls'
                ? `${borderActive} ring-2 ring-primary-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                UFPLS / Drip-Feed
              </span>
              {mode === 'ufpls' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
          </button>

          {/* Phased Tranches (Split Pots) */}
          <button
            type="button"
            onClick={() => onModeChange('phased_tranches')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'phased_tranches'
                ? `${borderActive} ring-2 ring-primary-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                <span>Phased Tranches</span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black rounded">
                  Split Pot
                </span>
              </span>
              {mode === 'phased_tranches' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
          </button>

          {/* Upfront Lump Sum */}
          <button
            type="button"
            onClick={() => onModeChange('upfront')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'upfront'
                ? `${borderActive} ring-2 ring-primary-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                Full Upfront PCLS
              </span>
              {mode === 'upfront' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
          </button>
        </div>
      </div>

      {/* Phased Tranches Dashboard & Sub-Pot Tracker */}
      {mode === 'phased_tranches' && (
        <div className="space-y-4 pt-1">
          {/* Warnings if Over Pot or Over LSA */}
          {isLsaExceeded && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-300 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong>Lump Sum Allowance Capped:</strong> Your scheduled tranches extract £{totalPclsFromTranches.toLocaleString()} in tax-free cash, exceeding your £{lsaLimit.toLocaleString()} LSA limit by £{(totalPclsFromTranches - lsaLimit).toLocaleString()}. Under HMRC rules, any excess lump sum will be taxed at your marginal income tax rate.
              </div>
            </div>
          )}

          {isPotExceeded && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Tranches Exceed Initial Pot:</strong> Total scheduled crystallisation (£{totalCrystallised.toLocaleString()}) exceeds your projected initial pension pot (£{Math.round(referencePensionPot).toLocaleString()}). Tranches will be funded from investment growth if pot compounds above initial value.
              </div>
            </div>
          )}

          {/* Scheduled Tranches Manager Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Coins className={`w-4 h-4 ${textAccent}`} />
                <span>Scheduled Crystallisation Tranches ({personName})</span>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span>Total Gross: <strong>£{totalCrystallised.toLocaleString()}</strong></span>
                <span className={textAccent}>PCLS Tax-Free: <strong>£{totalPclsFromTranches.toLocaleString()}</strong></span>
                <span className="text-indigo-600 dark:text-indigo-400">Flexi-Access Pot: <strong>£{totalDrawdownFromTranches.toLocaleString()}</strong></span>
              </div>
            </div>

            {tranches.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <p className="font-semibold text-slate-700 dark:text-slate-300">No crystallisation tranches defined yet.</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Click below to add your first crystallisation event (e.g. Crystallise £100,000 at age 58 to take £25k tax-free into ISA and £75k into Flexi-Access drawdown).
                </p>
                <button
                  type="button"
                  onClick={handleAddTranche}
                  className="mt-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Tranche</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {tranches.map((tranche, idx) => {
                  const isExpanded = expandedTrancheId === tranche.id;
                  const pclsAmount = Math.round((tranche.amount || 0) * ((tranche.pclsPercent ?? 25) / 100));
                  const designatedDrawdown = (tranche.amount || 0) - pclsAmount;

                  // Compute LSA limit available specifically to this tranche (accounting for other enabled tranches)
                  const otherTranchesPcls = tranches
                    .filter((t, i) => i !== idx && t.enabled)
                    .reduce((sum, t) => sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)), 0);
                  const availableLsaForThisTranche = Math.max(0, lsaLimit - otherTranchesPcls);
                  const pclsRate = Math.max(0.01, (tranche.pclsPercent ?? 25) / 100);
                  const maxGrossForLsa = Math.floor(availableLsaForThisTranche / pclsRate);

                  // Calculate cumulative values up to and including this tranche
                  const cumulativeCrystallisedUpToThis = tranches
                    .slice(0, idx + 1)
                    .filter((t) => t.enabled)
                    .reduce((sum, t) => sum + (t.amount || 0), 0);
                  const remainingUncrystAfterThis = Math.max(0, referencePensionPot - cumulativeCrystallisedUpToThis);
                  const cumulativePclsUpToThis = tranches
                    .slice(0, idx + 1)
                    .filter((t) => t.enabled)
                    .reduce((sum, t) => sum + Math.round((t.amount || 0) * ((t.pclsPercent ?? 25) / 100)), 0);
                  const remainingLsaAfterThis = Math.max(0, lsaLimit - cumulativePclsUpToThis);

                  return (
                    <div
                      key={tranche.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow shadow-xs"
                    >
                      {/* Tranche Header */}
                      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={tranche.enabled}
                            onChange={(e) => handleUpdateTranche(tranche.id, { enabled: e.target.checked })}
                            className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 focus:ring-primary-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {tranche.name || `Tranche ${idx + 1}`} (Age {tranche.age})
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                                Gross: £{(tranche.amount || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <span className={textAccent}>
                                PCLS Tax-Free: <strong>£{pclsAmount.toLocaleString()}</strong>
                              </span>
                              <span>&bull;</span>
                              <span className="text-indigo-600 dark:text-indigo-400">
                                Drawdown Pot: <strong>£{designatedDrawdown.toLocaleString()}</strong>
                              </span>
                              <span>&bull;</span>
                              <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                                Target: {TARGET_POT_LABELS[tranche.targetPot || 'stocks_and_shares_isa'].split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedTrancheId(isExpanded ? null : tranche.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse' : 'Edit Tranche Details'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTranche(tranche.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            title="Delete Tranche"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Tranche Expanded Edit Panel */}
                      {isExpanded && (
                        <div className="p-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Tranche Name */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                Tranche Label
                              </label>
                              <input
                                type="text"
                                value={tranche.name || ''}
                                onChange={(e) => handleUpdateTranche(tranche.id, { name: e.target.value })}
                                placeholder="e.g. Initial Drawdown Tranche"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            {/* Crystallisation Age */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                Age at Crystallisation
                              </label>
                              <input
                                type="number"
                                min={pensionAccessAge}
                                max={85}
                                value={tranche.age}
                                onChange={(e) => handleUpdateTranche(tranche.id, { age: Math.max(pensionAccessAge, Number(e.target.value)) })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            {/* Gross Amount Crystallised */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                  Gross Amount (£)
                                </label>
                                <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400">
                                  Max LSA: £{maxGrossForLsa.toLocaleString()}
                                </span>
                              </div>
                              <input
                                type="number"
                                step="5000"
                                min="0"
                                max={maxGrossForLsa}
                                value={tranche.amount}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const clamped = Math.min(Math.max(0, val), maxGrossForLsa);
                                  handleUpdateTranche(tranche.id, { amount: clamped });
                                }}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Quick Amount Presets & Max LSA Shortcut */}
                          <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-slate-400 font-medium">Presets:</span>
                              {[50000, 100000, 150000, 200000, 250000].map((amt) => {
                                const isOver = amt > maxGrossForLsa;
                                return (
                                  <button
                                    key={amt}
                                    type="button"
                                    onClick={() => handleUpdateTranche(tranche.id, { amount: Math.min(amt, maxGrossForLsa) })}
                                    className={`px-2 py-0.5 rounded-md border font-semibold cursor-pointer ${
                                      tranche.amount === amt
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/60 font-bold text-primary-900 dark:text-primary-200'
                                        : isOver
                                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 hover:bg-slate-100'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                    title={isOver ? `Capped at remaining LSA limit (£${maxGrossForLsa.toLocaleString()})` : undefined}
                                  >
                                    £{(amt / 1000)}k
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUpdateTranche(tranche.id, { amount: maxGrossForLsa })}
                              className="px-2 py-0.5 rounded-md border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-950/60 text-primary-800 dark:text-primary-300 font-bold cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors"
                            >
                              Max LSA (£{Math.round(maxGrossForLsa / 1000)}k)
                            </button>
                          </div>

                          {/* Destination Pot for 25% Tax Free Cash */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                Destination for Tax-Free Cash (£{pclsAmount.toLocaleString()})
                              </label>
                              <select
                                value={tranche.targetPot || 'stocks_and_shares_isa'}
                                onChange={(e) => handleUpdateTranche(tranche.id, { targetPot: e.target.value as LumpSumTargetPot })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                              >
                                {Object.entries(TARGET_POT_LABELS).map(([val, label]) => (
                                  <option key={val} value={val}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="bg-primary-50 dark:bg-primary-950/30 p-2.5 rounded-xl border border-primary-200/60 dark:border-primary-800/40 text-[11px] flex flex-col justify-center">
                              <div className="text-primary-900 dark:text-primary-200 font-bold flex justify-between">
                                <span>Tax-Free Lump Sum (25%):</span>
                                <span>£{pclsAmount.toLocaleString()}</span>
                              </div>
                              <div className="text-indigo-700 dark:text-indigo-300 font-bold flex justify-between mt-0.5">
                                <span>Remaining in Drawdown (75%):</span>
                                <span>£{designatedDrawdown.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Dynamic Sub-Pot & LSA Impact Bar for This Specific Tranche */}
                          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                              <span>Sub-Pot Balance Impact After Tranche {idx + 1} (Age {tranche.age}):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5 text-[10px]">
                              <div className="p-1.5 bg-purple-50 dark:bg-purple-950/50 rounded-lg text-purple-900 dark:text-purple-200">
                                <span>Uncrystallised Pot Remaining:</span>
                                <span className="font-bold block text-xs">£{Math.round(remainingUncrystAfterThis).toLocaleString()}</span>
                              </div>
                              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-900 dark:text-indigo-200">
                                <span>Total Crystallised Drawdown:</span>
                                <span className="font-bold block text-xs">£{Math.round(cumulativeCrystallisedUpToThis - cumulativePclsUpToThis).toLocaleString()}</span>
                              </div>
                              <div className="p-1.5 bg-primary-50 dark:bg-primary-950/50 rounded-lg text-primary-900 dark:text-primary-200">
                                <span>LSA Limit Remaining:</span>
                                <span className="font-bold block text-xs">£{Math.round(remainingLsaAfterThis).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Another Tranche Button */}
                <button
                  type="button"
                  onClick={handleAddTranche}
                  className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Another Crystallisation Tranche</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

