import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  TrendingDown,
  PieChart,
  Layers,
  Sparkles,
  ArrowRight,
  User,
  Users,
  Building2,
  Lock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, InvestmentPots } from '../types';
import { getLsaLimit } from '../utils/ukTaxEngine';

interface AssetLocationTaxDragCardProps {
  profile: UserProfile;
  pots: InvestmentPots;
  onChange?: (updated: UserProfile) => void;
}

type OwnerFilter = 'all' | 'primary' | 'partner';

interface WrapperItem {
  id: string;
  name: string;
  enclave: 'tax_free' | 'tax_deferred' | 'tax_exposed';
  balance: number;
  owner: 'primary' | 'partner';
  pclsEligible?: boolean;
}

export const AssetLocationTaxDragCard: React.FC<AssetLocationTaxDragCardProps> = ({
  profile,
  pots,
}) => {
  const isCouple = Boolean(profile.isCouplePlanning);
  const [selectedOwner, setSelectedOwner] = useState<OwnerFilter>('all');
  const [retirementTaxRate, setRetirementTaxRate] = useState<number>(20); // 20% basic, 40% higher

  // Extract individual wrapper pots
  const wrappers = useMemo<WrapperItem[]>(() => {
    const list: WrapperItem[] = [];

    // Primary Pots
    const primaryWp = Number(pots.workplacePensionBalance || 0);
    const primarySipp = Number(pots.sippBalance || 0);
    const primarySsIsa = Number(pots.stocksAndSharesIsaBalance || 0);
    const primaryCashIsa = Number(pots.cashIsaBalance || 0);
    const primaryLisa = Number(pots.lisaBalance || 0);
    const primaryGia = Number(pots.giaBalance || 0);
    const primaryCash = Number(pots.cashSavingsBalance || 0);

    if (primaryWp > 0) {
      list.push({
        id: 'primary_wp',
        name: 'Workplace Pension',
        enclave: 'tax_deferred',
        balance: primaryWp,
        owner: 'primary',
        pclsEligible: true,
      });
    }
    if (primarySipp > 0) {
      list.push({
        id: 'primary_sipp',
        name: 'SIPP',
        enclave: 'tax_deferred',
        balance: primarySipp,
        owner: 'primary',
        pclsEligible: true,
      });
    }
    if (primarySsIsa > 0) {
      list.push({
        id: 'primary_ss_isa',
        name: 'Stocks & Shares ISA',
        enclave: 'tax_free',
        balance: primarySsIsa,
        owner: 'primary',
      });
    }
    if (primaryCashIsa > 0) {
      list.push({
        id: 'primary_cash_isa',
        name: 'Cash ISA',
        enclave: 'tax_free',
        balance: primaryCashIsa,
        owner: 'primary',
      });
    }
    if (primaryLisa > 0) {
      list.push({
        id: 'primary_lisa',
        name: 'Lifetime ISA (LISA)',
        enclave: 'tax_free',
        balance: primaryLisa,
        owner: 'primary',
      });
    }
    if (primaryGia > 0) {
      list.push({
        id: 'primary_gia',
        name: 'General Investment Account (GIA)',
        enclave: 'tax_exposed',
        balance: primaryGia,
        owner: 'primary',
      });
    }
    if (primaryCash > 0) {
      list.push({
        id: 'primary_cash',
        name: 'Cash Savings',
        enclave: 'tax_exposed',
        balance: primaryCash,
        owner: 'primary',
      });
    }

    // Partner Pots (if couple)
    if (isCouple) {
      const partnerPots = profile.partnerPots;
      const partnerWp = Number(partnerPots?.workplacePensionBalance ?? profile.partnerWorkplacePensionBalance ?? 0);
      const partnerSipp = Number(partnerPots?.sippBalance ?? profile.partnerSippBalance ?? 0);
      const partnerSsIsa = Number(partnerPots?.stocksAndSharesIsaBalance ?? profile.partnerIsaBalance ?? 0);
      const partnerCashIsa = Number(partnerPots?.cashIsaBalance ?? 0);
      const partnerLisa = Number(partnerPots?.lisaBalance ?? 0);
      const partnerGia = Number(partnerPots?.giaBalance ?? 0);
      const partnerCash = Number(partnerPots?.cashSavingsBalance ?? 0);

      if (partnerWp > 0) {
        list.push({
          id: 'partner_wp',
          name: `${profile.partnerName || 'Partner'} Workplace Pension`,
          enclave: 'tax_deferred',
          balance: partnerWp,
          owner: 'partner',
          pclsEligible: true,
        });
      }
      if (partnerSipp > 0) {
        list.push({
          id: 'partner_sipp',
          name: `${profile.partnerName || 'Partner'} SIPP`,
          enclave: 'tax_deferred',
          balance: partnerSipp,
          owner: 'partner',
          pclsEligible: true,
        });
      }
      if (partnerSsIsa > 0) {
        list.push({
          id: 'partner_ss_isa',
          name: `${profile.partnerName || 'Partner'} S&S ISA`,
          enclave: 'tax_free',
          balance: partnerSsIsa,
          owner: 'partner',
        });
      }
      if (partnerCashIsa > 0) {
        list.push({
          id: 'partner_cash_isa',
          name: `${profile.partnerName || 'Partner'} Cash ISA`,
          enclave: 'tax_free',
          balance: partnerCashIsa,
          owner: 'partner',
        });
      }
      if (partnerLisa > 0) {
        list.push({
          id: 'partner_lisa',
          name: `${profile.partnerName || 'Partner'} LISA`,
          enclave: 'tax_free',
          balance: partnerLisa,
          owner: 'partner',
        });
      }
      if (partnerGia > 0) {
        list.push({
          id: 'partner_gia',
          name: `${profile.partnerName || 'Partner'} GIA`,
          enclave: 'tax_exposed',
          balance: partnerGia,
          owner: 'partner',
        });
      }
      if (partnerCash > 0) {
        list.push({
          id: 'partner_cash',
          name: `${profile.partnerName || 'Partner'} Cash Savings`,
          enclave: 'tax_exposed',
          balance: partnerCash,
          owner: 'partner',
        });
      }
    }

    return list;
  }, [pots, profile, isCouple]);

  // Filtered by selected owner
  const filteredWrappers = useMemo(() => {
    if (!isCouple || selectedOwner === 'all') return wrappers;
    return wrappers.filter((w) => w.owner === selectedOwner);
  }, [wrappers, isCouple, selectedOwner]);

  // Aggregate by tax enclave
  const enclaveAggregates = useMemo(() => {
    let taxFreeGross = 0;
    let taxDeferredGross = 0;
    let taxExposedGross = 0;

    filteredWrappers.forEach((w) => {
      if (w.enclave === 'tax_free') taxFreeGross += w.balance;
      else if (w.enclave === 'tax_deferred') taxDeferredGross += w.balance;
      else if (w.enclave === 'tax_exposed') taxExposedGross += w.balance;
    });

    const totalGross = taxFreeGross + taxDeferredGross + taxExposedGross;

    // Estimate Tax Drag
    // 1. Tax-Free Enclave: 0% tax drag
    const taxFreeNet = taxFreeGross;

    // 2. Tax-Deferred Enclave (Pensions):
    // 25% tax-free lump sum (PCLS up to LSA limit), remaining 75% taxed at retirement marginal rate
    const primaryLsa = getLsaLimit(profile);
    const applicableLsa = isCouple && selectedOwner === 'all' ? primaryLsa * 2 : primaryLsa;
    const estimatedPcls = Math.min(taxDeferredGross * 0.25, applicableLsa);
    const taxableDrawdownGross = Math.max(0, taxDeferredGross - estimatedPcls);
    const pensionTaxDrag = taxableDrawdownGross * (retirementTaxRate / 100);
    const taxDeferredNet = taxDeferredGross - pensionTaxDrag;

    // 3. Tax-Exposed Enclave (GIAs & Cash):
    // Estimated dividend/CGT/savings tax drag (~8% blended over holding lifecycle)
    const exposedTaxDrag = taxExposedGross * 0.08;
    const taxExposedNet = taxExposedGross - exposedTaxDrag;

    const totalTaxDrag = pensionTaxDrag + exposedTaxDrag;
    const totalNetRealizable = totalGross - totalTaxDrag;
    const effectiveTaxDragPct = totalGross > 0 ? (totalTaxDrag / totalGross) * 100 : 0;
    const taxEfficiencyScore = Math.max(0, Math.min(100, Math.round(100 - effectiveTaxDragPct * 3)));

    return {
      totalGross,
      taxFreeGross,
      taxDeferredGross,
      taxExposedGross,
      taxFreeNet,
      taxDeferredNet,
      taxExposedNet,
      estimatedPcls,
      pensionTaxDrag,
      exposedTaxDrag,
      totalTaxDrag,
      totalNetRealizable,
      effectiveTaxDragPct,
      taxEfficiencyScore,
    };
  }, [filteredWrappers, profile, isCouple, selectedOwner, retirementTaxRate]);

  const {
    totalGross,
    taxFreeGross,
    taxDeferredGross,
    taxExposedGross,
    totalTaxDrag,
    totalNetRealizable,
    effectiveTaxDragPct,
    taxEfficiencyScore,
  } = enclaveAggregates;

  // Treemap tile shares
  const taxFreePct = totalGross > 0 ? (taxFreeGross / totalGross) * 100 : 0;
  const taxDeferredPct = totalGross > 0 ? (taxDeferredGross / totalGross) * 100 : 0;
  const taxExposedPct = totalGross > 0 ? (taxExposedGross / totalGross) * 100 : 0;

  // Donut chart angles (out of 360 deg)
  const netAngle = totalGross > 0 ? (totalNetRealizable / totalGross) * 360 : 360;
  const dragAngle = 360 - netAngle;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Tax Wrapper &ldquo;Asset Location&rdquo; Treemap &amp; Tax-Drag Ring
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Asset location dictates retirement decumulation efficiency. Categorize your gross portfolio into three distinct UK tax enclaves to identify your true net spendable wealth and eliminate unnecessary HMRC tax-drag.
          </p>
        </div>

        {/* Controls: Owner Filter & Tax Rate Toggle */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {isCouple && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => setSelectedOwner('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedOwner === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Household</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOwner('primary')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedOwner === 'primary'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{profile.name || 'Primary'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOwner('partner')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  selectedOwner === 'partner'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{profile.partnerName || 'Partner'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="text-[11px] text-slate-400">Decumulation Tax:</span>
            <button
              type="button"
              onClick={() => setRetirementTaxRate(20)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                retirementTaxRate === 20
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              20% (Basic)
            </button>
            <button
              type="button"
              onClick={() => setRetirementTaxRate(40)}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                retirementTaxRate === 40
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              40% (Higher)
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Treemap (Left) + Tax Drag Donut Ring (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Asset Location Treemap (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <span>Asset Location Enclaves ({filteredWrappers.length} Active Wrappers)</span>
            </h4>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              Total Gross: £{Math.round(totalGross).toLocaleString()}
            </span>
          </div>

          {/* Enclave Summary Horizontal Bar */}
          <div className="h-5 w-full rounded-xl overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
            {taxFreePct > 0 && (
              <div
                style={{ width: `${taxFreePct}%` }}
                className="bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight cursor-default"
                title={`Tax-Free Enclave: £${Math.round(taxFreeGross).toLocaleString()} (${taxFreePct.toFixed(1)}%)`}
              >
                {taxFreePct > 15 ? `Tax-Free ${taxFreePct.toFixed(0)}%` : ''}
              </div>
            )}
            {taxDeferredPct > 0 && (
              <div
                style={{ width: `${taxDeferredPct}%` }}
                className="bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center text-[10px] font-bold text-white tracking-tight cursor-default"
                title={`Tax-Deferred Enclave: £${Math.round(taxDeferredGross).toLocaleString()} (${taxDeferredPct.toFixed(1)}%)`}
              >
                {taxDeferredPct > 15 ? `Tax-Deferred ${taxDeferredPct.toFixed(0)}%` : ''}
              </div>
            )}
            {taxExposedPct > 0 && (
              <div
                style={{ width: `${taxExposedPct}%` }}
                className="bg-amber-500 hover:bg-amber-600 transition-colors flex items-center justify-center text-[10px] font-bold text-slate-900 tracking-tight cursor-default"
                title={`Tax-Exposed Enclave: £${Math.round(taxExposedGross).toLocaleString()} (${taxExposedPct.toFixed(1)}%)`}
              >
                {taxExposedPct > 15 ? `Tax-Exposed ${taxExposedPct.toFixed(0)}%` : ''}
              </div>
            )}
          </div>

          {/* Treemap Enclave Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Tax-Free Enclave */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-black text-xs text-emerald-950 dark:text-emerald-100">
                    Tax-Free Enclave
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 rounded">
                  {taxFreePct.toFixed(1)}%
                </span>
              </div>
              <div className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">
                £{Math.round(taxFreeGross).toLocaleString()}
              </div>
              <p className="text-[10px] text-emerald-800/90 dark:text-emerald-300/80 leading-snug">
                ISAs &amp; LISAs. <strong>0% Income Tax</strong>, <strong>0% CGT</strong>. 100% net spendable cash in retirement with zero HMRC reporting.
              </p>
              <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                {filteredWrappers
                  .filter((w) => w.enclave === 'tax_free')
                  .map((w) => (
                    <div key={w.id} className="flex justify-between items-center text-[10px]">
                      <span className="text-emerald-900/80 dark:text-emerald-200 truncate pr-1">{w.name}</span>
                      <span className="font-mono font-bold text-emerald-950 dark:text-emerald-100 shrink-0">
                        £{Math.round(w.balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 2. Tax-Deferred Enclave */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-black text-xs text-blue-950 dark:text-blue-100">
                    Tax-Deferred Enclave
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-blue-200/80 dark:bg-blue-900/80 text-blue-900 dark:text-blue-100 rounded">
                  {taxDeferredPct.toFixed(1)}%
                </span>
              </div>
              <div className="font-mono text-base font-black text-blue-700 dark:text-blue-300">
                £{Math.round(taxDeferredGross).toLocaleString()}
              </div>
              <p className="text-[10px] text-blue-800/90 dark:text-blue-300/80 leading-snug">
                Pensions &amp; SIPPs. <strong>25% Tax-Free PCLS</strong> up to LSA; remaining 75% taxed at {retirementTaxRate}% upon drawdown.
              </p>
              <div className="pt-1.5 border-t border-blue-200/60 dark:border-blue-800/40 space-y-1">
                {filteredWrappers
                  .filter((w) => w.enclave === 'tax_deferred')
                  .map((w) => (
                    <div key={w.id} className="flex justify-between items-center text-[10px]">
                      <span className="text-blue-900/80 dark:text-blue-200 truncate pr-1">{w.name}</span>
                      <span className="font-mono font-bold text-blue-950 dark:text-blue-100 shrink-0">
                        £{Math.round(w.balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 3. Tax-Exposed Enclave */}
            <div className="bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-black text-xs text-amber-950 dark:text-amber-100">
                    Tax-Exposed Enclave
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded">
                  {taxExposedPct.toFixed(1)}%
                </span>
              </div>
              <div className="font-mono text-base font-black text-amber-700 dark:text-amber-300">
                £{Math.round(taxExposedGross).toLocaleString()}
              </div>
              <p className="text-[10px] text-amber-800/90 dark:text-amber-300/80 leading-snug">
                GIAs &amp; Cash. Subject to <strong>CGT above £3k</strong> and savings allowance taxes. Bed-and-ISA candidates.
              </p>
              <div className="pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 space-y-1">
                {filteredWrappers
                  .filter((w) => w.enclave === 'tax_exposed')
                  .map((w) => (
                    <div key={w.id} className="flex justify-between items-center text-[10px]">
                      <span className="text-amber-900/80 dark:text-amber-200 truncate pr-1">{w.name}</span>
                      <span className="font-mono font-bold text-amber-950 dark:text-amber-100 shrink-0">
                        £{Math.round(w.balance).toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tax-Drag Donut Ring & Net Wealth Realizability (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60">
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <span>HMRC Tax-Drag Donut Gauge</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                taxEfficiencyScore >= 85
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : taxEfficiencyScore >= 70
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              Efficiency Score: {taxEfficiencyScore}/100
            </span>
          </div>

          {/* Circular Donut Ring Graphic */}
          <div className="flex items-center justify-center py-2">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring (Red Tax-Drag) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-rose-400 dark:stroke-rose-600/70"
                  strokeWidth="10"
                  fill="none"
                />
                {/* Foreground Ring (Green Net Realizable) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  className="stroke-emerald-500 dark:stroke-emerald-400 transition-all duration-700"
                  strokeWidth="10"
                  fill="none"
                  strokeDasharray={`${(netAngle / 360) * 238.76} 238.76`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                  Net Spendable
                </span>
                <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                  £{Math.round(totalNetRealizable / 1000)}k
                </span>
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  {((totalNetRealizable / Math.max(1, totalGross)) * 100).toFixed(1)}% of Gross
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Strip */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Headline Gross Assets:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                £{Math.round(totalGross).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Estimated HMRC Tax Drag ({effectiveTaxDragPct.toFixed(1)}%):</span>
              </span>
              <span className="font-mono font-bold">
                -£{Math.round(totalTaxDrag).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700/80 font-bold">
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>True Net Spendable Portfolio:</span>
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-300">
                £{Math.round(totalNetRealizable).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Actionable Strategy Recommendation */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
            <div className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Recommended Decumulation Sequence:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-snug">
              1. <strong>GIAs</strong> first (harvest £3k annual CGT allowance) &rarr; 2. <strong>Pensions</strong> up to personal allowance / 20% basic band &rarr; 3. <strong>ISAs</strong> last to preserve 100% tax-free compounding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
