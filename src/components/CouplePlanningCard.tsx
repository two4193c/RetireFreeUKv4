import React from 'react';
import { UserProfile } from '../types';
import { Users, User, Heart, Sparkles } from 'lucide-react';

interface CouplePlanningCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

export const CouplePlanningCard: React.FC<CouplePlanningCardProps> = ({ profile, onChange }) => {
  const isCouple = Boolean(profile.isCouplePlanning);

  const updateProfile = (updates: Partial<UserProfile>) => {
    onChange({
      ...profile,
      ...updates,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6 transition-colors">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
            isCouple ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            {isCouple ? <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base">Planning Mode</h2>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                isCouple ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {isCouple ? 'Joint Household' : 'Single Individual'}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Choose between individual planning or joint couple retirement modeling</p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => updateProfile({ isCouplePlanning: false })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              !isCouple
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Single Planner</span>
          </button>
          <button
            type="button"
            onClick={() => updateProfile({ isCouplePlanning: true })}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isCouple
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Heart className="w-4 h-4 text-pink-300 fill-pink-300" />
            <span>Couple / Joint Planner</span>
          </button>
        </div>
      </div>

      {!isCouple ? (
        <div className="space-y-4 animate-fade-in">
          {/* Single Tax & Allowance Summary Badge */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>UK Individual Tax & Retirement Allowances</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                2024/25 Rules
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-slate-300 font-medium">Single Personal Allowance</p>
                <p className="text-base font-extrabold text-amber-300 mt-0.5">£12,570 <span className="text-xs font-normal text-white/80">/ yr</span></p>
                <p className="text-[10px] text-slate-300/80 mt-1">Standard tax-free personal income allowance in drawdown.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-slate-300 font-medium">Single State Pension</p>
                <p className="text-base font-extrabold text-emerald-300 mt-0.5">£11,541.40 <span className="text-xs font-normal text-white/80">/ yr</span></p>
                <p className="text-[10px] text-slate-300/80 mt-1">Full guaranteed inflation-protected State Pension at SP age.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                <p className="text-[10px] text-slate-300 font-medium">Single ISA Allowance</p>
                <p className="text-base font-extrabold text-sky-300 mt-0.5">£20,000 <span className="text-xs font-normal text-white/80">ISA / yr</span></p>
                <p className="text-[10px] text-slate-300/80 mt-1">Annual tax-free growth and withdrawal ISA contribution limit.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Dual Tax Benefit Summary Badge */}
          <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-100 dark:from-indigo-900 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-2xl p-4 shadow-sm border border-indigo-200 dark:border-indigo-800/50 space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
                <span>UK Joint Couple Tax & Retirement Advantages</span>
              </div>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded-full font-semibold border border-indigo-300 dark:border-indigo-400/30">
                2024/25 Rules
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/80 dark:bg-white/10 rounded-xl p-3 border border-indigo-100 dark:border-white/10">
                <p className="text-[10px] text-indigo-900 dark:text-indigo-200 font-medium">Dual Personal Allowance</p>
                <p className="text-base font-extrabold text-amber-600 dark:text-amber-300 mt-0.5">£25,140 <span className="text-xs font-normal text-slate-600 dark:text-white/80">/ yr</span></p>
                <p className="text-[10px] text-slate-600 dark:text-indigo-100/70 mt-1">Both partners get £12,570 tax-free income allowance in drawdown.</p>
              </div>
              <div className="bg-white/80 dark:bg-white/10 rounded-xl p-3 border border-indigo-100 dark:border-white/10">
                <p className="text-[10px] text-indigo-900 dark:text-indigo-200 font-medium">Dual Full State Pension</p>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-300 mt-0.5">£23,082.80 <span className="text-xs font-normal text-slate-600 dark:text-white/80">/ yr</span></p>
                <p className="text-[10px] text-slate-600 dark:text-indigo-100/70 mt-1">Combined guaranteed inflation-protected income at SP age.</p>
              </div>
              <div className="bg-white/80 dark:bg-white/10 rounded-xl p-3 border border-indigo-100 dark:border-white/10">
                <p className="text-[10px] text-indigo-900 dark:text-indigo-200 font-medium">Dual ISA & LSA Allowance</p>
                <p className="text-base font-extrabold text-sky-600 dark:text-sky-300 mt-0.5">£40,000 <span className="text-xs font-normal text-slate-600 dark:text-white/80">ISA / yr</span></p>
                <p className="text-[10px] text-slate-600 dark:text-indigo-100/70 mt-1">2x £20,000 annual ISA & 2x £268,275 Lump Sum Allowance limit.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
