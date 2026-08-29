import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Zap,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Info,
  TableIcon as Table2,
  RefreshCw,
  CheckCircle2,
  Dices,
} from 'lucide-react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection, AppMode } from '../types';
import { runMonteCarloSimulation } from '../utils/monteCarloEngine';

const PA = 12570;
const BASIC_CEIL = 50270;

const fmt = (n) =>
  n >= 1000000
    ? '£' + (n / 1000000).toFixed(2) + 'm'
    : n >= 1000
    ? '£' + Math.round(n / 1000).toLocaleString() + 'k'
    : '£' + Math.round(n).toLocaleString();
const pct = (n) => n.toFixed(1) + '%';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

interface DynamicOptimiserCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections: YearProjection[];
  appMode?: AppMode;
  onRunStressTest?: () => void;
  onChange?: (p: UserProfile) => void;
}

const KpiPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}> = ({ icon, label, value, sub, accent }) => (
  <div className="flex flex-col gap-1.5 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 flex-1 min-w-[140px]">
    <div className={"w-8 h-8 rounded-xl flex items-center justify-center " + accent}>{icon}</div>
    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none">{label}</p>
    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-none">{value}</p>
    {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">{sub}</p>}
  </div>
);

const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-start justify-between gap-2">
      <div>
        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{title}</h4>
        {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">Age {label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.stroke }} />
            <span className="text-slate-500 dark:text-slate-400">{p.name}</span>
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 dark:text-slate-200">{d.subject}</p>
      <p className="text-indigo-600 dark:text-indigo-400 font-extrabold text-base">{d.score}/100</p>
    </div>
  );
};

const RadarAxisTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" style={{ fontSize: 10, fontWeight: 600 }}>
    {String(payload.value).split('\n').map((line: string, i: number) => (
      <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>{line}</tspan>
    ))}
  </text>
);

