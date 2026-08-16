import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { PlannerScenario, UserProfile, InvestmentPots, DrawdownStrategy, AppMode, DashboardTab } from './types';
import { STRATEGY_DEFINITIONS } from './components/QuickDrawdownStrategyBar';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS, PRESET_SCENARIOS, sanitizePots, sanitizeProfile, createBlankScenario } from './utils/defaultData';
import { NewPlanModal } from './components/NewPlanModal';
import { JsonImportModal } from './components/JsonImportModal';
import { DeletePlanModal } from './components/DeletePlanModal';
import { ManagePlansModal } from './components/ManagePlansModal';
import { ResetPresetsModal } from './components/ResetPresetsModal';
import { calculateUKTax } from './utils/ukTaxEngine';
import { generateProjections } from './utils/projectionEngine';
import { solveMaximizedSpend, disableMaximizedSpend } from './utils/maximizedSpendSolver';
import { Header } from './components/Header';
import { ProfileInputs } from './components/ProfileInputs';
import { CouplePlanningCard } from './components/CouplePlanningCard';
import { PotManager } from './components/PotManager';
import { StatePensionCard } from './components/StatePensionCard';
import { DbPensionManager } from './components/DbPensionManager';
import { FixedIncomeManager } from './components/FixedIncomeManager';
import { PotTransferManager } from './components/PotTransferManager';
import { OneOffContributionManager } from './components/OneOffContributionManager';
import { TaxOptimizerCard } from './components/TaxOptimizerCard';
import { MonthlySavingsRateCard } from './components/MonthlySavingsRateCard';
import { SpendingPhasesCard } from './components/SpendingPhasesCard';
import { ProjectionChart } from './components/ProjectionChart';
import { AnnualBreakdownTable } from './components/AnnualBreakdownTable';
import { MonteCarloCard } from './components/MonteCarloCard';
import { DrawdownPlanner } from './components/DrawdownPlanner';
import { ExportSection } from './components/ExportSection';
import { ScenarioComparer } from './components/ScenarioComparer';
import { MacroSettingsCard } from './components/MacroSettingsCard';
import { AdvancedSettingsCard } from './components/AdvancedSettingsCard';
import { HistoricModelingCard } from './components/HistoricModelingCard';
import { IhtEstatePlanningCard } from './components/IhtEstatePlanningCard';
import { SummaryCommentsCard } from './components/SummaryCommentsCard';
import { StrategySummaryCard } from './components/StrategySummaryCard';
import { PlanInsightsCard } from './components/PlanInsightsCard';
import { IsaVsPensionEfficiencyCard } from './components/IsaVsPensionEfficiencyCard';
import { MaximizedSpendSolverModal } from './components/MaximizedSpendSolverModal';
import { SavePlanModal } from './components/SavePlanModal';
import { DuplicateVariantConflictModal, ConflictPlanInfo } from './components/DuplicateVariantConflictModal';
import { AiTaxAdvisorModal } from './components/AiTaxAdvisorModal';
import { TaxGuideCard } from './components/TaxGuideCard';
import { UserGuideCard } from './components/UserGuideCard';
import { RetirementLivingStandardsCard } from './components/RetirementLivingStandardsCard';
import { HealthyLifeExpectancyCard } from './components/HealthyLifeExpectancyCard';
import { MortgageGuideCard } from './components/MortgageGuideCard';
import { RiskGuideCard } from './components/RiskGuideCard';
import { IhtGuideCard } from './components/IhtGuideCard';
import { FloorGuideCard } from './components/FloorGuideCard';
import { CoupleGuideCard } from './components/CoupleGuideCard';
import { BenchmarkGuideCard } from './components/BenchmarkGuideCard';
import { SippConsolidationGuideCard } from './components/SippConsolidationGuideCard';
import { WrapperGuideCard } from './components/WrapperGuideCard';
import { SelfEmployedGuideCard } from './components/SelfEmployedGuideCard';
import { DbPensionGuideCard } from './components/DbPensionGuideCard';
import { DynamicWithdrawalGuideCard } from './components/DynamicWithdrawalGuideCard';
import { CareCostsGuideCard } from './components/CareCostsGuideCard';
import { FireBridgeGuideCard } from './components/FireBridgeGuideCard';
import { CgtHarvestingGuideCard } from './components/CgtHarvestingGuideCard';
import { PensionRecyclingGuideCard } from './components/PensionRecyclingGuideCard';
import { FourPercentRuleGuideCard } from './components/FourPercentRuleGuideCard';
import { SpendingSmileGuideCard } from './components/SpendingSmileGuideCard';
import { SayeBayeGuideCard } from './components/SayeBayeGuideCard';
import { EmergencyFundGuideCard } from './components/EmergencyFundGuideCard';
import { PensionLifestylingGuideCard } from './components/PensionLifestylingGuideCard';
import { StatePensionNiGuideCard } from './components/StatePensionNiGuideCard';
import { UfplsSmallPotsGuideCard } from './components/UfplsSmallPotsGuideCard';
import { PhasedRetirementGuideCard } from './components/PhasedRetirementGuideCard';
import { TaperedAllowanceGuideCard } from './components/TaperedAllowanceGuideCard';
import { ExpatQropsGuideCard } from './components/ExpatQropsGuideCard';
import { SwrMatrixCard } from './components/SwrMatrixCard';
import { WithdrawalGuardrailGaugeCard } from './components/WithdrawalGuardrailGaugeCard';
import { EssentialFloorSplitCard } from './components/EssentialFloorSplitCard';
import { PwrMetricBannerCard } from './components/PwrMetricBannerCard';
import { SwrTrajectoryChart } from './components/SwrTrajectoryChart';
import { SwrUkUsBenchmarkCard } from './components/SwrUkUsBenchmarkCard';
import { AccumulationLedgerCard } from './components/AccumulationLedgerCard';
import { MortgageDebtCard } from './components/MortgageDebtCard';
import { RightSizingCard } from './components/RightSizingCard';
import { LifeEventsDecumulationCard } from './components/LifeEventsDecumulationCard';
import { InvestmentFeesCard } from './components/InvestmentFeesCard';
import { CashFlowSankeyCard } from './components/CashFlowSankeyCard';
import { PlanManagementCard } from './components/PlanManagementCard';
import { Sparkles, ArrowUpRight, RotateCcw, Pencil, X, Check, LayoutDashboard, Wallet, Percent, LineChart, Shield, Landmark, Download, ArrowRightLeft, TrendingUp, Home, Trash2, AlertTriangle, BookOpen, Award, Scale, Heart, Users, Briefcase, Flame, ShieldAlert, Smile } from 'lucide-react';
import { SidebarNav } from './components/SidebarNav';
import { PlanErrorBoundary } from './components/PlanErrorBoundary';

