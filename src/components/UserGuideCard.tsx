import React, { useState } from 'react';
import { AppMode } from '../types';
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
  Lock,
  ArrowRightLeft,
  GraduationCap,
  FileText,
  Download,
  Bot,
  FileSpreadsheet,
  Share2,
  Columns,
  Maximize2,
  LayoutDashboard,
  ExternalLink,
  Keyboard
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  summary: string;
  content: React.ReactNode;
}

interface UserGuideCardProps {
  appMode?: AppMode;
  onToggleAppMode?: (mode: AppMode) => void;
}

export const UserGuideCard: React.FC<UserGuideCardProps> = ({
  appMode: externalAppMode,
  onToggleAppMode
}) => {
  const [openSectionId, setOpenSectionId] = useState<string | null>('getting-started');
  const [internalMode, setInternalMode] = useState<AppMode>('basic');

  const currentMode = externalAppMode ?? internalMode;
  const isBasic = currentMode === 'basic';

  const handleModeToggle = (mode: AppMode) => {
    if (onToggleAppMode) {
      onToggleAppMode(mode);
    } else {
      setInternalMode(mode);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSectionId(prev => prev === id ? null : id);
  };

  const basicSections: GuideSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started & Quick Workflow',
      icon: Compass,
      badge: 'Basic Workflow ⚡',
      summary: 'Streamlined 4-step guide for Basic Mode: enter core assets, set target income, view projections, and export PDFs for AI comparison.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>RetireFree UK</strong> — your UK-focused retirement planning tool (aligned with 2024/25 & 2025/26 tax rules).
          </p>

          {/* Current Mode Indicator Banner */}
          <div className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl text-white bg-blue-600">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Quick Start Guide — Basic Mode Active ⚡
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Showing essential 4-step workflow for core assets, decumulation projections, and PDF export.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleModeToggle('advanced')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced ✨</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('studio')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white shadow-xs"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Studio 🚀</span>
              </button>
            </div>
          </div>

          {/* Basic Mode 4 Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Enter Core Assets</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                In <strong>Inputs & Assets</strong>, enter your DC pensions, DB pensions, ISAs, Cash, State Pension age/amount, and Property.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-extrabold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Set Target Income</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Go to <strong>Strategy Planner</strong> to set your desired net annual retirement spending and choose a tax-efficient drawdown strategy.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">View Projections</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect year-by-year income, tax paid, and remaining portfolio balances up to Age 95 in <strong>Projections</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-extrabold flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Summary, Excel & PDF Export</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review the Executive Summary in <strong>Summary</strong>, download a multi-page PDF report, export a live Formula Excel (.xlsx) spreadsheet, or export CSV data for AI comparison.
              </p>
            </div>
          </div>

          {/* AI PDF & Excel Export Callout Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-purple-200 dark:border-purple-800/80 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>💡 Pro Tip: Export Formula Excel Worksheets & PDF Reports for AI Analysis</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Did you know you can export your retirement plan as a live <strong>Formula Excel (.xlsx) spreadsheet</strong> or an official multi-page PDF report from the <strong>Summary / Export</strong> tab? The exported Excel workbook features connected worksheets with live native Excel formulas (`SUM`, `IF`, `SUMPRODUCT`, UK tax bands, and drawdown strategy rules). You can upload these exported files directly into AI assistants like <strong>Google Gemini</strong>, <strong>ChatGPT</strong>, or <strong>Claude</strong> for automated strategy critiques and second opinions!
            </p>
          </div>

          <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800/60 space-y-2 text-xs text-blue-950 dark:text-blue-200">
            <div className="flex items-center gap-2 font-extrabold text-blue-900 dark:text-blue-300">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Basic Mode Overview</span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              Basic Mode keeps your workspace clean and straightforward by displaying only the core inputs and main decumulation charts. To access advanced tools like Monte Carlo risk stress testing, April 2027 Inheritance Tax (IHT) estate calculations, workplace stock schemes, or side-by-side plan comparisons, enable <strong>Advanced Mode ✨</strong> at any time.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'inputs-and-assets',
      title: '2. Managing Inputs & Asset Accounts',
      icon: Briefcase,
      badge: 'Core Assets',
      summary: 'How to enter DC pensions, DB pensions, State Pensions, ISAs, Cash, and Property in Basic Mode.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Inputs & Assets</strong> page builds the baseline financial foundation for your retirement projection:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" />
                Defined Contribution (DC) Pensions & SIPPs
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Enter current pot balances, ongoing contributions, expected investment growth rates, and platform fees.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <BuildingIcon className="w-4 h-4 text-indigo-600" />
                Defined Benefit (DB) / Final Salary & State Pensions
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Record guaranteed annual payout amounts, start ages, inflation revaluation rules, and spouse survivor benefits.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                ISAs, General Investment Accounts (GIAs) & Cash
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Tax-free ISAs and taxable GIAs or Cash savings. Specify growth rates and interest yields.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Property & One-off Expenses
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Add planned lump sum capital events like downsizing property, gifting children, or buying a car.
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
      badge: 'Basic Drawdown',
      summary: 'Understand the different drawdown ordering strategies and tax optimization engines.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The engine calculates your income tax liabilities every year according to UK Personal Allowances (£12,570), Basic/Higher/Additional rate tax bands, and the 25% Tax-Free Cash (PCLS) rules.
          </p>

          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Available Drawdown Strategies:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-primary-50/70 dark:bg-primary-950/40 rounded-xl border border-primary-200 dark:border-primary-800 space-y-1">
              <span className="font-extrabold text-primary-900 dark:text-primary-200 text-xs">Tax-Free Personal Allowance First (£12,570)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Limits taxable pension withdrawals to the £12,570 Personal Allowance each year, topping up remaining required spending tax-free from ISAs or tax-free cash (PCLS).
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
              <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">Basic Rate Tax Bracket First (£50,270)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Fills up to the 20% Basic Rate Tax Band ceiling (£50,270), avoiding 40% Higher Rate Tax while maximizing income from pensions before using tax-free ISAs.
              </p>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
              <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">Higher Rate Tax Bracket First (£125,140)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Fills up to the Higher Rate threshold (£125,140), avoiding the 45% Additional Rate Tax band for high-wealth portfolios.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">ISA / Tax-Free Pots First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Exhausts ISAs first to defer pension access, allowing pensions to compound tax-free for longer.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Cash & Savings First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Spends cash and yield-bearing savings first before tapping invested ISAs or pension pots.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pension / Taxable First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Draws from pensions first, preserving ISAs as tax-free reserves or for April 2027 Inheritance Tax (IHT) estate planning.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pro-Rata Balancing</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Withdraws proportionally from ISA, Pension, and Cash pots based on their relative size.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Guaranteed Annuity Purchase</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Converts pension wealth into a guaranteed lifetime annuity income at retirement age.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Hybrid Annuity & Flexi-Drawdown</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Combines a partial annuity purchase for baseline essential income with flexible drawdown for discretionary spending.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'summary-and-pdf',
      title: '4. Executive Summary, PDF Output & AI Plan Analysis',
      icon: FileText,
      badge: 'PDF & AI Export',
      summary: 'How to view plan summaries, export comprehensive PDF reports, and upload plans to AI tools for comparison.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Summary / Export</strong> tab brings together your entire plan overview into a clear executive dashboard and provides 1-click export tools for offline sharing or AI-assisted scenario critique.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-blue-600" />
                Executive Summary View
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Provides a high-level feasibility verdict, solved maximum spending capacity, total lifetime income tax paid, and key risk alerts in a single consolidated dashboard.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                <Download className="w-4 h-4 text-primary-600" />
                Exporting Multi-Page PDF Reports
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Generates a beautifully structured PDF report complete with cover page, table of contents, profile summary, tax relief breakdown, milestone schedule, and full decumulation schedule.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Leveraging AI (Gemini / ChatGPT) for Plan Comparison & Review</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Exporting your retirement plan as a PDF gives you a portable, standardized document that can be uploaded into AI tools for automated analysis. Here is how to use it:
            </p>
            <ol className="list-decimal list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-medium">
              <li>Go to <strong>Summary / Export</strong> in RetireFree UK and click <strong>Download PDF Report</strong>.</li>
              <li>Optionally, create a second plan variant (e.g. retiring at 60 vs. 65) and download its PDF as well.</li>
              <li>Open <strong>Google Gemini</strong>, <strong>ChatGPT</strong>, or <strong>Claude</strong> and upload your exported PDF file(s).</li>
              <li>Use one of our recommended prompts below to receive natural-language insights.</li>
            </ol>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs font-mono text-slate-800 dark:text-slate-200">
              <div className="font-sans font-bold text-[11px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Suggested AI Prompt Example:</div>
              <p className="text-[11px] font-sans italic text-slate-600 dark:text-slate-400">
                "Attached is my RetireFree UK retirement plan PDF. Please review the tax relief breakdown, drawdown ordering strategy, and cashflow schedule. Summarize key risks, identify potential higher-rate tax traps between age 60 and 67, and suggest 3 ways I could optimize tax efficiency."
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq-and-tips',
      title: '5. Frequently Asked Questions & Troubleshooting',
      icon: HelpCircle,
      badge: 'FAQ',
      summary: 'Answers to common questions regarding tax calculations, State Pension bridging, and data storage.',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <details className="group p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <summary className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
              <span>What is the difference between Basic Mode and Advanced Mode?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              Basic Mode streamlines your workspace by displaying only essential retirement inputs (DC/DB pensions, ISAs, Cash, State Pension) and main cashflow projections. Advanced Mode unlocks all 30+ planning modules, including workplace accumulation, mortgages, fee drag, Monte Carlo risk testing, IHT estate modeling, scenario comparison, and the 25-guide library.
            </p>
          </details>

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
    },
    {
      id: 'app-modes',
      title: '6. Application Modes: Basic Mode vs. Advanced Mode',
      icon: Sliders,
      badge: 'Mode Switcher',
      summary: 'Detailed breakdown of Basic Mode vs Advanced Mode features with interactive mode toggle.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            RetireFree UK v4 includes a dual-interface mode switcher allowing you to adjust application complexity to match your current planning phase.
          </p>

          {/* Interactive Mode Toggle Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 my-2">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2">
                <Sliders className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Interactive App Mode Selector</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-700">
                  Active: Basic Mode ⚡
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click to switch the application interface mode live right now:
              </p>
            </div>

            <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => handleModeToggle('basic')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-blue-600 text-white shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Basic Mode</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('advanced')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced Mode</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Basic Mode (Current)
                </span>
                <span className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  Streamlined
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Streamlines the sidebar by hiding secondary modules and technical guides, allowing you to focus purely on core assets and decumulation projections.
              </p>
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Included Cards in Basic Mode:</span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Profile Inputs (Ages, Retirement Target, Income Needs)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Defined Contribution (DC) Pensions & SIPPs</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Defined Benefit (DB) Pensions & State Pension</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>ISAs, Cash Savings & Tax-efficient Drawdown Strategy</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Annual Projections cashflow chart & remaining wealth</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 opacity-80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Advanced Mode
                </span>
                <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                  Full Power
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Unlocks the full architectural power of RetireFree UK v4 with 30+ planning modules, granular tax tables, Monte Carlo risk testing, and IHT estate calculations.
              </p>
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Additional Unlocked Modules:</span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Risk Stress Testing (Monte Carlo & Sequence of Returns)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>April 2027 Inheritance Tax (IHT) Estate Shield</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Accumulation Phase review & Workplace SAYE/BAYE modeling</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Mortgage & Debt amortization schedules</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Multi-plan side-by-side comparison & 25 specialized guides</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const advancedSections: GuideSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started & Quick Workflow',
      icon: Compass,
      badge: 'Advanced Suite ✨',
      summary: 'Comprehensive 5-step workflow for Advanced Mode: asset entry, strategy planning, risk stress-testing, scenario benchmarking, and AI PDF export.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>RetireFree UK</strong> — your UK-focused retirement planning tool (aligned with 2024/25 & 2025/26 tax rules).
          </p>

          {/* Current Mode Indicator Banner */}
          <div className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-indigo-50/90 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl text-white bg-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Quick Start Guide — Advanced Mode Active ✨
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Showing full suite steps including risk stress-tests, IHT estate planning, scenario comparison, and AI PDF exports.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleModeToggle('basic')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Basic ⚡</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('studio')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white shadow-xs"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Studio 🚀</span>
              </button>
            </div>
          </div>

          {/* Advanced Mode 5 Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 my-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Asset & Debt Setup</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter DC/DB pensions, ISAs, Cash, Workplace SAYE/BAYE, Mortgages, and Fee Drags.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-extrabold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Strategy & Rules</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set target spending, drawdown ordering, custom growth rates, and withdrawal guardrails.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-extrabold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Risk & Estate (IHT)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stress-test sequence of returns in <strong>Risk Analysis</strong> and model 40% IHT liabilities under April 2027 rules.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Compare Scenarios</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use the <strong>Compare</strong> tab to evaluate "What-If" plan variants side-by-side using 4D trade-off scorecards.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center text-xs">
                5
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Summary & AI PDF Export</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download multi-page PDF reports or comparison PDFs and upload to AI for deep strategy analysis.
              </p>
            </div>
          </div>

          {/* AI PDF Export Callout Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-purple-200 dark:border-purple-800/80 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-purple-900 dark:text-purple-200 text-xs sm:text-sm">
              <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>💡 Pro Tip: Upload Exported PDFs to AI for Comparative Analysis & Strategy Critique</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Exporting your plan as a PDF from the <strong>Summary / Export</strong> tab (or downloading scenario comparison PDFs from <strong>Scenario Comparer</strong>) creates portable reports with full tax, asset, and milestone data. Upload these PDFs directly into <strong>Google Gemini</strong>, <strong>ChatGPT</strong>, or <strong>Claude</strong> to perform natural-language scenario trade-off comparisons, risk stress tests, or second-opinion reviews!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'inputs-and-assets',
      title: '2. Managing Inputs & Asset Accounts',
      icon: Briefcase,
      badge: 'All Accounts & Debt',
      summary: 'Detailed entry for DC/DB pensions, ISAs, Cash, Accumulation phase, SAYE/BAYE schemes, Mortgages, and Fee Drags.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Inputs & Assets</strong> page builds the baseline financial foundation for your retirement projection:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" />
                Defined Contribution (DC) Pensions & SIPPs
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Enter current pot balances, ongoing contributions, expected investment growth rates, and platform fees.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <BuildingIcon className="w-4 h-4 text-indigo-600" />
                Defined Benefit (DB) / Final Salary & State Pensions
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Record guaranteed annual payout amounts, start ages, inflation revaluation rules, and spouse survivor benefits.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                ISAs, General Investment Accounts (GIAs) & Cash
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Tax-free ISAs and taxable GIAs or Cash savings. Specify growth rates and interest yields.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Property & One-off Expenses
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Add planned lump sum capital events like downsizing property, gifting children, or buying a car.
              </p>
            </div>

            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Unlocked Advanced Asset Modules:
              </h4>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
                <li><strong>Accumulation Phase Review:</strong> Model salary growth, workplace pension match, and ISA accumulation pre-retirement.</li>
                <li><strong>Workplace SAYE & BAYE Schemes:</strong> Track Save-As-You-Earn scheme maturing options and Tax-Free BAYE transfers.</li>
                <li><strong>Mortgage & Debt Amortization:</strong> Model repayment vs. interest-only mortgages and lump sum payoff strategies.</li>
                <li><strong>Platform Fee Drag Analyzer:</strong> Measure cumulative compounding loss from OCF, platform, and adviser fees over 30 years.</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'drawdown-strategies',
      title: '3. Strategy Planner & Drawdown Logic',
      icon: Sliders,
      badge: 'Advanced Optimization',
      summary: 'Understand the different drawdown ordering strategies, tax optimization engines, and withdrawal guardrails.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The engine calculates your income tax liabilities every year according to UK Personal Allowances (£12,570), Basic/Higher/Additional rate tax bands, and the 25% Tax-Free Cash (PCLS) rules.
          </p>

          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Available Drawdown Strategies:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-primary-50/70 dark:bg-primary-950/40 rounded-xl border border-primary-200 dark:border-primary-800 space-y-1">
              <span className="font-extrabold text-primary-900 dark:text-primary-200 text-xs">Tax-Free Personal Allowance First (£12,570)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Limits taxable pension withdrawals to the £12,570 Personal Allowance each year, topping up remaining required spending tax-free from ISAs or tax-free cash (PCLS).
              </p>
            </div>

            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-1">
              <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">Basic Rate Tax Bracket First (£50,270)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Fills up to the 20% Basic Rate Tax Band ceiling (£50,270), avoiding 40% Higher Rate Tax while maximizing income from pensions before using tax-free ISAs.
              </p>
            </div>

            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1">
              <span className="font-extrabold text-purple-900 dark:text-purple-200 text-xs">Higher Rate Tax Bracket First (£125,140)</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Fills up to the Higher Rate threshold (£125,140), avoiding the 45% Additional Rate Tax band for high-wealth portfolios.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">ISA / Tax-Free Pots First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Exhausts ISAs first to defer pension access, allowing pensions to compound tax-free for longer.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Cash & Savings First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Spends cash and yield-bearing savings first before tapping invested ISAs or pension pots.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pension / Taxable First</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Draws from pensions first, preserving ISAs as tax-free reserves or for April 2027 Inheritance Tax (IHT) estate planning.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Pro-Rata Balancing</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Withdraws proportionally from ISA, Pension, and Cash pots based on their relative size.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Guaranteed Annuity Purchase</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Converts pension wealth into a guaranteed lifetime annuity income at retirement age.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">Hybrid Annuity & Flexi-Drawdown</span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Combines a partial annuity purchase for baseline essential income with flexible drawdown for discretionary spending.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1 text-xs">
            <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Advanced Strategy & Visualization Tools:
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              In Advanced Mode and the <strong>Projections / Annual Breakdown</strong> page, you also unlock the <strong>Interactive Cash Flow Sankey Diagram</strong> (with numerical £/yr Essential Floor tuning, age timeline slider, and automatic 50% split for individual partner views), <strong>Withdrawal Guardrail Gauges</strong> (Guyton-Klinger rules), and <strong>Safe Withdrawal Rate (SWR) Matrices</strong>.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'summary-and-pdf',
      title: '4. Executive Summary, PDF Output & AI Plan Analysis',
      icon: FileText,
      badge: 'PDF & AI Export',
      summary: 'Generate multi-page PDF reports, export scenario comparison documents, and upload plan PDFs into AI models for automated strategy critique.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong>Summary / Export</strong> tab and <strong>Scenario Comparer</strong> provide complete reporting suites designed for offline record-keeping and AI-driven comparative analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-4 h-4 text-indigo-600" />
                Comprehensive PDF Reports
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Export 15+ page structured PDF reports containing executive summary feasibility verdicts, tax relief gained tables, State Pension execution timelines, and complete decumulation ledgers.
              </p>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-xs sm:text-sm">
                <Layers className="w-4 h-4 text-purple-600" />
                Scenario Comparison Exports
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                In the <strong>Compare</strong> tab, generate side-by-side comparison reports evaluating net tax differences, 4D radar scorecards, and pot longevity between two plan scenarios.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-slate-800/90 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Uploading Plan PDFs to AI Assistant (Gemini / ChatGPT / Claude)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Leverage modern LLMs to analyze your exported plan PDFs or compare multiple plan variations side-by-side:
            </p>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white text-[11px] block">Scenario Comparison Prompt:</span>
                <p className="italic text-slate-600 dark:text-slate-400 text-[11px]">
                  "I have uploaded two PDF reports from RetireFree UK: 'Plan A (Retire Age 58)' and 'Plan B (Retire Age 62)'. Compare the total lifetime tax paid, pot depletion ages, and sequence of returns risk between both plans, and highlight the main trade-offs."
                </p>
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white text-[11px] block">Tax & Estate Optimization Prompt:</span>
                <p className="italic text-slate-600 dark:text-slate-400 text-[11px]">
                  "Analyze my plan PDF under UK April 2027 Inheritance Tax (IHT) rules. Review my DC pension drawdown vs. ISA balances and suggest how I can minimize both income tax and potential estate tax liabilities."
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'scenarios-and-compare',
      title: '5. Scenarios & Plan Comparison',
      icon: Layers,
      badge: 'Multi-Plan Compare',
      summary: 'Create alternative scenarios, duplicate strategies, and compare them side-by-side with 4D trade-off scorecards.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            In <strong>Advanced Mode</strong>, you can test multiple "What-If" scenarios side-by-side without losing your baseline plan — for instance, comparing early retirement at age 58 vs. standard age 65.
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <strong>Creating Scenarios:</strong> Click the <strong>Plans / Scenarios</strong> dropdown in the top header or go to <strong>Plan Management</strong> tab to add a new scenario or duplicate your current active scenario.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <strong>Side-by-Side Comparison:</strong> Open the <strong>Compare</strong> tab in the main header (or select <strong>Plan Comparison</strong> in the sidebar) to compare two scenario variants using 4D radar chart overlays and net tax deltas.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
              <div>
                <strong>Export & Import:</strong> Use the <strong>Plan Management</strong> card to download your entire profile as a JSON backup file or CSV report.
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong>AI Plan Comparison:</strong> Export PDF reports for Scenario A and Scenario B, then upload both into Google Gemini or ChatGPT for automated multi-scenario trade-off analysis.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'risk-and-estate',
      title: '6. Risk Analysis & Estate (IHT) Planning',
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
                Model market crashes right at retirement age (Sequence of Returns Risk), sustained high inflation spikes (e.g. 5-7%), or living beyond age 95 using Monte Carlo simulations.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-600" />
                Inheritance Tax (IHT) Shield
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Calculate potential 40% IHT on property, cash, and GIAs using UK Nil-Rate Bands (£325k NRB + £175k Residential NRB). Incorporates April 2027 UK pension IHT rule changes.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'faq-and-tips',
      title: '7. Frequently Asked Questions & Troubleshooting',
      icon: HelpCircle,
      badge: 'FAQ',
      summary: 'Answers to common questions regarding tax calculations, State Pension bridging, and data storage.',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <details className="group p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
            <summary className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
              <span>What is the difference between Basic Mode and Advanced Mode?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
              Basic Mode streamlines your workspace by displaying only essential retirement inputs (DC/DB pensions, ISAs, Cash, State Pension) and main cashflow projections. Advanced Mode unlocks all 30+ planning modules, including workplace accumulation, mortgages, fee drag, Monte Carlo risk testing, IHT estate modeling, scenario comparison, and the 25-guide library.
            </p>
          </details>

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
    },
    {
      id: 'app-modes',
      title: '8. Application Modes: Basic Mode vs. Advanced Mode',
      icon: Sliders,
      badge: 'Mode Switcher',
      summary: 'Detailed breakdown of Basic Mode vs Advanced Mode features with interactive mode toggle.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            RetireFree UK v4 includes a dual-interface mode switcher allowing you to adjust application complexity to match your current planning phase.
          </p>

          {/* Interactive Mode Toggle Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 my-2">
            <div className="space-y-1 text-center sm:text-left">
              <div className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-center sm:justify-start gap-2">
                <Sliders className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Interactive App Mode Selector</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700">
                  Active: Advanced Mode ✨
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click to switch the application interface mode live right now:
              </p>
            </div>

            <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => handleModeToggle('basic')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Basic Mode</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('advanced')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-indigo-600 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced Mode</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/80 opacity-80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 dark:text-blue-300 text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Basic Mode
                </span>
                <span className="text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  Streamlined
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Streamlines the sidebar by hiding secondary modules and technical guides, allowing you to focus purely on core assets and decumulation projections.
              </p>
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Included Cards in Basic Mode:</span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Profile Inputs (Ages, Retirement Target, Income Needs)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Defined Contribution (DC) Pensions & SIPPs</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Defined Benefit (DB) Pensions & State Pension</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>ISAs, Cash Savings & Tax-efficient Drawdown Strategy</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Annual Projections cashflow chart & remaining wealth</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900 dark:text-indigo-300 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Advanced Mode (Current)
                </span>
                <span className="text-[10px] font-bold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                  Full Power
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Unlocks the full architectural power of RetireFree UK v4 with 30+ planning modules, granular tax tables, Monte Carlo risk testing, and IHT estate calculations.
              </p>
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">Additional Unlocked Modules:</span>
                <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Risk Stress Testing (Monte Carlo & Sequence of Returns)</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>April 2027 Inheritance Tax (IHT) Estate Shield</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Accumulation Phase review & Workplace SAYE/BAYE modeling</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Mortgage & Debt amortization schedules</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Multi-plan side-by-side comparison & 25 specialized guides</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const studioSections: GuideSection[] = [
    {
      id: 'getting-started',
      title: '1. Getting Started & Studio Mode Dual-Pane Workflow',
      icon: Compass,
      badge: 'Studio Suite 🚀',
      summary: 'Pro-grade dual-pane workflow: continuous parameters stack on the left, live real-time analytics on the right, and dedicated pop-out analytical windows.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Welcome to <strong>RetireFree UK Studio Mode</strong> — an adviser-grade dual-pane financial modeling workspace with real-time reactive recalculations and pop-out window capabilities.
          </p>

          {/* Current Mode Indicator Banner */}
          <div className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-primary-50/90 dark:bg-primary-950/40 border-primary-200 dark:border-primary-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl text-white bg-primary-600">
                <Columns className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white block">
                  Quick Start Guide — Studio Mode Active 🚀
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Dual-pane continuous workflow: adjust inputs on the left, inspect live charts on the right, and launch focused pop-out modals.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleModeToggle('basic')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Basic ⚡</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('advanced')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Advanced ✨</span>
              </button>
            </div>
          </div>

          {/* Studio Mode 4 Key Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 font-extrabold flex items-center justify-center text-xs">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Left Parameters Pane</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                18 interactive parameter modules in a continuous vertical scroll with instant sidebar jump anchors.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center text-xs">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Right Analysis Pane</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live KPI Scorecard, Drawdown Strategy Planner, Asset Layer Chart, and Monte Carlo risk probability cones.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Pop-Out Windows</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Launch Executive Summary, Scenario Comparer, Mortgage Amortization, and Documentation in spacious pop-outs.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-extrabold flex items-center justify-center text-xs">
                4
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white">Formulas & AI Export</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export live Excel workbooks with genuine dynamic formulas or generate presentation-ready PDF strategy packs.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'studio-popouts',
      title: '2. Dedicated Pop-Out Analytical Windows',
      icon: Maximize2,
      badge: 'Pop-Out Windows 🗗',
      summary: 'Executive Summary and Scenario Comparison open in focused modal windows, maintaining your active place in the workspace.',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            Studio Mode features dedicated pop-out windows so you can dive deep into executive dashboards, plan comparisons, and specialized tools without leaving your parameter workflow.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <LayoutDashboard className="w-4 h-4 text-primary-600" />
                  Executive Summary Pop-Out
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-md">
                  Tabbed Views
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Clicking Summary in the sidebar opens the full Executive Summary window with sub-tabs for Plan Insights, Strategy Dashboard, Projections, Stress-Testing, and April 2027 Inheritance Tax liability estimates.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                  Scenario Comparer Pop-Out
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                  Side-by-Side
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Clicking Compare in the sidebar opens a dedicated comparison pop-out. Evaluate retirement age changes, drawdown ordering trade-offs, and longevity safety margins with visual delta scorecards.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Documentation Modal
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                  25+ Guides
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Access UK tax thresholds, tapered allowance formulas, sequence of returns studies, DB scheme transfers, and emergency cash buffer strategies in an instant searchable dialog.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Genetic Solver &amp; AI Advisor
                </span>
                <span className="text-[10px] uppercase font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                  Optimization
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Run the Maximized Spend Genetic Algorithm solver to calculate precise sustainable spending limits, or launch the AI Tax Advisor for automated allowance leak audits.
              </p>
            </div>
          </div>
        </div>
      )
    },
    ...advancedSections.slice(1)
  ];

  const sections = currentMode === 'studio' ? studioSections : (currentMode === 'advanced' ? advancedSections : basicSections);

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

