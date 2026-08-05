import React, { useState } from 'react';
import { DashboardTab } from '../App';
import { PlannerScenario } from '../types';
import {
  Wallet,
  TrendingUp,
  Percent,
  LineChart,
  Shield,
  Landmark,
  LayoutDashboard,
  ArrowRightLeft,
  Home,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  ChevronsDownUp,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Sparkles,
  BookOpen,
  Menu,
  X,
  Target,
  Sun,
  Moon,
  FolderKanban,
  Plus,
  Save,
  Download,
  Upload,
} from 'lucide-react';

export interface CardSubItem {
  id: string;
  label: string;
  badge?: string;
}

export interface TabGroup {
  id: DashboardTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  cards: CardSubItem[];
}

export const NAV_STRUCTURE: TabGroup[] = [
  {
    id: 'plan_management',
    label: 'Plan Management',
    icon: FolderKanban,
    description: 'Manage saved plans, create new, export & import JSON',
    cards: [
      { id: 'card-plan-mgmt-overview', label: 'Plan Management' },
      { id: 'card-plan-mgmt-json', label: 'JSON Backup & Import' },
    ],
  },
  {
    id: 'inputs',
    label: 'Inputs & Assets',
    icon: Wallet,
    description: 'Personal profile, income, pots, pension and lump sums',
    cards: [
      { id: 'card-inputs-couple', label: 'Planning Mode' },
      { id: 'card-inputs-profile', label: 'Profile, Salary & Target Ages' },
      { id: 'card-inputs-pots', label: 'Capital Assets & Investment Pots' },
      { id: 'card-inputs-oneoff', label: 'Contributions' },
      { id: 'card-inputs-transfers', label: 'Investment Transfers' },
      { id: 'card-inputs-statepension', label: 'State Pension Forecast' },
      { id: 'card-inputs-dbpension', label: 'Defined Benefit Pensions' },
      { id: 'card-inputs-fixedincome', label: 'Fixed Income & Annuities' },
      { id: 'card-inputs-lifeevents', label: 'Life Events' },
    ],
  },
  {
    id: 'accumulation_review',
    label: 'Accumulation Review',
    icon: TrendingUp,
    description: 'Savings rate, tax traps, and wealth accumulation',
    cards: [
      { id: 'card-accum-savings', label: 'Monthly Savings & Capacity' },
      { id: 'card-accum-efficiency', label: 'ISA vs Pension Tax Efficiency' },
      { id: 'card-accum-tax', label: '60% Tax Trap Optimizer' },
      { id: 'card-accum-ledger', label: 'Accumulation Ledger' },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy',
    icon: Percent,
    description: 'Drawdown sequencing, tax brackets, and spending phases',
    cards: [
      { id: 'card-strat-planner', label: 'Drawdown Strategy Planner' },
      { id: 'card-strat-phases', label: 'Retirement Income Requirement' },
      { id: 'card-strat-lifeevents', label: 'Life Events' },
    ],
  },
  {
    id: 'projections',
    label: 'Deterministic Projection',
    icon: LineChart,
    description: 'Long-term income, capital forecasts, and year-by-year tables',
    cards: [
      { id: 'card-proj-chart', label: 'Capital & Income Growth Chart' },
      { id: 'card-proj-macro', label: 'Economic & Growth Assumptions' },
      { id: 'card-proj-table', label: 'Year-by-Year Cashflow Ledger' },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    icon: Shield,
    description: 'Monte Carlo stress tests and historic sequence of returns',
    cards: [
      { id: 'card-risk-monte', label: 'Monte Carlo Stress Simulation' },
      { id: 'card-risk-macro', label: 'Economic & Stress Parameters' },
      { id: 'card-risk-historic', label: 'Historic Market Sequences' },
    ],
  },
  {
    id: 'estate',
    label: 'Estate',
    icon: Landmark,
    description: 'Inheritance Tax (IHT) modeling & estate planning',
    cards: [
      { id: 'card-estate-iht', label: 'Inheritance Tax & Estate Planning' },
    ],
  },
  {
    id: 'overview',
    label: 'Summary',
    icon: LayoutDashboard,
    description: 'Executive PDF export, summary overview, and data backup',
    cards: [
      { id: 'card-summary-pdf', label: 'Executive PDF Report Export' },
      { id: 'card-summary-strat', label: 'Strategy Summary Dashboard' },
      { id: 'card-summary-chart', label: 'Complete Projections Chart' },
      { id: 'card-summary-monte', label: 'Stress Testing Summary' },
      { id: 'card-summary-estate', label: 'Inheritance Tax Summary' },
      { id: 'card-summary-comments', label: 'Strategy Comments & Insights' },
      { id: 'card-summary-csv', label: 'Data Export & Backup' },
    ],
  },
  {
    id: 'compare',
    label: 'Compare',
    icon: ArrowRightLeft,
    description: 'Side-by-side comparison of retirement plan variants',
    cards: [
      { id: 'card-compare-scenarios', label: 'Side-by-Side Plan Comparison' },
    ],
  },
  {
    id: 'mortgage',
    label: 'Mortgage Debt',
    icon: Home,
    description: 'Liabilities, interest rates, and payoff strategies',
    cards: [
      { id: 'card-mortgage-debt', label: 'Mortgage & Liabilities' },
    ],
  },
  {
    id: 'other',
    label: 'Other',
    icon: BookOpen,
    description: 'UK Tax rules guide and AI Tax Advisor assistance',
    cards: [
      { id: 'card-other-taxrules', label: 'Tax Rules Guide' },
      { id: 'card-other-aitaxadvisor', label: 'AI Tax Advisor' },
    ],
  },
];

interface SidebarNavProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  activeCardId?: string;
  onSelectCard?: (tabId: DashboardTab, cardId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  // Theme control props
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  // Plan & file management props
  scenarios: PlannerScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
  onNewScenario: () => void;
  onSaveScenario: () => void;
  onOpenManagePlans?: () => void;
  onImportScenarios?: (scenarios: PlannerScenario[]) => void;
  // Guide and AI Advisor triggers
  onOpenGuide?: () => void;
  onOpenAiAdvisor?: () => void;
}

export function SidebarNav({
  activeTab,
  onSelectTab,
  activeCardId,
  onSelectCard,
  isCollapsed,
  onToggleCollapse,
  theme,
  onToggleTheme,
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onNewScenario,
  onSaveScenario,
  onOpenManagePlans,
  onImportScenarios,
  onOpenGuide,
  onOpenAiAdvisor,
}: SidebarNavProps) {
  // Track open state of collapsible tab groups (defaults to active tab open)
  const [openTabGroups, setOpenTabGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_STRUCTURE.forEach((group) => {
      initial[group.id] = group.id === activeTab;
    });
    return initial;
  });

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleExpandAll = () => {
    const allOpen: Record<string, boolean> = {};
    NAV_STRUCTURE.forEach((group) => {
      allOpen[group.id] = true;
    });
    setOpenTabGroups(allOpen);
  };

  const handleCollapseAll = () => {
    const allClosed: Record<string, boolean> = {};
    NAV_STRUCTURE.forEach((group) => {
      allClosed[group.id] = false;
    });
    setOpenTabGroups(allClosed);
  };

  const areAllExpanded = NAV_STRUCTURE.every((group) => openTabGroups[group.id]);

  const toggleGroup = (tabId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOpenTabGroups((prev) => {
      const willExpand = !prev[tabId];
      if (willExpand) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return {
        ...prev,
        [tabId]: willExpand,
      };
    });
  };

  const handleTabClick = (tabId: DashboardTab) => {
    onSelectTab(tabId);
    setOpenTabGroups((prev) => {
      const willExpand = !prev[tabId];
      if (willExpand) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return {
        ...prev,
        [tabId]: willExpand,
      };
    });
  };

  const handleSubCardClick = (tabId: DashboardTab, cardId: string) => {
    if (cardId === 'card-other-taxrules' && onOpenGuide) {
      onOpenGuide();
    }
    if (cardId === 'card-other-aitaxadvisor' && onOpenAiAdvisor) {
      onOpenAiAdvisor();
    }

    if (onSelectCard) {
      onSelectCard(tabId, cardId);
    } else {
      onSelectTab(tabId);
      setTimeout(() => {
        const elem = document.getElementById(cardId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Bar Toggle Button (visible on mobile screens) */}
      <div className="lg:hidden flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-4 h-4 text-rose-500" /> : <Menu className="w-4 h-4 text-emerald-500" />}
          <span>Navigation & Plans</span>
        </button>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          {NAV_STRUCTURE.find((t) => t.id === activeTab)?.label}
        </span>
      </div>

      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen z-50 lg:z-30 bg-white dark:bg-slate-900/95 backdrop-blur-md border-r border-slate-200/80 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out shadow-lg lg:shadow-none shrink-0 ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          isMobileMenuOpen
            ? 'translate-x-0 w-80'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header & Controls */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full min-w-0 gap-1.5">
              <div className="flex items-center gap-2 overflow-hidden shrink-0">
                <div className="w-7 h-7 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block uppercase tracking-wider truncate">
                  Navigation
                </span>
              </div>

              {/* Icon-Only Menu Group Expand/Collapse Controls & Sidebar Collapse Toggle */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Expand all menu groups"
                  aria-label="Expand all menu groups"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Collapse all menu groups"
                  aria-label="Collapse all menu groups"
                >
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                </button>

                {/* Desktop Collapse Toggle Button */}
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex items-center justify-center p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer shrink-0"
                  title="Collapse Sidebar Menu"
                  aria-label="Collapse Sidebar Menu"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Desktop Expand Toggle Button when collapsed */
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-colors cursor-pointer shrink-0 mx-auto"
              title="Expand Sidebar Menu"
              aria-label="Expand Sidebar Menu"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg ml-auto"
            aria-label="Close Mobile Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2 custom-scrollbar">

          {/* Main Dashboard Navigation Groups */}
          {NAV_STRUCTURE.map((group) => {
            const Icon = group.icon;
            const isTabActive = activeTab === group.id;
            const isGroupOpen = openTabGroups[group.id] || false;

            return (
              <div key={group.id} className="rounded-2xl transition-all">
                {/* Main Tab Button */}
                <div
                  className={`group relative flex items-center justify-between w-full p-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isTabActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  onClick={() => handleTabClick(group.id)}
                  title={isCollapsed ? group.label : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-transform ${isTabActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                    {!isCollapsed && (
                      <span className="truncate text-xs font-bold tracking-tight">
                        {group.label}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors ${
                        isTabActive
                          ? 'bg-emerald-700/60 text-emerald-100'
                          : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {group.cards.length}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleGroup(group.id, e)}
                        className={`p-1 rounded-lg transition-transform ${
                          isTabActive ? 'hover:bg-emerald-700/70 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isGroupOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Tooltip for Collapsed Sidebar */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-xl whitespace-nowrap">
                      {group.label} ({group.cards.length} cards)
                    </div>
                  )}
                </div>

                {/* Sub-Items (Cards) Collapsible List */}
                {!isCollapsed && isGroupOpen && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-1 py-1 animate-fade-in">
                    {group.cards.map((card) => {
                      const isCardActive = activeCardId === card.id;

                      return (
                        <button
                          key={card.id}
                          onClick={() => handleSubCardClick(group.id, card.id)}
                          className={`flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer group ${
                            isCardActive && isTabActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <Target className={`w-3 h-3 shrink-0 transition-colors ${
                            isCardActive && isTabActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500 group-hover:text-emerald-500'
                          }`} />
                          <span className="truncate">{card.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Navigation Panel: Light/Dark Mode Control & Save Option */}
        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 shrink-0 bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl space-y-2">
          <div className="flex items-center gap-2">
            {/* Theme Toggle - Icon Only */}
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer shrink-0 shadow-2xs ${
                theme === 'dark'
                  ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700/80'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 shrink-0" />
              )}
            </button>

            {/* Save Option Button */}
            <button
              onClick={onSaveScenario}
              className="flex-1 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Save active plan"
              aria-label="Save active plan"
            >
              <Save className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">Save Plan</span>}
            </button>
          </div>

          {!isCollapsed && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-tight">
              Click sub-item to scroll directly to card
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

