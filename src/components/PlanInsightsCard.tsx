import React, { useMemo, useState } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection } from '../types';
import { computePlanInsights, ActionableOpportunity } from '../utils/planInsightsEngine';
import {
  Lightbulb,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Percent,
  Landmark,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  HelpCircle,
  Clock,
  Coins,
  ShieldAlert,
} from 'lucide-react';

interface PlanInsightsCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  projections: YearProjection[];
  taxResult: TaxCalculationResult;
  onChange?: (updatedProfile: UserProfile) => void;
  onOpenMaximizedSpendModal?: () => void;
}

export const PlanInsightsCard: React.FC<PlanInsightsCardProps> = ({
  profile,
  pots,
  projections,
  taxResult,
  onChange,
  onOpenMaximizedSpendModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const insights = useMemo(() => {
    return computePlanInsights(profile, pots, projections, taxResult);
  }, [profile, pots, projections, taxResult]);

  const { scorecard, milestones, opportunities, executiveSummary } = insights;

  const categories = useMemo(() => {
    const set = new Set<string>();
    opportunities.forEach((o) => set.add(o.category));
    return ['all', ...Array.from(set)];
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    if (selectedCategory === 'all') return opportunities;
    return opportunities.filter((o) => o.category === selectedCategory);
  }, [opportunities, selectedCategory]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200 dark:border-slate-800 space-y-7 transition-colors">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-slate-900 dark:text-slate-100 text-lg sm:text-xl tracking-tight">
                Plan Insights &amp; Strategic Opportunities
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  scorecard.isFullyFunded
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                {scorecard.isFullyFunded ? '100% Funded On Track' : `Shortfall Alert (Age ${scorecard.depletionAge})`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Executive health scorecard, key decumulation milestones, and actionable tax &amp; wealth optimization opportunities.
            </p>
          </div>
        </div>

        {onOpenMaximizedSpendModal && (
          <button
            type="button"
            onClick={onOpenMaximizedSpendModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Maximize Sustainable Spend</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
          </button>
        )}
      </div>

      {/* Executive Summary Callout */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Executive Overview &amp; Health Verdict</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {executiveSummary}
        </p>
      </div>

      {/* 1. PLAN HEALTH SCORECARD (5 KPI TILES) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          1. Plan Longevity &amp; Health Scorecard
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Metric 1: Sustainability Runway */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Portfolio Runway</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {scorecard.isFullyFunded ? `Age ${profile.lifeExpectancyAge || 90}+` : `Age ${scorecard.depletionAge}`}
            </div>
            <div className="text-[10px] font-bold">
              {scorecard.isFullyFunded ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  +£{(scorecard.finalPotBalance || 0).toLocaleString()} surplus at 90
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  {scorecard.runwayYears} yrs runway from now
                </span>
              )}
            </div>
          </div>

          {/* Metric 2: Initial SWR */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Initial SWR</span>
              <Percent className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {scorecard.initialSwr > 0 ? `${scorecard.initialSwr}%` : '0%'}
            </div>
            <div className="text-[10px] font-bold">
              <span
                className={
                  scorecard.swrStatus === 'conservative'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : scorecard.swrStatus === 'moderate'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {scorecard.swrStatus === 'conservative'
                  ? 'Conservative (<3.4%)'
                  : scorecard.swrStatus === 'moderate'
                  ? 'Balanced (3.4%–4.2%)'
                  : 'Elevated (>4.2%)'}
              </span>
            </div>
          </div>

          {/* Metric 3: Guaranteed Floor Coverage */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Guaranteed Floor</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {scorecard.guaranteedFloorCoveragePct}%
            </div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
              £{scorecard.guaranteedFloorAmount.toLocaleString()}/yr State &amp; DB
            </div>
          </div>

          {/* Metric 4: Decumulation Effective Tax Rate */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Effective Tax Rate</span>
              <Coins className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {scorecard.effectiveTaxRate}%
            </div>
            <div className="text-[10px] font-bold">
              <span
                className={
                  scorecard.taxEfficiencyStatus === 'optimal'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }
              >
                {scorecard.taxEfficiencyStatus === 'optimal' ? 'Tax Optimal (PA & 20%)' : 'Moderate Tax Drag'}
              </span>
            </div>
          </div>

          {/* Metric 5: Monte Carlo Success Rate */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Stochastic Score</span>
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white">
              {scorecard.monteCarloEstimatedSuccess}%
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {scorecard.monteCarloEstimatedSuccess >= 85 ? 'High Volatility Resilience' : 'Review Guardrails'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. STRATEGIC MILESTONES & INFLECTION TIMELINE */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          2. Strategic Milestones &amp; Inflection Points
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {m.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                  {m.badge}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {m.summary}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {m.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ACTIONABLE TAX & WEALTH OPPORTUNITIES */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            3. Actionable Tax &amp; Decumulation Opportunities ({opportunities.length})
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'All Opportunities' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="bg-slate-50 dark:bg-slate-800/50 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    {opp.status === 'recommended' ? (
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                    ) : opp.status === 'already_optimised' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    )}
                    {opp.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                    {opp.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      opp.impactLevel === 'High Impact'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                    }`}
                  >
                    {opp.impactLevel}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      opp.status === 'already_optimised'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        : opp.status === 'recommended'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {opp.status === 'already_optimised'
                      ? 'Already Optimised'
                      : opp.status === 'recommended'
                      ? 'Action Recommended'
                      : 'Review Suggested'}
                  </span>
                </div>
              </div>

              {/* Observation & Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observation</span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    {opp.observation}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Recommended Action</span>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    {opp.actionableStep}
                  </p>
                </div>
              </div>

              {/* Projected Benefit */}
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="text-[11px] text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Projected Financial Benefit: </span>
                  {opp.projectedBenefit}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
