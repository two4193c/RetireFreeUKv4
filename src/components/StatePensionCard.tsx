import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Landmark, Info, Users, Sparkles, Clock, ArrowUpRight, TrendingUp } from 'lucide-react';

interface StatePensionCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const StatePensionCard: React.FC<StatePensionCardProps> = ({ profile, onChange, isStudioMode }) => {
  const updateField = <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    onChange({
      ...profile,
      [field]: value,
    });
  };

  const isCouple = Boolean(profile.isCouplePlanning);

  const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
  const primaryYears = profile.qualifyingYears ?? 35;
  const primaryAnnual = primaryYears >= 10 ? Math.round((primaryYears / 35) * primaryFull * 100) / 100 : 0;
  const primarySpa = profile.statePensionAge ?? 67;
  const primaryDeferralYears = profile.statePensionDeferralYears || 0;
  const primaryClaimAge = primarySpa + primaryDeferralYears;
  const primaryDeferralBoostRate = 0.058 * primaryDeferralYears;
  const primaryBoostedAnnual = Math.round(primaryAnnual * (1 + primaryDeferralBoostRate) * 100) / 100;
  const primaryExtraAnnual = Math.round((primaryBoostedAnnual - primaryAnnual) * 100) / 100;
  const primaryForegone = Math.round(primaryAnnual * primaryDeferralYears);
  const primaryBreakEvenYears = primaryDeferralYears > 0 ? Math.round((1 / 0.058) * 10) / 10 : 0;
  const primaryBreakEvenAge = Math.round((primaryClaimAge + primaryBreakEvenYears) * 10) / 10;

  const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
  const partnerYears = profile.partnerQualifyingYears ?? 35;
  const partnerAnnual = partnerYears >= 10 ? Math.round((partnerYears / 35) * partnerFull * 100) / 100 : 0;
  const partnerSpa = profile.partnerStatePensionAge ?? 67;
  const partnerDeferralYears = profile.partnerStatePensionDeferralYears || 0;
  const partnerClaimAge = partnerSpa + partnerDeferralYears;
  const partnerDeferralBoostRate = 0.058 * partnerDeferralYears;
  const partnerBoostedAnnual = Math.round(partnerAnnual * (1 + partnerDeferralBoostRate) * 100) / 100;
  const partnerExtraAnnual = Math.round((partnerBoostedAnnual - partnerAnnual) * 100) / 100;
  const partnerForegone = Math.round(partnerAnnual * partnerDeferralYears);
  const partnerBreakEvenYears = partnerDeferralYears > 0 ? Math.round((1 / 0.058) * 10) / 10 : 0;
  const partnerBreakEvenAge = Math.round((partnerClaimAge + partnerBreakEvenYears) * 10) / 10;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                State Pension Forecast
              </h3>
              {!isStudioMode && (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                  Guaranteed Income
                </span>
              )}
            </div>
            {!isStudioMode && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculated based on National Insurance qualifying years (min 10 years for entitlement, max 35 years for full amount) with optional UK deferral boosting (+5.8%/yr).
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${isStudioMode ? "" : "lg:grid-cols-2"}`}>
        {/* Primary State Pension */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.includeStatePension ?? true}
                onChange={(e) => updateField('includeStatePension', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 focus:ring-primary-500 cursor-pointer"
              />
              <span>{profile.name || 'Primary'} State Pension</span>
            </label>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...profile,
                  includeStatePension: true,
                  qualifyingYears: 35,
                  statePensionAmountAnnual: primaryFull,
                });
              }}
              className="text-[10px] font-bold text-primary-700 dark:text-primary-300 hover:text-primary-800 bg-primary-100/80 dark:bg-primary-950/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-primary-200/60 dark:border-primary-800/60"
            >
              Max 35 Yrs (Full)
            </button>
          </div>

          {(profile.includeStatePension ?? true) && (
            <div className="space-y-3">
              {/* Triple Lock Inflation Indexing Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-primary-50/60 dark:bg-primary-950/40 rounded-xl border border-primary-200/60 dark:border-primary-800/50">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.enableTripleLock ?? true}
                    onChange={(e) => {
                      const val = e.target.checked;
                      onChange({
                        ...profile,
                        enableTripleLock: val,
                      });
                    }}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-slate-700 focus:ring-primary-500 cursor-pointer"
                  />
                  <span>Triple Lock Indexing</span>
                </label>
                <span className="text-[10px] font-semibold text-primary-700 dark:text-primary-300">
                  {(profile.enableTripleLock ?? true) ? 'CPI Inflation Linked' : 'Fixed Nominal £'}
                </span>
              </div>

              {/* Editable Full State Pension Benchmark */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>Full State Pension Benchmark</span>
                  <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">At 35 Yrs</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-extrabold text-slate-400">£</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={primaryFull}
                    onChange={(e) => {
                      const newFull = Math.max(0, Number(e.target.value));
                      const annual = primaryYears >= 10 ? Math.round((primaryYears / 35) * newFull * 100) / 100 : 0;
                      onChange({
                        ...profile,
                        fullStatePensionAmount: newFull,
                        statePensionAmountAnnual: annual,
                      });
                    }}
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3`}>
                {/* Qualifying Years */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Qualifying Years
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Min 10 / Max 35</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="35"
                    value={primaryYears}
                    onChange={(e) => {
                      const years = Math.min(35, Math.max(0, Number(e.target.value)));
                      const annual = years >= 10 ? Math.round((years / 35) * primaryFull * 100) / 100 : 0;
                      onChange({
                        ...profile,
                        qualifyingYears: years,
                        statePensionAmountAnnual: annual,
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>

                {/* State Pension Age */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    State Pension Age
                  </label>
                  <input
                    type="number"
                    min="60"
                    max="75"
                    value={profile.statePensionAge ?? 67}
                    onChange={(e) => updateField('statePensionAge', Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Qualifying Years Slider */}
              <div className="space-y-1 pt-1">
                <input
                  type="range"
                  min="0"
                  max="35"
                  step="1"
                  value={primaryYears}
                  onChange={(e) => {
                    const years = Number(e.target.value);
                    const annual = years >= 10 ? Math.round((years / 35) * primaryFull * 100) / 100 : 0;
                    onChange({
                      ...profile,
                      qualifyingYears: years,
                      statePensionAmountAnnual: annual,
                    });
                  }}
                  className="w-full accent-primary-600 cursor-pointer"
                />
              </div>

              {/* Minimum 10 Years Rule Notice */}
              {primaryYears > 0 && primaryYears < 10 && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900 dark:text-amber-200">UK Minimum 10 Years Rule:</span>
                    You need at least 10 qualifying National Insurance years to get any State Pension. Entitlement is £0/yr for less than 10 years.
                  </div>
                </div>
              )}

              {/* Deferral / Delay State Pension Section */}
              <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      Delay State Pension (Deferral)
                    </span>
                  </div>
                  {primaryDeferralYears > 0 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      +{(primaryDeferralYears * 5.8).toFixed(1)}% Boosted
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Standard Claim (Age {primarySpa})
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Under UK rules, delaying increases your State Pension by <strong>1% for every 9 weeks (~5.8% per year)</strong> permanently, fully index-linked for life.
                </p>

                {/* Quick Delay Presets */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Quick Deferral Options:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: `No Delay (${primarySpa})`, years: 0 },
                      { label: `+1 Yr (${primarySpa + 1})`, years: 1 },
                      { label: `+2 Yrs (${primarySpa + 2})`, years: 2 },
                      { label: `+3 Yrs (${primarySpa + 3})`, years: 3 },
                      { label: `+5 Yrs (${primarySpa + 5})`, years: 5 },
                    ].map((opt) => {
                      const isActive = primaryDeferralYears === opt.years;
                      return (
                        <button
                          key={opt.years}
                          type="button"
                          onClick={() => updateField('statePensionDeferralYears', opt.years)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            isActive
                              ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dual Synchronized Inputs: Years to Delay & Effective Claim Age */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Years to Delay
                      </label>
                      <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">
                        0 to 10 yrs
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateField('statePensionDeferralYears', Math.max(0, primaryDeferralYears - 1))}
                        disabled={primaryDeferralYears <= 0}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={primaryDeferralYears}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                          updateField('statePensionDeferralYears', val);
                        }}
                        className="w-full text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateField('statePensionDeferralYears', Math.min(10, primaryDeferralYears + 1))}
                        disabled={primaryDeferralYears >= 10}
                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Claim Age
                      </label>
                      <span className="text-[10px] font-semibold text-slate-400">
                        SPA is {primarySpa}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={primarySpa}
                      max={primarySpa + 10}
                      value={primaryClaimAge}
                      onChange={(e) => {
                        const newAge = Number(e.target.value) || primarySpa;
                        const diff = Math.max(0, Math.min(10, newAge - primarySpa));
                        updateField('statePensionDeferralYears', diff);
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Slider for delay */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={primaryDeferralYears}
                    onChange={(e) => updateField('statePensionDeferralYears', Number(e.target.value))}
                    className="w-full accent-primary-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>0y (Age {primarySpa})</span>
                    <span>5y (Age {primarySpa + 5})</span>
                    <span>10y (Age {primarySpa + 10})</span>
                  </div>
                </div>

                {/* Live Deferral Benefit & Break-even Card */}
                {primaryDeferralYears > 0 && primaryAnnual > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Deferred Impact (+{(primaryDeferralYears * 5.8).toFixed(1)}% Boost)
                      </span>
                      <span className="font-black text-emerald-800 dark:text-emerald-300">
                        +£{primaryExtraAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr extra
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Boosted Starting Pension:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          £{primaryBoostedAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">First Claim Year:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          Age {primaryClaimAge} ({primaryDeferralYears} yr{primaryDeferralYears > 1 ? 's' : ''} delay)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Income Foregone in Delay:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          £{primaryForegone.toLocaleString('en-GB')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block">Estimated Break-even:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          ~Age {primaryBreakEvenAge} ({primaryBreakEvenYears} yrs)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Computed Entitlement Result Callout */}
              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs ${
                primaryYears > 0 && primaryYears < 10
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                  : 'bg-primary-100/70 dark:bg-primary-950/60 border-primary-200 dark:border-primary-800'
              }`}>
                <div>
                  <span className={`font-bold ${
                    primaryYears > 0 && primaryYears < 10
                      ? 'text-amber-900 dark:text-amber-200'
                      : 'text-primary-900 dark:text-primary-200'
                  }`}>
                    Calculated Entitlement ({primaryYears}/35 Yrs):
                  </span>
                  {primaryDeferralYears > 0 && primaryYears >= 10 && (
                    <span className="text-[10px] text-primary-700 dark:text-primary-300 block font-medium">
                      Commences at Age {primaryClaimAge} (Base £{primaryAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })} + {(primaryDeferralYears * 5.8).toFixed(1)}% Deferral Boost)
                    </span>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className={`font-extrabold text-sm ${
                    primaryYears > 0 && primaryYears < 10
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-primary-800 dark:text-primary-300'
                  }`}>
                    £{(primaryDeferralYears > 0 && primaryYears >= 10 ? primaryBoostedAnnual : primaryAnnual).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
                  </span>
                  {primaryYears > 0 && primaryYears < 10 && (
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                      (&lt;10 Yrs = £0 Entitlement)
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Partner State Pension */}
        {isCouple ? (
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/60">
              <label className="text-xs font-extrabold text-indigo-950 dark:text-indigo-100 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.partnerIncludeStatePension ?? true}
                  onChange={(e) => updateField('partnerIncludeStatePension', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span>{profile.partnerName || 'Partner'} State Pension</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  onChange({
                    ...profile,
                    partnerIncludeStatePension: true,
                    partnerQualifyingYears: 35,
                    partnerStatePensionAmountAnnual: partnerFull,
                  });
                }}
                className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 bg-indigo-100 dark:bg-indigo-900/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
              >
                Max 35 Yrs (Full)
              </button>
            </div>

            {(profile.partnerIncludeStatePension ?? true) && (
              <div className="space-y-3">
                {/* Partner Triple Lock Indexing Toggle */}
                <div className="flex items-center justify-between p-2.5 bg-indigo-100/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50">
                  <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.partnerEnableTripleLock ?? true}
                      onChange={(e) => updateField('partnerEnableTripleLock', e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Triple Lock Indexing</span>
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                    {(profile.partnerEnableTripleLock ?? true) ? 'CPI Inflation Linked' : 'Fixed Nominal £'}
                  </span>
                </div>

                {/* Editable Full Partner State Pension Benchmark */}
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200/80 dark:border-indigo-900/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                    <span>Full State Pension Benchmark</span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">At 35 Yrs</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-extrabold text-indigo-400">£</span>
                    <input
                      type="number"
                      step="10"
                      min="0"
                      value={partnerFull}
                      onChange={(e) => {
                        const newFull = Math.max(0, Number(e.target.value));
                        const annual = partnerYears >= 10 ? Math.round((partnerYears / 35) * newFull * 100) / 100 : 0;
                        onChange({
                          ...profile,
                          partnerFullStatePensionAmount: newFull,
                          partnerStatePensionAmountAnnual: annual,
                        });
                      }}
                      className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                        Qualifying Years
                      </label>
                      <span className="text-[10px] font-semibold text-indigo-400">Min 10 / Max 35</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="35"
                      value={partnerYears}
                      onChange={(e) => {
                        const years = Math.min(35, Math.max(0, Number(e.target.value)));
                        const annual = years >= 10 ? Math.round((years / 35) * partnerFull * 100) / 100 : 0;
                        onChange({
                          ...profile,
                          partnerQualifyingYears: years,
                          partnerStatePensionAmountAnnual: annual,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 block">
                      State Pension Age
                    </label>
                    <input
                      type="number"
                      min="60"
                      max="75"
                      value={profile.partnerStatePensionAge ?? 67}
                      onChange={(e) => updateField('partnerStatePensionAge', Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="35"
                    step="1"
                    value={partnerYears}
                    onChange={(e) => {
                      const years = Number(e.target.value);
                      const annual = years >= 10 ? Math.round((years / 35) * partnerFull * 100) / 100 : 0;
                      onChange({
                        ...profile,
                        partnerQualifyingYears: years,
                        partnerStatePensionAmountAnnual: annual,
                      });
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Partner Minimum 10 Years Rule Notice */}
                {partnerYears > 0 && partnerYears < 10 && (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-900 dark:text-amber-200">UK Minimum 10 Years Rule:</span>
                      You need at least 10 qualifying National Insurance years to get any State Pension. Entitlement is £0/yr for less than 10 years.
                    </div>
                  </div>
                )}

                {/* Partner Deferral / Delay Section */}
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">
                        Delay State Pension (Deferral)
                      </span>
                    </div>
                    {partnerDeferralYears > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        +{(partnerDeferralYears * 5.8).toFixed(1)}% Boosted
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">
                        Standard Claim (Age {partnerSpa})
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Under UK rules, delaying increases your State Pension by <strong>1% for every 9 weeks (~5.8% per year)</strong> permanently, fully index-linked for life.
                  </p>

                  {/* Partner Quick Delay Presets */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">
                      Quick Deferral Options:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: `No Delay (${partnerSpa})`, years: 0 },
                        { label: `+1 Yr (${partnerSpa + 1})`, years: 1 },
                        { label: `+2 Yrs (${partnerSpa + 2})`, years: 2 },
                        { label: `+3 Yrs (${partnerSpa + 3})`, years: 3 },
                        { label: `+5 Yrs (${partnerSpa + 5})`, years: 5 },
                      ].map((opt) => {
                        const isActive = partnerDeferralYears === opt.years;
                        return (
                          <button
                            key={opt.years}
                            type="button"
                            onClick={() => updateField('partnerStatePensionDeferralYears', opt.years)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Partner Dual Inputs: Years to Delay & Effective Claim Age */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                          Years to Delay
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          0 to 10 yrs
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateField('partnerStatePensionDeferralYears', Math.max(0, partnerDeferralYears - 1))}
                          disabled={partnerDeferralYears <= 0}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={partnerDeferralYears}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(10, Number(e.target.value) || 0));
                            updateField('partnerStatePensionDeferralYears', val);
                          }}
                          className="w-full text-center px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateField('partnerStatePensionDeferralYears', Math.min(10, partnerDeferralYears + 1))}
                          disabled={partnerDeferralYears >= 10}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200">
                          Claim Age
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          SPA is {partnerSpa}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={partnerSpa}
                        max={partnerSpa + 10}
                        value={partnerClaimAge}
                        onChange={(e) => {
                          const newAge = Number(e.target.value) || partnerSpa;
                          const diff = Math.max(0, Math.min(10, newAge - partnerSpa));
                          updateField('partnerStatePensionDeferralYears', diff);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Partner Slider for delay */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={partnerDeferralYears}
                      onChange={(e) => updateField('partnerStatePensionDeferralYears', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>0y (Age {partnerSpa})</span>
                      <span>5y (Age {partnerSpa + 5})</span>
                      <span>10y (Age {partnerSpa + 10})</span>
                    </div>
                  </div>

                  {/* Live Partner Deferral Benefit & Break-even Card */}
                  {partnerDeferralYears > 0 && partnerAnnual > 0 && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          Deferred Impact (+{(partnerDeferralYears * 5.8).toFixed(1)}% Boost)
                        </span>
                        <span className="font-black text-emerald-800 dark:text-emerald-300">
                          +£{partnerExtraAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr extra
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Boosted Starting Pension:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            £{partnerBoostedAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })}/yr
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">First Claim Year:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            Age {partnerClaimAge} ({partnerDeferralYears} yr{partnerDeferralYears > 1 ? 's' : ''} delay)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Income Foregone in Delay:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            £{partnerForegone.toLocaleString('en-GB')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block">Estimated Break-even:</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            ~Age {partnerBreakEvenAge} ({partnerBreakEvenYears} yrs)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs ${
                  partnerYears > 0 && partnerYears < 10
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-indigo-100/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                }`}>
                  <div>
                    <span className={`font-bold ${
                      partnerYears > 0 && partnerYears < 10
                        ? 'text-amber-900 dark:text-amber-200'
                        : 'text-indigo-900 dark:text-indigo-200'
                    }`}>
                      Calculated Entitlement ({partnerYears}/35 Yrs):
                    </span>
                    {partnerDeferralYears > 0 && partnerYears >= 10 && (
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block font-medium">
                        Commences at Age {partnerClaimAge} (Base £{partnerAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2 })} + {(partnerDeferralYears * 5.8).toFixed(1)}% Deferral Boost)
                      </span>
                    )}
                  </div>
                  <div className="sm:text-right">
                    <span className={`font-extrabold text-sm ${
                      partnerYears > 0 && partnerYears < 10
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-indigo-800 dark:text-indigo-300'
                    }`}>
                      £{(partnerDeferralYears > 0 && partnerYears >= 10 ? partnerBoostedAnnual : partnerAnnual).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
                    </span>
                    {partnerYears > 0 && partnerYears < 10 && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                        (&lt;10 Yrs = £0 Entitlement)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-400 opacity-60" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Single Person Planning Mode Active
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs">
              To calculate a partner's State Pension based on qualifying years and deferral options, enable Couple Planning in the profile header above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
