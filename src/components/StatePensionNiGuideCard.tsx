import React from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Coins, 
  HelpCircle, 
  TrendingUp, 
  Award, 
  Calendar, 
  Calculator, 
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export const StatePensionNiGuideCard: React.FC = () => {
  return (
    <div id="card-doc-statepensionniguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200/60 dark:border-amber-800/60">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>State Pension Maximisation & Voluntary NI Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                Guaranteed Income Optimisation
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              How to audit missing NI years, purchase voluntary Class 2/3 contributions for 300%+ ROI, and evaluate State Pension deferral benefits.
            </p>
          </div>
        </div>
      </div>

      {/* Core Baseline Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Full New State Pension (2024/25)</span>
          <div className="text-xl font-black text-slate-900 dark:text-white">£221.20 <span className="text-xs font-normal text-slate-500">/ week</span></div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Equivalent to <strong>£11,502.40 per year</strong> tax-free at source (though counts toward personal allowance).</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
          <span className="text-amber-900 dark:text-amber-300 font-medium">Qualifying Years Required</span>
          <div className="text-xl font-black text-amber-950 dark:text-amber-200">35 Years</div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Need at least <strong>10 years</strong> to receive any State Pension. Each year adds ~£328.64/yr income for life.</p>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-1.5">
          <span className="text-emerald-900 dark:text-emerald-300 font-medium">State Pension Deferral Rate</span>
          <div className="text-xl font-black text-emerald-950 dark:text-emerald-200">+5.8% <span className="text-xs font-normal text-slate-500">per year</span></div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">Increases by 1% for every 9 weeks deferred. Deferring 1 year boosts annual payout by ~<strong>£667/year for life</strong>.</p>
        </div>
      </div>

      {/* Voluntary NI Contribution ROI Math */}
      <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>The Incredible ROI Math of Voluntary Class 3 NI Contributions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2.5">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              If your HMRC record shows gaps in your National Insurance history (e.g. from living abroad, career breaks, or early retirement), buying voluntary <strong>Class 3 NI contributions</strong> is often the single highest guaranteed return on investment available in UK personal finance.
            </p>
            <ul className="space-y-2 text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Cost per gap year:</strong> ~£907.40 (Class 3 voluntary rate).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Income added:</strong> 1/35th of full pension = <strong>+£328.64 per year</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Triple Lock Inflation Protection:</strong> Rises annually by CPI, wage growth, or 2.5%.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-3">
            <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
              <span>Payback & Break-Even Timeline</span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-bold">
                ~2.7 Years Break-Even
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Paying £907 upfront yields £328.64 every single year in retirement. In under 3 years of receiving State Pension, you have fully recovered your initial outlay. Living 20 years past State Pension age yields over <strong>£6,500+ in inflation-indexed income</strong> for an initial £907 outlay.
            </p>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-300 font-medium">
              Class 2 Note: Eligible self-employed individuals with gaps can pay Class 2 voluntary rates at just <strong>~£179.40 per year</strong> — achieving break-even in under 6 months!
            </div>
          </div>
        </div>
      </div>

      {/* State Pension Deferral vs Taking Early */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span>State Pension Deferral: When Does It Make Sense?</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>When Deferral is Highly Beneficial</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>• You are still working full-time at State Pension age and taking State Pension would push you into higher (40%) or additional (45%) rate tax bands.</li>
              <li>• You have excellent health and family longevity.</li>
              <li>• You wish to build higher guaranteed inflation-linked income later in retirement to cover late-life care needs.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>When Taking Immediately is Preferable</span>
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>• You need immediate cash flow to avoid selling equities from your SIPP / ISA during a market downturn.</li>
              <li>• You have health concerns or reduced life expectancy (break-even on 1-year deferral is ~age 80).</li>
              <li>• Your current total taxable income is below your Personal Allowance (£12,570), making State Pension 100% tax-free.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900 dark:text-amber-300">Modelling State Pension in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the <strong>Profile Inputs</strong> card, you can enter your exact expected <strong>State Pension Annual Amount</strong> and <strong>State Pension Start Age</strong>. The engine automatically indexes this income by inflation annually and adjusts portfolio drawdown requirements from that year forward.
          </p>
        </div>
      </div>

    </div>
  );
};
