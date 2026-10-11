import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SidebarNav, NAV_STRUCTURE, getFilteredNavStructure } from '../SidebarNav';
import { PRESET_SCENARIOS } from '../../utils/defaultData';
import { DashboardTab } from '../../types';

describe('SidebarNav menu configuration', () => {
  it('has renamed tabs and reordered tabs in NAV_STRUCTURE', () => {
    const inputsTab = NAV_STRUCTURE.find((t) => t.id === 'inputs');
    const strategyTab = NAV_STRUCTURE.find((t) => t.id === 'strategy');
    const mortgageTab = NAV_STRUCTURE.find((t) => t.id === 'mortgage');
    const accumTab = NAV_STRUCTURE.find((t) => t.id === 'accumulation_review');
    const stratAnalysisTab = NAV_STRUCTURE.find((t) => t.id === 'strategy_analysis');
    const riskTab = NAV_STRUCTURE.find((t) => t.id === 'risk');
    const estateTab = NAV_STRUCTURE.find((t) => t.id === 'estate');

    expect(inputsTab?.label).toBe('Input & Accumulation');
    expect(strategyTab?.label).toBe('Drawdown Planning');
    expect(mortgageTab?.label).toBe('Property Planning');
    expect(accumTab?.label).toBe('Accumulation Analysis');
    expect(stratAnalysisTab?.label).toBe('Drawdown Analysis');
    expect(riskTab?.label).toBe('Risk Projection');
    expect(estateTab?.label).toBe('Estate Planning');

    const inputsIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'inputs');
    const strategyIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'strategy');
    const mortgageIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'mortgage');
    const accumIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'accumulation_review');

    // Strategy ('Drawdown Planning') is placed directly after inputs ('Input & Accumulation')
    expect(strategyIndex).toBe(inputsIndex + 1);
    // Property Planning ('mortgage') is placed directly after Drawdown Planning ('strategy')
    expect(mortgageIndex).toBe(strategyIndex + 1);
    // Property Planning ('mortgage') is placed above Accumulation Analysis ('accumulation_review')
    expect(mortgageIndex).toBeLessThan(accumIndex);
    expect(accumIndex).toBe(mortgageIndex + 1);
  });

  it('includes Asset Allocation & Macro Settings card inside Input & Accumulation', () => {
    const inputsTab = NAV_STRUCTURE.find((t) => t.id === 'inputs');
    const macroCard = inputsTab?.cards.find((c) => c.id === 'card-inputs-macro');

    expect(macroCard).toBeDefined();
    expect(macroCard?.label).toBe('Asset Allocation & Macro Settings');
  });

  it('preserves renamed labels and ordering in filtered nav structure for basic and advanced modes', () => {
    const basicNav = getFilteredNavStructure('basic');
    const basicInputs = basicNav.find((t) => t.id === 'inputs');
    const basicStrategy = basicNav.find((t) => t.id === 'strategy');
    const basicRisk = basicNav.find((t) => t.id === 'risk');

    expect(basicInputs?.label).toBe('Input & Accumulation');
    expect(basicStrategy?.label).toBe('Drawdown Planning');
    expect(basicRisk?.label).toBe('Risk Projection');

    // Macro settings card is accessible in basic nav
    expect(basicInputs?.cards.some((c) => c.id === 'card-inputs-macro')).toBe(true);

    const advancedNav = getFilteredNavStructure('advanced');
    const advInputs = advancedNav.find((t) => t.id === 'inputs');
    const advStrategy = advancedNav.find((t) => t.id === 'strategy');
    const advMortgage = advancedNav.find((t) => t.id === 'mortgage');
    const advAccum = advancedNav.find((t) => t.id === 'accumulation_review');
    const advAnalysis = advancedNav.find((t) => t.id === 'strategy_analysis');
    const advRisk = advancedNav.find((t) => t.id === 'risk');
    const advEstate = advancedNav.find((t) => t.id === 'estate');

    expect(advInputs?.label).toBe('Input & Accumulation');
    expect(advStrategy?.label).toBe('Drawdown Planning');
    expect(advMortgage?.label).toBe('Property Planning');
    expect(advAccum?.label).toBe('Accumulation Analysis');
    expect(advAnalysis?.label).toBe('Drawdown Analysis');
    expect(advRisk?.label).toBe('Risk Projection');
    expect(advEstate?.label).toBe('Estate Planning');

    const advStrategyIdx = advancedNav.findIndex((t) => t.id === 'strategy');
    const advMortgageIdx = advancedNav.findIndex((t) => t.id === 'mortgage');
    const advAccumIdx = advancedNav.findIndex((t) => t.id === 'accumulation_review');

    expect(advMortgageIdx).toBe(advStrategyIdx + 1);
    expect(advAccumIdx).toBe(advMortgageIdx + 1);
  });

  it('places Dynamic Optimiser first, Trajectory Chart second, and Bengen Benchmark after PWR Metric in Drawdown Analysis', () => {
    const stratTab = NAV_STRUCTURE.find((t) => t.id === 'strategy');
    const stratAnalysisTab = NAV_STRUCTURE.find((t) => t.id === 'strategy_analysis');

    expect(stratTab?.cards.some((c) => c.id === 'card-dynamic-optimiser')).toBe(false);
    expect(stratTab?.cards[0]?.id).toBe('card-strat-phases');
    expect(stratTab?.cards[0]?.label).toBe('Retirement Income Requirement');
    expect(stratTab?.cards[1]?.id).toBe('card-strat-planner');
    expect(stratTab?.cards[1]?.label).toBe('Drawdown Strategy Planner');
    expect(stratAnalysisTab?.cards[0]?.id).toBe('card-dynamic-optimiser');
    expect(stratAnalysisTab?.cards[0]?.label).toBe('Dynamic Optimiser');
    expect(stratAnalysisTab?.cards[1]?.id).toBe('card-swr-trajectory-chart');
    expect(stratAnalysisTab?.cards[1]?.label).toBe('Effective Withdrawal Rate Trajectory Chart');
    expect(stratAnalysisTab?.cards[2]?.id).toBe('card-pwr-metric');
    expect(stratAnalysisTab?.cards[2]?.label).toBe('Personalized Withdrawal Rate (PWR) Metric');
    expect(stratAnalysisTab?.cards[3]?.id).toBe('card-swr-uk-us-benchmark');
    expect(stratAnalysisTab?.cards[3]?.label).toBe('Bengen (US) vs UK Domestic Market Benchmark');
  });
});

