import React, { useState } from 'react';
import { 
  HelpCircle, 
  Compass, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Calculator, 
  Sliders, 
  PieChart, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb, 
  Zap, 
  ArrowRight,
  BookOpen,
  Scale,
  DollarSign,
  Briefcase,
  FileText
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  content: React.ReactNode;
}

export const UserGuideCard: React.FC = () => {
  const [openSectionId, setOpenSectionId] = useState<string | null>('getting-started');

  const toggleSection = (id: string) => {
    setOpenSectionId(prev => prev === id ? null : id);
  };

  const sections: GuideSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started & Quick Workflow',
      icon: Compass,
      badge: 'Start Here',
      summary: 'Learn the basic workflow from adding your assets to generating a tax-smart retirement drawdown plan.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>RetireFree UK</strong> — your comprehensive retirement financial planning suite tailored strictly to UK tax laws (2024/25 & 2025/26).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Enter Your Assets</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In the <strong>Inputs & Assets</strong> tab, enter your Defined Contribution (DC) pensions, DB pensions, ISAs, Cash, State Pension age/amount, property, and fees.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Set Target Income</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Go to <strong>Strategy Planner</strong> to set your desired annual net retirement income and choose a tax-efficient drawdown strategy.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Review & Stress Test</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect year-by-year cash flows in <strong>Projections</strong>, test sequence-of-returns risk in <strong>Risk Analysis</strong>, and model estate tax in <strong>IHT Planning</strong>.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 flex items-start gap-2 text-xs text-blue-900 dark:text-blue-200">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Basic vs. Advanced Mode:</strong> You can toggle between <strong>Basic</strong> and <strong>Advanced Mode</strong> in the top header. Basic mode streamlines navigation to core planning cards, while Advanced mode unlocks full depth including Accumulation reviews, Mortgage modeling, Custom fee drags, and Scenario comparisons.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'inputs-and-assets',
      title: '2. Managing Inputs & Asset Accounts',
      icon: Briefcase,
      badge: 'Data Entry',
      summary: 'How to enter DC pensions, DB pensions, State Pensions, ISAs, Cash, Property, and Life Events.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Inputs & Assets</strong> page is where you build the baseline picture of your financial assets and income streams:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Defined Contribution (DC) Pensions & SIPPs
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Enter current pot balances, ongoing employer & employee contributions, expected investment growth rates (net or gross), and platform fees.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <BuildingIcon className="w-4 h-4 text-indigo-600" />
                Defined Benefit (DB) / Final Salary Pensions
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Record guaranteed annual payout amounts, start age, CPI inflation revaluation, and spouse survivor benefit percentages (e.g., 50% or 66%).
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                ISAs, General Investment Accounts (GIAs) & Cash
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Tax-free ISAs and taxable GIAs or Cash savings. Specify growth rates and expected annual interest/yield.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Life Events & One-off Expenses
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Add planned lump sum capital events like downsizing property, gifting children, buying a car, or paying off a mortgage at retirement.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'drawdown-strategies',
      title: '3. Strategy Planner & Drawdown Logic',
      icon: Sliders,
      badge: 'Tax Optimization',
      summary: 'Understand the different drawdown ordering strategies and tax optimization engines.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The engine calculates your income tax liabilities every year according to UK Personal Allowances, Basic/Higher/Additional rate tax bands, and the 25% Tax-Free Cash (PCLS) rules.
          </p>

          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Available Drawdown Strategies:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
              <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-xs">Tax-Efficient / Minimum Tax (Recommended)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Fills Personal Allowance with taxable pension drawdown first, then uses tax-free ISA or PCLS cash to top up remaining required spending without triggering higher tax bands.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pro-Rata Balancing</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Withdraws proportionally from ISA, Pension, and Cash pots based on their relative size to maintain balanced asset allocation.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Cash & ISA First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Exhausts cash reserves and tax-free ISAs first to defer pension access, allowing pensions to grow tax-free for as long as possible.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pension First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Withdraws from pension pots first, preserving ISAs as a tax-free reserve or for estate inheritance planning.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'scenarios-and-compare',
      title: '4. Scenarios & Plan Comparison',
      icon: Layers,
      badge: 'What-If Modeling',
      summary: 'How to create alternative scenario plans, duplicate strategies, and compare them side-by-side.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            You can test multiple "What-If" scenarios without losing your baseline plan — for instance, comparing early retirement at age 58 vs. standard age 65, or comparing high-risk vs. conservative equity allocations.
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Creating Scenarios:</strong> Click the <strong>Plans / Scenarios</strong> dropdown in the top header or go to <strong>Plan Management</strong> tab to add a new scenario or duplicate your current active scenario.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Side-by-Side Comparison:</strong> In <strong>Advanced Mode</strong>, open the <strong>Compare Plans</strong> tab. Select any two scenario variants to see differences in total tax paid, final remaining wealth at age 95, and solvency years.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Export & Import:</strong> Use the <strong>Plan Management / Export</strong> card to download your entire profile as a JSON backup file or CSV report to keep for offline records.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'risk-and-estate',
      title: '5. Risk Analysis & Estate (IHT) Planning',
      icon: ShieldCheck,
      badge: 'Protection',
      summary: 'Stress-testing sequence of returns, inflation shocks, and calculating Inheritance Tax liabilities.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-600" />
                Risk & Stress Testing
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Model market crashes right at retirement age (Sequence of Returns Risk), sustained high inflation spikes (e.g. 5-7%), or living beyond age 95.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                Inheritance Tax (IHT)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Calculate potential 40% IHT on property, cash, and GIAs using UK Nil-Rate Bands (£325k NRB + £175k Residential NRB). Note that DC pensions currently sit outside the estate for IHT.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq-and-tips',
      title: '6. Frequently Asked Questions & Troubleshooting',
      icon: HelpCircle,
      badge: 'FAQ',
      summary: 'Answers to common questions regarding tax calculations, State Pension bridging, and data storage.',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <details className="group p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <summary className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
              <span>Where is my financial data stored?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              All financial data is stored 100% locally in your browser's private secure cache (LocalStorage). No personal data or financial figures are sent to external servers.
            </p>
          </details>

          <details className="group p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <summary className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
              <span>How does State Pension bridging work?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              If you retire before State Pension age (e.g. at 60 when State Pension starts at 67), the engine automatically increases withdrawals from your private pension/ISAs during those gap years to bridge your income up to your target requirement.
            </p>
          </details>

          <details className="group p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <summary className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
              <span>Does the engine account for inflation indexing?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              Yes! All target income requirements, state pensions, DB pensions, and tax bands are adjusted annually for inflation based on your chosen inflation rate setting (default 2.5%).
            </p>
          </details>
        </div>
      )
    }
  ];

  return (
    <div id="card-other-userguide" className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-200 dark:border-blue-800">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Application Manual
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">• Version 4.0</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              RetireFree Application User Guide
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Comprehensive walkthrough, feature reference, drawdown strategy explanations, and tips
            </p>
          </div>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isOpen = openSectionId === section.id;

          return (
            <div 
              key={section.id} 
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? 'bg-slate-50/80 dark:bg-slate-800/50 border-blue-200 dark:border-blue-900 shadow-xs' 
                  : 'bg-white dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    isOpen 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {section.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                        {section.badge}
                      </span>
                    </div>
                    {!isOpen && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {section.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`p-1.5 rounded-lg text-slate-400 transition-transform ${isOpen ? 'rotate-180 bg-blue-100/80 dark:bg-blue-950/80 text-blue-600' : ''}`}>
                  <ChevronDown className="w-5 h-5" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 animate-fade-in">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

// Helper component for Building icon
function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-6 0h6" />
    </svg>
  );
}
