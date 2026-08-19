import React from 'react';
import { 
  Sparkles, 
  Calculator, 
  LineChart, 
  Activity, 
  FileText, 
  Zap, 
  Home, 
  ShieldCheck,
  CheckCircle2,
  Lock,
  Download,
  Banknote
} from 'lucide-react';

export const FeaturesGuideCard: React.FC = () => {
  return (
    <div id="card-doc-featuresguide" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
      
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-6">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black tracking-wide text-xs uppercase mb-1">
          <Sparkles className="w-4 h-4" />
          <span>App Features & Capabilities</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Comprehensive Feature List
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          RetireFree UK provides adviser-depth tax modelling and financial planning in a fast, real-time reactive interface. Explore the full range of features available to help you build and stress-test your retirement plan.
        </p>
      </div>

      {/* Security & Data Privacy Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
        <div className="flex items-center gap-2 font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
          <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>100% Local, Private & Secure</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <strong>Your financial data never leaves your device.</strong> RetireFree UK is a fully local application. We do not use remote databases, cloud servers, or tracking cookies to store your inputs. All calculations happen securely and instantly directly within your own browser.
        </p>
        <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-xs text-slate-700 dark:text-slate-300">
            <strong>Cross-Device Portability:</strong> Use the secure JSON Export/Import feature (found in the settings menu) to save your plan to a local file. This allows you to safely transfer your data between your phone, tablet, and desktop without ever relying on the cloud.
          </p>
        </div>
      </div>

      {/* Feature List Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-indigo-500" />
          Application Capabilities
        </h3>
        
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/80">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-700/80 w-1/3">Feature</th>
                <th className="px-4 py-3 font-bold border-b border-slate-200 dark:border-slate-700/80">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> UK Income Tax Modelling
                </td>
                <td className="px-4 py-3 leading-relaxed">Fully models PAYE income tax bands, Personal Allowance tapering, Dividend Tax, Capital Gains Tax, and PCLS/UFPLS tax-free pension rules.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> National Insurance
                </td>
                <td className="px-4 py-3 leading-relaxed">Accurately calculates Class 1 (employee), Class 2, and Class 4 (self-employed) National Insurance contributions.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> ISA & SIPP Wrappers
                </td>
                <td className="px-4 py-3 leading-relaxed">Models all primary UK tax wrappers, including Stocks & Shares ISAs, Cash ISAs, LISAs, GIAs, and SIPPs (with proper tax relief logic).</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> DB & State Pensions
                </td>
                <td className="px-4 py-3 leading-relaxed">Supports multiple Defined Benefit pensions with spousal continuation rules, plus advanced State Pension modelling including NI qualifying years and the Triple Lock.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Couple / Dual Planning
                </td>
                <td className="px-4 py-3 leading-relaxed">Full split-view modelling showing each partner's individual tax, income, and allocation streams simultaneously for joint household planning.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Monte Carlo & SORR
                </td>
                <td className="px-4 py-3 leading-relaxed">Runs 1,000 stochastic simulations to map outcome probability cones (P10/P50/P90), plus deterministic stress-testing against historic market crashes (Sequence of Returns Risk).</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Spending Phases
                </td>
                <td className="px-4 py-3 leading-relaxed">Models variable spending over time, including the empirical "retirement spending smile" (Go-Go, Slow-Go, No-Go phases) and custom manual phases.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> IHT & Estate Planning
                </td>
                <td className="px-4 py-3 leading-relaxed">Complete Inheritance Tax modelling including the Nil Rate Band, Residence Nil Rate Band, taper relief, and the April 2027 rules bringing pensions into the taxable estate.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Annuity Comparison
                </td>
                <td className="px-4 py-3 leading-relaxed">Built-in annuity engine to compare flexible drawdown strategies against purchasing a guaranteed income floor.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> UK Gilt Ladder Strategy
                </td>
                <td className="px-4 py-3 leading-relaxed">Construct tailored, default-free UK Government bond ladders (using Debt Management Office gilts) with 0% Capital Gains Tax arbitrage under TCGA 1992 s.115 to eliminate Sequence of Returns Risk for your initial retirement bridge.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> SAYE / Share Schemes
                </td>
                <td className="px-4 py-3 leading-relaxed">Dedicated UK Save As You Earn and Share Incentive Plan modelling, including the 90-day ISA transfer tax loophole.</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> Dynamic Guardrails
                </td>
                <td className="px-4 py-3 leading-relaxed">Calculates Safe Withdrawal Rates (SWR) dynamically based on current market conditions and dynamically adjusts for inflation.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unique Differentiators */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          RetireFree UK Exclusive Features
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          The following advanced capabilities are unique highlights of the RetireFree UK platform.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30 space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Genetic Max Spend Solver
            </h4>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
              Instead of guessing if your money will last, our algorithmic solver automatically iterates through your cash flow to find the exact maximum sustainable withdrawal ("Die With Zero").
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-200 dark:border-blue-800/30 space-y-2">
            <h4 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Sankey Cash Flow Diagrams
            </h4>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
              Interactive waterfall diagrams generated for every phase of retirement, visually routing every pound from its source account, through the HMRC tax system, and into your spending budget.
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 space-y-2">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Right-Sizing Equity Routing
            </h4>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
              Models complex property downsizing events, automatically deducting agent fees and SDLT, and letting you inject the released equity directly into specific pots (like ISAs or SIPPs).
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-200 dark:border-purple-800/30 space-y-2">
            <h4 className="font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
              <LineChart className="w-4 h-4" /> KPI Impact Slider
            </h4>
            <p className="text-xs text-purple-800/80 dark:text-purple-200/80 leading-relaxed">
              A real-time sliding bar showing exactly how each input change instantly impacts your key metrics (retirement age, pot depletion age, and inheritance value) without reloading.
            </p>
          </div>

          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 space-y-2">
            <h4 className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
              <Banknote className="w-4 h-4" /> UK Gilt Ladder & 0% CGT Arbitrage
            </h4>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 leading-relaxed">
              Build custom maturity schedules using real UK Treasury Gilts. Eliminates Sequence of Returns Risk by securing guaranteed annual cashflow with zero Capital Gains Tax under TCGA 1992 s.115.
            </p>
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-200 dark:border-indigo-800/30 space-y-2">
            <h4 className="font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Live AI-Ready Exports
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80 leading-relaxed">
              Download your entire plan as a live Formula Excel (.xlsx) workbook where every cell connects using native Excel formulas. Designed specifically so you can upload it directly to ChatGPT or Claude for a second-opinion critique.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
