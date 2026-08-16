import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Users,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  TableIcon as Table2,
  RefreshCw,
  CheckCircle2,
  Dices,
  SlidersHorizontal,
} from 'lucide-react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection, AppMode } from '../types';
import { runMonteCarloSimulation } from '../utils/monteCarloEngine';

// ─── Constants ────────────────────────────────────────────────────────────────
const PA = 12_570;
const BASIC_CEIL = 50_270;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `£${(n / 1_000_000).toFixed(2)}m`
  : n >= 1_000   ? `£${Math.round(n / 1_000).toLocaleString()}k`
                 : `£${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${n.toFixed(1)}%`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ─── Props ────────────────────────────────────────────────────────────────────
interface DynamicOptimiserCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections: YearProjection[];
  appMode?: AppMode;
  onRunStressTest?: () => void;
  onChange?: (p: UserProfile) => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const KpiPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}> = ({ icon, label, value, sub, accent }) => (
  <div className="flex flex-col gap-1.5 bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 rounded-2xl px-4 py-3 flex-1 min-w-[140px]">
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide leading-none">{label}</p>
    <p className="text-lg font-extrabold text-slate-900 dark:text-slate-50 leading-none">{value}</p>
    {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-none">{sub}</p>}
  </div>
);

const Panel: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title, subtitle, children, action,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-1 min-w-[160px]">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">Age {label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadarAxisTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" style={{ fontSize: 10, fontWeight: 600 }}>
    {String(payload.value).split('\n').map((line: string, i: number) => (
      <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>{line}</tspan>
    ))}
  </text>
);

// Band cell colouring
const bandCell = (v: number, threshold: number) => {
  if (v <= 0) return 'text-slate-300 dark:text-slate-700';
  if (v > threshold * 0.5) return 'text-red-600 dark:text-red-400 font-bold';
  if (v > 0) return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-500';
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const DynamicOptimiserCard: React.FC<DynamicOptimiserCardProps> = ({
  profile, pots, taxResult, projections, appMode: _appMode = 'advanced', onRunStressTest, onChange,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showMatrix, setShowMatrix] = useState(false);
  const [mcRunning, setMcRunning] = useState(false);
  const [mcSuccessRate, setMcSuccessRate] = useState<number | undefined>(undefined);
  const [equalising, setEqualising] = useState(false);
  const [equalised, setEqualised] = useState(false);

  const isCouple = !!(profile.isCouplePlanning);

  // ── Retirement rows ────────────────────────────────────────────────────────
  const retRows = useMemo(() => projections.filter((p) => p.isRetired), [projections]);

  // ── Embedded Monte Carlo (1 000 sims) ─────────────────────────────────────
  useEffect(() => {
    // Re-run when profile/pots/taxResult changes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, pots, taxResult]);

  // Reset equalised badge when profile changes from outside
  useEffect(() => { setEqualised(false); }, [profile.drawdownStrategy, profile.partnerDrawdownStrategy]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    if (!retRows.length) return null;
    const totalGross = retRows.reduce((s, r) => s + (r.totalWithdrawalAmount ?? 0), 0);
    const totalTax   = retRows.reduce((s, r) => s + (r.totalTaxPaid ?? 0), 0);
    const avgRate    = totalGross > 0 ? (totalTax / totalGross) * 100 : 0;
    const paCap      = retRows.filter((r) => (r.primaryNetIncome ?? 0) >= PA).length;
    const paRate     = retRows.length > 0 ? (paCap / retRows.length) * 100 : 0;
    const taxSaved   = Math.max(0, totalGross * 0.2 - totalTax);
    let coupleBalance: number | null = null;
    if (isCouple) {
      const devs = retRows.map((r) => {
        const p = r.primaryNetIncome ?? 0, q = r.partnerNetIncome ?? 0, t = p + q;
        return t === 0 ? 0 : Math.abs(p / t - 0.5) * 100;
      });
      coupleBalance = devs.reduce((a, b) => a + b, 0) / devs.length;
    }
    return { taxSaved, avgRate, paRate, coupleBalance };
  }, [retRows, isCouple]);

  // ── Streamgraph ───────────────────────────────────────────────────────────
  const streamData = useMemo(() =>
    retRows.map((r, i) => {
      const gross = r.totalWithdrawalAmount ?? 0;
      const sp    = (r.primaryStatePensionReceived ?? 0) + (r.partnerStatePensionReceived ?? 0);
      const prevIsa = i > 0 ? (retRows[i - 1].isaPot ?? r.isaPot) : r.isaPot;
      const isa   = Math.max(0, Math.min(prevIsa - r.isaPot, gross - sp));
      const pa    = Math.max(0, Math.min(PA, gross) - sp - isa);
      const basic = Math.min(Math.max(0, gross - PA), BASIC_CEIL - PA);
      const higher = Math.max(0, gross - BASIC_CEIL);
      return {
        age: r.age,
        'State Pension':          Math.round(sp),
        'ISA Bridge':             Math.round(isa),
        'Personal Allowance (0%)': Math.round(pa),
        'Basic Rate (20%)':       Math.round(basic),
        'Higher Rate':            Math.round(higher),
      };
    }),
  [retRows]);

  // ── Radar scores ──────────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const totalGross = retRows.reduce((s, r) => s + (r.totalWithdrawalAmount ?? 0), 0);
    const totalTax   = retRows.reduce((s, r) => s + (r.totalTaxPaid ?? 0), 0);
    const taxEff     = totalGross > 0 ? Math.round((1 - totalTax / totalGross) * 100) : 80;
    const longevity  = mcSuccessRate !== undefined ? mcSuccessRate
      : retRows.length > 0 && (retRows[retRows.length - 1].totalPot ?? 0) > 0 ? 85 : 40;
    const finalPot   = retRows[retRows.length - 1]?.totalPot ?? 0;
    const nrb        = isCouple ? 650_000 : 325_000;
    const iht        = clamp(Math.round((finalPot / nrb) * 60), 0, 100);
    const swr        = (retRows[0]?.totalPot ?? 1) > 0
      ? (retRows[0]?.totalWithdrawalAmount ?? 0) / (retRows[0]?.totalPot ?? 1) * 100 : 4;
    const volRes     = clamp(Math.round((3.5 / Math.max(swr, 0.1)) * 70), 0, 100);
    const sp         = (profile.includeStatePension ? profile.statePensionAmountAnnual ?? 0 : 0)
      + (isCouple && profile.partnerIncludeStatePension ? profile.partnerStatePensionAmountAnnual ?? 0 : 0);
    const floor      = clamp(Math.round((sp / Math.max(profile.targetAnnualSpendRetirement ?? 30_000, 1)) * 100), 0, 100);
    return [
      { subject: 'Tax\nEfficiency',      score: taxEff   },
      { subject: 'Longevity\nSafety',    score: longevity },
      { subject: 'IHT\nPreservation',    score: iht       },
      { subject: 'Volatility\nResilience', score: volRes  },
      { subject: 'Income\nFloor',        score: floor     },
    ];
  }, [retRows, isCouple, mcSuccessRate, profile]);

  // ── Tax Matrix ────────────────────────────────────────────────────────────
  const matrixRows = useMemo(() =>
    retRows.map((r) => {
      const pGross = r.primaryNetIncome !== undefined
        ? (r.primaryTaxPaid ?? 0) + (r.primaryNetIncome ?? 0)
        : r.totalWithdrawalAmount ?? 0;
      const pPA    = Math.min(pGross, PA);
      const pBasic = clamp(pGross - PA, 0, BASIC_CEIL - PA);
      const pHigher = Math.max(0, pGross - BASIC_CEIL);
      const p60Trap = pGross > 100_000 && pGross < 125_140 ? Math.min(pGross - 100_000, 25_140) : 0;

      const qGross = r.partnerNetIncome !== undefined
        ? (r.partnerTaxPaid ?? 0) + (r.partnerNetIncome ?? 0) : 0;
      const qPA    = isCouple ? Math.min(qGross, PA)                                      : null;
      const qBasic = isCouple ? clamp(qGross - PA, 0, BASIC_CEIL - PA)                   : null;
      const qHigher = isCouple ? Math.max(0, qGross - BASIC_CEIL)                        : null;
      const q60Trap = isCouple && qGross > 100_000 && qGross < 125_140
        ? Math.min(qGross - 100_000, 25_140) : null;

      return {
        age: r.age,
        pGross, pPA, pBasic, pHigher, p60Trap,
        pTax: r.primaryTaxPaid ?? 0,
        qGross, qPA, qBasic, qHigher, q60Trap,
        qTax: r.partnerTaxPaid ?? 0,
        totalTax: r.totalTaxPaid ?? 0,
      };
    }),
  [retRows, isCouple]);

  // ── Panel 3 data ──────────────────────────────────────────────────────────
  const incomeData = useMemo(() =>
    retRows.map((r) =>
      isCouple
        ? { age: r.age, Primary: Math.round(r.primaryNetIncome ?? 0), Partner: Math.round(r.partnerNetIncome ?? 0) }
        : { age: r.age, Income: Math.round(r.totalWithdrawalAmount ?? 0) }
    ),
  [retRows, isCouple]);

  // ── Equalisation Solver ───────────────────────────────────────────────────
  const handleBalance = () => {
    if (!onChange || !isCouple) return;
    setEqualising(true);
    setTimeout(() => {
      const updated = {
        ...profile,
        drawdownStrategy: 'tax_optimizer' as const,
        partnerDrawdownStrategy: 'tax_optimizer' as const,
      };
      onChange(updated);
      setEqualised(true);
      setEqualising(false);
    }, 400);
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (retRows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">\u26A1 Dynamic Optimiser \u2014 Dynamic Optimization Cockpit</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Set a retirement date to activate the optimization cockpit.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">

      {/* Header */}
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
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">\u26A1 Dynamic Optimiser</h3>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm">
                Dynamic Optimization Cockpit
              </span>
              {mcRunning && (
                <span className="flex items-center gap-1 text-[9px] text-indigo-500 dark:text-indigo-400">
                  <Dices className="w-3 h-3 animate-spin" /> Running 1,000 sims\u2026
                </span>
              )}
              {!mcRunning && mcSuccessRate !== undefined && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> MC: {mcSuccessRate}% success
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              1,000-sim stochastic engine \u00B7 Tax matrix \u00B7 Spousal equalisation \u00B7 Radar scoring
            </p>
          </div>
        </div>
        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="p-6 space-y-8">

          {/* KPI Strip */}
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
                accent="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                label="PA Capture Rate"
                value={pct(kpis.paRate)}
                sub="Personal Allowance utilised"
              />
              {isCouple && kpis.coupleBalance !== null && (
                <KpiPill
                  icon={<Users className="w-4 h-4" />}
                  accent="bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400"
                  label="Couple Income Balance"
                  value={`\xB1${kpis.coupleBalance!.toFixed(1)}%`}
                  sub="avg deviation from 50/50"
                />
              )}
              {!mcRunning && mcSuccessRate !== undefined && (
                <KpiPill
                  icon={<Dices className="w-4 h-4" />}
                  accent="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  label="MC Success Rate (1,000)"
                  value={`${mcSuccessRate}%`}
                  sub="probability of lifetime solvency"
                />
              )}
            </div>
          )}

          {/* Grid: Streamgraph + Radar */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Panel 1: Streamgraph */}
            <div className="xl:col-span-3">
              <Panel
                title="Optimal Withdrawal Streamgraph"
                subtitle="Income split across tax bands each retirement year \u2014 minimise Higher Rate (red)"
                action={
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMatrix((v) => !v); }}
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
                      {([['spG','#8b5cf6'],['isaG','#f59e0b'],['paG','#10b981'],['brG','#38bdf8'],['hrG','#ef4444']] as [string,string][]).map(([id,c]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `\xA3${Math.round(v/1000)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                    <Area type="monotone" dataKey="State Pension"           stackId="1" fill="url(#spG)"  stroke="#8b5cf6" strokeWidth={0} />
                    <Area type="monotone" dataKey="ISA Bridge"              stackId="1" fill="url(#isaG)" stroke="#f59e0b" strokeWidth={0} />
                    <Area type="monotone" dataKey="Personal Allowance (0%)" stackId="1" fill="url(#paG)"  stroke="#10b981" strokeWidth={0} />
                    <Area type="monotone" dataKey="Basic Rate (20%)"        stackId="1" fill="url(#brG)"  stroke="#38bdf8" strokeWidth={0} />
                    <Area type="monotone" dataKey="Higher Rate"             stackId="1" fill="url(#hrG)"  stroke="#ef4444" strokeWidth={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Panel 2: Radar */}
            <div className="xl:col-span-2">
              <Panel
                title="Multi-Objective Plan Score"
                subtitle="Five-axis optimisation radar \u2014 higher is better on all axes"
                action={
                  mcRunning
                    ? <span className="text-[9px] text-indigo-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Simulating\u2026</span>
                    : undefined
                }
              >
                {mcSuccessRate === undefined && !mcRunning && (
                  <button
                    onClick={onRunStressTest}
                    className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-2.5 py-2 hover:bg-amber-100 transition-colors cursor-pointer w-full text-left"
                  >
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    <span><strong>Longevity Safety</strong> uses a deterministic estimate. Run the <span className="underline">Stress Test</span> for a Monte Carlo-accurate score.</span>
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
                      <div className="text-xs font-extrabold" style={{ color: d.score >= 70 ? '#10b981' : d.score >= 45 ? '#f59e0b' : '#ef4444' }}>{d.score}</div>
                      <div className="text-[8px] text-slate-400 leading-tight">{d.subject.replace('\n', ' ')}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          {/* Tax Matrix Table (toggleable) */}
          {showMatrix && (
            <Panel title="Annual Tax Matrix" subtitle="Per-year income split, tax band exposure and 60% trap detection across all retirement years">
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60">
                      <th className="px-2 py-2 text-left font-bold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-50 dark:bg-slate-800/60">Age</th>
                      <th className="px-2 py-2 text-right font-bold text-slate-500 dark:text-slate-400">Gross (P)</th>
                      <th className="px-2 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">PA 0%</th>
                      <th className="px-2 py-2 text-right font-bold text-sky-600 dark:text-sky-400">Basic 20%</th>
                      <th className="px-2 py-2 text-right font-bold text-rose-500 dark:text-rose-400">Higher 40%</th>
                      <th className="px-2 py-2 text-right font-bold text-orange-600">60% Trap</th>
                      <th className="px-2 py-2 text-right font-bold text-slate-500">Tax (P)</th>
                      {isCouple && <>
                        <th className="px-2 py-2 text-right font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700">Gross (Q)</th>
                        <th className="px-2 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">PA 0%</th>
                        <th className="px-2 py-2 text-right font-bold text-sky-600 dark:text-sky-400">Basic 20%</th>
                        <th className="px-2 py-2 text-right font-bold text-rose-500 dark:text-rose-400">Higher 40%</th>
                        <th className="px-2 py-2 text-right font-bold text-orange-600">60% Trap</th>
                        <th className="px-2 py-2 text-right font-bold text-slate-500">Tax (Q)</th>
                      </>}
                      <th className="px-2 py-2 text-right font-bold text-slate-700 dark:text-slate-200 border-l border-slate-200 dark:border-slate-700">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((r, i) => (
                      <tr key={r.age} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-800/30'}>
                        <td className="px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-inherit">{r.age}</td>
                        <td className="px-2 py-1.5 text-right text-slate-500">{fmt(r.pGross)}</td>
                        <td className="px-2 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{fmt(r.pPA)}</td>
                        <td className={`px-2 py-1.5 text-right ${bandCell(r.pBasic, BASIC_CEIL - PA)}`}>{r.pBasic > 0 ? fmt(r.pBasic) : '\u2014'}</td>
                        <td className={`px-2 py-1.5 text-right ${r.pHigher > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-300 dark:text-slate-700'}`}>{r.pHigher > 0 ? fmt(r.pHigher) : '\u2014'}</td>
                        <td className={`px-2 py-1.5 text-right ${r.p60Trap > 0 ? 'text-orange-600 dark:text-orange-400 font-extrabold animate-pulse' : 'text-slate-300 dark:text-slate-700'}`}>{r.p60Trap > 0 ? fmt(r.p60Trap) : '\u2014'}</td>
                        <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 font-semibold">{fmt(r.pTax)}</td>
                        {isCouple && <>
                          <td className="px-2 py-1.5 text-right text-slate-500 border-l border-slate-100 dark:border-slate-800">{fmt(r.qGross ?? 0)}</td>
                          <td className="px-2 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{fmt(r.qPA ?? 0)}</td>
                          <td className={`px-2 py-1.5 text-right ${bandCell(r.qBasic ?? 0, BASIC_CEIL - PA)}`}>{(r.qBasic ?? 0) > 0 ? fmt(r.qBasic ?? 0) : '\u2014'}</td>
                          <td className={`px-2 py-1.5 text-right ${(r.qHigher ?? 0) > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-300 dark:text-slate-700'}`}>{(r.qHigher ?? 0) > 0 ? fmt(r.qHigher ?? 0) : '\u2014'}</td>
                          <td className={`px-2 py-1.5 text-right ${(r.q60Trap ?? 0) > 0 ? 'text-orange-600 dark:text-orange-400 font-extrabold animate-pulse' : 'text-slate-300 dark:text-slate-700'}`}>{(r.q60Trap ?? 0) > 0 ? fmt(r.q60Trap ?? 0) : '\u2014'}</td>
                          <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-300 font-semibold">{fmt(r.qTax)}</td>
                        </>}
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

          {/* Panel 3: Income Equalisation / Band Utilisation */}
          <Panel
            title={isCouple ? 'Spousal Income Equalisation' : 'Tax Band Utilisation'}
            subtitle={
              isCouple
                ? 'Primary vs Partner net income \u2014 both should stay below the \xA350,270 Higher Rate cliff'
                : 'Annual income vs Personal Allowance (\xA312,570) and Basic Rate ceiling (\xA350,270)'
            }
            action={
              isCouple && onChange ? (
                <button
                  onClick={handleBalance}
                  disabled={equalising || equalised}
                  className={`flex items-center gap-1.5 text-[10px] font-bold rounded-lg px-2.5 py-1.5 transition-all shrink-0 ${
                    equalised
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 cursor-pointer'
                  }`}
                >
                  {equalising ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> Balancing\u2026</>
                  ) : equalised ? (
                    <><CheckCircle2 className="w-3 h-3" /> Equalised</>
                  ) : (
                    <><SlidersHorizontal className="w-3 h-3" /> Balance Now</>
                  )}
                </button>
              ) : undefined
            }
          >
            <ResponsiveContainer width="100%" height={200}>
              {isCouple ? (
                <LineChart data={incomeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `\xA3${Math.round(v/1000)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                  <ReferenceLine y={BASIC_CEIL} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: '40% cliff \xA350,270', position: 'insideTopLeft', fontSize: 9, fill: '#ef4444' }} />
                  <ReferenceLine y={PA}         stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: 'PA \xA312,570',          position: 'insideTopLeft', fontSize: 9, fill: '#10b981' }} />
                  <Line type="monotone" dataKey="Primary" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Partner" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                </LineChart>
              ) : (
                <BarChart data={incomeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `\xA3${Math.round(v/1000)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <ReferenceLine y={BASIC_CEIL} stroke="#ef4444" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: '40% cliff \xA350,270', position: 'insideTopLeft', fontSize: 9, fill: '#ef4444' }} />
                  <ReferenceLine y={PA}         stroke="#10b981" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: 'PA \xA312,570',          position: 'insideTopLeft', fontSize: 9, fill: '#10b981' }} />
                  <Bar dataKey="Income" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={16} />
                </BarChart>
              )}
            </ResponsiveContainer>

            {isCouple && kpis?.coupleBalance !== null && (
              <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2 mt-1 ${
                (kpis?.coupleBalance ?? 99) < 5
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                  : (kpis?.coupleBalance ?? 99) < 15
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
              }`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {(kpis?.coupleBalance ?? 99) < 5
                    ? 'Excellent spousal income equalisation \u2014 both incomes closely balanced.'
                    : (kpis?.coupleBalance ?? 99) < 15
                    ? `Moderate imbalance (\xB1${kpis?.coupleBalance?.toFixed(1)}%). Use Balance Now to switch both members to Tax Optimiser strategy.`
                    : `Significant income imbalance (\xB1${kpis?.coupleBalance?.toFixed(1)}%). Click Balance Now to equalise income and reduce household tax.`
                  }
                </span>
              </div>
            )}
          </Panel>

        </div>
      )}
    </div>
  );
};

export default DynamicOptimiserCard;
