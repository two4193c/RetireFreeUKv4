import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Compass,
  CheckCircle2,
  Sparkles,
  Coffee,
  Plane,
  Car,
  Home,
  ShoppingBag,
  HeartHandshake,
  Tv,
  ArrowRight,
  Zap,
  Info,
  HelpCircle,
  Award,
  DollarSign,
  Users,
  User,
  MapPin,
  Check,
} from 'lucide-react';

interface RetirementLivingStandardsCardProps {
  profile?: UserProfile;
  onApplyTargetIncome?: (annualIncome: number) => void;
}

export const RetirementLivingStandardsCard: React.FC<RetirementLivingStandardsCardProps> = ({
  profile,
  onApplyTargetIncome,
}) => {
  const [householdType, setHouseholdType] = useState<'single' | 'couple'>(
    profile?.isCouplePlanning ? 'couple' : 'single'
  );
  const [location, setLocation] = useState<'outside_london' | 'london'>('outside_london');

  // Active target income from profile if available, or default £31,300
  const activePlanIncome =
    profile?.maximizedSpendConfig?.enabled
      ? profile.maximizedSpendConfig.targetAnnualIncome
      : profile?.targetRetirementIncomeAnnual || 31300;

  // PLSA 2024/25 Benchmark Figures (Net Annual Income in Today's Terms)
  const standardsData = {
    single: {
      outside_london: {
        minimum: 14400,
        moderate: 31300,
        comfortable: 43100,
      },
      london: {
        minimum: 15700,
        moderate: 32800,
        comfortable: 45200,
      },
    },
    couple: {
      outside_london: {
        minimum: 22400,
        moderate: 43100,
        comfortable: 59000,
      },
      london: {
        minimum: 24500,
        moderate: 45000,
        comfortable: 61500,
      },
    },
  };

  const currentBench = standardsData[householdType][location];

  // Helper to determine active tier
  const getAchievedTier = (income: number) => {
    if (income >= currentBench.comfortable) return { label: 'Comfortable', color: 'emerald', bg: 'bg-primary-500', text: 'text-primary-600 dark:text-primary-400' };
    if (income >= currentBench.moderate) return { label: 'Moderate', color: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' };
    if (income >= currentBench.minimum) return { label: 'Minimum', color: 'amber', bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Below Minimum', color: 'rose', bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
  };

  const activeTier = getAchievedTier(activePlanIncome);

  const fmt = (v: number) => `£${v.toLocaleString()}`;

  return (
    <div id="card-retirement-living-standards" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs border border-indigo-200 dark:border-indigo-800">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Official UK Benchmark
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">• PLSA Living Standards 2024/25</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              UK Retirement Living Standards (PLSA Guide)
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Independent benchmarks created by the Pensions and Lifetime Savings Association (PLSA) & Loughborough University.
            </p>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          {/* Household Type Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setHouseholdType('single')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                householdType === 'single'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Single</span>
            </button>
            <button
              onClick={() => setHouseholdType('couple')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                householdType === 'couple'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Couple</span>
            </button>
          </div>

          {/* Location Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setLocation('outside_london')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                location === 'outside_london'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-primary-500" />
              <span>Rest of UK</span>
            </button>
            <button
              onClick={() => setLocation('london')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                location === 'london'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>London</span>
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE PLAN MATCH HIGHLIGHT BANNER */}
      {profile && (
        <div className="p-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-primary-500/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-primary-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Your Current Plan Target Income:
                </span>
                <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {fmt(activePlanIncome)}/yr net
                </strong>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Based on your plan inputs for a <strong className="capitalize">{householdType}</strong> in <strong className="capitalize">{location.replace('_', ' ')}</strong>, your target budget achieves the <strong className={`font-black ${activeTier.text}`}>{activeTier.label.toUpperCase()}</strong> Retirement Living Standard.
              </p>
            </div>
          </div>

          <div className={`px-3.5 py-1.5 rounded-xl text-xs font-black text-white ${activeTier.bg} shadow-sm shrink-0 self-end sm:self-auto`}>
            ✨ {activeTier.label} Standard Achieved
          </div>
        </div>
      )}

      {/* THE 3 RETIREMENT LIVING STANDARDS TIERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* TIER 1: MINIMUM */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl p-6 border-2 border-amber-200 dark:border-amber-900/60 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-amber-400 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black uppercase tracking-wider rounded-full border border-amber-300 dark:border-amber-800">
                Minimum Standard
              </span>
              <span className="text-xs font-bold text-slate-400">Basic Needs</span>
            </div>

            <div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {fmt(currentBench.minimum)}
                <span className="text-xs font-semibold text-slate-500">/yr net</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Covers all your basic needs with a small allowance for leisure and social activities.
              </p>
            </div>

            {/* Category Bullet List */}
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-start gap-2">
                <Coffee className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Food & Groceries:</strong> £95/wk per couple. Eating out once a month.</span>
              </div>
              <div className="flex items-start gap-2">
                <Plane className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Holidays:</strong> 1 week UK holiday per year. No overseas trips.</span>
              </div>
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Transport:</strong> No car. Uses public transport and local bus passes.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Clothing:</strong> £630/yr per person for essential wardrobe replacements.</span>
              </div>
              <div className="flex items-start gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Gifts & Social:</strong> £20 per birthday/Christmas gift for family.</span>
              </div>
            </div>
          </div>

          {onApplyTargetIncome && (
            <button
              onClick={() => onApplyTargetIncome(currentBench.minimum)}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Set Target to Minimum ({fmt(currentBench.minimum)}/yr)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* TIER 2: MODERATE */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl p-6 border-2 border-indigo-400 dark:border-indigo-600 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-md hover:border-indigo-500 transition-all">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
            Most Popular Goal
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-xs font-black uppercase tracking-wider rounded-full border border-indigo-300 dark:border-indigo-800">
                Moderate Standard
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Financial Security</span>
            </div>

            <div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {fmt(currentBench.moderate)}
                <span className="text-xs font-semibold text-slate-500">/yr net</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Provides greater financial security, flexibility, and freedom for dining and travel.
              </p>
            </div>

            {/* Category Bullet List */}
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-start gap-2">
                <Coffee className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Food & Groceries:</strong> £130/wk. Eating out 2-3 times per month.</span>
              </div>
              <div className="flex items-start gap-2">
                <Plane className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Holidays:</strong> 2 weeks in Europe + 1 weekend UK break annually.</span>
              </div>
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Transport:</strong> 3-year-old small car (replaced every 5 years).</span>
              </div>
              <div className="flex items-start gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Clothing:</strong> £1,500/yr per person for quality clothing.</span>
              </div>
              <div className="flex items-start gap-2">
                <Tv className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span><strong>Leisure:</strong> Subscriptions (Netflix, Spotify) + £50 gift budget.</span>
              </div>
            </div>
          </div>

          {onApplyTargetIncome && (
            <button
              onClick={() => onApplyTargetIncome(currentBench.moderate)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>Set Target to Moderate ({fmt(currentBench.moderate)}/yr)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* TIER 3: COMFORTABLE */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl p-6 border-2 border-primary-300 dark:border-primary-700/80 space-y-5 flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-primary-500 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-xs font-black uppercase tracking-wider rounded-full border border-primary-300 dark:border-primary-800">
                Comfortable Standard
              </span>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Luxury & Freedom</span>
            </div>

            <div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {fmt(currentBench.comfortable)}
                <span className="text-xs font-semibold text-slate-500">/yr net</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Offers luxury, spontaneous travel, regular fine dining, and generous family support.
              </p>
            </div>

            {/* Category Bullet List */}
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-start gap-2">
                <Coffee className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span><strong>Food & Groceries:</strong> £160/wk. Eating out weekly + fine dining.</span>
              </div>
              <div className="flex items-start gap-2">
                <Plane className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span><strong>Holidays:</strong> 3 weeks in Europe + multiple UK breaks per year.</span>
              </div>
              <div className="flex items-start gap-2">
                <Car className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span><strong>Transport:</strong> 2 newer cars (replaced every 3 years).</span>
              </div>
              <div className="flex items-start gap-2">
                <Home className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span><strong>Home Maintenance:</strong> Regular home decorating, repairs & gardening.</span>
              </div>
              <div className="flex items-start gap-2">
                <HeartHandshake className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <span><strong>Gifts & Social:</strong> £100+ per gift, theatre tickets, gym membership.</span>
              </div>
            </div>
          </div>

          {onApplyTargetIncome && (
            <button
              onClick={() => onApplyTargetIncome(currentBench.comfortable)}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <span>Set Target to Comfortable ({fmt(currentBench.comfortable)}/yr)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

      {/* STATE PENSION CONTEXT BOX */}
      <div className="p-5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-blue-950 dark:text-blue-100 text-base">
            Role of the Full UK State Pension
          </h3>
        </div>

        <p className="text-xs sm:text-sm text-blue-900/90 dark:text-blue-200/90 leading-relaxed">
          The full new UK State Pension for 2024/25 is <strong>£11,502.40/year per person</strong> (£221.20/week). 
          For a couple receiving two full state pensions, they receive <strong>£23,004.80/year tax-free</strong> (falling within their combined personal allowances).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-1">
            <div className="font-extrabold text-slate-800 dark:text-slate-200">For Singles:</div>
            <div className="text-slate-600 dark:text-slate-400">
              State Pension (£11,502) covers <strong>80%</strong> of the Minimum Living Standard (£14,400). You only need a private pension pot of ~<strong>£70,000</strong> to bridge to the Minimum standard, or ~<strong>£350,000</strong> to reach the Moderate standard.
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-800/80 space-y-1">
            <div className="font-extrabold text-slate-800 dark:text-slate-200">For Couples:</div>
            <div className="text-slate-600 dark:text-slate-400">
              Two State Pensions (£23,004) <strong>100% COVER</strong> the Minimum Living Standard (£22,400)! A couple only needs a joint private pot of ~<strong>£350,000</strong> to achieve the Moderate standard (£43,100/yr).
            </div>
          </div>
        </div>
      </div>

      {/* METHODOLOGY & SOURCE FOOTNOTE */}
      <div className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <p className="font-semibold text-slate-600 dark:text-slate-400">Key Assumptions of the PLSA Retirement Living Standards:</p>
        <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
          <li>Assume the retiree is mortgage-free and rent-free (home fully paid off).</li>
          <li>All income figures represent <strong>net annual spending after tax</strong> in today's money.</li>
          <li>Figures are updated annually by Loughborough University based on independent public focus groups.</li>
        </ul>
      </div>

    </div>
  );
};
