import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Heart,
  Activity,
  Calendar,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Info,
  Clock,
  User,
  Users,
  MapPin,
  ArrowRight,
  Sun,
  Smile,
  Shield,
  Stethoscope,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface HealthyLifeExpectancyCardProps {
  profile?: UserProfile;
}

export const HealthyLifeExpectancyCard: React.FC<HealthyLifeExpectancyCardProps> = ({
  profile,
}) => {
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [currentAge, setCurrentAge] = useState<number>(profile?.currentAge || 60);
  const [retirementAge, setRetirementAge] = useState<number>(profile?.targetRetirementAge || 60);

  // ONS Average Statistics at Age 65
  // Total Life Expectancy (TLE) from age 65: Males ~85 font, Females ~88
  // Healthy Life Expectancy (HLE) from age 65: Males ~75 (10.0 yrs), Females ~76 (11.0 yrs)
  const stats = {
    male: {
      tle: 85.5,
      hle: 75.0,
      healthyYearsAfter65: 10.0,
      unhealthyYears: 10.5,
    },
    female: {
      tle: 87.8,
      hle: 76.5,
      healthyYearsAfter65: 11.5,
      unhealthyYears: 11.3,
    },
  };

  const currentStat = stats[gender];
  const activeRetireAge = Math.max(currentAge, retirementAge);

  // Active Go-Go years between retirement and Healthy Life Expectancy
  const healthyRetirementYears = Math.max(0, Math.round((currentStat.hle - activeRetireAge) * 10) / 10);
  const totalRetirementYears = Math.max(0, Math.round((currentStat.tle - activeRetireAge) * 10) / 10);
  const healthGapYears = Math.max(0, Math.round((currentStat.tle - currentStat.hle) * 10) / 10);

  return (
    <div id="card-healthy-life-expectancy" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs border border-rose-200 dark:border-rose-800">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                UK ONS Demographics Guide
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">• Health Span vs. Life Span</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Healthy Life Expectancy vs. Total Life Expectancy
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Why your "Active Health Span" matters far more for retirement spend planning than your overall lifespan.
            </p>
          </div>
        </div>

        {/* Gender & Age Controls */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setGender('male')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                gender === 'male'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Male Statistics
            </button>
            <button
              onClick={() => setGender('female')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                gender === 'female'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Female Statistics
            </button>
          </div>
        </div>
      </div>

      {/* KPI HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Healthy Life Expectancy */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <span>Healthy Life Expectancy (HLE)</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Age {currentStat.hle}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
            Average age good health lasts free of disability
          </p>
        </div>

        {/* KPI 2: Total Life Expectancy */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300">
            <span>Total Life Expectancy (TLE)</span>
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            Age {currentStat.tle}
          </div>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold">
            Average total biological lifespan in UK
          </p>
        </div>

        {/* KPI 3: Health Gap */}
        <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
            <span>The Health Gap (Declining Health)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {healthGapYears} Years
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
            Years spent with long-term condition or care needs
          </p>
        </div>

        {/* KPI 4: Active Go-Go Window */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800 dark:text-purple-300">
            <span>Active "Go-Go" Window</span>
            <Sun className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {healthyRetirementYears} Years
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold">
            Healthy retirement window (Retire Age {activeRetireAge} to {currentStat.hle})
          </p>
        </div>
      </div>

      {/* VISUAL TIMELINE BREAKDOWN */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            <span>Retirement Lifespan Timeline Visualization</span>
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            UK National Averages ({gender.toUpperCase()})
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="bg-slate-100 dark:bg-slate-800/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-extrabold">
              <span className="text-emerald-700 dark:text-emerald-300">Phase 1: Go-Go Active Years (Age {activeRetireAge} to {currentStat.hle})</span>
              <span className="text-amber-700 dark:text-amber-300">Phase 2: Slow-Go & Care Years (Age {currentStat.hle} to {currentStat.tle})</span>
            </div>

            {/* Dual Colored Bar */}
            <div className="h-6 w-full rounded-2xl overflow-hidden flex shadow-inner border border-slate-300 dark:border-slate-600">
              <div
                style={{ width: `${(healthyRetirementYears / totalRetirementYears) * 100}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider"
              >
                {healthyRetirementYears} Yrs Healthy Active
              </div>
              <div
                style={{ width: `${(healthGapYears / totalRetirementYears) * 100}%` }}
                className="bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider"
              >
                {healthGapYears} Yrs Care/Health Gap
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-1">
              <div className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-emerald-500" />
                <span>Phase 1: Go-Go Phase (Age {activeRetireAge}–75)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Peak mobility, energy, and independence. Ideal for high travel, hobbies, active outdoor sports, and experiential spending.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800/80 space-y-1">
              <div className="font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Smile className="w-4 h-4 text-amber-500" />
                <span>Phase 2: Slow-Go Phase (Age 75–83)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Pace slows down. Discretionary spending naturally declines as travel shifts closer to home and social activities center around family.
              </p>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800/80 space-y-1">
              <div className="font-extrabold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-rose-500" />
                <span>Phase 3: No-Go / Care Phase (Age 83+)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Discretionary travel drops to zero. Financial focus shifts from lifestyle spend to domestic support, home adaptations, or social care fees.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGIC IMPLICATIONS FOR RETIREMENT DRAWDOWN */}
      <div className="p-5 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 dark:from-amber-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 rounded-3xl border border-amber-200 dark:border-amber-800/80 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
            What Does the Health Gap Mean for Your Drawdown Strategy?
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="space-y-2 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>1. Front-Loading Drawdown ("Max Spender")</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Since health typically begins to decline around age 75, saving your wealth to live frugally in your 60s often results in unspent money when mobility is lost. Front-loading drawdown (spending more in the Go-Go years) maximizes life satisfaction.
            </p>
          </div>

          <div className="space-y-2 p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              <span>2. Care Cost Buffering vs Living Budget</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              In the UK, residential care fees average £35,000–£55,000/yr. Rather than reducing your early lifestyle budget, protection options include keeping your primary property equity as a late-stage care buffer or securing guaranteed DB/State pension floors.
            </p>
          </div>
        </div>
      </div>

      {/* ONS STATISTICAL REFERENCE FOOTNOTE */}
      <div className="text-xs text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
        <p className="font-semibold text-slate-600 dark:text-slate-400">Official Data Sources:</p>
        <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
          <li>ONS (Office for National Statistics) UK Life Expectancy & Healthy Life Expectancy Tables.</li>
          <li>Healthy Life Expectancy is defined as years spent in self-reported "Good" or "Very Good" health based on national UK census data.</li>
        </ul>
      </div>
    </div>
  );
};
