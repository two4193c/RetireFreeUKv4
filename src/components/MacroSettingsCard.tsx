import React from 'react';
import { UserProfile, InvestmentPots, PerPersonPotAllocations, PotReturnOverrides, AssetAllocationSplit } from '../types';
import { DEFAULT_POT_RETURN_OVERRIDES, DEFAULT_ASSET_ALLOCATION_SPLIT } from '../utils/defaultData';
import { calculateWeightedAssetReturn } from '../utils/assetAllocation';
import { InvestmentFeesCard } from './InvestmentFeesCard';
import { TrendingUp, Percent, Flame, Sparkles, Shield, RotateCcw, Sliders, Layers, Coins, Building2, PieChart, BarChart3, Receipt } from 'lucide-react';

interface MacroSettingsCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  pots?: InvestmentPots;
  onChange: (updatedProfile: UserProfile) => void;
}

export const MacroSettingsCard: React.FC<MacroSettingsCardProps> = ({ profile, pots, onChange ,
  isStudioMode}) => {
  const preReturn = profile.expectedInvestmentReturn ?? 6.5;
  const postReturn = profile.postRetirementReturn ?? 4.5;
  const inflation = profile.expectedInflationRate ?? 2.5;

  const overrides = profile.potReturnOverrides || DEFAULT_POT_RETURN_OVERRIDES;
  const aaSplit = profile.assetAllocationSplit || DEFAULT_ASSET_ALLOCATION_SPLIT;

  const realPreReturn = (preReturn - (inflation) || 0).toFixed(1);
  const realPostReturn = (postReturn - (inflation) || 0).toFixed(1);

  const updateField = (key: keyof UserProfile, val: any) => {
    onChange({
      ...profile,
      [key]: val,
    });
  };

  const updateOverrideField = (field: keyof PotReturnOverrides, val: any) => {
    onChange({
      ...profile,
      potReturnOverrides: {
        ...overrides,
        [field]: val,
      },
    });
  };

  const updateAaSplit = (updated: AssetAllocationSplit) => {
    let newPre = preReturn;
    let newPost = postReturn;

    if (updated.enabled) {
      newPre = calculateWeightedAssetReturn(updated.accumulation, updated.assetClassReturns);
      newPost = calculateWeightedAssetReturn(updated.decumulation, updated.assetClassReturns);
    }

    onChange({
      ...profile,
      expectedInvestmentReturn: newPre,
      postRetirementReturn: newPost,
      assetAllocationSplit: updated,
    });
  };

  const applyAaPreset = (accumEq: number, accumBd: number, accumCs: number, decumEq: number, decumBd: number, decumCs: number) => {
    const updated: AssetAllocationSplit = {
      ...aaSplit,
      enabled: true,
      accumulation: { equity: accumEq, bond: accumBd, cash: accumCs },
      decumulation: { equity: decumEq, bond: decumBd, cash: decumCs },
    };
    updateAaSplit(updated);
  };

  const applyPreset = (pre: number, post: number, inf: number) => {
    onChange({
      ...profile,
      expectedInvestmentReturn: pre,
      postRetirementReturn: post,
      expectedInflationRate: inf,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Investment Returns & Macroeconomic Settings
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Growth Assumptions
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Adjust pre-retirement return, post-retirement return, CPI inflation, and pot-specific growth overrides
            </p>
          </div>
        </div>

        {/* Real Growth Summary Indicator Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
            Real Pre-Retire: <span className="font-extrabold">{Number(realPreReturn) >= 0 ? `+${realPreReturn}%` : `${realPreReturn}%`}</span> p.a.
          </div>
          <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs font-bold text-indigo-700 dark:text-indigo-300">
            Real Post-Retire: <span className="font-extrabold">{Number(realPostReturn) >= 0 ? `+${realPostReturn}%` : `${realPostReturn}%`}</span> p.a.
          </div>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
          Quick Macroeconomic Presets:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPreset(5.0, 3.5, 2.5)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
          >
            🛡️ Conservative (5.0% Pre / 3.5% Post / 2.5% Inf)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(6.5, 4.5, 2.5)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
          >
            ⚖️ Balanced Baseline (6.5% Pre / 4.5% Post / 2.5% Inf)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(8.0, 5.5, 2.0)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors border border-emerald-200 dark:border-emerald-800 cursor-pointer"
          >
            🚀 Growth / Optimistic (8.0% Pre / 5.5% Post / 2.0% Inf)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(7.0, 5.0, 4.0)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
          >
            🔥 High Inflation Scenario (7.0% Pre / 5.0% Post / 4.0% Inf)
          </button>
        </div>
      </div>

      {/* Baseline Macro Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        
        {/* Pre-Retirement Return Rate */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Pre-Retirement Return</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={preReturn}
                onChange={(e) => updateField('expectedInvestmentReturn', e.target.value === '' ? 0 : Number(e.target.value))}
                onBlur={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val) || e.target.value === '') val = 0;
                  val = Math.max(-5, Math.min(25, val));
                  updateField('expectedInvestmentReturn', val);
                }}
                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-extrabold text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">% p.a.</span>
            </div>
          </div>
          {(preReturn < -5 || preReturn > 25) && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">⚠ Value clamped to -5% to 25% on save</p>}

          <input
            type="range"
            min="0"
            max="15"
            step="0.1"
            value={preReturn}
            onChange={(e) => updateField('expectedInvestmentReturn', Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />

          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Compound annual growth rate during working accumulation years.
          </div>
        </div>

        {/* Post-Retirement Return Rate */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Post-Retirement Return</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={postReturn}
                onChange={(e) => updateField('postRetirementReturn', e.target.value === '' ? 0 : Number(e.target.value))}
                onBlur={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val) || e.target.value === '') val = 0;
                  val = Math.max(-5, Math.min(25, val));
                  updateField('postRetirementReturn', val);
                }}
                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-extrabold text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">% p.a.</span>
            </div>
          </div>
          {(postReturn < -5 || postReturn > 25) && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">⚠ Value clamped to -5% to 25% on save</p>}

          <input
            type="range"
            min="0"
            max="12"
            step="0.1"
            value={postReturn}
            onChange={(e) => updateField('postRetirementReturn', Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Compound annual growth rate during drawdown decumulation years (usually lower risk).
          </div>
        </div>

        {/* Expected Inflation Rate */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Expected Annual Inflation</span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min="0"
                max="15"
                value={inflation}
                onChange={(e) => updateField('expectedInflationRate', e.target.value === '' ? 0 : Number(e.target.value))}
                onBlur={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val) || e.target.value === '') val = 0;
                  val = Math.max(-2, Math.min(15, val));
                  updateField('expectedInflationRate', val);
                }}
                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-extrabold text-slate-900 dark:text-white text-right focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">% p.a.</span>
            </div>
          </div>
          {(inflation < -2 || inflation > 15) && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">⚠ Value clamped to -2% to 15% on save</p>}

          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={inflation}
            onChange={(e) => updateField('expectedInflationRate', Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Expected annual CPI inflation rate used to index spending and state pensions.
          </div>
        </div>
      </div>

      {/* ASSET ALLOCATION SPLIT (ACCUMULATION VS DECUMULATION) SECTION */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        
        {/* Toggle Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
          <div className="flex items-center gap-3">
            <PieChart className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Asset Allocation Split (Accumulation vs Decumulation)
                </h3>
                <span className="bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                  Multi-Asset Portfolio
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                Model separate Equities, Bonds, and Cash allocations during working accumulation vs drawdown decumulation years.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={aaSplit.enabled}
              onChange={(e) => updateAaSplit({ ...aaSplit, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Asset Allocation Split Configuration */}
        {aaSplit.enabled && (
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            
            {/* Quick Strategy Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Asset Allocation Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyAaPreset(85, 10, 5, 30, 50, 20)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  🚀 Aggressive Accumulation (85/10/5) → Capital Preservation (30/50/20)
                </button>
                <button
                  type="button"
                  onClick={() => applyAaPreset(70, 20, 10, 40, 45, 15)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  ⚖️ Balanced Growth (70/20/10) → Income Drawdown (40/45/15)
                </button>
                <button
                  type="button"
                  onClick={() => applyAaPreset(100, 0, 0, 60, 30, 10)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:border-emerald-300 transition-colors cursor-pointer"
                >
                  ⚡ 100% Equity → Classic 60/40 Portfolio (60/30/10)
                </button>
              </div>
            </div>

            {/* Side-by-Side Dual Allocation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* CARD A: ACCUMULATION PHASE (PRE-RETIREMENT) */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Accumulation Phase
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                    +{calculateWeightedAssetReturn(aaSplit.accumulation, aaSplit.assetClassReturns)}% p.a.
                  </span>
                </div>

                {/* Stacked Visual Bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div style={{ width: `${aaSplit.accumulation.equity}%` }} className="bg-emerald-500 h-full transition-all" title={`Equities ${aaSplit.accumulation.equity}%`} />
                  <div style={{ width: `${aaSplit.accumulation.bond}%` }} className="bg-indigo-500 h-full transition-all" title={`Bonds ${aaSplit.accumulation.bond}%`} />
                  <div style={{ width: `${aaSplit.accumulation.cash}%` }} className="bg-amber-400 h-full transition-all" title={`Cash ${aaSplit.accumulation.cash}%`} />
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 pt-1">
                  {/* Equity slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">Equities:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.accumulation.equity}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.accumulation.equity}
                      onChange={(e) => {
                        const eq = Number(e.target.value);
                        const rem = 100 - eq;
                        const bd = Math.round(rem * 0.75);
                        const cs = rem - bd;
                        updateAaSplit({
                          ...aaSplit,
                          accumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Bond slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400">Bonds / Fixed Income:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.accumulation.bond}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.accumulation.bond}
                      onChange={(e) => {
                        const bd = Number(e.target.value);
                        const rem = 100 - bd;
                        const eq = Math.min(rem, aaSplit.accumulation.equity);
                        const cs = rem - eq;
                        updateAaSplit({
                          ...aaSplit,
                          accumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Cash slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-amber-600 dark:text-amber-400">Cash / Short-Term:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.accumulation.cash}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.accumulation.cash}
                      onChange={(e) => {
                        const cs = Number(e.target.value);
                        const rem = 100 - cs;
                        const eq = Math.round(rem * 0.85);
                        const bd = rem - eq;
                        updateAaSplit({
                          ...aaSplit,
                          accumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* CARD B: DECUMULATION PHASE (POST-RETIREMENT) */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Decumulation Phase
                    </span>
                  </div>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                    +{calculateWeightedAssetReturn(aaSplit.decumulation, aaSplit.assetClassReturns)}% p.a.
                  </span>
                </div>

                {/* Stacked Visual Bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div style={{ width: `${aaSplit.decumulation.equity}%` }} className="bg-emerald-500 h-full transition-all" title={`Equities ${aaSplit.decumulation.equity}%`} />
                  <div style={{ width: `${aaSplit.decumulation.bond}%` }} className="bg-indigo-500 h-full transition-all" title={`Bonds ${aaSplit.decumulation.bond}%`} />
                  <div style={{ width: `${aaSplit.decumulation.cash}%` }} className="bg-amber-400 h-full transition-all" title={`Cash ${aaSplit.decumulation.cash}%`} />
                </div>

                {/* Sliders */}
                <div className="space-y-2.5 pt-1">
                  {/* Equity slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-600 dark:text-emerald-400">Equities:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.decumulation.equity}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.decumulation.equity}
                      onChange={(e) => {
                        const eq = Number(e.target.value);
                        const rem = 100 - eq;
                        const bd = Math.round(rem * 0.80);
                        const cs = rem - bd;
                        updateAaSplit({
                          ...aaSplit,
                          decumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Bond slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-indigo-600 dark:text-indigo-400">Bonds / Fixed Income:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.decumulation.bond}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.decumulation.bond}
                      onChange={(e) => {
                        const bd = Number(e.target.value);
                        const rem = 100 - bd;
                        const eq = Math.min(rem, aaSplit.decumulation.equity);
                        const cs = rem - eq;
                        updateAaSplit({
                          ...aaSplit,
                          decumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  {/* Cash slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-amber-600 dark:text-amber-400">Cash / Short-Term:</span>
                      <span className="text-slate-900 dark:text-white">{aaSplit.decumulation.cash}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={aaSplit.decumulation.cash}
                      onChange={(e) => {
                        const cs = Number(e.target.value);
                        const rem = 100 - cs;
                        const eq = Math.round(rem * 0.50);
                        const bd = rem - eq;
                        updateAaSplit({
                          ...aaSplit,
                          decumulation: { equity: eq, bond: bd, cash: cs },
                        });
                      }}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Asset Class Baseline Yield Inputs */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block uppercase tracking-wider">
                Asset Class Return Rate Assumptions (% p.a.)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Equity Expected Return:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.1" min="0" max="25"
                      value={aaSplit.assetClassReturns.equityReturn}
                      onChange={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, equityReturn: e.target.value === '' ? '' : Number(e.target.value) } })}
                      onBlur={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, equityReturn: Math.max(0, Math.min(25, Number(e.target.value) || 0)) } })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Bond Expected Return:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.1" min="0" max="25"
                      value={aaSplit.assetClassReturns.bondReturn}
                      onChange={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, bondReturn: e.target.value === '' ? '' : Number(e.target.value) } })}
                      onBlur={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, bondReturn: Math.max(0, Math.min(25, Number(e.target.value) || 0)) } })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Cash Expected Return:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" step="0.1" min="0" max="25"
                      value={aaSplit.assetClassReturns.cashReturn}
                      onChange={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, cashReturn: e.target.value === '' ? '' : Number(e.target.value) } })}
                      onBlur={(e) => updateAaSplit({ ...aaSplit, assetClassReturns: { ...aaSplit.assetClassReturns, cashReturn: Math.max(0, Math.min(25, Number(e.target.value) || 0)) } })}
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PER-POT GRANULAR ASSET ALLOCATION OVERRIDES */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 block">
                      Per-Pot Granular Asset Allocations (Pre & Post Retirement)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Customize stock/bond/cash ratios individually for Workplace Pension, SIPP, ISAs & GIA
                    </span>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(aaSplit.perPotAllocationsEnabled)}
                    onChange={(e) => updateAaSplit({ ...aaSplit, perPotAllocationsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {aaSplit.perPotAllocationsEnabled && (
                <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  {/* Presets Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Asset Location Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const primaryPots = {
                            workplacePension: { accumulation: { equity: 80, bond: 20, cash: 0 }, decumulation: { equity: 40, bond: 50, cash: 10 } },
                            sipp: { accumulation: { equity: 100, bond: 0, cash: 0 }, decumulation: { equity: 100, bond: 0, cash: 0 } },
                            stocksAndSharesIsa: { accumulation: { equity: 100, bond: 0, cash: 0 }, decumulation: { equity: 100, bond: 0, cash: 0 } },
                            cashIsa: { accumulation: { equity: 0, bond: 0, cash: 100 }, decumulation: { equity: 0, bond: 0, cash: 100 } },
                            gia: { accumulation: { equity: 70, bond: 30, cash: 0 }, decumulation: { equity: 50, bond: 50, cash: 0 } },
                          };
                          updateAaSplit({
                            ...aaSplit,
                            perPotAllocationsEnabled: true,
                            primaryPots,
                            partnerPots: profile.isCouplePlanning ? primaryPots : undefined,
                          });
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 transition-colors cursor-pointer"
                      >
                        ⚡ 100% Equity ISAs & SIPP (Tax Arbitrage)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const primaryPots = {
                            workplacePension: { accumulation: { equity: 80, bond: 15, cash: 5 }, decumulation: { equity: 40, bond: 40, cash: 20 } },
                            sipp: { accumulation: { equity: 90, bond: 10, cash: 0 }, decumulation: { equity: 60, bond: 30, cash: 10 } },
                            stocksAndSharesIsa: { accumulation: { equity: 100, bond: 0, cash: 0 }, decumulation: { equity: 90, bond: 10, cash: 0 } },
                            cashIsa: { accumulation: { equity: 0, bond: 0, cash: 100 }, decumulation: { equity: 0, bond: 0, cash: 100 } },
                            gia: { accumulation: { equity: 60, bond: 40, cash: 0 }, decumulation: { equity: 40, bond: 40, cash: 20 } },
                          };
                          updateAaSplit({
                            ...aaSplit,
                            perPotAllocationsEnabled: true,
                            primaryPots,
                            partnerPots: profile.isCouplePlanning ? primaryPots : undefined,
                          });
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
                      >
                        🛡️ 3-Year Cash Buffer
                      </button>
                    </div>
                  </div>

                  {/* Account Types Cards */}
                  {[
                    { key: 'workplacePension', label: 'Workplace Pension', defaultAccum: { equity: 80, bond: 15, cash: 5 }, defaultDecum: { equity: 40, bond: 50, cash: 10 } },
                    { key: 'sipp', label: 'SIPP Pension', defaultAccum: { equity: 80, bond: 15, cash: 5 }, defaultDecum: { equity: 40, bond: 50, cash: 10 } },
                    { key: 'stocksAndSharesIsa', label: 'Stocks & Shares ISA', defaultAccum: { equity: 100, bond: 0, cash: 0 }, defaultDecum: { equity: 100, bond: 0, cash: 0 } },
                    { key: 'cashIsa', label: 'Cash ISA', defaultAccum: { equity: 0, bond: 0, cash: 100 }, defaultDecum: { equity: 0, bond: 0, cash: 100 } },
                    { key: 'gia', label: 'General Investment Account (GIA)', defaultAccum: { equity: 70, bond: 25, cash: 5 }, defaultDecum: { equity: 50, bond: 40, cash: 10 } },
                  ].map((pot) => {
                    const potKey = pot.key as keyof PerPersonPotAllocations;
                    const primaryConfig = aaSplit.primaryPots?.[potKey];
                    const accum = primaryConfig?.accumulation || aaSplit.accumulation || pot.defaultAccum;
                    const decum = primaryConfig?.decumulation || aaSplit.decumulation || pot.defaultDecum;

                    const accumReturn = calculateWeightedAssetReturn(accum, aaSplit.assetClassReturns);
                    const decumReturn = calculateWeightedAssetReturn(decum, aaSplit.assetClassReturns);

                    const updatePotPhase = (phase: 'accumulation' | 'decumulation', updatedAlloc: { equity: number; bond: number; cash: number }) => {
                      const currentPrimaryPots = aaSplit.primaryPots || {};
                      const currentPotObj = currentPrimaryPots[potKey] || {};
                      const newPrimaryPots = {
                        ...currentPrimaryPots,
                        [potKey]: {
                          ...currentPotObj,
                          [phase]: updatedAlloc,
                        },
                      };
                      updateAaSplit({
                        ...aaSplit,
                        primaryPots: newPrimaryPots,
                      });
                    };

                    return (
                      <div key={pot.key} className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            {pot.label}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                              Pre: +{accumReturn}% p.a.
                            </span>
                            <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                              Post: +{decumReturn}% p.a.
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Pre-Retirement (Accumulation) */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                              <span>Pre-Retirement (Accumulation)</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{accum.equity}% Eq / {accum.bond}% Bd / {accum.cash}% Cs</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                              <div style={{ width: `${accum.equity}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${accum.bond}%` }} className="bg-indigo-500 h-full" />
                              <div style={{ width: `${accum.cash}%` }} className="bg-amber-400 h-full" />
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <span>Equity: {accum.equity}%</span>
                                <input
                                  type="range" min="0" max="100" step="5"
                                  value={accum.equity}
                                  onChange={(e) => {
                                    const eq = Number(e.target.value);
                                    const rem = 100 - eq;
                                    const bd = Math.round(rem * 0.80);
                                    const cs = rem - bd;
                                    updatePotPhase('accumulation', { equity: eq, bond: bd, cash: cs });
                                  }}
                                  className="w-28 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <span>Bonds: {accum.bond}%</span>
                                <input
                                  type="range" min="0" max="100" step="5"
                                  value={accum.bond}
                                  onChange={(e) => {
                                    const bd = Number(e.target.value);
                                    const rem = 100 - bd;
                                    const eq = Math.min(rem, accum.equity);
                                    const cs = rem - eq;
                                    updatePotPhase('accumulation', { equity: eq, bond: bd, cash: cs });
                                  }}
                                  className="w-28 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Post-Retirement (Decumulation) */}
                          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                              <span>Post-Retirement (Decumulation)</span>
                              <span className="text-indigo-600 dark:text-indigo-400">{decum.equity}% Eq / {decum.bond}% Bd / {decum.cash}% Cs</span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                              <div style={{ width: `${decum.equity}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${decum.bond}%` }} className="bg-indigo-500 h-full" />
                              <div style={{ width: `${decum.cash}%` }} className="bg-amber-400 h-full" />
                            </div>
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <span>Equity: {decum.equity}%</span>
                                <input
                                  type="range" min="0" max="100" step="5"
                                  value={decum.equity}
                                  onChange={(e) => {
                                    const eq = Number(e.target.value);
                                    const rem = 100 - eq;
                                    const bd = Math.round(rem * 0.80);
                                    const cs = rem - bd;
                                    updatePotPhase('decumulation', { equity: eq, bond: bd, cash: cs });
                                  }}
                                  className="w-28 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                <span>Bonds: {decum.bond}%</span>
                                <input
                                  type="range" min="0" max="100" step="5"
                                  value={decum.bond}
                                  onChange={(e) => {
                                    const bd = Number(e.target.value);
                                    const rem = 100 - bd;
                                    const eq = Math.min(rem, decum.equity);
                                    const cs = rem - eq;
                                    updatePotPhase('decumulation', { equity: eq, bond: bd, cash: cs });
                                  }}
                                  className="w-28 h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Investment, Platform & Adviser Fees Section */}
      <InvestmentFeesCard profile={profile} pots={pots} onChange={onChange} />

    </div>
  );
};
