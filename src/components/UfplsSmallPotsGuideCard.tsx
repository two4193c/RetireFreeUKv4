import React from 'react';
import { 
  Coins, 
  HelpCircle, 
  Layers, 
  Percent, 
  AlertTriangle, 
  CheckCircle2, 
  PieChart, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Wallet,
  TrendingUp,
  Landmark,
  ShieldCheck,
  Zap,
  Scale,
  DollarSign
} from 'lucide-react';

export const UfplsSmallPotsGuideCard: React.FC = () => {
  return (
    <div id="card-doc-ufplssmallpotsguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200/60 dark:border-purple-800/60">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Pension Crystallisation & Withdrawal Methods Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
                Post-LTA Regime
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparing UFPLS (Drip-Feed), Phased Crystallisation (Split Pots), and Full Upfront PCLS under UK Lump Sum Allowance (£268,275) rules.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Way Strategy Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>The Three UK Pension Decumulation Routes</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Route 1: UFPLS (Drip Feed) */}
          <div className="p-5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 dark:text-purple-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  1. UFPLS (Drip-Feed)
                </span>
                <span className="text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                  100% Uncrystallised
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Funds stay 100% uncrystallised in your SIPP/workplace pot. For each withdrawal, exactly <strong>25% is tax-free</strong> and <strong>75% is taxable income</strong>.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <span><strong>Growth Multiplier:</strong> Unwithdrawn funds continue growing tax-free, generating fresh 25% tax-free allowance on investment returns up to the £268,275 LSA limit.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Instant MPAA Trigger:</strong> First taxable payment immediately restricts your future pension contributions to £10,000/yr.</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 text-[11px] text-purple-900 dark:text-purple-300 font-semibold">
              Best for: Simple ad-hoc income without managing separate drawdown sub-accounts.
            </div>
          </div>

          {/* Route 2: Phased Crystallisation (Split Pots) */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  2. Phased Crystallisation
                </span>
                <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                  Split Sub-Pots ⚡
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                You crystallise planned tranches over time (e.g. £100,000 at Age 58, £100,000 at Age 63). Each tranche releases 25% tax-free lump sum into ISAs/cash and moves 75% into a <strong>Crystallised Drawdown Pot</strong>.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Optimal Tax Control:</strong> Uncrystallised portion keeps growing tax-free cash potential, while crystallised pot draws are timed to fill the 0% Personal Allowance (£12,570) with zero tax!</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Zero LSA on Drawdown:</strong> Once crystallised, drawing income from the FAD pot uses £0 further Lump Sum Allowance.</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-300 font-semibold">
              Best for: Maximum tax efficiency and bridging early retirement years before State Pension.
            </div>
          </div>

          {/* Route 3: Full Upfront PCLS */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  3. Full Upfront PCLS
                </span>
                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                  100% Crystallised
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Crystallise your entire pension pot at the earliest access age (e.g. 57). Take the full 25% tax-free lump sum upfront (capped at £268,275 LSA) and place 100% of the remaining 75% into Flexi-Access Drawdown.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span><strong>Instant Capital:</strong> Provides maximum immediate cash for paying off mortgages, debt, or gifting.</span>
                </div>
                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Forfeits Future Growth Tax-Free:</strong> All future growth on the 75% pot is 100% taxable when drawn — no additional 25% tax-free relief on future market gains.</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
              Best for: Large immediate lump sum capital needs (e.g. clearing £150k mortgage).
            </div>
          </div>

        </div>
      </div>

      {/* Deep-Dive: Sub-Pot Accounting in RetireFree UK */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800/60 dark:to-blue-950/30 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>How RetireFree UK Models Sub-Pot Mechanics & Lump Sum Allowances</span>
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          RetireFree UK v4 uses an institutional-grade sub-pot ledger that separates pension wealth into two distinct compounding buckets across single and couple profiles:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-purple-600" />
              Uncrystallised Pension Sub-Pot
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Maintains eligibility for 25% tax-free lump sum under the standard £268,275 Lump Sum Allowance (LSA). As the pot compounds at 5-7% p.a., 25% of the gains generate additional tax-free cash eligibility until the £268,275 threshold is met.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-indigo-600" />
              Crystallised Flexi-Access Drawdown Pot
            </span>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              Holds funds where 25% PCLS was already extracted and sheltered. Withdrawals from this pot count as taxable income but consume <strong>£0 further LSA</strong>. When drawn alongside tax-free ISAs up to £12,570/yr, your effective tax rate is 0%.
            </p>
          </div>
        </div>

        {/* Target Sheltering Routing */}
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800/80 text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
          <span className="font-bold block">Tax-Free Cash (PCLS) Sheltering Destinations</span>
          <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
            When crystallising tranches in RetireFree UK, you can choose where the 25% tax-free cash lands: <strong>Stocks & Shares ISA</strong> (for long-term tax-free growth), <strong>Cash ISA / Cash Savings</strong> (for a 2-3 year low-volatility cash buffer), <strong>General Investment Account (GIA)</strong>, or <strong>Direct Spending / Debt Payoff</strong>.
          </p>
        </div>
      </div>

      {/* Small Pension Pots Commutation Rules (£10,000 Rule) */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="w-4 h-4 text-purple-500" />
          <span>HMRC Small Pension Pots Commutation Rules (£10,000 Limit)</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Under UK tax legislation, if you hold small, orphan pension pots worth <strong>£10,000 or less</strong>, you can cash them out entirely under the <strong>Small Pots Commutation Rules</strong> (25% tax-free, 75% taxable).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Up to 3 Personal Pots</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">You can encash up to <strong>3 separate non-workplace / personal pension pots</strong> under £10k each in your lifetime.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Unlimited Workplace Pots</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Occupational / workplace pension pots under £10,000 can be encashed with <strong>no limit on the number of pots</strong>, provided employer approval is met.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                MPAA Protection Shield
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">Crucially, Small Pots encashments do <strong>NOT trigger the £10,000 MPAA</strong>, allowing ongoing £60k annual employer contributions!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Tax Code Warning */}
      <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900 dark:text-amber-300">Beware of the First Withdrawal Emergency Tax Code (Month 1 M1 Code)</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Your pension provider is required by HMRC to apply an <strong>Emergency Tax Code on a Month 1 basis</strong> to your first UFPLS or taxable drawdown payment. This often over-taxes initial lump sums by thousands of pounds. You can reclaim overpaid tax via HMRC Form <strong>P55, P53, or P50</strong> within 30 days.
          </p>
        </div>
      </div>

      {/* HMRC Pension Recycling Anti-Avoidance Warning */}
      <div className="p-5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-rose-900 dark:text-rose-300">HMRC Pension Recycling Anti-Avoidance Rules</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            HMRC prohibits withdrawing tax-free cash (PCLS) solely to pay it straight back into a pension to claim double tax relief. Recycling penalties apply if: (1) PCLS exceeds £7,500 in 12 months, (2) cumulative pension contributions increase by &gt;30% of normal, and (3) the recycling was pre-planned.
          </p>
        </div>
      </div>

    </div>
  );
};

