import React from 'react';
import { UserProfile } from '../types';
import { Shield, TrendingUp } from 'lucide-react';

interface DynamicSpendingCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const DynamicSpendingCard: React.FC<DynamicSpendingCardProps> = ({ profile, onChange }) => {
  const updateField = (key: keyof UserProfile, val: any) => {
    onChange({
      ...profile,
      [key]: val,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-emerald-500" />
            Dynamic Spending Rules (Guyton-Klinger)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Automatically adjust your retirement income targets during simulations based on portfolio performance to mitigate Sequence of Returns Risk.
          </p>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer"
            checked={profile.dynamicSpendingRules?.enabled || false}
            onChange={(e) => {
              if (e.target.checked) {
                updateField('dynamicSpendingRules', {
                  enabled: true,
                  capitalPreservationThresholdPercent: 20,
                  capitalPreservationCutPercent: 10,
                  prosperityThresholdPercent: 20,
                  prosperityIncreasePercent: 10,
                  skipInflationOnNegativeReturn: true
                });
              } else {
                updateField('dynamicSpendingRules', {
                  ...profile.dynamicSpendingRules!,
                  enabled: false
                });
              }
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
          <span className="ml-3 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            {profile.dynamicSpendingRules?.enabled ? 'Active' : 'Disabled'}
          </span>
        </label>
      </div>

      {profile.dynamicSpendingRules?.enabled && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Capital Preservation Rule */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-rose-500 transform rotate-180" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Capital Preservation Rule</h4>
              </div>
              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed h-8">
                If portfolio drops and your withdrawal rate rises <strong className="text-slate-700 dark:text-slate-300">X%</strong> above your initial rate, cut spending by <strong className="text-slate-700 dark:text-slate-300">Y%</strong>.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trigger Threshold (+X%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      value={profile.dynamicSpendingRules.capitalPreservationThresholdPercent}
                      onChange={(e) => updateField('dynamicSpendingRules', { ...profile.dynamicSpendingRules!, capitalPreservationThresholdPercent: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Spending Cut (-Y%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                      value={profile.dynamicSpendingRules.capitalPreservationCutPercent}
                      onChange={(e) => updateField('dynamicSpendingRules', { ...profile.dynamicSpendingRules!, capitalPreservationCutPercent: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Prosperity Rule */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Prosperity Rule</h4>
              </div>
              <p className="text-[10px] text-slate-500 mb-2 leading-relaxed h-8">
                If portfolio grows and your withdrawal rate falls <strong className="text-slate-700 dark:text-slate-300">X%</strong> below your initial rate, raise spending by <strong className="text-slate-700 dark:text-slate-300">Y%</strong>.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Trigger Threshold (-X%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      value={profile.dynamicSpendingRules.prosperityThresholdPercent}
                      onChange={(e) => updateField('dynamicSpendingRules', { ...profile.dynamicSpendingRules!, prosperityThresholdPercent: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Spending Raise (+Y%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500"
                      value={profile.dynamicSpendingRules.prosperityIncreasePercent}
                      onChange={(e) => updateField('dynamicSpendingRules', { ...profile.dynamicSpendingRules!, prosperityIncreasePercent: Number(e.target.value) })}
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inflation Rule */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Freeze Inflation on Negative Returns</h4>
              <p className="text-[10px] text-slate-500 max-w-xl mt-0.5">
                If the portfolio suffers a negative return, skip the standard annual inflation adjustment for income (effectively reducing real purchasing power).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={profile.dynamicSpendingRules.skipInflationOnNegativeReturn}
                onChange={(e) => updateField('dynamicSpendingRules', { ...profile.dynamicSpendingRules!, skipInflationOnNegativeReturn: e.target.checked })}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-500 peer-checked:bg-emerald-500"></div>
            </label>
          </div>

        </div>
      )}
    </div>
  );
};
