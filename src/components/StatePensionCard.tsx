import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Landmark, Info, Users, Sparkles } from 'lucide-react';

interface StatePensionCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const StatePensionCard: React.FC<StatePensionCardProps> = ({ profile, onChange }) => {
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

  const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
  const partnerYears = profile.partnerQualifyingYears ?? 35;
  const partnerAnnual = partnerYears >= 10 ? Math.round((partnerYears / 35) * partnerFull * 100) / 100 : 0;

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
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                Guaranteed Income
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calculated based on National Insurance qualifying years (min 10 years for entitlement, max 35 years for full amount).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Primary State Pension */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <label className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={profile.includeStatePension ?? true}
                onChange={(e) => updateField('includeStatePension', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer"
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
              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer border border-emerald-200/60 dark:border-emerald-800/60"
            >
              Max 35 Yrs (Full)
            </button>
          </div>

          {(profile.includeStatePension ?? true) && (
            <div className="space-y-3">
              {/* Triple Lock Inflation Indexing Toggle */}
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50">
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
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Triple Lock Indexing</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {(profile.enableTripleLock ?? true) ? 'CPI Inflation Linked' : 'Fixed Nominal £'}
                </span>
              </div>

              {/* Editable Full State Pension Benchmark */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>Full State Pension Benchmark</span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">At 35 Yrs</span>
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
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="w-full accent-emerald-600 cursor-pointer"
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

              {/* Computed Entitlement Result Callout */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                primaryYears > 0 && primaryYears < 10
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-100/70 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
              }`}>
                <span className={`font-bold ${
                  primaryYears > 0 && primaryYears < 10
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-emerald-900 dark:text-emerald-200'
                }`}>
                  Calculated Entitlement ({primaryYears}/35 Yrs):
                </span>
                <div className="text-right">
                  <span className={`font-extrabold text-sm ${
                    primaryYears > 0 && primaryYears < 10
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-emerald-800 dark:text-emerald-300'
                  }`}>
                    £{primaryAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
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

                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  partnerYears > 0 && partnerYears < 10
                    ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                    : 'bg-indigo-100/80 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                }`}>
                  <span className={`font-bold ${
                    partnerYears > 0 && partnerYears < 10
                      ? 'text-amber-900 dark:text-amber-200'
                      : 'text-indigo-900 dark:text-indigo-200'
                  }`}>
                    Calculated Entitlement ({partnerYears}/35 Yrs):
                  </span>
                  <div className="text-right">
                    <span className={`font-extrabold text-sm ${
                      partnerYears > 0 && partnerYears < 10
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-indigo-800 dark:text-indigo-300'
                    }`}>
                      £{partnerAnnual.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
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
              To calculate a partner's State Pension based on qualifying years, enable Couple Planning in the profile header above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