const bandCell = (v: number, threshold: number) => {
  if (v <= 0) return 'text-slate-300 dark:text-slate-700';
  if (v > threshold * 0.5) return 'text-red-600 dark:text-red-400 font-bold';
  if (v > 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-500';
};

export const DynamicOptimiserCard: React.FC<DynamicOptimiserCardProps> = ({
  profile,
  pots,
  taxResult,
  projections,
  appMode: _appMode = 'advanced',
  onRunStressTest,
  onChange: _onChange,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcSuccessRate, setMcSuccessRate] = useState<number | undefined>(undefined);

  const isCouple = !!profile.isCouplePlanning;
  const retRows = useMemo(() => projections.filter((p) => p.isRetired), [projections]);

  useEffect(() => {
    setMcSuccessRate(undefined);
    setMcRunning(true);
    const timer = setTimeout(() => {
      try {
        const result = runMonteCarloSimulation(profile, pots, taxResult, {
          numSimulations: 1000,
          accumulationVolatility: 12,
          decumulationVolatility: 8,
          maxAge: profile.lifeExpectancyAge ?? 95,
        });
        setMcSuccessRate(result.successRate);
      } catch {
        setMcSuccessRate(undefined);
      } finally {
        setMcRunning(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [profile, pots, taxResult]);

  const kpis = useMemo(() => {
    if (!retRows.length) return null;
    const totalGross = retRows.reduce((s, r) => s + (r.totalWithdrawalAmount ?? 0), 0);
    const totalTax = retRows.reduce((s, r) => s + (r.totalTaxPaid ?? 0), 0);
    const avgRate = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
    const paCap = retRows.filter((r) => (r.primaryNetIncome ?? 0) >= PA).length;
    const paRate = retRows.length > 0 ? (paCap / retRows.length) * 100 : 0;
    const taxSaved = Math.max(0, totalGross * 0.2 - totalTax);
    return { taxSaved, avgRate, paRate };
  }, [retRows]);

  const streamData = useMemo(() =>
    retRows.map((r) => {
      const sp = (r.statePensionReceived || 0);
      const nonTaxable = (r.taxFreeFixedIncomeReceived || 0) + (r.giltLadderIncomeReceived || 0) + (r.isaDrawdown || 0) + (r.cashDrawdown || 0) + (r.pensionDrawdownTaxFree || 0);
      
      const paCap = isCouple ? PA * 2 : PA;
      const basicCap = isCouple ? BASIC_CEIL * 2 : BASIC_CEIL;

      const taxableRemaining = (r.dbPensionIncomeReceived || 0) + (r.taxableFixedIncomeReceived || 0) + (r.annuityIncomeReceived || 0) + (r.pensionDrawdownTaxable || 0);

      const paAvailable = Math.max(0, paCap - sp);
      const pa = Math.min(taxableRemaining, paAvailable);
      
      const taxableAfterPA = Math.max(0, taxableRemaining - paAvailable);
      const basicAvailable = basicCap - paCap;
      const basic = Math.min(taxableAfterPA, basicAvailable);
      
      const higher = Math.max(0, taxableAfterPA - basicAvailable);

      return {
        age: r.age,
        'State Pension': Math.round(sp),
        'ISA Bridge': Math.round(nonTaxable),
        'Personal Allowance (0%)': Math.round(pa),
        'Basic Rate (20%)': Math.round(basic),
        'Higher Rate': Math.round(higher),
      };
    }),
  [retRows, isCouple]);

  const radarData = useMemo(() => {
    const totalGross = retRows.reduce((s, r) => s + (r.totalWithdrawalAmount ?? 0), 0);
    const totalTax = retRows.reduce((s, r) => s + (r.totalTaxPaid ?? 0), 0);
    const taxEff = totalGross > 0 ? Math.round((1 - totalTax / totalGross) * 100) : 80;
    const longevity =
      mcSuccessRate !== undefined
        ? mcSuccessRate
        : retRows.length > 0 && (retRows[retRows.length - 1].totalPot ?? 0) > 0
        ? 85
        : 40;
    const finalPot = retRows[retRows.length - 1]?.totalPot ?? 0;
    const nrb = isCouple ? 650000 : 325000;
    const iht = clamp(Math.round((finalPot / nrb) * 60), 0, 100);
    const swr =
      (retRows[0]?.totalPot ?? 1) > 0
        ? ((retRows[0]?.totalWithdrawalAmount ?? 0) / (retRows[0]?.totalPot ?? 1)) * 100
        : 4;
    const volRes = clamp(Math.round((3.5 / Math.max(swr, 0.1)) * 70), 0, 100);
    const sp =
      (profile.includeStatePension ? profile.statePensionAmountAnnual ?? 0 : 0) +
      (isCouple && profile.partnerIncludeStatePension ? profile.partnerStatePensionAmountAnnual ?? 0 : 0);
    const floor = clamp(Math.round((sp / Math.max(profile.targetAnnualSpendRetirement ?? 30000, 1)) * 100), 0, 100);
    return [
      { subject: 'Tax\nEfficiency', score: taxEff },
      { subject: 'Longevity\nSafety', score: longevity },
      { subject: 'IHT\nPreservation', score: iht },
      { subject: 'Volatility\nResilience', score: volRes },
      { subject: 'Income\nFloor', score: floor },
    ];
  }, [retRows, isCouple, mcSuccessRate, profile]);

  const matrixRows = useMemo(() =>
    retRows.map((r) => {
      const pGross =
        (r.primaryStatePensionReceived || 0) +
        (r.primaryDbPensionIncomeReceived || 0) +
        (r.primaryTaxableFixedIncomeReceived || 0) +
        (r.primaryAnnuityIncomeReceived || 0) +
        (r.primaryPensionDrawdownTaxable || 0);
      const pPA = Math.min(pGross, PA);
      const pBasic = clamp(pGross - PA, 0, BASIC_CEIL - PA);
      const pHigher = Math.max(0, pGross - BASIC_CEIL);
      const p60Trap = pGross > 100000 && pGross < 125140 ? Math.min(pGross - 100000, 25140) : 0;

      const qGross =
        (r.partnerStatePensionReceived || 0) +
        (r.partnerDbPensionIncomeReceived || 0) +
        (r.partnerTaxableFixedIncomeReceived || 0) +
        (r.partnerAnnuityIncomeReceived || 0) +
        (r.partnerPensionDrawdownTaxable || 0);
      const qPA = isCouple ? Math.min(qGross, PA) : null;
      const qBasic = isCouple ? clamp(qGross - PA, 0, BASIC_CEIL - PA) : null;
      const qHigher = isCouple ? Math.max(0, qGross - BASIC_CEIL) : null;
      const q60Trap = isCouple && qGross > 100000 && qGross < 125140 ? Math.min(qGross - 100000, 25140) : null;

      return {
        age: r.age,
        pGross,
        pPA,
        pBasic,
        pHigher,
        p60Trap,
        pTax: r.primaryTaxPaid ?? 0,
        qGross,
        qPA,
        qBasic,
        qHigher,
        q60Trap,
        qTax: r.partnerTaxPaid ?? 0,
        totalTax: r.totalTaxPaid ?? 0,
      };
    }),
  [retRows, isCouple]);

  const incomeData = useMemo(() =>
    retRows.map((r) => {
      const taxable = (r.statePensionReceived || 0) + (r.dbPensionIncomeReceived || 0) + (r.taxableFixedIncomeReceived || 0) + (r.annuityIncomeReceived || 0) + (r.pensionDrawdownTaxable || 0);
      const nonTaxable = (r.taxFreeFixedIncomeReceived || 0) + (r.giltLadderIncomeReceived || 0) + (r.isaDrawdown || 0) + (r.cashDrawdown || 0) + (r.pensionDrawdownTaxFree || 0);
      return {
        age: r.age,
        Taxable: Math.round(taxable),
        NonTaxable: Math.round(nonTaxable),
      };
    }),
  [retRows]);

  if (retRows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Dynamic Optimiser — Optimization Cockpit</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Set a retirement date to activate the optimization cockpit.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl shadow-sm">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Dynamic Optimiser</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                Optimization Cockpit
              </span>
              {mcRunning && (
                <span className="flex items-center gap-1 text-[9px] text-indigo-500 dark:text-indigo-400">
                  <Dices className="w-3 h-3 animate-spin" /> Running 1,000 sims…
                </span>
              )}
              {!mcRunning && mcSuccessRate !== undefined && (
                <span className="flex items-center gap-1 text-[9px] text-primary-600 dark:text-primary-400">
                  <CheckCircle2 className="w-3 h-3" /> MC: {mcSuccessRate}% success
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              1,000-sim stochastic engine · Tax matrix · Radar scoring · Withdrawal streamgraph
            </p>
          </div>
        </div>
        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="p-6 space-y-8">
          {kpis && (
            <div className="flex flex-wrap gap-3">
              <KpiPill
                icon={<Zap className="w-4 h-4" />}
                accent="bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                label="Lifetime Tax Saved"
                value={fmt(kpis.taxSaved)}
                sub="vs flat 20% baseline"
              />
              <KpiPill
                icon={<TrendingUp className="w-4 h-4" />}
                accent="bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                label="Avg Effective Tax Rate"
                value={pct(kpis.avgRate)}
                sub="across all retirement years"
              />
              <KpiPill
                icon={<Target className="w-4 h-4" />}
                accent="bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400"
                label="PA Capture Rate"
                value={pct(kpis.paRate)}
                sub="Personal Allowance utilised"
              />
              {!mcRunning && mcSuccessRate !== undefined && (
                <KpiPill
                  icon={<Dices className="w-4 h-4" />}
                  accent="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  label="MC Success Rate (1,000)"
                  value={mcSuccessRate + '%'}
                  sub="probability of lifetime solvency"
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3">
              <Panel
                title="Optimal Withdrawal Streamgraph"
                subtitle="Income split across tax bands each retirement year — minimise Higher Rate (red)"
                action={
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMatrix((v) => !v);
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
                  >
                    <Table2 className="w-3 h-3" />
                    {showMatrix ? 'Hide Matrix' : 'Tax Matrix'}
                  </button>
                }
              >
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={streamData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {[
                        ['spG', '#8b5cf6'],
                        ['isaG', '#f59e0b'],
                        ['paG', '#10b981'],
                        ['brG', '#38bdf8'],
                        ['hrG', '#ef4444'],
                      ].map(([id, c]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => '£' + Math.round(v / 1000) + 'k'} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                    <Area type="monotone" dataKey="State Pension" stackId="1" fill="url(#spG)" stroke="#8b5cf6" strokeWidth={0} />
                    <Area type="monotone" dataKey="ISA Bridge" stackId="1" fill="url(#isaG)" stroke="#f59e0b" strokeWidth={0} />
                    <Area type="monotone" dataKey="Personal Allowance (0%)" stackId="1" fill="url(#paG)" stroke="#10b981" strokeWidth={0} />
                    <Area type="monotone" dataKey="Basic Rate (20%)" stackId="1" fill="url(#brG)" stroke="#38bdf8" strokeWidth={0} />
                    <Area type="monotone" dataKey="Higher Rate" stackId="1" fill="url(#hrG)" stroke="#ef4444" strokeWidth={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            <div className="xl:col-span-2">
              <Panel
                title="Multi-Objective Plan Score"
                subtitle="Five-axis optimisation radar — higher is better on all axes"
                action={
                  mcRunning ? (
                    <span className="text-[9px] text-indigo-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Simulating…
                    </span>
                  ) : undefined
                }
              >
                {mcSuccessRate === undefined && !mcRunning && (
                  <button
                    onClick={onRunStressTest}
                    className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-2.5 py-2 hover:bg-amber-100 transition-colors cursor-pointer w-full text-left"
                  >
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      <strong>Longevity Safety</strong> uses a deterministic estimate. Run the <span className="underline">Stress Test</span> for a Monte Carlo-accurate score.
                    </span>
                  </button>
                )}
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={<RadarAxisTick />} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Plan Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} />
                    <Tooltip content={<RadarTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {radarData.map((d) => (
                    <div key={d.subject} className="text-center">
                      <div className="text-xs font-extrabold" style={{ color: d.score >= 70 ? '#10b981' : d.score >= 45 ? '#f59e0b' : '#ef4444' }}>
                        {d.score}
                      </div>
                      <div className="text-[8px] text-slate-400 leading-tight">{d.subject.replace('\n', ' ')}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          
          {/* Advanced Visual Telemetry */}
          <div className="grid xl:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            
            <Panel title="Depletion Sequence Waterfall" subtitle="Visual timeline of when each pot runs completely dry.">
              <div className="space-y-2 mt-2">
                {[
                  { label: 'State Pension', fn: (r: any) => (r.primaryStatePensionReceived || 0) + (r.partnerStatePensionReceived || 0) > 0, baseColor: 'bg-purple-500' },
                  { label: 'Tax-Free (ISA/Cash)', fn: (r: any) => (r.isaPot || 0) > 100, baseColor: 'bg-amber-500' },
                  { label: 'Pension', fn: (r: any) => (r.pensionPot || 0) > 100, baseColor: 'bg-primary-500' },
                  { label: 'GIA', fn: (r: any) => (r.cashGiaPot || 0) > 100, baseColor: 'bg-rose-500' },
                ].map((pot) => (
                  <div key={pot.label} className="flex items-center gap-2 text-[10px]">
                    <div className="w-24 text-slate-600 dark:text-slate-400 font-semibold">{pot.label}</div>
                    <div className="flex-1 flex gap-[1px] h-4">
                      {retRows.map((r, i) => {
                        const active = pot.fn(r);
                        return (
                          <div 
                            key={r.age} 
                            className={`flex-1 rounded-sm transition-all ${active ? pot.baseColor : 'bg-slate-100 dark:bg-slate-800/50'}`} 
                            title={`Age ${r.age}: ${active ? 'Active' : 'Depleted'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[8px] text-slate-400 pl-26 mt-1">
                  <div className="flex-1 flex justify-between">
                    <span>Age {retRows[0]?.age}</span>
                    <span>Age {retRows[retRows.length - 1]?.age}</span>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Tax Efficiency Heatmap" subtitle="Density matrix of tax band utilisation. Darker = Maxed out band.">
              <div className="space-y-2 mt-2">
                {[
                  { label: '60% Trap / Addt.', key: 'Higher Rate', limit: 50000, color: '225, 29, 72' }, // rose-600
                  { label: 'Higher (40%)', key: 'Higher Rate', limit: 50000, color: '239, 68, 68' }, // red-500
                  { label: 'Basic (20%)', key: 'Basic Rate (20%)', limit: 37700, color: '14, 165, 233' }, // sky-500
                  { label: 'PA (0%)', key: 'Personal Allowance (0%)', limit: 12570, color: '16, 185, 129' }, // primary-500
                ].map((band) => (
                  <div key={band.label} className="flex items-center gap-2 text-[10px]">
                    <div className="w-24 text-slate-600 dark:text-slate-400 font-semibold">{band.label}</div>
                    <div className="flex-1 flex gap-[1px] h-4">
                      {streamData.map((r) => {
                        let val = r[band.key as keyof typeof r] as number;
                        const hrThreshold = isCouple ? 100000 : 50000;
                        if (band.label === '60% Trap / Addt.') {
                           val = val > hrThreshold ? val - hrThreshold : 0;
                        } else if (band.label === 'Higher (40%)') {
                           val = Math.min(val, hrThreshold);
                        }
                        
                        const actualLimit = isCouple ? band.limit * 2 : band.limit;
                        const intensity = val > 0 ? Math.max(0.15, Math.min(1, val / actualLimit)) : 0.03;
                        const isZero = val === 0;
                        
                        return (
                          <div 
                            key={r.age} 
                            className={`flex-1 rounded-sm ${isZero ? 'bg-slate-100 dark:bg-slate-800/50' : ''}`}
                            style={isZero ? {} : { backgroundColor: `rgba(${band.color}, ${intensity})` }}
                            title={`Age ${r.age}: £${val}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
                 <div className="flex items-center gap-2 text-[8px] text-slate-400 pl-26 mt-1">
                  <div className="flex-1 flex justify-between">
                    <span>Age {retRows[0]?.age}</span>
                    <span>Age {retRows[retRows.length - 1]?.age}</span>
                  </div>
                </div>
              </div>
            </Panel>

          </div>

          {showMatrix && (

            <Panel title="Annual Tax Matrix" subtitle="Per-year income split, tax band exposure and 60% trap detection across all retirement years">
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <th className="px-2 py-2 text-left font-bold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800/60">Age</th>
                      <th className="px-2 py-2 text-right font-bold text-slate-500 dark:text-slate-400">Gross (P)</th>
                      <th className="px-2 py-2 text-right font-bold text-primary-600 dark:text-primary-400">PA 0%</th>
                      <th className="px-2 py-2 text-right font-bold text-sky-600 dark:text-sky-400">Basic 20%</th>
                      <th className="px-2 py-2 text-right font-bold text-rose-500 dark:text-rose-400">Higher 40%</th>
                      <th className="px-2 py-2 text-right font-bold text-orange-600">60% Trap</th>
                      <th className="px-2 py-2 text-right font-bold text-slate-500">Tax (P)</th>
                      {isCouple && (
                        <>
                          <th className="px-2 py-2 text-right font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">Gross (Q)</th>
                          <th className="px-2 py-2 text-right font-bold text-primary-600 dark:text-primary-400">PA 0%</th>
                          <th className="px-2 py-2 text-right font-bold text-sky-600 dark:text-sky-400">Basic 20%</th>
                          <th className="px-2 py-2 text-right font-bold text-rose-500 dark:text-rose-400">Higher 40%</th>
                          <th className="px-2 py-2 text-right font-bold text-orange-600">60% Trap</th>
                          <th className="px-2 py-2 text-right font-bold text-slate-500">Tax (Q)</th>
                        </>
                      )}
                      <th className="px-2 py-2 text-right font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-700">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((r, i) => (
                      <tr key={r.age} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'}>
                        <td className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-inherit">{r.age}</td>
                        <td className="px-2 py-1.5 text-right text-slate-500">{fmt(r.pGross)}</td>
                        <td className="px-2 py-1.5 text-right text-primary-600 dark:text-primary-400">{fmt(r.pPA)}</td>
                        <td className={"px-2 py-1.5 text-right " + bandCell(r.pBasic, BASIC_CEIL - PA)}>{r.pBasic > 0 ? fmt(r.pBasic) : '—'}</td>
                        <td className={"px-2 py-1.5 text-right " + (r.pHigher > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-300 dark:text-slate-700')}>{r.pHigher > 0 ? fmt(r.pHigher) : '—'}</td>
                        <td className={"px-2 py-1.5 text-right " + (r.p60Trap > 0 ? 'text-orange-600 dark:text-orange-400 font-extrabold animate-pulse' : 'text-slate-300 dark:text-slate-700')}>{r.p60Trap > 0 ? fmt(r.p60Trap) : '—'}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 font-semibold">{fmt(r.pTax)}</td>
                        {isCouple && (
                          <>
                            <td className="px-2 py-1.5 text-right text-slate-500 border-l border-slate-100 dark:border-slate-800">{fmt(r.qGross ?? 0)}</td>
                            <td className="px-2 py-1.5 text-right text-primary-600 dark:text-primary-400">{fmt(r.qPA ?? 0)}</td>
                            <td className={"px-2 py-1.5 text-right " + bandCell(r.qBasic ?? 0, BASIC_CEIL - PA)}>{(r.qBasic ?? 0) > 0 ? fmt(r.qBasic ?? 0) : '—'}</td>
                            <td className={"px-2 py-1.5 text-right " + ((r.qHigher ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-300 dark:text-slate-700')}>{(r.qHigher ?? 0) > 0 ? fmt(r.qHigher ?? 0) : '—'}</td>
                            <td className={"px-2 py-1.5 text-right " + ((r.q60Trap ?? 0) > 0 ? 'text-orange-600 dark:text-orange-400 font-extrabold animate-pulse' : 'text-slate-300 dark:text-slate-700')}>{(r.q60Trap ?? 0) > 0 ? fmt(r.q60Trap ?? 0) : '—'}</td>
                            <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 font-semibold">{fmt(r.qTax)}</td>
                          </>
                        )}
                        <td className="px-2 py-1.5 text-right font-extrabold text-slate-800 dark:text-slate-100 border-l border-slate-100 dark:border-slate-800">{fmt(r.totalTax)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                      <td className="px-2 py-2 text-slate-700 dark:text-slate-200 sticky left-0 bg-slate-100 dark:bg-slate-800">Total</td>
                      <td colSpan={isCouple ? 13 : 6} />
                      <td className="px-2 py-2 text-right text-slate-900 dark:text-white font-extrabold border-l border-slate-200 dark:border-slate-700">
                        {fmt(matrixRows.reduce((s, r) => s + r.totalTax, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {[
                  { color: '#10b981', label: 'Green = tax-free income (PA / ISA / State Pension)' },
                  { color: '#38bdf8', label: 'Blue = Basic Rate 20% band' },
                  { color: '#f87171', label: 'Red = Higher Rate 40% — tax leakage' },
                  { color: '#f97316', label: 'Orange (pulsing) = 60% Tax Trap zone' },
                ].map((h) => (
                  <div key={h.label} className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: h.color }} />
                    {h.label}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title="Annual Income & Tax Band Utilisation"
            subtitle="Annual Taxable vs Non-Taxable income compared to Tax Bands"
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incomeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => '£' + Math.round(v / 1000) + 'k'} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                <Tooltip content={<CurrencyTooltip />} />
                <ReferenceLine y={BASIC_CEIL} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: '40% cliff £50,270', position: 'insideTopLeft', fontSize: 9, fill: '#ef4444' }} />
                <ReferenceLine y={PA} stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: 'PA £12,570', position: 'insideTopLeft', fontSize: 9, fill: '#10b981' }} />
                <Bar dataKey="Taxable" stackId="a" fill="#38bdf8" radius={[0, 0, 0, 0]} maxBarSize={16} />
                <Bar dataKey="NonTaxable" stackId="a" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}
    </div>
  );
};

export default DynamicOptimiserCard;
