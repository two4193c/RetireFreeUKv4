import React from 'react';
import {
  SlidersHorizontal,
  Receipt,
  Sliders,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Settings2,
  Info,
} from 'lucide-react';
import { UserProfile, CustomTaxBandOverrides, PotReturnOverrides } from '../types';
import { DEFAULT_CUSTOM_TAX_BANDS, DEFAULT_POT_RETURN_OVERRIDES } from '../utils/defaultData';
import { InvestmentFeesCard } from './InvestmentFeesCard';
import { MacroSettingsCard } from './MacroSettingsCard';

interface AdvancedSettingsCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
  onOpenAiAdvisor?: () => void;
}

export const AdvancedSettingsCard: React.FC<AdvancedSettingsCardProps> = ({ profile, onChange, onOpenAiAdvisor }) => {
  const customBands = profile.customTaxBands || DEFAULT_CUSTOM_TAX_BANDS;
  const isCustomTaxEnabled = Boolean(customBands.enabled);
  const isScottish = profile.taxRegion === 'scotland';

  const overrides = profile.potReturnOverrides || DEFAULT_POT_RETURN_OVERRIDES;
  const isGrowthOverridesEnabled = Boolean(overrides.enabled);
  const inflation = profile.expectedInflationRate ?? 2.5;

  const updateCustomTaxBand = <K extends keyof CustomTaxBandOverrides>(field: K, value: CustomTaxBandOverrides[K]) => {
    onChange({
      ...profile,
      customTaxBands: {
        ...(profile.customTaxBands || DEFAULT_CUSTOM_TAX_BANDS),
        [field]: value,
      },
    });
  };

  const resetCustomTaxBands = () => {
    onChange({
      ...profile,
      customTaxBands: {
        ...DEFAULT_CUSTOM_TAX_BANDS,
        enabled: true,
      },
    });
  };

  const updateOverrideField = (field: keyof PotReturnOverrides, value: any) => {
    onChange({
      ...profile,
      potReturnOverrides: {
        ...overrides,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Advanced
                </h2>
                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Model Tuning
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize tax band inflation indexing, custom tax rate overrides, and pot-specific investment growth rates.
              </p>
            </div>
          </div>

          {/* ACTIVE SETTINGS SUMMARY BADGES */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                (profile.indexTaxBands ?? true)
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              {(profile.indexTaxBands ?? true) ? 'Tax Bands: Indexed' : 'Tax Bands: Frozen'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                isCustomTaxEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isCustomTaxEnabled ? 'Custom Tax Overrides Active' : 'Default HMRC Tax Bands'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                isGrowthOverridesEnabled
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {isGrowthOverridesEnabled ? 'Pot Growth Overrides Active' : 'Flat Growth Rate'}
            </span>
          </div>
        </div>

        <div className="space-y-6 pt-6">
          {/* 1. TAX BANDS & ALLOWANCE INFLATION INDEXING */}
          <section id="card-adv-tax-indexing" className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                    Tax Bands & Allowance Inflation Indexing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {(profile.indexTaxBands ?? true)
                      ? 'Personal allowance & tax thresholds expand each year with CPI inflation'
                      : 'Tax bands & allowances remain frozen in nominal terms (simulating fiscal drag)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onChange({ ...profile, indexTaxBands: true })}
                  className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    (profile.indexTaxBands ?? true)
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Indexed (Default)
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...profile, indexTaxBands: false })}
                  className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    !(profile.indexTaxBands ?? true)
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Frozen (Fiscal Drag)
                </button>
              </div>
            </div>
          </section>

          {/* 2. INCOME TAX BANDS & ALLOWANCES OVERRIDES */}
          <section id="card-adv-tax-overrides" className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors shrink-0 ${
                    isCustomTaxEnabled
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60'
                  }`}
                >
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                      Income Tax Bands & Allowances Overrides
                    </h3>
                    {isCustomTaxEnabled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        <Sparkles className="w-3 h-3" /> Custom Overrides Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isCustomTaxEnabled
                      ? 'Custom tax bands and rates are active across all tax calculations and projection models'
                      : 'Currently using standard HMRC UK 2026/27 default tax bands (£12,570 PA, 20%, 40%, 45%)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomTaxEnabled}
                    onChange={(e) => updateCustomTaxBand('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isCustomTaxEnabled ? 'Override Enabled' : 'Use Default UK Bands'}
                </span>
              </div>
            </div>

            {/* CUSTOM TAX BANDS EDITOR */}
            {isCustomTaxEnabled && (
              <div className="bg-amber-50/40 dark:bg-slate-800/60 border border-amber-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-4 transition-all">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      {isScottish ? 'Scottish Income Tax Bands Override' : 'rUK (England/NI/Wales) Income Tax Bands Override'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetCustomTaxBands}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to HMRC Defaults
                  </button>
                </div>

                {/* Standard rUK Tax Bands Inputs */}
                {!isScottish ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Personal Allowance */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Personal Allowance (£)</span>
                        <span className="text-[10px] text-slate-400">0% Tax</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={customBands.personalAllowance}
                          onChange={(e) => updateCustomTaxBand('personalAllowance', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Tax-free threshold (Std: £12,570)</p>
                    </div>

                    {/* PA Taper Threshold */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>PA Taper Start (£)</span>
                        <span className="text-[10px] text-slate-400">£1 per £2</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={customBands.paTaperThreshold}
                          onChange={(e) => updateCustomTaxBand('paTaperThreshold', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">PA clawback start (Std: £100,000)</p>
                    </div>

                    {/* Basic Rate % */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Basic Rate (%)</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Basic</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={customBands.basicRatePercent}
                          onChange={(e) => updateCustomTaxBand('basicRatePercent', Number(e.target.value))}
                          className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Basic tax rate (Std: 20%)</p>
                    </div>

                    {/* Basic Rate Band Width */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Basic Band Width (£)</span>
                        <span className="text-[10px] text-slate-400">Taxable</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          value={customBands.basicRateThreshold}
                          onChange={(e) => updateCustomTaxBand('basicRateThreshold', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Width of basic rate band (Std: £37,700)</p>
                    </div>

                    {/* Higher Rate % */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Higher Rate (%)</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Higher</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={customBands.higherRatePercent}
                          onChange={(e) => updateCustomTaxBand('higherRatePercent', Number(e.target.value))}
                          className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Higher tax rate (Std: 40%)</p>
                    </div>

                    {/* Higher Rate Gross Limit */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Higher Rate Gross Limit (£)</span>
                        <span className="text-[10px] text-slate-400">Gross</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="500"
                          min="0"
                          value={customBands.higherRateThreshold}
                          onChange={(e) => updateCustomTaxBand('higherRateThreshold', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Gross income where additional rate starts (Std: £125,140)</p>
                    </div>

                    {/* Additional Rate % */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Additional Rate (%)</span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Additional</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={customBands.additionalRatePercent}
                          onChange={(e) => updateCustomTaxBand('additionalRatePercent', Number(e.target.value))}
                          className="w-full pl-3 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                        <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Top tax rate above higher threshold (Std: 45%)</p>
                    </div>
                  </div>
                ) : (
                  /* Scottish Tax Bands Overrides */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Starter Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotStarterRatePercent ?? 19}
                        onChange={(e) => updateCustomTaxBand('scotStarterRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 19% up to £2,306 taxable</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Basic Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotBasicRatePercent ?? 20}
                        onChange={(e) => updateCustomTaxBand('scotBasicRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 20% up to £13,991 taxable</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Intermediate Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotIntermediateRatePercent ?? 21}
                        onChange={(e) => updateCustomTaxBand('scotIntermediateRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 21% up to £31,092 taxable</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Higher Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotHigherRatePercent ?? 42}
                        onChange={(e) => updateCustomTaxBand('scotHigherRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 42% up to £62,430 taxable</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Advanced Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotAdvancedRatePercent ?? 45}
                        onChange={(e) => updateCustomTaxBand('scotAdvancedRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 45% up to £125,140 taxable</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Top Rate (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={customBands.scotTopRatePercent ?? 48}
                        onChange={(e) => updateCustomTaxBand('scotTopRatePercent', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                      <p className="text-[10px] text-slate-400">Std: 48% over £125,140 taxable</p>
                    </div>
                  </div>
                )}

                {/* Statutory Allowances Overrides */}
                <div className="pt-3 border-t border-amber-200/80 dark:border-slate-700/80 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Statutory Annual Allowances Overrides
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Max Pension Annual Allowance */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>Max Pension Annual Allowance (£)</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Annual Limit</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={customBands.pensionAnnualAllowance ?? 60000}
                          onChange={(e) => updateCustomTaxBand('pensionAnnualAllowance', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Statutory pension annual contribution allowance limit (Std: £60,000)</p>
                    </div>

                    {/* ISA Annual Allowance */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>ISA Annual Allowance (£)</span>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">Annual Limit</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">£</span>
                        <input
                          type="number"
                          step="1000"
                          min="0"
                          value={customBands.isaAnnualAllowance ?? 20000}
                          onChange={(e) => updateCustomTaxBand('isaAnnualAllowance', Math.max(0, Number(e.target.value)))}
                          className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">Annual tax-free ISA subscription allowance limit (Std: £20,000)</p>
                    </div>
                  </div>
                </div>

                {/* LIVE TAX BAND SUMMARY BADGES */}
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Active Custom Tax Schedule:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      0% up to £{customBands.personalAllowance.toLocaleString()}
                    </span>
                    <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      {customBands.basicRatePercent}% up to £{(customBands.personalAllowance + customBands.basicRateThreshold).toLocaleString()} gross
                    </span>
                    <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      {customBands.higherRatePercent}% up to £{customBands.higherRateThreshold.toLocaleString()} gross
                    </span>
                    <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800">
                      {customBands.additionalRatePercent}% over £{customBands.higherRateThreshold.toLocaleString()} gross
                    </span>
                    <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                      Pension AA: £{(customBands.pensionAnnualAllowance ?? 60000).toLocaleString()}
                    </span>
                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      ISA AA: £{(customBands.isaAnnualAllowance ?? 20000).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. POT-SPECIFIC GROWTH RATE OVERRIDES */}
          <section id="card-adv-growth-overrides" className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                      Pot-Specific Growth Rate Overrides
                    </h3>
                    <span className="bg-indigo-200 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                      Asset Allocation Yields
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Override flat baseline return with custom yield rates per account type (e.g., 7.5% S&S ISA vs 4.2% Cash ISA vs 3.5% Savings).
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 self-start sm:self-auto">
                <input
                  type="checkbox"
                  checked={isGrowthOverridesEnabled}
                  onChange={(e) => updateOverrideField('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Custom Pot Return Overrides Inputs Grid */}
            {isGrowthOverridesEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                {/* Workplace Pension */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Workplace Pension</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{overrides.workplacePensionReturn ?? 7.0}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.workplacePensionReturn ?? 7.0}
                    onChange={(e) => updateOverrideField('workplacePensionReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('workplacePensionReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.workplacePensionReturn ?? 7.0) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* SIPP */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>SIPP / Personal Pension</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{overrides.sippReturn ?? 7.5}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.sippReturn ?? 7.5}
                    onChange={(e) => updateOverrideField('sippReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('sippReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.sippReturn ?? 7.5) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* Stocks & Shares ISA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Stocks &amp; Shares ISA</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{overrides.stocksAndSharesIsaReturn ?? 7.5}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.stocksAndSharesIsaReturn ?? 7.5}
                    onChange={(e) => updateOverrideField('stocksAndSharesIsaReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('stocksAndSharesIsaReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.stocksAndSharesIsaReturn ?? 7.5) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* Cash ISA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Cash ISA</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">{overrides.cashIsaReturn ?? 4.2}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.cashIsaReturn ?? 4.2}
                    onChange={(e) => updateOverrideField('cashIsaReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('cashIsaReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.cashIsaReturn ?? 4.2) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* Lifetime ISA (LISA) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Lifetime ISA (LISA)</span>
                    <span className="font-extrabold text-teal-600 dark:text-teal-400">{overrides.lisaReturn ?? 6.5}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.lisaReturn ?? 6.5}
                    onChange={(e) => updateOverrideField('lisaReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('lisaReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.lisaReturn ?? 6.5) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* General Investment Account (GIA) */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>GIA Account</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{overrides.giaReturn ?? 6.5}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.giaReturn ?? 6.5}
                    onChange={(e) => updateOverrideField('giaReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('giaReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">Real: +{((overrides.giaReturn ?? 6.5) - inflation).toFixed(1)}% p.a.</span>
                </div>

                {/* Cash Savings / High-Yield Savings */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Cash Savings &amp; High-Yield Accounts</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">{overrides.cashSavingsReturn ?? 3.5}%</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={overrides.cashSavingsReturn ?? 3.5}
                    onChange={(e) => updateOverrideField('cashSavingsReturn', e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={(e) => updateOverrideField('cashSavingsReturn', Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Real: +{((overrides.cashSavingsReturn ?? 3.5) - inflation).toFixed(1)}% p.a. (Accurately models cash drag vs inflation)
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Investment Returns & Asset Allocation Split */}
          <div id="card-adv-macro" className="scroll-mt-24 transition-all duration-300">
            <MacroSettingsCard profile={profile} onChange={onChange} />
          </div>

          {/* AI Tax & Pension Advisor */}
          <div id="card-other-aitaxadvisor" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between scroll-mt-24 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                    AI Tax & Pension Advisor
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Smart AI assistant tailored to your specific active scenario parameters and UK tax queries.
                  </p>
                </div>
              </div>

              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                <li>Personalized drawdown tax optimization recommendations</li>
                <li>60% tax trap mitigation strategies</li>
                <li>Inheritance tax (IHT) planning & gifting rules</li>
                <li>Instant answers to complex UK pension questions</li>
              </ul>
            </div>

            <button
              onClick={onOpenAiAdvisor}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Tax Advisor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
