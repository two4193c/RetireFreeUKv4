import React, { useEffect, useRef } from 'react';
import {
  X,
  BookOpen,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react';
import { UserProfile, AppMode } from '../types';

import { UserGuideCard } from './UserGuideCard';
import { FeaturesGuideCard } from './FeaturesGuideCard';
import { EmergencyFundGuideCard } from './EmergencyFundGuideCard';
import { PensionLifestylingGuideCard } from './PensionLifestylingGuideCard';
import { StatePensionNiGuideCard } from './StatePensionNiGuideCard';
import { UfplsSmallPotsGuideCard } from './UfplsSmallPotsGuideCard';
import { PhasedRetirementGuideCard } from './PhasedRetirementGuideCard';
import { TaperedAllowanceGuideCard } from './TaperedAllowanceGuideCard';
import { ExpatQropsGuideCard } from './ExpatQropsGuideCard';
import { HealthyLifeExpectancyCard } from './HealthyLifeExpectancyCard';
import { RetirementLivingStandardsCard } from './RetirementLivingStandardsCard';
import { TaxGuideCard } from './TaxGuideCard';
import { MortgageGuideCard } from './MortgageGuideCard';
import { RiskGuideCard } from './RiskGuideCard';
import { IhtGuideCard } from './IhtGuideCard';
import { FloorGuideCard } from './FloorGuideCard';
import { CoupleGuideCard } from './CoupleGuideCard';
import { BenchmarkGuideCard } from './BenchmarkGuideCard';
import { SippConsolidationGuideCard } from './SippConsolidationGuideCard';
import { WrapperGuideCard } from './WrapperGuideCard';
import { SelfEmployedGuideCard } from './SelfEmployedGuideCard';
import { DbPensionGuideCard } from './DbPensionGuideCard';
import { DynamicWithdrawalGuideCard } from './DynamicWithdrawalGuideCard';
import { CareCostsGuideCard } from './CareCostsGuideCard';
import { FireBridgeGuideCard } from './FireBridgeGuideCard';
import { CgtHarvestingGuideCard } from './CgtHarvestingGuideCard';
import { PensionRecyclingGuideCard } from './PensionRecyclingGuideCard';
import { FourPercentRuleGuideCard } from './FourPercentRuleGuideCard';
import { SpendingSmileGuideCard } from './SpendingSmileGuideCard';
import { SayeBayeGuideCard } from './SayeBayeGuideCard';
import { StudioModeGuideCard } from './StudioModeGuideCard';

export type DocSubTabType =
  | 'user_guide'
  | 'studio_guide'
  | 'features_guide'
  | 'cash_buffer_guide'
  | 'lifestyling_guide'
  | 'state_pension_ni_guide'
  | 'ufpls_small_pots_guide'
  | 'phased_retirement_guide'
  | 'tapered_allowance_guide'
  | 'expat_qrops_guide'
  | 'living_standards'
  | 'healthy_life'
  | 'tax_rules'
  | 'mortgage_guide'
  | 'risk_guide'
  | 'iht_guide'
  | 'floor_guide'
  | 'couple_guide'
  | 'benchmark_guide'
  | 'sipp_guide'
  | 'wrapper_guide'
  | 'self_employed_guide'
  | 'db_guide'
  | 'dynamic_guide'
  | 'care_guide'
  | 'fire_bridge_guide'
  | 'cgt_harvesting_guide'
  | 'recycling_guide'
  | 'four_percent_guide'
  | 'spending_smile_guide'
  | 'saye_baye_guide';

export interface GuideOption {
  id: DocSubTabType;
  label: string;
  category: string;
}

export const ALL_GUIDE_OPTIONS: GuideOption[] = [
  // 1. Foundations & Getting Started
  { id: 'user_guide', label: 'Quick Start Guide', category: '1. Foundations' },
  { id: 'studio_guide', label: 'Studio Mode Workspace Guide', category: '1. Foundations' },
  { id: 'features_guide', label: 'App Features & Capabilities', category: '1. Foundations' },
  { id: 'cash_buffer_guide', label: 'Emergency Fund & Cash Buffer Guide', category: '1. Foundations' },
  { id: 'state_pension_ni_guide', label: 'State Pension & Voluntary NI Guide', category: '1. Foundations' },
  { id: 'living_standards', label: 'Retirement Living Standards', category: '1. Foundations' },
  { id: 'healthy_life', label: 'Healthy Life Expectancy', category: '1. Foundations' },
  { id: 'benchmark_guide', label: 'Scenario Benchmark & Scorecard Guide', category: '1. Foundations' },

  // 2. Tax Wrappers & Pensions
  { id: 'tax_rules', label: 'UK Tax Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'wrapper_guide', label: 'Workplace Pension / SIPP / ISA Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'lifestyling_guide', label: 'Pension Lifestyling & Default Funds Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'ufpls_small_pots_guide', label: 'UFPLS vs PCLS & Small Pots Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'phased_retirement_guide', label: 'Phased Retirement & Tax Cliff Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'tapered_allowance_guide', label: 'Tapered Annual Allowance (TAA) Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'saye_baye_guide', label: 'Workplace SAYE & BAYE Scheme Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'sipp_guide', label: 'SIPP Consolidation Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'db_guide', label: 'Defined Benefit (DB) Pension Guide', category: '2. Tax Wrappers & Pensions' },
  { id: 'self_employed_guide', label: 'Self-Employed Tax & Pension Guide', category: '2. Tax Wrappers & Pensions' },

  // 3. Decumulation Strategies
  { id: 'four_percent_guide', label: 'The 4% Rule vs UK Reality Guide', category: '3. Decumulation Strategies' },
  { id: 'dynamic_guide', label: 'Dynamic Withdrawal Guardrails Guide', category: '3. Decumulation Strategies' },
  { id: 'spending_smile_guide', label: 'Retirement Spending Smile Guide', category: '3. Decumulation Strategies' },
  { id: 'fire_bridge_guide', label: 'FIRE Pre-57 ISA Bridge Guide', category: '3. Decumulation Strategies' },
  { id: 'cgt_harvesting_guide', label: 'CGT & GIA Harvesting Guide', category: '3. Decumulation Strategies' },
  { id: 'recycling_guide', label: 'Pension Recycling & Taper Guide', category: '3. Decumulation Strategies' },

  // 4. Guaranteed Income & Debt
  { id: 'floor_guide', label: 'Guaranteed Floor & Annuity Guide', category: '4. Guaranteed Income & Debt' },
  { id: 'mortgage_guide', label: 'Mortgage & Debt Strategy Guide', category: '4. Guaranteed Income & Debt' },

  // 5. Estate & Care Planning
  { id: 'couple_guide', label: 'Couple & Joint Planning Guide', category: '5. Estate & Care Planning' },
  { id: 'risk_guide', label: 'Sequence Risk & Stress Test Guide', category: '5. Estate & Care Planning' },
  { id: 'iht_guide', label: 'April 2027 IHT & Estate Guide', category: '5. Estate & Care Planning' },
  { id: 'care_guide', label: 'Care Costs & Equity Release Guide', category: '5. Estate & Care Planning' },
  { id: 'expat_qrops_guide', label: 'Expat, Overseas & QROPS Pension Guide', category: '5. Estate & Care Planning' },
];

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  docSubTab: DocSubTabType;
  onSelectDocSubTab: (subTab: DocSubTabType) => void;
  profile: UserProfile;
  onProfileChange: (p: UserProfile) => void;
  appMode: AppMode;
  onToggleAppMode: (mode: AppMode) => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  docSubTab,
  onSelectDocSubTab,
  profile,
  onProfileChange,
  appMode,
  onToggleAppMode,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Trap body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Scroll content to top whenever selected guide changes
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [docSubTab]);

  if (!isOpen) return null;

  const currentOption = ALL_GUIDE_OPTIONS.find((g) => g.id === docSubTab) || ALL_GUIDE_OPTIONS[0];

  // Group guide options by category
  const categories = Array.from(new Set(ALL_GUIDE_OPTIONS.map((g) => g.category)));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-popout-title"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-6xl h-[92vh] max-h-[92vh] bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Modal Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 bg-white dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="doc-popout-title" className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Documentation &amp; Strategy Guides
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-indigo-100/70 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50 shrink-0">
                  Studio Pop-Out
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {currentOption.category} &bull; {currentOption.label}
              </p>
            </div>
          </div>

          {/* Quick Guide Switcher Dropdown & Close Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative flex-1 sm:w-80">
              <select
                id="doc-modal-guide-selector"
                value={docSubTab}
                onChange={(e) => onSelectDocSubTab(e.target.value as DocSubTabType)}
                aria-label="Select documentation guide"
                className="w-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 pr-8 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
              >
                {categories.map((cat) => (
                  <optgroup key={cat} label={cat} className="bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-slate-100">
                    {ALL_GUIDE_OPTIONS.filter((g) => g.category === cat).map((guide) => (
                      <option key={guide.id} value={guide.id} className="font-medium text-slate-800 dark:text-slate-200">
                        {guide.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Close Guide (Esc)"
              aria-label="Close Guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          ref={contentContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
        >
          {docSubTab === 'user_guide' && (
            <UserGuideCard appMode={appMode} onToggleAppMode={onToggleAppMode} />
          )}
          {docSubTab === 'studio_guide' && (
            <StudioModeGuideCard appMode={appMode} onToggleAppMode={onToggleAppMode} />
          )}
          {docSubTab === 'features_guide' && <FeaturesGuideCard />}
          {docSubTab === 'cash_buffer_guide' && <EmergencyFundGuideCard />}
          {docSubTab === 'lifestyling_guide' && <PensionLifestylingGuideCard />}
          {docSubTab === 'state_pension_ni_guide' && <StatePensionNiGuideCard />}
          {docSubTab === 'ufpls_small_pots_guide' && <UfplsSmallPotsGuideCard />}
          {docSubTab === 'phased_retirement_guide' && <PhasedRetirementGuideCard />}
          {docSubTab === 'tapered_allowance_guide' && <TaperedAllowanceGuideCard />}
          {docSubTab === 'expat_qrops_guide' && <ExpatQropsGuideCard />}
          {docSubTab === 'healthy_life' && <HealthyLifeExpectancyCard profile={profile} />}
          {docSubTab === 'living_standards' && (
            <RetirementLivingStandardsCard
              profile={profile}
              onApplyTargetIncome={(income) => {
                onProfileChange({
                  ...profile,
                  targetRetirementIncomeAnnual: income,
                });
              }}
            />
          )}
          {docSubTab === 'tax_rules' && <TaxGuideCard />}
          {docSubTab === 'mortgage_guide' && <MortgageGuideCard />}
          {docSubTab === 'risk_guide' && <RiskGuideCard />}
          {docSubTab === 'iht_guide' && <IhtGuideCard />}
          {docSubTab === 'floor_guide' && <FloorGuideCard />}
          {docSubTab === 'couple_guide' && <CoupleGuideCard />}
          {docSubTab === 'benchmark_guide' && <BenchmarkGuideCard />}
          {docSubTab === 'sipp_guide' && <SippConsolidationGuideCard />}
          {docSubTab === 'wrapper_guide' && <WrapperGuideCard />}
          {docSubTab === 'self_employed_guide' && <SelfEmployedGuideCard />}
          {docSubTab === 'db_guide' && <DbPensionGuideCard />}
          {docSubTab === 'dynamic_guide' && <DynamicWithdrawalGuideCard />}
          {docSubTab === 'care_guide' && <CareCostsGuideCard />}
          {docSubTab === 'fire_bridge_guide' && <FireBridgeGuideCard />}
          {docSubTab === 'cgt_harvesting_guide' && <CgtHarvestingGuideCard />}
          {docSubTab === 'recycling_guide' && <PensionRecyclingGuideCard />}
          {docSubTab === 'four_percent_guide' && <FourPercentRuleGuideCard />}
          {docSubTab === 'spending_smile_guide' && <SpendingSmileGuideCard />}
          {docSubTab === 'saye_baye_guide' && <SayeBayeGuideCard />}
        </div>

        {/* Modal Footer Quick Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[11px]">Esc</kbd> to return to Studio mode</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
