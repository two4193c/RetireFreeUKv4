import React from 'react';
import { 
  ShieldCheck, 
  PiggyBank, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Percent, 
  Building2, 
  Coins, 
  RefreshCw,
  ArrowRight
} from 'lucide-react';

export const EmergencyFundGuideCard: React.FC = () => {
  return (
    <div id="card-doc-cashbufferguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Emergency Fund & Cash Buffer Strategy Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                Liquidity & Risk Management
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Optimising liquid cash reserves in accumulation vs decumulation to insulate against sequence of returns risk, market downturns, and emergency expenses.
            </p>
          </div>
        </div>
      </div>

      {/* Core Principle: Accumulation vs Decumulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Accumulation Phase */}
        <div className="p-6 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-sky-900 dark:text-sky-300 font-bold text-sm">
            <Wallet className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span>1. Accumulation Phase: The Emergency Fund</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            During your working years, an emergency fund provides a defensive financial cushion against unexpected life shocks (job redundancy, urgent house/boiler repairs, or medical costs) without having to break tax wrappers or take on high-interest debt.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span><strong>Target Size:</strong> 3 to 6 months of essential net living expenses (6–12 months if self-employed or single-income household).</span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <span><strong>Optimal Wrappers:</strong> Instant-access Cash ISAs, high-yield notice accounts, or NS&I Premium Bonds (tax-free prizes).</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-900/60 text-xs font-bold text-sky-900 dark:text-sky-300">
            Rule of Thumb: Keep emergency cash separate from investment capital to avoid panic-selling stocks during market dips.
          </div>
        </div>

        {/* Decumulation Phase */}
        <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>2. Decumulation Phase: The Retirement Cash Buffer</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            In retirement, cash serves an active defensive purpose: eliminating <strong>Sequence of Returns Risk</strong>. Holding 1 to 3 years of net portfolio income withdrawals in cash ensures you never sell equities or pensions during a market crash.
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Target Size:</strong> 1 to 3 years of net portfolio drawdown requirement (after State & DB pensions).</span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Optimal Strategy:</strong> Multi-year cash bucket paired with short-dated UK Gilts or fixed-term deposits.</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/60 dark:border-emerald-900/60 text-xs font-bold text-emerald-900 dark:text-emerald-300">
            Sequence Shield: Gives equity markets 2–3 years to recover before you need to sell any equities for income!
          </div>
        </div>
      </div>

      {/* The 3-Tier Liquidity Architecture */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>The 3-Tier Cash & Liquidity Bucket Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Tier 1 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                Tier 1: Immediate Cash Float
              </span>
              <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                1–3 Months
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Held in instant-access bank accounts or Cash ISAs for monthly drawdown payouts, regular standing orders, and day-to-day living expenses.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <strong>Instruments:</strong> Current accounts, instant Cash ISA, NS&I Direct Saver.
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Tier 2: Short-Term Income Buffer
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                1–2 Years
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Buffers against market volatility. Refills Tier 1 on an annual or bi-annual basis. Low risk with yield protection.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <strong>Instruments:</strong> 1-year fixed rate bonds, notice accounts, short-dated low-coupon UK Gilts.
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Tier 3: Growth & Rebalancing
              </span>
              <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                3+ Years
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Diversified equities, global index funds, and property wrappers generating long-term real growth above inflation.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <strong>Instruments:</strong> SIPP / Workplace Pension, Stocks & Shares ISA, GIA.
            </div>
          </div>

        </div>
      </div>

      {/* UK Tax Rules & Safety Limits */}
      <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>UK Tax Rules & FSCS Protection Limits</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Personal Savings Allowance (PSA)</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Tax-free interest threshold per year outside ISAs:
            </p>
            <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
              <li>Basic Rate (20%): <strong>£1,000 allowance</strong></li>
              <li>Higher Rate (40%): <strong>£500 allowance</strong></li>
              <li>Additional Rate (45%): <strong>£0 allowance</strong></li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Cash ISA vs GIA Cash</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Cash held inside a <strong>Cash ISA</strong> generates 100% tax-free interest and does not count towards your PSA limit. In decumulation, maintaining cash within ISAs prevents unwanted income tax liabilities.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>FSCS £85,000 Banking Limit</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              The Financial Services Compensation Scheme guarantees cash deposits up to <strong>£85,000 per person per banking license</strong> (£170k for joint accounts). High cash buffers should be distributed across multiple distinct banking groups.
            </p>
          </div>

        </div>
      </div>

      {/* Dynamic Cash Buffer Replenishment Strategy */}
      <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Dynamic Cash Buffer Replenishment Protocol</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-2">
            <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>In Bull Markets (Equity Portfolios Rising)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Skim capital gains and harvest dividend payments from your growth portfolio (SIPP / ISA) to top up Tier 1 & Tier 2 cash back to your target 2–3 year buffer level.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-2">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>In Bear Markets (Equity Portfolios Down)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              <strong>Freeze all equity sales completely.</strong> Draw 100% of your living costs from your Tier 1 & Tier 2 cash buffer, allowing your equity portfolio time to recover fully without locking in paper losses.
            </p>
          </div>

        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-900 dark:text-emerald-300">Modelling Emergency Funds & Cash Buffers in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Specify your initial cash reserves in the <strong>Cash Savings Balance</strong>, <strong>Cash ISA Balance</strong>, and <strong>GIA Cash Balance</strong> inputs. The decumulation engine automatically draws down liquid cash and ISAs first based on your selected withdrawal sequence, protecting tax wrappers and modeling real cash replenishment.
          </p>
        </div>
      </div>

    </div>
  );
};