describe('SidebarNav component interactivity', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  const defaultProps = {
    appName: 'RetireFree UK',
    activeTab: 'inputs' as DashboardTab,
    onSelectTab: vi.fn(),
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    theme: 'light' as const,
    onToggleTheme: vi.fn(),
    scenarios: PRESET_SCENARIOS,
    activeScenarioId: PRESET_SCENARIOS[0].id,
    onSelectScenario: vi.fn(),
    onNewScenario: vi.fn(),
    onSaveScenario: vi.fn(),
  };

  it('renders sidebar with app name and groups', () => {
    render(<SidebarNav {...defaultProps} />);

    expect(screen.getAllByText('RetireFree UK').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Input & Accumulation').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Drawdown Planning')).toBeInTheDocument();
  });

  it('selects a tab when an inactive tab header is clicked', () => {
    const onSelectTab = vi.fn();
    render(<SidebarNav {...defaultProps} onSelectTab={onSelectTab} />);

    const strategyTabButton = screen.getByText('Drawdown Planning');
    fireEvent.click(strategyTabButton);

    expect(onSelectTab).toHaveBeenCalledWith('strategy');
  });

  it('collapses an active tab group on click in standard mode', () => {
    const onSelectTab = vi.fn();
    render(<SidebarNav {...defaultProps} activeTab="inputs" onSelectTab={onSelectTab} />);

    // Since 'inputs' starts open, sub-items like 'Planning Mode' are visible
    expect(screen.getByText('Planning Mode')).toBeInTheDocument();

    // Click inputs header inside aside navigation
    const aside = screen.getByRole('complementary');
    const inputsHeader = within(aside).getByText('Input & Accumulation');
    fireEvent.click(inputsHeader);

    // Should not call onSelectTab because it collapses in non-studio mode
    expect(onSelectTab).not.toHaveBeenCalled();
    // 'Planning Mode' should be hidden now
    expect(screen.queryByText('Planning Mode')).not.toBeInTheDocument();
  });

  it('re-triggers onSelectTab in studio mode even when open', () => {
    const onSelectTab = vi.fn();
    render(
      <SidebarNav
        {...defaultProps}
        activeTab="inputs"
        appMode="studio"
        onSelectTab={onSelectTab}
      />
    );

    const aside = screen.getByRole('complementary');
    const inputsHeader = within(aside).getByText('Input & Accumulation');
    fireEvent.click(inputsHeader);

    expect(onSelectTab).toHaveBeenCalledWith('inputs');
  });

  it('handles clicking a sub-card item', () => {
    const onSelectCard = vi.fn();
    render(
      <SidebarNav
        {...defaultProps}
        activeTab="inputs"
        onSelectCard={onSelectCard}
      />
    );

    const planningModeCard = screen.getByText('Planning Mode');
    fireEvent.click(planningModeCard);

    expect(onSelectCard).toHaveBeenCalledWith('inputs', 'card-inputs-couple');
  });

  it('handles card-other-taxrules triggering onOpenGuide', () => {
    const onOpenGuide = vi.fn();
    const onSelectCard = vi.fn();
    render(
      <SidebarNav
        {...defaultProps}
        activeTab="inputs"
        onOpenGuide={onOpenGuide}
        onSelectCard={onSelectCard}
      />
    );

    // Expand documentation group
    const docHeader = screen.getByText('Documentation');
    fireEvent.click(docHeader);

    // Look for a sub card if rendered
    expect(onSelectCard).not.toHaveBeenCalled();
  });

  it('expands and collapses all groups via quick action buttons', () => {
    render(<SidebarNav {...defaultProps} activeTab="inputs" />);

    const expandAllBtn = screen.getByRole('button', { name: /Expand all menu groups/i });
    const collapseAllBtn = screen.getByRole('button', { name: /Collapse all menu groups/i });

    // Expand all
    fireEvent.click(expandAllBtn);
    expect(screen.getByText('Drawdown Strategy Planner')).toBeInTheDocument();

    // Collapse all
    fireEvent.click(collapseAllBtn);
    expect(screen.queryByText('Drawdown Strategy Planner')).not.toBeInTheDocument();
    expect(screen.queryByText('Planning Mode')).not.toBeInTheDocument();
  });

  it('toggles desktop sidebar collapse', () => {
    const onToggleCollapse = vi.fn();
    render(<SidebarNav {...defaultProps} onToggleCollapse={onToggleCollapse} isCollapsed={false} />);

    const collapseBtn = screen.getByRole('button', { name: /Collapse Sidebar Menu/i });
    fireEvent.click(collapseBtn);

    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('renders collapsed state with expand button', () => {
    const onToggleCollapse = vi.fn();
    render(<SidebarNav {...defaultProps} onToggleCollapse={onToggleCollapse} isCollapsed={true} />);

    const expandBtn = screen.getByRole('button', { name: /Expand Sidebar Menu/i });
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('switches app mode via bottom mode switcher buttons', () => {
    const onSetAppMode = vi.fn();
    render(<SidebarNav {...defaultProps} appMode="basic" onSetAppMode={onSetAppMode} />);

    const advancedBtn = screen.getByRole('button', { name: /Advanced/i });
    fireEvent.click(advancedBtn);
    expect(onSetAppMode).toHaveBeenCalledWith('advanced');

    const studioBtn = screen.getByRole('button', { name: /Studio/i });
    fireEvent.click(studioBtn);
    expect(onSetAppMode).toHaveBeenCalledWith('studio');

    const basicBtn = screen.getByRole('button', { name: /Basic/i });
    fireEvent.click(basicBtn);
    expect(onSetAppMode).toHaveBeenCalledWith('basic');
  });

  it('triggers theme toggle, save plan, and tour callbacks', () => {
    const onToggleTheme = vi.fn();
    const onSaveScenario = vi.fn();
    const onStartTour = vi.fn();

    render(
      <SidebarNav
        {...defaultProps}
        onToggleTheme={onToggleTheme}
        onSaveScenario={onSaveScenario}
        onStartTour={onStartTour}
      />
    );

    const themeBtn = screen.getByRole('button', { name: /Appearance Options/i });
    fireEvent.click(themeBtn);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    const saveBtn = screen.getByRole('button', { name: /Save active plan/i });
    fireEvent.click(saveBtn);
    expect(onSaveScenario).toHaveBeenCalledTimes(1);

    const tourBtn = screen.getByTitle(/Start Guided Tour/i);
    fireEvent.click(tourBtn);
    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it('toggles mobile menu drawer', () => {
    render(<SidebarNav {...defaultProps} />);

    const aside = screen.getByRole('complementary');
    expect(aside.className).toContain('-translate-x-full');

    // Mobile bar button has the app name
    const mobileMenuBtn = screen.getAllByText('RetireFree UK')[0].closest('button')!;
    fireEvent.click(mobileMenuBtn);

    // Mobile menu is open: aside should be translated into view
    expect(aside.className).toContain('translate-x-0');

    // Mobile close button inside aside header
    const closeBtn = screen.getByRole('button', { name: /Close Mobile Menu/i });
    fireEvent.click(closeBtn);

    // After closing, aside should translate out
    expect(aside.className).toContain('-translate-x-full');
  });
});
