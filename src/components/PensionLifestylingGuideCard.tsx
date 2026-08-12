import React from 'react';
import { 
  TrendingDown, 
  ShieldAlert, 
  Sliders, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  PieChart, 
  Compass, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Building2,
  Coins
} from 'lucide-react';

export const PensionLifestylingGuideCard: React.FC = () => {
  return (
    <div id="card-doc-lifestylingguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Pension Lifestyling & Default Funds Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                Workplace Pension De-risking
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Understanding workplace pension default glidepaths, automatic asset de-risking, and avoiding mismatch between default funds and flexible drawdown.
            </p>
          </div>
        </div>
      </div>

      {/* Overview & Core Definition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* What is Lifestyling */}
        <div className="p-6 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-sm">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>What is Pension Lifestyling?</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Over 90% of UK workplace pension scheme members remain in their provider's <strong>Default Investment Fund</strong>. Most default funds feature automatic <strong>Lifestyling</strong> (also known as a <em>Glidepath</em> or <em>Target Date Strategy</em>).
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Starting 10 to 15 years before your selected target retirement age, the pension provider automatically shifts your capital out of higher-growth assets (like global equities) and into lower-risk assets (bonds, UK Gilts, and cash deposits).
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 text-xs font-bold text-indigo-900 dark:text-indigo-300">
            Goal: Protect accumulated capital from a market crash right before you retire.
          </div>
        </div>

        {/* The Modern Mismatch Hazard */}
        <div className="p-6 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-bold text-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>The Modern Drawdown Mismatch Hazard</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Historically, lifestyling was designed when everyone bought a guaranteed <strong>Annuity</strong> at age 65. Traditional lifestyling shifted 100% into Fixed Interest Gilts (which track annuity pricing) and Cash (for the 25% tax-free lump sum).
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            However, today <strong>over 80% of UK retirees choose Flexible Drawdown</strong> instead. De-risking heavily into cash and bonds prematurely damages compounding growth needed to fund a 30-year retirement.
          </p>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 text-xs font-bold text-amber-900 dark:text-amber-300">
            Hazard: Being de-risked into cash when you plan to stay invested in equities for drawdown!
          </div>
        </div>

      </div>

      {/* The 3 Main Types of Lifestyling Strategies */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-500" />
          <span>The 3 Main Types of Lifestyling De-risking Paths</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Annuity Target */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-500" />
                1. Annuity Target
              </span>
              <span className="text-[10px] font-bold uppercase bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                Annuity Focus
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Shifts capital into long-term UK Government Gilts, Corporate Bonds, and 25% Cash.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <strong>Best For:</strong> Individuals purchasing a guaranteed annuity at retirement to secure fixed income for life.
            </div>
          </div>

          {/* Flexible Drawdown Target */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                2. Drawdown Target
              </span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Flexible Drawdown
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Retains 40%–60% equity exposure at retirement, shifting the remainder into multi-asset funds, short-dated bonds, and cash.
            </p>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <strong>Best For:</strong> Individuals keeping their pension invested in drawdown while taking flexible income withdrawals.
            </div>
          </div>

          {/* Full Cash Target */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-500" />
                3. Cash Target
              </span>
              <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                Full Lump Sum
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Shifts 100% of accumulated capital into money market funds and cash deposits over the final 5–10 years.
            </p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <strong>Best For:</strong> Individuals intending to encash their entire pension pot as a cash lump sum upon reaching retirement age.
            </div>
          </div>

        </div>
      </div>

      {/* Critical Pitfalls to Watch For */}
      <div className="p-6 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Top 4 Default Fund & Lifestyling Pitfalls</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>1. Wrong Target Retirement Age in Provider System</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              If your workplace pension lists your target retirement age as 65, but you plan to retire early at 57 (FIRE), automatic de-risking won't have started, leaving your pot fully exposed to equity volatility right before you retire. Conversely, if you plan to work until 70 but the provider target is 60, you will be de-risked 10 years too early!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>2. Bond Market Volatility & Rate Spikes</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              In 2022, sharp interest rate rises caused UK long-dated Gilts and corporate bond funds to drop by 30%–40%. Investors who were lifestyled into long bonds expecting 'safety' suffered severe capital losses right before retirement.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>3. Inflation Erosion During De-risking</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Holding high proportions of cash or low-yielding bonds for 10–15 years prior to retirement exposes your capital to severe inflation drag if CPI inflation outpaces deposit interest rates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 space-y-1.5">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>4. High Default Fund Charges vs Self-Select Funds</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              While workplace default funds are capped at 0.75% AMC under UK regulations, switching to self-select passive global index trackers inside the same scheme can often lower fees down to 0.10%–0.20% p.a.
            </p>
          </div>

        </div>
      </div>

      {/* Actionable Action Plan */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Action Plan: How to Review Your Workplace Pension</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Log into your pension provider portal</p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Check your currently assigned investment fund name and verify your selected Target Retirement Age in profile settings.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Determine your intended retirement strategy</p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">If you plan flexible drawdown, select a <strong>Flexible Drawdown Default Option</strong> or opt out of automatic lifestyling to maintain self-directed global equity investments.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80">
            <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Align RetireFree UK v4 assumptions</p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">Set realistic expected pre-retirement investment returns in RetireFree UK based on whether you are de-risked in bonds/cash or fully invested in growth equities.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-indigo-900 dark:text-indigo-300">Modelling Asset Returns in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the <strong>Advanced Settings & Investment Returns</strong> card, you can configure distinct <strong>Pre-Retirement Return</strong> (Accumulation) and <strong>Post-Retirement Return</strong> (Decumulation) rates, or enable <strong>Custom Asset Allocation Splits</strong> to model specific equity, bond, and cash weightings throughout your timeline.
          </p>
        </div>
      </div>

    </div>
  );
};
