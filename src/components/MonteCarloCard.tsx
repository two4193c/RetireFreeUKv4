import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { UserProfile, InvestmentPots, TaxCalculationResult } from '../types';
import { runMonteCarloSimulation, MonteCarloParams, MarketScenario, calculateCashBufferRequiredDetails } from '../utils/monteCarloEngine';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import { Dices, ShieldAlert, Sparkles, Sliders, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';

interface MonteCarloCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  onChange?: (updatedProfile: UserProfile) => void;
  showAllScenarios?: boolean;
}

export const MonteCarloCard: React.FC<MonteCarloCardProps> = ({ profile, pots, taxResult, onChange, showAllScenarios = false }) => {
  const targetHorizonAge = profile.maximizedSpendConfig?.targetEndAge || profile.lifeExpectancyAge || 95;

  const [params, setParams] = useState<MonteCarloParams>({
    numSimulations: 500,
    accumulationVolatility: 12.0,
    decumulationVolatility: 8.0,
    maxAge: targetHorizonAge,
    stressedReturnDropPercent: 2.0,
    crashStartAge: profile.targetRetirementAge,
    crashDurationYears: 2,
    crashYearDropsPercent: [30, 15],
  });

  const [localParams, setLocalParams] = useState<MonteCarloParams>(params);
  const [hasRun, setHasRun] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  React.useEffect(() => {
    setLocalParams((prev) => ({
      ...prev,
      maxAge: targetHorizonAge,
      crashStartAge: profile.targetRetirementAge,
    }));
  }, [targetHorizonAge, profile.targetRetirementAge]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setParams(localParams);
    }, 300);
    return () => clearTimeout(timer);
  }, [localParams]);

  const [activeTab, setActiveTab] = useState<'fan' | 'breakdown' | 'survival'>('fan');
  const adjustInflation = profile.adjustForInflation ?? false;

  const isCouple = Boolean(profile.isCouplePlanning);
  const primarySpEnabled = profile.includeStatePension ?? true;
  const partnerSpEnabled = isCouple && (profile.partnerIncludeStatePension ?? true);
  const primarySpa = profile.statePensionAge || 67;
  const partnerAgeDiff = (profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge;
  const partnerSpaPrimaryAge = (profile.partnerStatePensionAge || 67) - partnerAgeDiff;
  const isSameSpaYear = primarySpEnabled && partnerSpEnabled && (primarySpa === partnerSpaPrimaryAge);

  const primaryRetireAge = profile.targetRetirementAge || 60;
  const partnerRetirePrimaryAge = (profile.partnerTargetRetirementAge || profile.targetRetirementAge || 60) - partnerAgeDiff;
  const isSameRetireYear = isCouple && (primaryRetireAge === partnerRetirePrimaryAge);

  const primaryAccessAge = getPensionAccessAge(profile);
  const partnerAccessAgeRaw = getPartnerPensionAccessAge(profile);
  const partnerAccessPrimaryAge = partnerAccessAgeRaw - partnerAgeDiff;
  const isSameAccessYear = isCouple && (primaryAccessAge === partnerAccessPrimaryAge);

  const currentCrashStartAge = localParams.crashStartAge ?? profile.targetRetirementAge;
  const currentCrashDuration = Math.max(1, localParams.crashDurationYears ?? 2);
  const currentCrashYearDrops = useMemo(() => {
    const drops = localParams.crashYearDropsPercent || [30, 15];
    return Array.from({ length: currentCrashDuration }, (_, i) => drops[i] ?? (i === 0 ? 30 : i === 1 ? 15 : 10));
  }, [localParams.crashYearDropsPercent, currentCrashDuration]);

  const crashSummaryText = useMemo(() => {
    return currentCrashYearDrops.map((d, i) => `-${d}% Y${i + 1}`).join(', ');
  }, [currentCrashYearDrops]);

  const handleCrashDurationChange = (newDuration: number) => {
    const validDur = Math.max(1, Math.min(10, newDuration));
    setLocalParams((prev) => {
      const existing = prev.crashYearDropsPercent || [30, 15];
      const updated: number[] = [];
      for (let i = 0; i < validDur; i++) {
        if (existing[i] !== undefined) {
          updated.push(existing[i]);
        } else if (i === 0) {
          updated.push(30);
        } else if (i === 1) {
          updated.push(15);
        } else {
          updated.push(10);
        }
      }
      return {
        ...prev,
        crashDurationYears: validDur,
        crashYearDropsPercent: updated,
      };
    });
  };

  const handleCrashYearDropChange = (yearIndex: number, newDrop: number) => {
    setLocalParams((prev) => {
      const existing = [...(prev.crashYearDropsPercent || currentCrashYearDrops)];
      existing[yearIndex] = Math.max(-100, Math.min(100, newDrop));
      return {
        ...prev,
        crashYearDropsPercent: existing,
      };
    });
  };

  const currentCashBufferYears = Math.max(1, localParams.cashBufferYears ?? currentCrashDuration);

  // Compute Monte Carlo simulation for current single selection
  const mcResult = useMemo(() => {
    if (!taxResult || !hasRun) return null;
    return runMonteCarloSimulation(profile, pots, taxResult, params);
  }, [profile, pots, taxResult, params, hasRun]);

  // Compute 3 scenario results for Overview tab comparison view
  const baseResult = useMemo(() => {
    if (!taxResult || !hasRun) return null;
    return runMonteCarloSimulation(profile, pots, taxResult, { ...params, marketScenario: 'standard' });
  }, [profile, pots, taxResult, params, hasRun]);

  const stressedResult = useMemo(() => {
    if (!taxResult || !hasRun) return null;
    return runMonteCarloSimulation(profile, pots, taxResult, { ...params, marketScenario: 'stressed' });
  }, [profile, pots, taxResult, params, hasRun]);

  const crashResult = useMemo(() => {
    if (!taxResult || !hasRun) return null;
    return runMonteCarloSimulation(profile, pots, taxResult, {
      ...params,
      marketScenario: 'early_crash',
      useCashBuffer: params.useCashBuffer ?? false,
      cashBufferYears: params.cashBufferYears ?? params.crashDurationYears ?? 2,
    });
  }, [profile, pots, taxResult, params, hasRun]);

  const projectedCashAtCrashStart = useMemo(() => {
    if (!crashResult || !crashResult.agePercentiles) return undefined;
    const targetAgeData = crashResult.agePercentiles.find((p) => p.age === currentCrashStartAge);
    return targetAgeData?.p50CashGiaPot;
  }, [crashResult, currentCrashStartAge]);

  const cashBufferSummary = useMemo(() => {
    if (!hasRun) return {} as any;
    return calculateCashBufferRequiredDetails(
      profile,
      pots,
      currentCrashStartAge,
      currentCashBufferYears,
      projectedCashAtCrashStart
    );
  }, [profile, pots, currentCrashStartAge, currentCashBufferYears, projectedCashAtCrashStart, hasRun]);

  const prepareChartData = (result: typeof mcResult) => {
    if (!result) return [];
    const inflationRate = (profile.expectedInflationRate || 2.5) / 100;
    return result.agePercentiles.map((p) => {
      const yearOffset = p.age - profile.currentAge;
      const discount = adjustInflation ? Math.pow(1 + inflationRate, yearOffset) : 1;

      return {
        age: p.age,
        year: p.year,
        isRetired: p.isRetired,
        p10: Math.round(p.p10TotalPot / discount),
        p25: Math.round(p.p25TotalPot / discount),
        p50: Math.round(p.p50TotalPot / discount),
        p75: Math.round(p.p75TotalPot / discount),
        p90: Math.round(p.p90TotalPot / discount),
        p50Pension: Math.round(p.p50PensionPot / discount),
        p50Isa: Math.round(p.p50IsaPot / discount),
        p50Cash: Math.round(p.p50CashGiaPot / discount),
        survivalRate: p.survivalRate,
      };
    });
  };

  // Inflation adjustments for chart rendering
  const chartData = useMemo(() => prepareChartData(mcResult), [mcResult, profile.currentAge, profile.expectedInflationRate, adjustInflation]);
  const baseChartData = useMemo(() => prepareChartData(baseResult), [baseResult, profile.currentAge, profile.expectedInflationRate, adjustInflation]);
  const stressedChartData = useMemo(() => prepareChartData(stressedResult), [stressedResult, profile.currentAge, profile.expectedInflationRate, adjustInflation]);
  const crashChartData = useMemo(() => prepareChartData(crashResult), [crashResult, profile.currentAge, profile.expectedInflationRate, adjustInflation]);

  if (!taxResult) {
    return (
      <div className="bg-slate-900 rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Dices className="h-6 w-6 mr-3 text-purple-600" />
          Stochastic Projections
        </h2>
        <div className="text-gray-500">Awaiting tax calculation data...</div>
      </div>
    );
  }

  if (!hasRun || !mcResult || !baseResult || !stressedResult || !crashResult) {
    return (
      <div className="bg-slate-900 rounded-xl shadow-lg border border-gray-100 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Dices className="h-6 w-6 mr-3 text-purple-600" />
          Stochastic Projections
        </h2>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          {isSimulating ? (
            <div className="text-indigo-600 font-bold">Loading...</div>
          ) : (
            <button
              onClick={() => {
                setIsSimulating(true);
                setTimeout(() => {
                  setHasRun(true);
                  setIsSimulating(false);
                }, 100);
              }}
              className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Run Simulation
            </button>
          )}
        </div>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    if (Math.abs(val) >= 1000000) return `£${(val / 1000000).toFixed(2)}M`;
    if (Math.abs(val) >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${val}`;
  };

  const retirementYr = mcResult.agePercentiles.find((p) => p.age === profile.targetRetirementAge);
  const endYr = mcResult.agePercentiles[mcResult.agePercentiles.length - 1];

  const successColor =
    mcResult.successRateAge85 >= 85
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : mcResult.successRateAge85 >= 70
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-rose-600 bg-rose-50 border-rose-200';

  return (
    <div className="bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-800 space-y-6 transition-colors">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-400 rounded-xl">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-100 text-base flex items-center gap-2">
                <span>Monte Carlo Volatility & Risk Simulation</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                  Stochastic Model
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulates {params.numSimulations} market scenarios across accumulation & decumulation phases
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Market Scenario Controls (Only visible when not in Overview showAllScenarios mode) */}
      {!showAllScenarios && (
        <>
          {/* Volatility & Simulation Parameters Controls */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Simulation Parameters & Asset Volatility (Standard Deviation)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Runs: <strong>{params.numSimulations}</strong> trials
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold">
              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Accumulation Volatility:</span>
                  <span className="text-indigo-400">{localParams.accumulationVolatility}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={localParams.accumulationVolatility}
                  onChange={(e) =>
                    setLocalParams((prev) => ({ ...prev, accumulationVolatility: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 font-normal mt-1">Pre-retirement equity/growth fluctuation</p>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Decumulation Volatility:</span>
                  <span className="text-indigo-400">{localParams.decumulationVolatility}%</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="18"
                  step="1"
                  value={localParams.decumulationVolatility}
                  onChange={(e) =>
                    setLocalParams((prev) => ({ ...prev, decumulationVolatility: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-600 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-slate-500 font-normal mt-1">Post-retirement multi-asset fluctuation</p>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1">
                  <span>Projection Horizon:</span>
                  <span className="text-indigo-400">Age {localParams.maxAge}</span>
                </div>
                <select
                  value={localParams.maxAge}
                  onChange={(e) => setLocalParams((prev) => ({ ...prev, maxAge: Number(e.target.value) }))}
                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-100"
                >
                  <option value={85}>To Age 85</option>
                  <option value={90}>To Age 90</option>
                  <option value={95}>To Age 95</option>
                  <option value={100}>To Age 100</option>
                </select>
                <p className="text-[10px] text-slate-500 font-normal mt-1">Target age model length</p>
              </div>
            </div>
          </div>

          {/* KPI Highlight Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Success Rate */}
            <div className={`p-4 rounded-2xl border ${successColor} flex flex-col justify-between space-y-1`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Pot Success Rate (Age 85)</span>
                {mcResult.successRateAge85 >= 80 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-3xl font-black">{mcResult.successRateAge85}%</div>
              <p className="text-[11px] font-medium opacity-90">
                {mcResult.successRateAge85 >= 85
                  ? 'High confidence: Pot unlikely to deplete.'
                  : mcResult.incomeSuccessRateAge85 > mcResult.successRateAge85
                  ? `Pot depletes in ${100 - mcResult.successRateAge85}% of runs, but your guaranteed income still fully covers your target in ${mcResult.incomeSuccessRateAge85}% of runs.`
                  : 'Moderate risk of depletion in adverse markets.'}
              </p>
            </div>

            {/* Median Pot at Retirement */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Target Age {profile.targetRetirementAge} Pot (Median)
              </span>
              <div className="text-2xl font-black text-slate-100 mt-1">
                {formatCurrency(retirementYr?.p50TotalPot || 0)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                P10: <strong>{formatCurrency(retirementYr?.p10TotalPot || 0)}</strong> • P90: <strong>{formatCurrency(retirementYr?.p90TotalPot || 0)}</strong>
              </p>
            </div>

            {/* End of Horizon Pot */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Pot Balance at Age {params.maxAge} (Median)
              </span>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {formatCurrency(endYr?.p50TotalPot || 0)}
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                P10: <strong>{formatCurrency(endYr?.p10TotalPot || 0)}</strong> • P90: <strong>{formatCurrency(endYr?.p90TotalPot || 0)}</strong>
              </p>
            </div>

            {/* Depletion Risk / Survival by Age */}
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Survival Rates by Age</span>
              <div className="text-xs font-bold text-slate-200 space-y-1 mt-1">
                <div className="flex justify-between">
                  <span>Age 80:</span>
                  <span className="text-emerald-400 font-extrabold">{mcResult.successRateAge80}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Age 85:</span>
                  <span className="text-indigo-400 font-extrabold">{mcResult.successRateAge85}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Age 90:</span>
                  <span className="text-purple-400 font-extrabold">{mcResult.successRateAge90}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CHART RENDERING CONTAINER */}
      {showAllScenarios ? (
        <div className="space-y-8 pt-2">
          {/* Scenario 1: Standard Volatility Model */}
          <div className="space-y-3 bg-slate-800/40 p-4.5 rounded-2xl border border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>1. Standard Volatility Model</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Compounding returns fluctuate around baseline expected annual growth ({profile.expectedInvestmentReturn || 6}% accum / {profile.postRetirementReturn || 4.5}% decum).
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-800 text-xs font-bold shrink-0">
                <span>Success Rate (Age 85):</span>
                <span className="font-black text-sm">{baseResult.successRateAge85}%</span>
              </div>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={baseChartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="p90Base" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="p50Base" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="p10Base" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]} labelFormatter={(label) => `Age ${label}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  {isSameRetireYear || !isCouple ? (
                    <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      <ReferenceLine x={partnerRetirePrimaryAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                    </>
                  )}
                  {isSameSpaYear ? (
                    <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      {primarySpEnabled && (
                        <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      )}
                      {partnerSpEnabled && (
                        <ReferenceLine x={partnerSpaPrimaryAge} stroke="#ec4899" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                      )}
                    </>
                  )}
                  <Area type="monotone" dataKey="p90" name="90th Percentile (Optimistic)" stroke="#818cf8" fill="url(#p90Base)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="p50" name="50th Percentile (Median)" stroke="#10b981" fill="url(#p50Base)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="p10" name="10th Percentile (Pessimistic)" stroke="#f43f5e" fill="url(#p10Base)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario 2: Stressed Market Model */}
          <div className="space-y-3 bg-slate-800/40 p-4.5 rounded-2xl border border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <span>2. Stressed Market Model (-2.0% Growth Drag)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Tests portfolio resilience under lower investment growth or sustained inflationary drag.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-950/80 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 text-xs font-bold shrink-0">
                <span>Success Rate (Age 85):</span>
                <span className="font-black text-sm">{stressedResult.successRateAge85}%</span>
              </div>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stressedChartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="p90Stressed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="p50Stressed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="p10Stressed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]} labelFormatter={(label) => `Age ${label}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  {isSameRetireYear || !isCouple ? (
                    <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      <ReferenceLine x={partnerRetirePrimaryAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                    </>
                  )}
                  {isSameSpaYear ? (
                    <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      {primarySpEnabled && (
                        <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      )}
                      {partnerSpEnabled && (
                        <ReferenceLine x={partnerSpaPrimaryAge} stroke="#ec4899" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                      )}
                    </>
                  )}
                  <Area type="monotone" dataKey="p90" name="90th Percentile (Optimistic)" stroke="#818cf8" fill="url(#p90Stressed)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="p50" name="50th Percentile (Median Stressed)" stroke="#f59e0b" fill="url(#p50Stressed)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="p10" name="10th Percentile (Pessimistic)" stroke="#f43f5e" fill="url(#p10Stressed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario 3: Sequence Risk Early Crash */}
          <div className="space-y-3 bg-slate-800/40 p-4.5 rounded-2xl border border-slate-700/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>3. Sequence Risk ({crashSummaryText} Market Crash)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Simulates market crash across {currentCrashDuration} year(s) starting at Age {currentCrashStartAge} ({crashSummaryText}).
                </p>
              </div>
              <div className="flex items-center gap-2 bg-rose-100 dark:bg-rose-950/80 text-rose-300 px-3 py-1.5 rounded-xl border border-rose-800 text-xs font-bold shrink-0">
                <span>Success Rate (Age 85):</span>
                <span className="font-black text-sm">{crashResult.successRateAge85}%</span>
              </div>
            </div>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={crashChartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="p90Crash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="p50Crash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="p10Crash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e11d48" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#e11d48" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]} labelFormatter={(label) => `Age ${label}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                  {isSameRetireYear || !isCouple ? (
                    <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      <ReferenceLine x={primaryRetireAge} stroke="#10b981" strokeDasharray="4 4" label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      <ReferenceLine x={partnerRetirePrimaryAge} stroke="#059669" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                    </>
                  )}
                  {isSameSpaYear ? (
                    <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                  ) : (
                    <>
                      {primarySpEnabled && (
                        <ReferenceLine x={primarySpa} stroke="#8b5cf6" strokeDasharray="4 4" label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }} />
                      )}
                      {partnerSpEnabled && (
                        <ReferenceLine x={partnerSpaPrimaryAge} stroke="#ec4899" strokeDasharray="4 4" label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }} />
                      )}
                    </>
                  )}
                  <Area type="monotone" dataKey="p90" name="90th Percentile (Optimistic)" stroke="#818cf8" fill="url(#p90Crash)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="p50" name="50th Percentile (Median Post-Crash)" stroke="#f43f5e" fill="url(#p50Crash)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="p10" name="10th Percentile (Pessimistic)" stroke="#e11d48" fill="url(#p10Crash)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-88 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'fan' ? (
              <AreaChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="p90Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p75Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="p50Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="p10Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                {isSameRetireYear || !isCouple ? (
                  <ReferenceLine
                    x={primaryRetireAge}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryRetireAge}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                    />
                    <ReferenceLine
                      x={partnerRetirePrimaryAge}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                    />
                  </>
                )}

                {isSameAccessYear ? (
                  <ReferenceLine
                    x={primaryAccessAge}
                    stroke="#0284c7"
                    strokeDasharray="3 3"
                    label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryAccessAge}
                      stroke="#0284c7"
                      strokeDasharray="3 3"
                      label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                    />
                    {isCouple && (
                      <ReferenceLine
                        x={partnerAccessPrimaryAge}
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                      />
                    )}
                  </>
                )}

                {isSameSpaYear ? (
                  <ReferenceLine
                    x={primarySpa}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    {primarySpEnabled && (
                      <ReferenceLine
                        x={primarySpa}
                        stroke="#8b5cf6"
                        strokeDasharray="4 4"
                        label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                      />
                    )}
                    {partnerSpEnabled && (
                      <ReferenceLine
                        x={partnerSpaPrimaryAge}
                        stroke="#ec4899"
                        strokeDasharray="4 4"
                        label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                      />
                    )}
                  </>
                )}

                <Area type="monotone" dataKey="p90" name="90th Percentile (Optimistic)" stroke="#818cf8" fill="url(#p90Gradient)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="p75" name="75th Percentile" stroke="#6366f1" fill="url(#p75Gradient)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="p50" name="50th Percentile (Median)" stroke="#10b981" fill="url(#p50Gradient)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="p25" name="25th Percentile" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="p10" name="10th Percentile (Pessimistic)" stroke="#f43f5e" fill="url(#p10Gradient)" strokeWidth={2} />
              </AreaChart>
            ) : activeTab === 'breakdown' ? (
              <AreaChart data={chartData} margin={{ top: 54, right: 15, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pensionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="isaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={formatCurrency} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any, name: any) => [`£${Number((value) || 0).toLocaleString()}`, name]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                {isSameRetireYear || !isCouple ? (
                  <ReferenceLine
                    x={primaryRetireAge}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: isCouple ? 'Retire (Both)' : 'Retire', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryRetireAge}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.name || 'Primary'} Retire`, fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                    />
                    <ReferenceLine
                      x={partnerRetirePrimaryAge}
                      stroke="#059669"
                      strokeDasharray="4 4"
                      label={{ value: `${profile.partnerName || 'Partner'} Retire`, fill: '#059669', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                    />
                  </>
                )}

                {isSameAccessYear ? (
                  <ReferenceLine
                    x={primaryAccessAge}
                    stroke="#0284c7"
                    strokeDasharray="3 3"
                    label={{ value: 'Pension Access (Both)', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                  />
                ) : (
                  <>
                    <ReferenceLine
                      x={primaryAccessAge}
                      stroke="#0284c7"
                      strokeDasharray="3 3"
                      label={{ value: isCouple ? `${profile.name || 'Primary'} Access` : 'Private Pension Access', fill: '#0284c7', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -26 }}
                    />
                    {isCouple && (
                      <ReferenceLine
                        x={partnerAccessPrimaryAge}
                        stroke="#38bdf8"
                        strokeDasharray="3 3"
                        label={{ value: `${profile.partnerName || 'Partner'} Access`, fill: '#38bdf8', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -38 }}
                      />
                    )}
                  </>
                )}

                {isSameSpaYear ? (
                  <ReferenceLine
                    x={primarySpa}
                    stroke="#8b5cf6"
                    strokeDasharray="4 4"
                    label={{ value: 'State Pension (Both)', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                  />
                ) : (
                  <>
                    {primarySpEnabled && (
                      <ReferenceLine
                        x={primarySpa}
                        stroke="#8b5cf6"
                        strokeDasharray="4 4"
                        label={{ value: isCouple ? `${profile.name || 'Primary'} SPA` : 'State Pension', fill: '#8b5cf6', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -2 }}
                      />
                    )}
                    {partnerSpEnabled && (
                      <ReferenceLine
                        x={partnerSpaPrimaryAge}
                        stroke="#ec4899"
                        strokeDasharray="4 4"
                        label={{ value: `${profile.partnerName || 'Partner'} SPA`, fill: '#ec4899', fontSize: 11, fontWeight: 'bold', position: 'top', dy: -14 }}
                      />
                    )}
                  </>
                )}

                <Area type="monotone" dataKey="p50Pension" name="Median Pension Pot" stackId="1" stroke="#10b981" fill="url(#pensionGradient)" />
                <Area type="monotone" dataKey="p50Isa" name="Median ISA Pot" stackId="1" stroke="#6366f1" fill="url(#isaGradient)" />
                <Area type="monotone" dataKey="p50Cash" name="Median Cash & GIA" stackId="1" stroke="#f59e0b" fill="url(#cashGradient)" />
              </AreaChart>
            ) : (
              <LineChart data={chartData.filter((d) => d.age >= profile.targetRetirementAge)} margin={{ top: 30, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="age" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(value: any) => [`${value}% Probability`, 'Surviving Portfolio']}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />

                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: '80% Safety Goal', fill: '#10b981', fontSize: 10 }} />

                <Line type="monotone" dataKey="survivalRate" name="Portfolio Survival Rate (%)" stroke="#6366f1" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* View mode toggle & inflation toggle (Positioned After Chart) */}
      {!showAllScenarios ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-700/50 flex-wrap">
            <button
              onClick={() => setActiveTab('fan')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'fan' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pot Trajectory Percentiles
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'breakdown' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Median Pot Split
            </button>
            <button
              onClick={() => setActiveTab('survival')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'survival' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Survival Probability
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/80">
            <input
              type="checkbox"
              checked={adjustInflation}
              onChange={(e) => onChange?.({ ...profile, adjustForInflation: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-700 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
            <span>Today's £ (Real Terms)</span>
          </label>
        </div>
      ) : (
        <div className="flex justify-end pt-3 border-t border-slate-800/80">
          <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/80">
            <input
              type="checkbox"
              checked={adjustInflation}
              onChange={(e) => onChange?.({ ...profile, adjustForInflation: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-700 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
            <span>Today's £ (Real Terms)</span>
          </label>
        </div>
      )}

      {/* Market Scenario Stress Models Selector (Positioned after chart, before info box) */}
      {!showAllScenarios && (
        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Market Scenario Stress Models</span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Active: <strong className="text-indigo-300 font-bold">
                {(localParams.marketScenario || 'standard') === 'stressed'
                  ? `Stressed Market (-${(localParams.stressedReturnDropPercent ?? 2.0).toFixed(1)}%)`
                  : (localParams.marketScenario || 'standard') === 'early_crash'
                  ? `Market Crash (${crashSummaryText})`
                  : 'Standard Market'}
              </strong>
            </span>
          </div>

          <div role="radiogroup" aria-label="Market Scenario Stress Models" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Standard Scenario */}
            <button
              type="button"
              role="radio"
              aria-checked={(localParams.marketScenario || 'standard') === 'standard'}
              onClick={() => setLocalParams((prev) => ({ ...prev, marketScenario: 'standard' }))}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                (localParams.marketScenario || 'standard') === 'standard'
                  ? 'bg-indigo-50/90 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20 text-indigo-100 shadow-xs'
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                  <span>Standard Market</span>
                </span>
                {(localParams.marketScenario || 'standard') === 'standard' && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                )}
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-tight">
                Baseline expected returns ({profile.expectedInvestmentReturn || 6}% accum / {profile.postRetirementReturn || 4.5}% decum)
              </p>
            </button>

            {/* Stressed Scenario */}
            <button
              type="button"
              role="radio"
              aria-checked={localParams.marketScenario === 'stressed'}
              onClick={() => setLocalParams((prev) => ({ ...prev, marketScenario: 'stressed' }))}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                localParams.marketScenario === 'stressed'
                  ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 ring-2 ring-amber-500/20 text-amber-100 shadow-xs'
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-amber-400" />
                  <span>Stressed Market (-{(localParams.stressedReturnDropPercent ?? 2.0).toFixed(1)}%)</span>
                </span>
                {localParams.marketScenario === 'stressed' && (
                  <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                )}
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-tight">
                -{(localParams.stressedReturnDropPercent ?? 2.0).toFixed(1)}% p.a. drag ({Math.max(0, (profile.expectedInvestmentReturn || 6) - (localParams.stressedReturnDropPercent ?? 2.0)).toFixed(1)}% / {Math.max(0, (profile.postRetirementReturn || 4.5) - (localParams.stressedReturnDropPercent ?? 2.0)).toFixed(1)}%)
              </p>
            </button>

            {/* Early Crash Scenario */}
            <button
              type="button"
              role="radio"
              aria-checked={localParams.marketScenario === 'early_crash'}
              onClick={() => setLocalParams((prev) => ({ ...prev, marketScenario: 'early_crash' }))}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                localParams.marketScenario === 'early_crash'
                  ? 'bg-rose-50 dark:bg-rose-950/80 border-rose-700 ring-2 ring-rose-500/20 text-rose-100 shadow-xs'
                  : 'bg-slate-900 border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Market Crash ({crashSummaryText})</span>
                </span>
                {localParams.marketScenario === 'early_crash' && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" />
                )}
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-tight">
                {currentCrashDuration} yrs crash at Age {currentCrashStartAge} ({crashSummaryText})
              </p>
            </button>
          </div>

          {/* Dynamic Controls for Stressed Market Scenario */}
          {localParams.marketScenario === 'stressed' && (
            <div className="mt-3 p-3.5 bg-amber-500/10 dark:bg-amber-950/40 rounded-2xl border border-amber-300/60 dark:border-amber-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="text-xs font-bold text-amber-200 flex items-center gap-2">
                <span>Stressed Market Annual Return Reduction (Default -2.0%):</span>
              </label>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.1"
                  value={localParams.stressedReturnDropPercent ?? 2.0}
                  onChange={(e) => setLocalParams((prev) => ({ ...prev, stressedReturnDropPercent: parseFloat(e.target.value) || 0 }))}
                  className="w-full sm:w-36 accent-amber-600 cursor-pointer"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={localParams.stressedReturnDropPercent ?? 2.0}
                  onChange={(e) => setLocalParams((prev) => ({ ...prev, stressedReturnDropPercent: parseFloat(e.target.value) || 0 }))}
                  className="w-20 text-xs font-extrabold text-center px-2 py-1 bg-slate-900 text-amber-100 border border-amber-300 dark:border-amber-700 rounded-xl"
                />
                <span className="text-xs font-extrabold text-amber-100 bg-amber-100 dark:bg-amber-900/80 px-2.5 py-1 rounded-xl border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                  -{(localParams.stressedReturnDropPercent ?? 2.0).toFixed(1)}% p.a.
                </span>
              </div>
            </div>
          )}

          {/* Dynamic Controls for Early Market Crash Scenario */}
          {localParams.marketScenario === 'early_crash' && (
            <div className="mt-3 p-4 bg-rose-500/10 dark:bg-rose-950/40 rounded-2xl border border-rose-300/60 dark:border-rose-800/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 dark:border-rose-900/60 pb-2.5">
                <span className="text-xs font-extrabold text-rose-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Custom Market Crash Parameters</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLocalParams((prev) => ({
                      ...prev,
                      crashStartAge: profile.targetRetirementAge,
                      crashDurationYears: 2,
                      crashYearDropsPercent: [30, 15],
                    }));
                  }}
                  className="text-[11px] font-bold text-rose-300 hover:underline cursor-pointer"
                >
                  Reset Defaults (-30% Y1, -15% Y2 @ Retirement Start)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Crash Start Age */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-rose-200 block">
                    Crash Start Timing (Default: Retirement Start - Age {profile.targetRetirementAge}):
                  </label>
                  <select
                    value={currentCrashStartAge}
                    onChange={(e) => setLocalParams((prev) => ({ ...prev, crashStartAge: parseInt(e.target.value, 10) }))}
                    className="w-full text-xs font-bold bg-slate-900 text-rose-100 border border-rose-700 rounded-xl px-2.5 py-2 focus:ring-rose-500 cursor-pointer"
                  >
                    {Array.from({ length: Math.max(1, (localParams.maxAge || 95) - profile.currentAge + 1) }, (_, i) => profile.currentAge + i).map((a) => {
                      const pAccessAge = getPensionAccessAge(profile);
                      let labelTag = '';
                      if (a === profile.targetRetirementAge && a >= pAccessAge) {
                        labelTag = ' — Retirement & Pension Drawdown Start (Default)';
                      } else if (a === profile.targetRetirementAge) {
                        labelTag = ' — Retirement Start (Default)';
                      } else if (a === pAccessAge) {
                        labelTag = ' — Private Pension Access Age';
                      }

                      return (
                        <option key={a} value={a}>
                          Age {a} ({new Date().getFullYear() + (a - profile.currentAge)}){labelTag}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-300/70">
                    Year {new Date().getFullYear() + (currentCrashStartAge - profile.currentAge)} (Age {currentCrashStartAge})
                  </p>
                </div>

                {/* Crash Duration */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-rose-200 block">
                    Crash Duration (Years):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={currentCrashDuration}
                      onChange={(e) => handleCrashDurationChange(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                    <span className="text-xs font-extrabold text-rose-100 bg-rose-100 dark:bg-rose-900/80 px-2.5 py-1 rounded-lg border border-rose-700 min-w-[65px] text-center">
                      {currentCrashDuration} {currentCrashDuration === 1 ? 'Year' : 'Years'}
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-700/80 dark:text-rose-300/70">
                    Ages {currentCrashStartAge} to {currentCrashStartAge + currentCrashDuration - 1}
                  </p>
                </div>
              </div>

              {/* Per-Year Drop Settings */}
              <div className="space-y-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
                <label className="text-[11px] font-extrabold text-rose-200 block">
                  Configurable Percentage Drop for Each Crash Year:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentCrashYearDrops.map((drop, idx) => {
                    const crashAge = currentCrashStartAge + idx;
                    const crashYear = new Date().getFullYear() + (crashAge - profile.currentAge);
                    return (
                      <div
                        key={idx}
                        className="bg-slate-900/80 p-2.5 rounded-xl border border-rose-800/80 space-y-1.5"
                      >
                        <div className="flex justify-between items-center text-xs font-bold text-rose-100">
                          <span>Year {idx + 1} (Age {crashAge} / {crashYear}):</span>
                          <span className="font-extrabold text-rose-400 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                            -{drop}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={drop}
                            onChange={(e) => handleCrashYearDropChange(idx, parseInt(e.target.value, 10))}
                            className="w-full accent-rose-600 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={drop}
                            onChange={(e) => handleCrashYearDropChange(idx, parseInt(e.target.value, 10) || 0)}
                            className="w-16 text-xs font-extrabold text-center px-1 py-1 bg-slate-900 text-slate-100 border border-slate-700 rounded-lg"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cash Buffer Strategy Option & Yearly Breakdown */}
              <div className="space-y-3 pt-3 border-t border-rose-200/60 dark:border-rose-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-rose-800">
                  <div>
                    <label className="text-xs font-extrabold text-rose-100 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localParams.useCashBuffer ?? false}
                        onChange={(e) => setLocalParams((prev) => ({ ...prev, useCashBuffer: e.target.checked }))}
                        className="w-4 h-4 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer accent-rose-600"
                      />
                      <span>Use Cash Buffer for Crash Scenario ({currentCashBufferYears} {currentCashBufferYears === 1 ? 'Year' : 'Years'} from Crash Start)</span>
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5 ml-6">
                      Prioritises drawing living expenses from cash reserves during the market crash instead of selling equities or pension investments at a loss.
                    </p>
                  </div>

                  {localParams.useCashBuffer && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-[11px] font-bold text-rose-200">Buffer Duration:</span>
                      <select
                        value={currentCashBufferYears}
                        onChange={(e) => setLocalParams((prev) => ({ ...prev, cashBufferYears: parseInt(e.target.value, 10) }))}
                        className="text-xs font-bold bg-rose-50 dark:bg-slate-800 text-rose-100 border border-rose-700 rounded-lg px-2 py-1 focus:ring-rose-500 cursor-pointer"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((y) => (
                          <option key={y} value={y}>
                            {y} {y === 1 ? 'Year' : 'Years'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Cash Buffer Required Details Table */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-rose-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-900/50 pb-2.5">
                    <div>
                      <h5 className="text-xs font-extrabold text-rose-100 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Cash Buffer Required Details (by Year)</span>
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        Net income needed for living expenses during crash years (after guaranteed State & DB pensions).
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-extrabold text-slate-300">Total Buffer Required:</span>
                      <span className="text-xs font-black text-rose-400 bg-rose-100 dark:bg-rose-950 px-2.5 py-1 rounded-lg border border-rose-800">
                        £{cashBufferSummary.totalNetCashBufferRequired.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Table of Cash Buffer Required by Year */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-rose-200/80 dark:border-rose-900/80 text-[10px] font-extrabold text-rose-300 uppercase tracking-wider bg-rose-50/50 dark:bg-rose-950/30">
                          <th className="py-2 px-2">Crash Year</th>
                          <th className="py-2 px-2">Age / Year</th>
                          <th className="py-2 px-2 text-right">Target Net Income</th>
                          <th className="py-2 px-2 text-right">Guaranteed Income</th>
                          <th className="py-2 px-2 text-right text-rose-400">Net Cash Buffer Required</th>
                          <th className="py-2 px-2 text-right text-emerald-400">Gross Pension Draw Avoided</th>
                          <th className="py-2 px-2 text-center">Coverage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40 font-medium">
                        {cashBufferSummary.yearlyDetails.map((detail) => (
                          <tr key={detail.crashYearIndex} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20">
                            <td className="py-2 px-2 font-bold text-rose-100">Year {detail.crashYearIndex}</td>
                            <td className="py-2 px-2 text-slate-300">Age {detail.age} ({detail.calendarYear})</td>
                            <td className="py-2 px-2 text-right text-slate-200 font-semibold">£{detail.targetNetIncome.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right text-slate-400">
                              {detail.totalGuaranteedIncome > 0 ? `£${detail.totalGuaranteedIncome.toLocaleString()}` : '£0'}
                            </td>
                            <td className="py-2 px-2 text-right font-extrabold text-rose-400 bg-rose-50/60 dark:bg-rose-950/50">
                              £{detail.netCashBufferRequired.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-emerald-400">
                              ~£{detail.grossPensionAvoided.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {detail.isCoveredByExistingCash ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                                  <CheckCircle2 className="w-3 h-3" /> Covered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                                  <AlertTriangle className="w-3 h-3" /> Shortfall
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary comparison with user's actual cash reserves */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">
                        Projected Liquid Cash at Crash Start (Age {currentCrashStartAge} / {new Date().getFullYear() + (currentCrashStartAge - profile.currentAge)}):
                      </span>
                      <strong className="text-slate-900 dark:text-white font-extrabold">£{cashBufferSummary.existingCashAvailable.toLocaleString()}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Cash Buffer Readiness:</span>
                      {cashBufferSummary.isFullyCovered ? (
                        <span className="text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800 font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Fully Funded (+£{cashBufferSummary.shortfallOrSurplus.toLocaleString()} Surplus)
                        </span>
                      ) : (
                        <span className="text-amber-300 bg-amber-100 dark:bg-amber-950 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 font-extrabold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Buffer Shortfall (-£{Math.abs(cashBufferSummary.shortfallOrSurplus).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Scenario Insight Banner */}
      {localParams.marketScenario === 'stressed' ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-2 text-xs text-amber-200 font-medium">
          <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong>Stressed Market Model Active:</strong> Reduces expected annual growth by {(localParams.stressedReturnDropPercent ?? 2.0).toFixed(1)}% p.a. across all years ({Math.max(0, (profile.expectedInvestmentReturn || 6) - (localParams.stressedReturnDropPercent ?? 2.0)).toFixed(1)}% pre-retirement / {Math.max(0, (profile.postRetirementReturn || 4.5) - (localParams.stressedReturnDropPercent ?? 2.0)).toFixed(1)}% post-retirement). This tests how your portfolio holds up under lower growth or sustained inflationary drag.
          </p>
        </div>
      ) : params.marketScenario === 'early_crash' ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-2xl border border-rose-800/60 flex items-start gap-2 text-xs text-rose-200 font-medium">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <p>
            <strong>Sequence Risk ({crashSummaryText} Market Crash) Active:</strong> Simulates a market crash across {currentCrashDuration} year(s) starting at Age {currentCrashStartAge} ({crashSummaryText}). This tests whether your initial cash savings and portfolio survive severe market drawdown.
          </p>
        </div>
      ) : (
        <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex items-start gap-2 text-xs text-indigo-200 font-medium">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p>
            <strong>Standard Volatility Model:</strong> Compounding returns fluctuate randomly around your expected annual growth rates ({profile.expectedInvestmentReturn || 6}% pre-retirement / {profile.postRetirementReturn || 4.5}% post-retirement).
            The <strong>10th percentile</strong> shows a pessimistic sequence, while the <strong>90th percentile</strong> represents optimistic market conditions.
          </p>
        </div>
      )}

    </div>
  );
};
