import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Split,
  Sparkles,
  Info,
  Coins,
  Percent,
  Calendar,
  ChevronDown,
  ChevronUp,
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
  const [showExplainer, setShowExplainer] = useState(false);
  const [expandedTrancheId, setExpandedTrancheId] = useState<string | null>(null);

  const isRose = accentColor === 'rose';
  const borderActive = isRose
    ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30'
    : 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30';
  const textAccent = isRose ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  const bgBadge = isRose
    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200';

  const handleAddTranche = () => {
    const nextAge = tranches.length > 0
      ? Math.max(...tranches.map((t) => t.age)) + 2
      : Math.max(pensionAccessAge, 58);

    const defaultAmount = 100000;
    const newTranche: CrystallisationTranche = {
      id: `tranche-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `Tranche ${tranches.length + 1} (Age ${nextAge})`,
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

  return (
    <div className="space-y-4">
      {/* Strategy Mode Switcher */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers className={`w-3.5 h-3.5 ${textAccent}`} />
            <span>Crystallisation &amp; PCLS Strategy ({personName})</span>
          </span>
          <button
            type="button"
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How does this work?</span>
          </button>
        </label>

        {/* 3 Strategy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* UFPLS Drip Feed */}
          <button
            type="button"
            onClick={() => onModeChange('ufpls')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'ufpls'
                ? `${borderActive} ring-2 ring-emerald-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                UFPLS / Drip-Feed
              </span>
              {mode === 'ufpls' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Funds stay 100% uncrystallised. Each withdrawal draws 25% tax-free and 75% taxable as needed.
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
              Max Growth Retention
            </div>
          </button>

          {/* Phased Tranches (Split Pots) */}
          <button
            type="button"
            onClick={() => onModeChange('phased_tranches')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'phased_tranches'
                ? `${borderActive} ring-2 ring-emerald-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                <span>Phased Tranches</span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black rounded">
                  Split Pot
                </span>
              </span>
              {mode === 'phased_tranches' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Crystallise specific tranches (e.g. £100k), take 25% tax-free, and draw income from the crystallised pot.
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
              Precise Tax Control
            </div>
          </button>

          {/* Upfront Lump Sum */}
          <button
            type="button"
            onClick={() => onModeChange('upfront')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === 'upfront'
                ? `${borderActive} ring-2 ring-emerald-500/20`
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                Full Upfront PCLS
              </span>
              {mode === 'upfront' && <CheckCircle2 className={`w-4 h-4 ${textAccent}`} />}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Crystallise 100% of pension pot at access age. Take 25% tax-free upfront, remaining 75% enters drawdown pot.
            </p>
            <div className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
              Full Lump Sum Today
            </div>
          </button>
        </div>
      </div>

      {/* Explainer Box */}
      {showExplainer && (
        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Crystallised vs. Uncrystallised Pension Funds Mechanics</span>
            </span>
            <button
              onClick={() => setShowExplainer(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="font-extrabold text-emerald-700 dark:text-emerald-400">
                1. Uncrystallised Pension Pot
              </div>
              <p>
                Money that has never had tax-free cash taken from it. When this pot grows, <strong>25% of all investment growth also becomes tax-free</strong> when later crystallised (up to the £268,275 LSA limit).
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="font-extrabold text-indigo-700 dark:text-indigo-400">
                2. Crystallised Pot (Flexi-Access Drawdown)
              </div>
              <p>
                Money left inside the pension after the 25% tax-free PCLS has been extracted. Any withdrawal from this sub-pot is <strong>100% taxable income</strong>, but uses <strong>£0 additional LSA</strong>. You can draw £12,570/yr within your Personal Allowance at <strong>0% tax</strong>.
              </p>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-200">
            <strong>Example Strategy:</strong> Crystallise <strong>£100,000</strong> at age 58 &rarr; Take <strong>£25,000 tax-free cash</strong> into ISA &rarr; Hold <strong>£75,000</strong> in crystallised drawdown pot &rarr; Draw <strong>£12,000/yr</strong> over the next 6 years tax-free under the Personal Allowance!
          </div>
        </div>
      )}

      {/* Phased Tranches Content */}
      {mode === 'phased_tranches' && (
        <div className="space-y-3 pt-1">
          {/* Summary of Defined Tranches */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5">
                <Coins className={`w-4 h-4 ${textAccent}`} />
                <span>Scheduled Crystallisation Tranches</span>
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span>Total Gross: <strong>£{totalCrystallised.toLocaleString()}</strong></span>
                <span className={textAccent}>Tax-Free (PCLS): <strong>£{totalPclsFromTranches.toLocaleString()}</strong></span>
                <span className="text-indigo-600 dark:text-indigo-400">Drawdown Pot: <strong>£{totalDrawdownFromTranches.toLocaleString()}</strong></span>
              </div>
            </div>

            {tranches.length === 0 ? (
              <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="font-semibold">No crystallisation tranches defined yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click below to add your first crystallisation event (e.g. Crystallise £100,000 at age 58).
                </p>
                <button
                  type="button"
                  onClick={handleAddTranche}
                  className="mt-3 px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Tranche</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {tranches.map((tranche, idx) => {
                  const isExpanded = expandedTrancheId === tranche.id;
                  const pclsAmount = Math.round((tranche.amount || 0) * ((tranche.pclsPercent ?? 25) / 100));
                  const designatedDrawdown = (tranche.amount || 0) - pclsAmount;

                  return (
                    <div
                      key={tranche.id}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-shadow shadow-xs"
                    >
                      {/* Tranche Header */}
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={tranche.enabled}
                            onChange={(e) => handleUpdateTranche(tranche.id, { enabled: e.target.checked })}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {tranche.name || `Tranche ${idx + 1}`} (Age {tranche.age})
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span>Gross: <strong>£{(tranche.amount || 0).toLocaleString()}</strong></span>
                              <span>&bull;</span>
                              <span className={textAccent}>Tax-Free PCLS: <strong>£{pclsAmount.toLocaleString()}</strong></span>
                              <span>&bull;</span>
                              <span className="text-indigo-600 dark:text-indigo-400">Designated Drawdown: <strong>£{designatedDrawdown.toLocaleString()}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setExpandedTrancheId(isExpanded ? null : tranche.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTranche(tranche.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
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
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                Gross Amount Crystallised (£)
                              </label>
                              <input
                                type="number"
                                step="5000"
                                min="1000"
                                value={tranche.amount}
                                onChange={(e) => handleUpdateTranche(tranche.id, { amount: Math.max(0, Number(e.target.value)) })}
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          {/* Quick Amount Presets */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            <span className="text-slate-400 font-medium">Presets:</span>
                            {[50000, 100000, 150000, 200000, 250000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => handleUpdateTranche(tranche.id, { amount: amt })}
                                className={`px-2 py-0.5 rounded-md border text-slate-700 dark:text-slate-300 font-semibold cursor-pointer ${
                                  tranche.amount === amt
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                £{(amt / 1000)}k
                              </button>
                            ))}
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

                            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] flex flex-col justify-center">
                              <div className="text-emerald-900 dark:text-emerald-200 font-bold flex justify-between">
                                <span>Tax-Free Lump Sum (25%):</span>
                                <span>£{pclsAmount.toLocaleString()}</span>
                              </div>
                              <div className="text-indigo-700 dark:text-indigo-300 font-bold flex justify-between mt-0.5">
                                <span>Remaining in Drawdown (75%):</span>
                                <span>£{designatedDrawdown.toLocaleString()}</span>
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
                  className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
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