const STORAGE_KEY = 'uk_retirement_planner_scenarios_v2';
const THEME_STORAGE_KEY = 'retireready_theme_v1';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public props: AppErrorBoundaryProps;
  public state: AppErrorBoundaryState;

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Uncaught Rendering Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center text-xl font-black">
              ⚠️
            </div>
            <h2 className="text-lg font-bold">RetireFree UK Encountered an Error</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred while loading your retirement scenario.'}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset Scenarios & Reload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


export default function AppWrapper() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}

function App() {
  // Theme state persisted in localStorage (defaults to dark mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'dark';
  });

  // Apply dark class to <html> element
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load saved scenarios from localStorage or default to PRESET_SCENARIOS
  const [scenarios, setScenarios] = useState<PlannerScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validated = parsed.map((s: PlannerScenario, idx: number) => ({
            ...s,
            id: s?.id || `scenario_${idx}_${Date.now()}`,
            name: s?.name || `Plan ${idx + 1}`,
            profile: sanitizeProfile(s?.profile),
            pots: sanitizePots(s?.pots, DEFAULT_POTS),
          }));
          if (validated.length > 0) return validated;
        }
      }
    } catch (e) {
      console.warn('Failed to parse localStorage scenarios:', e);
    }
    return PRESET_SCENARIOS.map((s) => ({
      ...s,
      profile: sanitizeProfile(s.profile),
      pots: sanitizePots(s.pots, DEFAULT_POTS),
    }));
  });

  const [activeScenarioId, setActiveScenarioId] = useState<string>(() => {
    return scenarios[0]?.id || 'preset_standard';
  });

  // Ensure activeScenarioId is always valid
  useEffect(() => {
    if (scenarios.length > 0) {
      const exists = scenarios.some((s) => s.id === activeScenarioId);
      if (!exists) {
        setActiveScenarioId(scenarios[0].id);
      }
    }
  }, [scenarios, activeScenarioId]);

  const [activeTab, setActiveTab] = useState<DashboardTab>('inputs');
  const [docSubTab, setDocSubTab] = useState<'user_guide' | 'cash_buffer_guide' | 'lifestyling_guide' | 'state_pension_ni_guide' | 'ufpls_small_pots_guide' | 'phased_retirement_guide' | 'tapered_allowance_guide' | 'expat_qrops_guide' | 'living_standards' | 'healthy_life' | 'tax_rules' | 'mortgage_guide' | 'risk_guide' | 'iht_guide' | 'floor_guide' | 'couple_guide' | 'benchmark_guide' | 'sipp_guide' | 'wrapper_guide' | 'self_employed_guide' | 'db_guide' | 'dynamic_guide' | 'care_guide' | 'fire_bridge_guide' | 'cgt_harvesting_guide' | 'recycling_guide' | 'four_percent_guide' | 'spending_smile_guide' | 'saye_baye_guide'>('user_guide');
  const [appMode, setAppMode] = useState<AppMode>(() => {
    try {
      const saved = localStorage.getItem('retireready_mode_v1');
      if (saved === 'basic' || saved === 'advanced') return saved;
    } catch (e) {}
    return 'basic';
  });

  useEffect(() => {
    try {
      localStorage.setItem('retireready_mode_v1', appMode);
    } catch (e) {}
  }, [appMode]);

  // Redirect to inputs tab if switching to basic mode while on an advanced-only tab
  useEffect(() => {
    if (appMode === 'basic') {
      const advancedTabs: DashboardTab[] = ['accumulation_review', 'strategy_analysis', 'estate', 'compare', 'mortgage', 'advanced_settings'];
      if (advancedTabs.includes(activeTab)) {
        setActiveTab('inputs');
      }
      if (docSubTab !== 'user_guide') {
        setDocSubTab('user_guide');
      }
    }
  }, [appMode, activeTab, docSubTab]);
  const [swrHorizonYears, setSwrHorizonYears] = useState<number>(30);
  const [swrEquityPct, setSwrEquityPct] = useState<number>(60);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string>('');
  const [compareScenarioAId, setCompareScenarioAId] = useState<string>('');
  const [compareScenarioBId, setCompareScenarioBId] = useState<string>('');

  const effectiveCompareAId = compareScenarioAId && scenarios.some((s) => s.id === compareScenarioAId)
    ? compareScenarioAId
    : (scenarios.find((s) => s.id === activeScenarioId)?.id || scenarios[0]?.id || '');

  const effectiveCompareBId = compareScenarioBId && scenarios.some((s) => s.id === compareScenarioBId)
    ? compareScenarioBId
    : (scenarios.find((s) => s.id !== effectiveCompareAId)?.id || effectiveCompareAId);

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

  const handleOpenGuide = () => {
    setActiveTab('documentation');
    setTimeout(() => {
      const elem = document.getElementById('card-other-taxrules');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };
  const [isMaximizedSpendModalOpen, setIsMaximizedSpendModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isManagePlansModalOpen, setIsManagePlansModalOpen] = useState(false);
  const [isResetPresetsModalOpen, setIsResetPresetsModalOpen] = useState(false);

  // Strategy Variant duplicate conflict modal state
  const [variantConflictState, setVariantConflictState] = useState<{
    baseScenarioId: string;
    basePlanName: string;
    strategiesToCreate: DrawdownStrategy[];
    conflictingPlans: ConflictPlanInfo[];
    allProposedVariantNames: string[];
  } | null>(null);

  // Rename plan modal & inline state
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [isEditingInlineName, setIsEditingInlineName] = useState(false);
  const [inlineNameText, setInlineNameText] = useState('');

  // Save scenarios to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {
      console.warn('Failed to save scenarios:', e);
    }
  }, [scenarios]);

  // Current active scenario, profile & pots
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0] || PRESET_SCENARIOS[0];
  const profile = useMemo(() => sanitizeProfile(activeScenario?.profile), [activeScenario?.profile]);
  const pots = useMemo(() => sanitizePots(activeScenario?.pots, DEFAULT_POTS), [activeScenario?.pots]);

  // Update profile for active scenario
  const handleProfileChange = (updatedProfile: UserProfile) => {
    const sanitized = sanitizeProfile(updatedProfile);
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenarioId
          ? { ...s, profile: sanitized, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  // Update pots for active scenario
  const handlePotsChange = (updatedPots: InvestmentPots) => {
    const sanitized = sanitizePots(updatedPots, DEFAULT_POTS);
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenarioId
          ? { ...s, pots: sanitized, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handlePartnerPotsChange = (updatedPartnerPots: InvestmentPots) => {
    const cleanPartnerPots = sanitizePots(updatedPartnerPots, DEFAULT_PARTNER_POTS);
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === activeScenarioId
          ? { ...s, profile: { ...s.profile, partnerPots: cleanPartnerPots }, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  // Scenario management actions
  const handleSelectScenario = (id: string) => {
    setActiveScenarioId(id);
    setIsEditingInlineName(false);
  };

  const handleOpenNewPlanModal = () => {
    setIsNewPlanModalOpen(true);
  };

  const handleCreatePlan = (
    mode: 'blank' | 'clone' | 'max_spender' | 'variants',
    cloneSourceId?: string,
    customName?: string
  ) => {
    const source = scenarios.find((s) => s.id === cloneSourceId) || activeScenario;
    const baseName = source.name.replace(/\s*\([^)]*\)/g, '').trim();

    if (mode === 'variants') {
      handleCreateStrategyVariants(source.id, [
        'tax_optimizer',
        'tax_free_bracket',
        'basic_rate_bracket',
        'isa_first',
        'pension_first',
      ]);
      return;
    }

    const newId = `scenario_${Date.now()}`;

    if (mode === 'blank') {
      const newName = customName?.trim() || `Plan ${scenarios.length + 1}`;
      const newScenario = createBlankScenario(newId, newName);
      setScenarios((prev) => [...prev, newScenario]);
      setActiveScenarioId(newId);
    } else if (mode === 'max_spender') {
      const maxResult = solveMaximizedSpend({ profile: source.profile, pots: source.pots });
      const newName = customName?.trim() || `${baseName} (Max Spender - £${maxResult.maxAnnualIncome.toLocaleString()}/yr)`;
      const newScenario: PlannerScenario = {
        id: newId,
        name: newName,
        updatedAt: new Date().toISOString(),
        profile: maxResult.bestCandidateProfile,
        pots: JSON.parse(JSON.stringify(source.pots)),
      };
      setScenarios((prev) => [...prev, newScenario]);
      setActiveScenarioId(newId);
    } else {
      // Single clone
      const newName = customName?.trim() || `${baseName} (Copy)`;
      const newScenario: PlannerScenario = {
        id: newId,
        name: newName,
        updatedAt: new Date().toISOString(),
        profile: JSON.parse(JSON.stringify(source.profile)),
        pots: JSON.parse(JSON.stringify(source.pots)),
      };
      setScenarios((prev) => [...prev, newScenario]);
      setActiveScenarioId(newId);
    }
  };

  const executeCreateStrategyVariants = (
    source: PlannerScenario,
    effectiveBaseName: string,
    strategiesToCreate: DrawdownStrategy[],
    replaceMatches: ConflictPlanInfo[] = []
  ) => {
    const newVariants: PlannerScenario[] = strategiesToCreate.map((strat, idx) => {
      const def = STRATEGY_DEFINITIONS.find((s) => s.id === strat);
      const stratLabel = def ? def.shortLabel : strat;
      let newProfile = JSON.parse(JSON.stringify(source.profile));
      if (newProfile.maximizedSpendConfig?.enabled) {
        newProfile = disableMaximizedSpend(newProfile);
      }
      newProfile.drawdownStrategy = strat;
      if (newProfile.isCouplePlanning) {
        newProfile.partnerDrawdownStrategy = strat;
      }

      return {
        id: `scenario_strat_${Date.now()}_${idx}`,
        name: `${effectiveBaseName} (${stratLabel})`,
        updatedAt: new Date().toISOString(),
        profile: newProfile,
        pots: JSON.parse(JSON.stringify(source.pots)),
      };
    });

    // Solve for Max Spender plan variant
    try {
      const maxResult = solveMaximizedSpend({ profile: source.profile, pots: source.pots });
      const maxSpenderScenario: PlannerScenario = {
        id: `scenario_max_spend_${Date.now()}`,
        name: `${effectiveBaseName} (Max Spender - £${maxResult.maxAnnualIncome.toLocaleString()}/yr)`,
        updatedAt: new Date().toISOString(),
        profile: maxResult.bestCandidateProfile,
        pots: JSON.parse(JSON.stringify(source.pots)),
      };
      newVariants.push(maxSpenderScenario);
    } catch (e) {
      console.error('Failed to solve max spend for strategy variants:', e);
    }

    if (replaceMatches.length > 0) {
      // Overwrite / Replace matching plans where applicable and append new ones
      const idsToRemove = new Set(replaceMatches.map((m) => m.existingScenarioId));
      setScenarios((prev) => {
        const filtered = prev.filter((s) => !idsToRemove.has(s.id));
        return [...filtered, ...newVariants];
      });
    } else {
      setScenarios((prev) => [...prev, ...newVariants]);
    }
  };

  const handleCreateStrategyVariants = (
    baseScenarioId: string,
    strategiesToCreate: DrawdownStrategy[],
    overrideBaseName?: string
  ) => {
    const source = scenarios.find((s) => s.id === baseScenarioId) || activeScenario;
    const baseName = overrideBaseName ? overrideBaseName.trim() : source.name.replace(/\s*\([^)]*\)/g, '').trim();

    // Check if any plan already exists matching this base name and strategy patterns
    // 1. Proposed variant labels
    const proposedLabels = strategiesToCreate.map((strat) => {
      const def = STRATEGY_DEFINITIONS.find((s) => s.id === strat);
      return def ? def.shortLabel : strat;
    });

    // Check for existing plans whose names start with baseName + " (" or match Max Spender
    const conflictingPlans: ConflictPlanInfo[] = [];
    scenarios.forEach((s) => {
      if (s.id === source.id) return; // Don't replace the base plan itself
      const sName = s.name.trim();

      // Check if it matches baseName (Label) or baseName (Max Spender...
      const matchesLabel = proposedLabels.some((lbl) => sName === `${baseName} (${lbl})`);
      const matchesMax = sName.startsWith(`${baseName} (Max Spender`);

      if (matchesLabel || matchesMax) {
        conflictingPlans.push({
          existingScenarioId: s.id,
          planName: s.name,
        });
      }
    });

    if (conflictingPlans.length > 0 && !overrideBaseName) {
      // Prompt user with modal to either replace or create with new base name!
      const allProposedVariantNames = proposedLabels.map((lbl) => `${baseName} (${lbl})`);
      allProposedVariantNames.push(`${baseName} (Max Spender)`);

      setVariantConflictState({
        baseScenarioId,
        basePlanName: baseName,
        strategiesToCreate,
        conflictingPlans,
        allProposedVariantNames,
      });
      return;
    }

    // No conflict or user provided override base name
    executeCreateStrategyVariants(source, baseName, strategiesToCreate);
  };

  // Save plan modal state
  const [isSavePlanModalOpen, setIsSavePlanModalOpen] = useState(false);

  const handleOpenSavePlanModal = () => {
    setIsSavePlanModalOpen(true);
  };

  const handleOverwritePlan = (id: string, updatedName: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              name: updatedName.trim(),
              profile: JSON.parse(JSON.stringify(profile)),
              pots: JSON.parse(JSON.stringify(pots)),
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
    if (id !== activeScenarioId) {
      setActiveScenarioId(id);
    }
  };

  const handleSaveAsNewPlan = (newName: string) => {
    const newId = `scenario_${Date.now()}`;
    const newScenario: PlannerScenario = {
      id: newId,
      name: newName.trim(),
      updatedAt: new Date().toISOString(),
      profile: JSON.parse(JSON.stringify(profile)),
      pots: JSON.parse(JSON.stringify(pots)),
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newId);
  };

  const handleSaveScenario = () => {
    handleOpenSavePlanModal();
  };

  const handleRenameScenario = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, name: trimmed, updatedAt: new Date().toISOString() }
          : s
      )
    );
    setRenameTarget(null);
    setIsEditingInlineName(false);
  };

  const handleDeleteScenario = (id: string) => {
    const remaining = scenarios.filter((s) => s.id !== id);
    if (remaining.length === 0) {
      const freshPlan = createBlankScenario(`scenario_${Date.now()}`, 'My Retirement Plan');
      setScenarios([freshPlan]);
      setActiveScenarioId(freshPlan.id);
    } else {
      setScenarios(remaining);
      if (activeScenarioId === id) {
        setActiveScenarioId(remaining[0].id);
      }
    }
  };

  const handleResetPlanData = (id: string) => {
    setScenarios((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              profile: sanitizeProfile(DEFAULT_PROFILE),
              pots: sanitizePots(DEFAULT_POTS, DEFAULT_POTS),
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
  };

  const [pendingImportScenarios, setPendingImportScenarios] = useState<PlannerScenario[] | null>(null);

  const handleImportScenarios = (importedScenarios: PlannerScenario[]) => {
    if (Array.isArray(importedScenarios) && importedScenarios.length > 0) {
      const sanitized = importedScenarios.map((s, idx) => ({
        ...s,
        id: s?.id || `scenario_${idx}_${Date.now()}`,
        name: s?.name || `Imported Plan ${idx + 1}`,
        profile: sanitizeProfile(s?.profile),
        pots: sanitizePots(s?.pots, DEFAULT_POTS),
      }));
      setPendingImportScenarios(sanitized);
    }
  };

  const handleFinalImport = (updatedScenarios: PlannerScenario[], activeIdToSet?: string) => {
    if (Array.isArray(updatedScenarios) && updatedScenarios.length > 0) {
      setScenarios(updatedScenarios);
      if (activeIdToSet) {
        setActiveScenarioId(activeIdToSet);
      } else if (updatedScenarios[0]?.id) {
        setActiveScenarioId(updatedScenarios[0].id);
      }
    }
    setPendingImportScenarios(null);
  };

  const handleResetToPreset = () => {
    if (confirm('Reset to standard presets? Your custom modifications will be replaced.')) {
      setScenarios(PRESET_SCENARIOS);
      setActiveScenarioId('preset_standard');
    }
  };

  // 60% Tax Trap Quick Fix Action
  const handleOptimizeTaxTrap = (additionalAmount: number, target: 'primary' | 'partner' = 'primary') => {
    if (additionalAmount <= 0) return;

    const targetProfile = target === 'partner' ? {
      gross: profile.partnerGrossAnnualSalary || 0,
      method: profile.partnerPensionContributionMethod || profile.pensionContributionMethod,
      pots: sanitizePots(profile.partnerPots, DEFAULT_PARTNER_POTS),
    } : {
      gross: profile.grossAnnualSalary || 0,
      method: profile.pensionContributionMethod,
      pots: sanitizePots(pots, DEFAULT_POTS),
    };

    if (targetProfile.method === 'salary_sacrifice') {
      // Calculate additional employee % needed to sacrifice the required annual amount
      const currentMonthly = targetProfile.pots.workplacePensionMonthlyEmployee || 0;
      const grossSalary = targetProfile.gross;
      let newMonthly = currentMonthly;

      if (targetProfile.pots.workplacePensionMonthlyEmployeeType === 'percent') {
        const addPct = grossSalary > 0 ? (additionalAmount / grossSalary) * 100 : 0;
        newMonthly = Math.round((currentMonthly + addPct) * 100) / 100;
      } else {
        const addMonthlyFixed = Math.ceil(additionalAmount / 12);
        newMonthly = currentMonthly + addMonthlyFixed;
      }

      if (target === 'partner') {
        handlePartnerPotsChange({
          ...targetProfile.pots,
          workplacePensionMonthlyEmployee: newMonthly,
        });
      } else {
        handlePotsChange({
          ...pots,
          workplacePensionMonthlyEmployee: newMonthly,
        });
      }
    } else {
      // Relief at source / Net pay -> Add to SIPP (net amount = gross * 0.8)
      const additionalNetMonthly = Math.ceil((additionalAmount * 0.8) / 12);
      if (target === 'partner') {
        handlePartnerPotsChange({
          ...targetProfile.pots,
          sippMonthlyContribution: (targetProfile.pots.sippMonthlyContribution || 0) + additionalNetMonthly,
        });
      } else {
        handlePotsChange({
          ...pots,
          sippMonthlyContribution: (pots.sippMonthlyContribution || 0) + additionalNetMonthly,
        });
      }
    }
  };

  // Perform live UK tax & projection calculations safely
  const { taxResult, projections, calculationError } = useMemo(() => {
    try {
      const tax = calculateUKTax(profile, pots);
      const proj = generateProjections(profile, pots, tax);
      return { taxResult: tax, projections: proj, calculationError: null };
    } catch (err) {
      console.error('Plan calculation error:', err);
      return {
        taxResult: null,
        projections: [],
        calculationError: err instanceof Error ? err.message : 'Plan calculation failed',
      };
    }
  }, [profile, pots]);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col lg:flex-row antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Left Collapsible Navigation Sidebar (Flush against left edge) */}
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setActiveCardId('');
        }}
        activeCardId={activeCardId}
        onSelectCard={(tabId, cardId) => {
          setActiveTab(tabId);
          setActiveCardId(cardId);
          if (cardId === 'card-doc-userguide' || cardId === 'card-other-userguide') {
            setDocSubTab('user_guide');
          } else if (cardId === 'card-doc-cashbufferguide') {
            setDocSubTab('cash_buffer_guide');
          } else if (cardId === 'card-doc-lifestylingguide') {
            setDocSubTab('lifestyling_guide');
          } else if (cardId === 'card-doc-statepensionniguide') {
            setDocSubTab('state_pension_ni_guide');
          } else if (cardId === 'card-doc-ufplssmallpotsguide') {
            setDocSubTab('ufpls_small_pots_guide');
          } else if (cardId === 'card-doc-phasedretirementguide') {
            setDocSubTab('phased_retirement_guide');
          } else if (cardId === 'card-doc-taperedallowanceguide') {
            setDocSubTab('tapered_allowance_guide');
          } else if (cardId === 'card-doc-expatqropsguide') {
            setDocSubTab('expat_qrops_guide');
          } else if (cardId === 'card-doc-livingstandards') {
            setDocSubTab('living_standards');
          } else if (cardId === 'card-doc-taxrules' || cardId === 'card-other-taxrules') {
            setDocSubTab('tax_rules');
          } else if (cardId === 'card-doc-healthylife') {
            setDocSubTab('healthy_life');
          } else if (cardId === 'card-doc-mortgageguide') {
            setDocSubTab('mortgage_guide');
          } else if (cardId === 'card-doc-riskguide') {
            setDocSubTab('risk_guide');
          } else if (cardId === 'card-doc-ihtguide') {
            setDocSubTab('iht_guide');
          } else if (cardId === 'card-doc-floorguide') {
            setDocSubTab('floor_guide');
          } else if (cardId === 'card-doc-coupleguide') {
            setDocSubTab('couple_guide');
          } else if (cardId === 'card-doc-benchmarkguide') {
            setDocSubTab('benchmark_guide');
          } else if (cardId === 'card-doc-sippguide') {
            setDocSubTab('sipp_guide');
          } else if (cardId === 'card-doc-wrapperguide') {
            setDocSubTab('wrapper_guide');
          } else if (cardId === 'card-doc-selfemployedguide') {
            setDocSubTab('self_employed_guide');
          } else if (cardId === 'card-doc-dbguide') {
            setDocSubTab('db_guide');
          } else if (cardId === 'card-doc-dynamicguide') {
            setDocSubTab('dynamic_guide');
          } else if (cardId === 'card-doc-careguide') {
            setDocSubTab('care_guide');
          } else if (cardId === 'card-doc-firebridgeguide') {
            setDocSubTab('fire_bridge_guide');
          } else if (cardId === 'card-doc-cgtharvestingguide') {
            setDocSubTab('cgt_harvesting_guide');
          } else if (cardId === 'card-doc-recyclingguide') {
            setDocSubTab('recycling_guide');
          } else if (cardId === 'card-doc-fourpercentguide') {
            setDocSubTab('four_percent_guide');
          } else if (cardId === 'card-doc-spendingsmileguide') {
            setDocSubTab('spending_smile_guide');
          } else if (cardId === 'card-doc-sayebayeguide') {
            setDocSubTab('saye_baye_guide');
          }
          setTimeout(() => {
            const elem = document.getElementById(cardId);
            if (elem) {
              elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 50);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        appMode={appMode}
        onSetAppMode={setAppMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onNewScenario={handleOpenNewPlanModal}
        onSaveScenario={handleSaveScenario}
        onOpenManagePlans={() => setIsManagePlansModalOpen(true)}
        onImportScenarios={handleImportScenarios}
        onOpenGuide={handleOpenGuide}
        onOpenAiAdvisor={() => setShowAiModal(true)}
      />

      {/* Main Right App Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">

      {/* Top Navigation */}
      <Header
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        activeTab={activeTab}
        onSelectScenario={handleSelectScenario}
        onNewScenario={handleOpenNewPlanModal}
        onSaveScenario={handleSaveScenario}
        onDeleteScenario={handleDeleteScenario}
        onRequestDeleteScenario={(id, name) => setPlanToDelete({ id, name })}
        onOpenManagePlans={() => setIsManagePlansModalOpen(true)}
        onImportScenarios={handleImportScenarios}
        onOpenGuide={handleOpenGuide}
        onOpenAiAdvisor={() => setShowAiModal(true)}
        onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Main Dashboard Content Area */}

        {/* Main Dashboard Content Area */}
        <div className="w-full space-y-6">
            {/* Plan Loading Failure Fallback Banner */}
            {calculationError && (
              <div className="bg-rose-50 dark:bg-rose-950/60 p-6 rounded-3xl border border-rose-300 dark:border-rose-800 space-y-4 text-center my-4">
                <div className="flex items-center justify-center gap-2 text-rose-700 dark:text-rose-300 font-extrabold text-base">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Unable to Load Retirement Plan: "{activeScenario.name}"</span>
                </div>
                <p className="text-xs text-rose-600 dark:text-rose-400 max-w-xl mx-auto">
                  An error occurred while computing tax rules or financial projections for this plan: {calculationError}
                </p>
                <div className="flex items-center justify-center gap-3 pt-1">
                  <button
                    onClick={() => handleDeleteScenario(activeScenario.id)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Plan</span>
                  </button>
                  <button
                    onClick={() => handleResetPlanData(activeScenario.id)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Plan Data</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dashboard Content Wrapped in Plan Error Boundary */}
            <PlanErrorBoundary
              key={activeScenarioId}
              activeScenario={activeScenario}
              onDeleteScenario={handleDeleteScenario}
              onResetPlanData={handleResetPlanData}
            >
            {/* Tab: Plan Management */}
            {activeTab === 'plan_management' && (
              <div className="space-y-6">
                <PlanManagementCard
                  scenarios={scenarios}
                  activeScenarioId={activeScenarioId}
                  onSelectScenario={handleSelectScenario}
                  onSaveScenario={handleSaveScenario}
                  onNewScenario={handleOpenNewPlanModal}
                  onRequestDeleteScenario={(id, name) => setPlanToDelete({ id, name })}
                  onRenameScenario={handleRenameScenario}
                  onOpenManagePlans={() => setIsManagePlansModalOpen(true)}
                  onImportScenarios={handleImportScenarios}
                />
              </div>
            )}

            {/* Tab 1: Inputs & Assets */}
            {activeTab === 'inputs' && (
              <div className="space-y-6">
                <div id="card-inputs-couple" className="scroll-mt-24 transition-all duration-300">
                  <CouplePlanningCard profile={profile} onChange={handleProfileChange} />
                </div>
                <div id="card-inputs-profile" className="scroll-mt-24 transition-all duration-300">
                  <ProfileInputs profile={profile} onChange={handleProfileChange} pots={pots} />
                </div>
                <div id="card-inputs-pots" className="scroll-mt-24 transition-all duration-300">
                  <PotManager
                    pots={pots}
                    onChange={handlePotsChange}
                    taxResult={taxResult}
                    profile={profile}
                    partnerPots={profile.partnerPots}
                    onPartnerPotsChange={handlePartnerPotsChange}
                  />
                </div>
                <div id="card-inputs-oneoff" className="scroll-mt-24 transition-all duration-300">
                  <OneOffContributionManager profile={profile} onChange={handleProfileChange} />
                </div>
                {appMode === 'advanced' && (
                  <>
                    <div id="card-inputs-transfers" className="scroll-mt-24 transition-all duration-300">
                      <PotTransferManager profile={profile} onChange={handleProfileChange} pots={pots} />
                    </div>
                    <div id="card-inputs-statepension" className="scroll-mt-24 transition-all duration-300">
                      <StatePensionCard profile={profile} onChange={handleProfileChange} />
                    </div>
                  </>
                )}
                <div id="card-inputs-dbpension" className="scroll-mt-24 transition-all duration-300">
                  <DbPensionManager profile={profile} onChange={handleProfileChange} />
                </div>
                <div id="card-inputs-fixedincome" className="scroll-mt-24 transition-all duration-300">
                  <FixedIncomeManager profile={profile} onChange={handleProfileChange} />
                </div>
                {appMode === 'advanced' && (
                  <>
                    <div id="card-inputs-lifeevents" className="scroll-mt-24 transition-all duration-300">
                      <LifeEventsDecumulationCard profile={profile} onChange={handleProfileChange} />
                    </div>
                    <div id="card-inputs-fees" className="scroll-mt-24 transition-all duration-300">
                      <InvestmentFeesCard profile={profile} onChange={handleProfileChange} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Accumulation Review (Advanced Only) */}
            {activeTab === 'accumulation_review' && appMode === 'advanced' && (
              <div className="space-y-6">
                <div id="card-accum-savings" className="scroll-mt-24 transition-all duration-300">
                  <MonthlySavingsRateCard profile={profile} pots={pots} />
                </div>
                <div id="card-accum-efficiency" className="scroll-mt-24 transition-all duration-300">
                  <IsaVsPensionEfficiencyCard
                    profile={profile}
                    pots={pots}
                    taxResult={taxResult}
                    projections={projections}
                    onChange={handleProfileChange}
                  />
                </div>
                <div id="card-accum-tax" className="scroll-mt-24 transition-all duration-300">
                  <TaxOptimizerCard
                    taxResult={taxResult}
                    profile={profile}
                    pots={pots}
                    onOptimizeTaxTrap={handleOptimizeTaxTrap}
                  />
                </div>
                <div id="card-accum-ledger" className="scroll-mt-24 transition-all duration-300">
                  <AccumulationLedgerCard
                    profile={profile}
                    pots={pots}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Strategy */}
            {activeTab === 'strategy' && (
              <div className="space-y-6">
                <div id="card-strat-planner" className="scroll-mt-24 transition-all duration-300">
                  <DrawdownPlanner
                    profile={profile}
                    pots={pots}
                    projections={projections}
                    onChange={handleProfileChange}
                    scenarios={scenarios}
                    activeScenarioId={activeScenarioId}
                    onCreateStrategyVariants={handleCreateStrategyVariants}
                    onNavigateToCompare={() => setActiveTab('compare')}
                    onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
                    appMode={appMode}
                  />
                </div>
                <div id="card-strat-phases" className="scroll-mt-24 transition-all duration-300">
                  <SpendingPhasesCard
                    profile={profile}
                    onChange={handleProfileChange}
                    onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
                    appMode={appMode}
                  />
                </div>
                {appMode === 'advanced' && (
                  <div id="card-strat-macro" className="scroll-mt-24 transition-all duration-300">
                    <MacroSettingsCard profile={profile} onChange={handleProfileChange} />
                  </div>
                )}
              </div>
            )}

            {/* Tab 3b: Strategy Analysis (Advanced Mode Only) */}
            {activeTab === 'strategy_analysis' && (
              <div className="space-y-6">
                <div id="card-pwr-metric" className="scroll-mt-24 transition-all duration-300">
                  <PwrMetricBannerCard profile={profile} pots={pots} projections={projections} />
                </div>
                <div id="card-swr-matrix" className="scroll-mt-24 transition-all duration-300">
                  <SwrMatrixCard
                    profile={profile}
                    pots={pots}
                    horizonYears={swrHorizonYears}
                    onHorizonYearsChange={setSwrHorizonYears}
                    equityPct={swrEquityPct}
                    onEquityPctChange={setSwrEquityPct}
                  />
                </div>
                <div id="card-guardrail-gauge" className="scroll-mt-24 transition-all duration-300">
                  <WithdrawalGuardrailGaugeCard
                    profile={profile}
                    pots={pots}
                    horizonYears={swrHorizonYears}
                    equityPct={swrEquityPct}
                  />
                </div>
                <div id="card-essential-floor-split" className="scroll-mt-24 transition-all duration-300">
                  <EssentialFloorSplitCard profile={profile} pots={pots} />
                </div>
                <div id="card-swr-trajectory-chart" className="scroll-mt-24 transition-all duration-300">
                  <SwrTrajectoryChart projections={projections} profile={profile} />
                </div>
                <div id="card-swr-uk-us-benchmark" className="scroll-mt-24 transition-all duration-300">
                  <SwrUkUsBenchmarkCard />
                </div>
                <div id="card-ai-advisor" className="scroll-mt-24 transition-all duration-300">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                            AI Tax &amp; Pension Advisor
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Smart AI assistant tailored to your specific active scenario parameters and UK tax queries.
                          </p>
                        </div>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                        <li>Personalised drawdown tax optimisation recommendations</li>
                        <li>60% tax trap mitigation strategies</li>
                        <li>Instant answers to complex UK pension questions</li>
                        <li>Context-aware analysis of your active plan</li>
                      </ul>
                    </div>
                    <button
                      onClick={() => setShowAiModal(true)}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Launch AI Tax Advisor</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Projection */}
            {activeTab === 'projections' && (
              <div className="space-y-6">
                <div id="card-proj-chart" className="scroll-mt-24 transition-all duration-300">
                  <ProjectionChart
                    projections={projections}
                    profile={profile}
                    pots={pots}
                    onChange={handleProfileChange}
                    onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
                    appMode={appMode}
                  />
                </div>
                {appMode === 'advanced' && (
                  <>
                    <div id="card-cashflow-sankey" className="scroll-mt-24 transition-all duration-300">
                      <CashFlowSankeyCard
                        projections={projections}
                        profile={profile}
                        pots={pots}
                        taxResult={taxResult}
                        appMode={appMode}
                      />
                    </div>
                    <div id="card-proj-macro" className="scroll-mt-24 transition-all duration-300">
                      <MacroSettingsCard profile={profile} onChange={handleProfileChange} />
                    </div>
                    <div id="card-proj-table" className="scroll-mt-24 transition-all duration-300">
                      <AnnualBreakdownTable projections={projections} profile={profile} taxResult={taxResult} onChange={handleProfileChange} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 5: Risk */}
            {activeTab === 'risk' && (
              <div className="space-y-6">
                <div id="card-risk-monte" className="scroll-mt-24 transition-all duration-300">
                  <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} appMode={appMode} />
                </div>
                {appMode === 'advanced' && (
                  <>
                    <div id="card-risk-macro" className="scroll-mt-24 transition-all duration-300">
                      <MacroSettingsCard profile={profile} onChange={handleProfileChange} />
                    </div>
                    <div id="card-risk-historic" className="scroll-mt-24 transition-all duration-300">
                      <HistoricModelingCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab 6: Estate */}
            {activeTab === 'estate' && (
              <div className="space-y-6">
                <div id="card-estate-iht" className="scroll-mt-24 transition-all duration-300">
                  <IhtEstatePlanningCard profile={profile} projections={projections} onChange={handleProfileChange} />
                </div>
              </div>
            )}

            {/* Tab 7: Summary */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div id="card-plan-insights" className="scroll-mt-24 transition-all duration-300">
                  <PlanInsightsCard
                    profile={profile}
                    pots={pots}
                    projections={projections}
                    taxResult={taxResult}
                    onChange={handleProfileChange}
                    onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
                  />
                </div>
                <div id="card-summary-strat" className="scroll-mt-24 transition-all duration-300">
                  <StrategySummaryCard
                    profile={profile}
                    pots={pots}
                    taxResult={taxResult}
                    projections={projections}
                    onChange={handleProfileChange}
                    onOpenMaximizedSpendModal={() => setIsMaximizedSpendModalOpen(true)}
                  />
                </div>
                <div id="card-summary-chart" className="scroll-mt-24 transition-all duration-300">
                  <ProjectionChart projections={projections} profile={profile} pots={pots} onChange={handleProfileChange} showAllCharts={true} />
                </div>
                <div id="card-summary-monte" className="scroll-mt-24 transition-all duration-300">
                  <MonteCarloCard profile={profile} pots={pots} taxResult={taxResult} onChange={handleProfileChange} showAllScenarios={true} appMode={appMode} />
                </div>
                <div id="card-summary-estate" className="scroll-mt-24 transition-all duration-300">
                  <IhtEstatePlanningCard profile={profile} projections={projections} onChange={handleProfileChange} hideInputs={true} />
                </div>
                <div id="card-summary-comments" className="scroll-mt-24 transition-all duration-300">
                  <SummaryCommentsCard profile={profile} taxResult={taxResult} />
                </div>
              </div>
            )}

            {/* Tab: Output */}
            {activeTab === 'output' && (
              <div className="space-y-6">
                <div id="card-output-pdf" className="scroll-mt-24 transition-all duration-300">
                  <ExportSection
                    variant="pdf_only"
                    profile={profile}
                    pots={pots}
                    projections={projections}
                    taxResult={taxResult}
                    planName={activeScenario.name}
                  />
                </div>

                <div id="card-output-csv" className="scroll-mt-24 transition-all duration-300">
                  <ExportSection
                    variant="data_only"
                    profile={profile}
                    pots={pots}
                    projections={projections}
                    taxResult={taxResult}
                    planName={activeScenario.name}
                    scenarios={scenarios}
                    onImportScenarios={handleImportScenarios}
                  />
                </div>
              </div>
            )}

            {/* Tab 8: Compare */}
            {activeTab === 'compare' && (
              <div className="space-y-6">
                <div id="card-compare-scenarios" className="scroll-mt-24 transition-all duration-300">
                  <ScenarioComparer
                    scenarios={scenarios}
                    activeScenarioId={activeScenarioId}
                    scenarioAId={effectiveCompareAId}
                    scenarioBId={effectiveCompareBId}
                    onSelectScenarioA={setCompareScenarioAId}
                    onSelectScenarioB={setCompareScenarioBId}
                    onClose={() => setActiveTab('overview')}
                  />
                </div>
              </div>
            )}

            {/* Tab 9: Housing Strategy */}
            {activeTab === 'mortgage' && (
              <div className="space-y-6">
                <div id="card-mortgage-debt" className="scroll-mt-24 transition-all duration-300">
                  <MortgageDebtCard profile={profile} onChange={handleProfileChange} />
                </div>
                <div id="card-right-sizing" className="scroll-mt-24 transition-all duration-300">
                  <RightSizingCard profile={profile} onChange={handleProfileChange} />
                </div>
              </div>
            )}

            {/* Tab: Advanced */}
            {activeTab === 'advanced_settings' && (
              <div className="space-y-6">
                <AdvancedSettingsCard 
                  profile={profile} 
                  onChange={handleProfileChange} 
                  onOpenAiAdvisor={() => setShowAiModal(true)} 
                />
              </div>
            )}

            {/* Tab 10: Documentation */}
            {activeTab === 'documentation' && (
              <div className="space-y-6">
                {/* Page 1: User Guide Page */}
                {docSubTab === 'user_guide' && (
                  <UserGuideCard appMode={appMode} onToggleAppMode={setAppMode} />
                )}

                {/* Page 1b: Emergency Fund & Cash Buffer Strategy Guide */}
                {docSubTab === 'cash_buffer_guide' && (
                  <EmergencyFundGuideCard />
                )}

                {/* Page 1c: Pension Lifestyling & Default Funds Guide */}
                {docSubTab === 'lifestyling_guide' && (
                  <PensionLifestylingGuideCard />
                )}

                {/* Page 1d: State Pension Maximisation & Voluntary NI Guide */}
                {docSubTab === 'state_pension_ni_guide' && (
                  <StatePensionNiGuideCard />
                )}

                {/* Page 1e: UFPLS vs PCLS & Small Pots Guide */}
                {docSubTab === 'ufpls_small_pots_guide' && (
                  <UfplsSmallPotsGuideCard />
                )}

                {/* Page 1f: Phased Retirement & Tax Cliff Guide */}
                {docSubTab === 'phased_retirement_guide' && (
                  <PhasedRetirementGuideCard />
                )}

                {/* Page 1g: Tapered Annual Allowance Guide */}
                {docSubTab === 'tapered_allowance_guide' && (
                  <TaperedAllowanceGuideCard />
                )}

                {/* Page 1h: Expat, Overseas & QROPS Pension Guide */}
                {docSubTab === 'expat_qrops_guide' && (
                  <ExpatQropsGuideCard />
                )}

                {/* Page 2: Healthy Life Expectancy vs Total Life Expectancy */}
                {docSubTab === 'healthy_life' && (
                  <HealthyLifeExpectancyCard profile={profile} />
                )}

                {/* Page 3: Retirement Living Standards */}
                {docSubTab === 'living_standards' && (
                  <RetirementLivingStandardsCard
                    profile={profile}
                    onApplyTargetIncome={(income) => {
                      handleProfileChange({
                        ...profile,
                        targetRetirementIncomeAnnual: income,
                      });
                    }}
                  />
                )}

                {/* Page 4: UK Retirement Tax Rules Cheat Sheet */}
                {docSubTab === 'tax_rules' && (
                  <TaxGuideCard />
                )}

                {/* Page 5: Mortgage & Debt Strategy Guide */}
                {docSubTab === 'mortgage_guide' && (
                  <MortgageGuideCard />
                )}

                {/* Page 6: Sequence Risk & Stress Testing Guide */}
                {docSubTab === 'risk_guide' && (
                  <RiskGuideCard />
                )}

                {/* Page 7: April 2027 Inheritance Tax Guide */}
                {docSubTab === 'iht_guide' && (
                  <IhtGuideCard />
                )}

                {/* Page 8: Guaranteed Income Safety Floor & Annuity Guide */}
                {docSubTab === 'floor_guide' && (
                  <FloorGuideCard />
                )}

                {/* Page 9: Couple & Joint Planning Guide */}
                {docSubTab === 'couple_guide' && (
                  <CoupleGuideCard />
                )}

                {/* Page 10: Scenario Benchmark & Scorecard Guide */}
                {docSubTab === 'benchmark_guide' && (
                  <BenchmarkGuideCard />
                )}

                {/* Page 11: SIPP Consolidation Guide */}
                {docSubTab === 'sipp_guide' && (
                  <SippConsolidationGuideCard />
                )}

                {/* Page 12: Workplace Pension / SIPP / ISA Guide */}
                {docSubTab === 'wrapper_guide' && (
                  <WrapperGuideCard />
                )}

                {/* Page 13: Self-Employed Tax & Pension Guide */}
                {docSubTab === 'self_employed_guide' && (
                  <SelfEmployedGuideCard />
                )}

                {/* Page 14: Defined Benefit (DB) Pension Guide */}
                {docSubTab === 'db_guide' && (
                  <DbPensionGuideCard />
                )}

                {/* Page 15: Dynamic Withdrawal Guardrails Guide */}
                {docSubTab === 'dynamic_guide' && (
                  <DynamicWithdrawalGuideCard />
                )}

                {/* Page 16: Care Costs & Equity Release Guide */}
                {docSubTab === 'care_guide' && (
                  <CareCostsGuideCard />
                )}

                {/* Page 17: FIRE Pre-57 ISA Bridge Guide */}
                {docSubTab === 'fire_bridge_guide' && (
                  <FireBridgeGuideCard />
                )}

                {/* Page 18: CGT & GIA Harvesting Guide */}
                {docSubTab === 'cgt_harvesting_guide' && (
                  <CgtHarvestingGuideCard />
                )}

                {/* Page 19: Pension Recycling & Taper Guide */}
                {docSubTab === 'recycling_guide' && (
                  <PensionRecyclingGuideCard />
                )}

                {/* Page 20: The 4% Rule vs UK Reality Guide */}
                {docSubTab === 'four_percent_guide' && (
                  <FourPercentRuleGuideCard />
                )}

                {/* Page 21: Retirement Spending Smile Guide */}
                {docSubTab === 'spending_smile_guide' && (
                  <SpendingSmileGuideCard />
                )}

                {/* Page 22: Workplace SAYE & BAYE Scheme Guide */}
                {docSubTab === 'saye_baye_guide' && (
                  <SayeBayeGuideCard />
                )}
              </div>
            )}
            </PlanErrorBoundary>
          </div>

        <NewPlanModal
        isOpen={isNewPlanModalOpen}
        onClose={() => setIsNewPlanModalOpen(false)}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onCreatePlan={handleCreatePlan}
      />
    </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            RetireFree UK • Built for UK Tax Year 2024/25 & 2025/26
          </p>
          <p className="text-slate-400 dark:text-slate-500">
            Guidance model for educational purposes. Consult a regulated UK IFA for formal tax advice.
          </p>
        </div>
      </footer>

      {/* Modals */}
      {showAiModal && (
        <AiTaxAdvisorModal
          profile={profile}
          pots={pots}
          taxResult={taxResult}
          projections={projections}
          onClose={() => setShowAiModal(false)}
        />
      )}

      {/* Rename Plan Modal */}
      {renameTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-5 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Rename Retirement Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Give your scenario a clear descriptive title</p>
                </div>
              </div>
              <button
                onClick={() => setRenameTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Plan Name</label>
              <input
                type="text"
                value={renameTarget.name}
                onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameScenario(renameTarget.id, renameTarget.name);
                  if (e.key === 'Escape') setRenameTarget(null);
                }}
                autoFocus
                placeholder="e.g. Early FIRE at 55"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />

              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">Quick suggestions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Early FIRE @ 55', 'Coast FIRE Plan', 'Conservative Growth', 'Couple Joint Strategy', 'Max Pension Sacrifice'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setRenameTarget({ ...renameTarget, name: suggestion })}
                      className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-lg transition-colors border border-slate-200/60 dark:border-slate-700/60 cursor-pointer"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRenameScenario(renameTarget.id, renameTarget.name)}
                disabled={!renameTarget.name.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Save Plan Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maximized Spend Solver Modal */}
      <MaximizedSpendSolverModal
        isOpen={isMaximizedSpendModalOpen}
        onClose={() => setIsMaximizedSpendModalOpen(false)}
        profile={profile}
        pots={pots}
        onApplyMaximizedSpend={handleProfileChange}
      />

      {/* Delete Plan Modal */}
      <DeletePlanModal
        isOpen={Boolean(planToDelete)}
        onClose={() => setPlanToDelete(null)}
        planId={planToDelete?.id || null}
        planName={planToDelete?.name || ''}
        onConfirmDelete={(id) => handleDeleteScenario(id)}
      />

      {/* Manage Plans Modal */}
      <ManagePlansModal
        isOpen={isManagePlansModalOpen}
        onClose={() => setIsManagePlansModalOpen(false)}
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onRequestDeleteScenario={(id, name) => setPlanToDelete({ id, name })}
        onNewScenario={handleOpenNewPlanModal}
        onRenameScenario={handleRenameScenario}
        onImportScenarios={setPendingImportScenarios}
      />

      {/* Reset Presets Modal */}
      <ResetPresetsModal
        isOpen={isResetPresetsModalOpen}
        onClose={() => setIsResetPresetsModalOpen(false)}
        onConfirmReset={() => {
          setScenarios(PRESET_SCENARIOS);
          setActiveScenarioId('preset_standard');
        }}
      />

      {/* Duplicate Variant Conflict Modal */}
      {variantConflictState && (
        <DuplicateVariantConflictModal
          isOpen={Boolean(variantConflictState)}
          onClose={() => setVariantConflictState(null)}
          basePlanName={variantConflictState.basePlanName}
          conflictingPlans={variantConflictState.conflictingPlans}
          allProposedVariantNames={variantConflictState.allProposedVariantNames}
          onReplaceExisting={() => {
            const source = scenarios.find((s) => s.id === variantConflictState.baseScenarioId) || activeScenario;
            executeCreateStrategyVariants(
              source,
              variantConflictState.basePlanName,
              variantConflictState.strategiesToCreate,
              variantConflictState.conflictingPlans
            );
            setVariantConflictState(null);
          }}
          onCreateWithNewBaseName={(newBaseName) => {
            handleCreateStrategyVariants(
              variantConflictState.baseScenarioId,
              variantConflictState.strategiesToCreate,
              newBaseName
            );
            setVariantConflictState(null);
          }}
        />
      )}

      {/* Save Plan Prompt Modal */}
      <SavePlanModal
        isOpen={isSavePlanModalOpen}
        onClose={() => setIsSavePlanModalOpen(false)}
        activeScenario={activeScenario}
        existingScenarios={scenarios}
        onOverwritePlan={handleOverwritePlan}
        onSaveAsNewPlan={handleSaveAsNewPlan}
      />

      {/* JSON Import Modal */}
      {pendingImportScenarios && (
        <JsonImportModal
          isOpen={Boolean(pendingImportScenarios)}
          onClose={() => setPendingImportScenarios(null)}
          importedScenarios={pendingImportScenarios}
          currentScenarios={scenarios}
          onImport={handleFinalImport}
        />
      )}

      </div>
    </div>
  );
}









