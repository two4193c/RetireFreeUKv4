import React from 'react';
import { Briefcase, TrendingUp, CheckCircle2, ArrowRight, ShieldCheck, Clock, Percent, AlertCircle, Sparkles, Layers, DollarSign } from 'lucide-react';

export const SayeBayeGuideCard: React.FC = () => {
  return (
    <div id="card-doc-sayebayeguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-800/60">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Workplace SAYE & BAYE Schemes Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                Employee Share Plans
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              HMRC-approved ShareSave (SAYE) and Share Incentive Plans (BAYE/SIP): Tax relief, 20% discounts, and the crucial 90-day ISA transfer window
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SAYE Card */}
        <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-300 font-bold text-base">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>1. SAYE (Save As You Earn / ShareSave)</span>
            </div>
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
              Up to 20% Discount
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            An HMRC-approved employee scheme allowing you to save <strong>£5 to £500 per month</strong> directly out of your net pay over a <strong>3-year or 5-year period</strong>. At maturity, you get an option to buy company shares at a discounted price set when you joined.
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Up to 20% Share Option Discount</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                The option price is fixed at the start of the scheme with up to a <strong>20% discount</strong> off market value. If company stock rises, your gain is magnified.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                <span>Zero Downside Risk Guarantee</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                If the share price falls below the option price at maturity, you don't have to buy the shares! You simply take <strong>100% of your cash savings back tax-free</strong> (plus any tax-free bonus).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900/60 space-y-1">
              <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Tax Treatment</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                • <strong>No Income Tax or National Insurance</strong> when buying discounted shares at maturity.<br />
                • Gains made when selling shares later are subject to Capital Gains Tax (CGT)—unless transferred to an ISA!
              </p>
            </div>
          </div>
        </div>

        {/* BAYE / SIP Card */}
        <div className="p-6 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-purple-900 dark:text-purple-300 font-bold text-base">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>2. BAYE / SIP (Share Incentive Plan)</span>
            </div>
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
              Pre-Tax Salary Purchase
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            An HMRC-approved scheme allowing employees to buy company shares out of <strong>gross pre-tax salary</strong> before Income Tax and National Insurance are deducted, providing instant tax savings of 20% to 45% + NI.
          </p>

          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider text-[11px]">The 4 Types of SIP Shares:</h4>
            
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="font-bold text-purple-900 dark:text-purple-300">1. Partnership Shares:</span> Bought from gross pay (up to £1,800/yr or 10% of income).
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="font-bold text-purple-900 dark:text-purple-300">2. Matching Shares:</span> Employers can match up to 2 free shares per 1 Partnership share!
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="font-bold text-purple-900 dark:text-purple-300">3. Free Shares:</span> Employers can award up to £3,600 of free shares per year tax-free.
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60">
                <span className="font-bold text-purple-900 dark:text-purple-300">4. Dividend Shares:</span> Reinvest dividends tax-free into more company shares.
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200/60 dark:border-purple-900/60 space-y-1">
              <div className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>The 5-Year Holding Rule for 100% Tax-Free Status</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                • <strong>Under 3 years</strong>: Pay Income Tax & NI on full value when removed.<br />
                • <strong>3 to 5 years</strong>: Pay Income Tax & NI on lower of initial cost or market value.<br />
                • <strong>5+ years</strong>: <strong>100% TAX-FREE</strong> (Zero Income Tax, zero NI, zero CGT)!
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* SAYE / SIP to ISA 90-Day Transfer Feature Box */}
      <div className="p-6 rounded-2xl bg-primary-50/80 dark:bg-primary-950/40 border border-primary-200/80 dark:border-primary-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-primary-900 dark:text-primary-300 font-bold text-base">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span>The Magic Loophole: SAYE / SIP to Stocks & Shares ISA (90-Day Rule)</span>
          </div>
          <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-primary-600 text-white shadow-sm">
            0% Capital Gains Tax Forever
          </span>
        </div>

        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          Under HMRC rules, when your SAYE scheme matures (or when you withdraw shares from a SIP after 5 years), you can transfer up to <strong>£20,000 worth of shares directly into a Stocks & Shares ISA within 90 days</strong> of exercising the option or leaving the plan.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary-900 dark:text-primary-300">
              <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-xs flex items-center justify-center font-black">1</span>
              <span>Exercise / Maturity</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              When your SAYE scheme finishes, exercise your option to buy shares at the discounted price (e.g. £10,000 cost for shares now worth £30,000).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary-900 dark:text-primary-300">
              <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-xs flex items-center justify-center font-black">2</span>
              <span>Transfer In Specie Within 90 Days</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Instruct your ISA provider to accept an "In-Specie" transfer of up to £20,000 value directly into your ISA within <strong>90 days</strong> of scheme completion.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary-900 dark:text-primary-300">
              <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-xs flex items-center justify-center font-black">3</span>
              <span>Complete CGT Shielding</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              The £20,000 of shares is sheltered in your ISA. <strong>No Capital Gains Tax is due on transfer</strong>, and all future growth and dividends remain 100% tax-free!
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary-200/60 dark:border-primary-900/60 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary-900 dark:text-primary-300">
              <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 text-xs flex items-center justify-center font-black">4</span>
              <span>SIPP Tax Relief (Optional)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Once sheltered in your ISA, you can optionally sell the shares tax-free and contribute the cash into a <strong>SIPP</strong>, claiming 20% to 45% income tax relief on the contribution.
            </p>
          </div>
        </div>
      </div>

      {/* Strategic Decision Matrix for Retirement Planning */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Strategic Hierarchy: How to Prioritize Employee Share Schemes in Your Plan</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-black text-xs flex items-center justify-center">1</span>
              <h4 className="font-bold text-slate-900 dark:text-white">Max Pension Match</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              First, ensure workplace pension contributions capture 100% of employer match (instant 100% return + NI savings).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-xs flex items-center justify-center">2</span>
              <h4 className="font-bold text-slate-900 dark:text-white">BAYE / SIP Matching</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If your employer offers matching shares in a SIP (e.g. 2 free shares for 1), max this out next for instant free equity + pre-tax income savings.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-black text-xs flex items-center justify-center">3</span>
              <h4 className="font-bold text-slate-900 dark:text-white">SAYE ShareSave</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Join 3-year or 5-year SAYE schemes up to £500/month. Enjoy a 20% discount with zero downside risk if the stock drops.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-800 dark:text-primary-300 font-black text-xs flex items-center justify-center">4</span>
              <h4 className="font-bold text-slate-900 dark:text-white">90-Day ISA Shelter</h4>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Upon maturity, transfer up to £20,000 of shares into a Stocks & Shares ISA within 90 days. Diversify out of single-stock risk as needed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-blue-900 dark:text-blue-300">Modeling SAYE & BAYE Transfers in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            In the application, you can model future matured SAYE/BAYE payouts by navigating to <strong>Baseline Inputs → Pot Transfers & Scheduled Lump Sums</strong>. Add a scheduled transfer into your Stocks & Shares ISA at your planned maturity age to see its impact on your pre-57 FIRE bridge!
          </p>
        </div>
      </div>

    </div>
  );
};
