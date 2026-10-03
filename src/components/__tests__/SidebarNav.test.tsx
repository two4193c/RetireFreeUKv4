import { describe, it, expect } from 'vitest';
import { NAV_STRUCTURE, getFilteredNavStructure } from '../SidebarNav';

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
