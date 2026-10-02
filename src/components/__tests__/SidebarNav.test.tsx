import { describe, it, expect } from 'vitest';
import { NAV_STRUCTURE, getFilteredNavStructure } from '../SidebarNav';

describe('SidebarNav menu configuration', () => {
  it('has renamed tabs and reordered Strategy after Input & Accumulation in NAV_STRUCTURE', () => {
    const inputsTab = NAV_STRUCTURE.find((t) => t.id === 'inputs');
    const strategyTab = NAV_STRUCTURE.find((t) => t.id === 'strategy');
    const mortgageTab = NAV_STRUCTURE.find((t) => t.id === 'mortgage');
    const riskTab = NAV_STRUCTURE.find((t) => t.id === 'risk');

    expect(inputsTab?.label).toBe('Input & Accumulation');
    expect(strategyTab?.label).toBe('Drawdown Planning');
    expect(mortgageTab?.label).toBe('Property Planning');
    expect(riskTab?.label).toBe('Risk Projection');

    const inputsIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'inputs');
    const strategyIndex = NAV_STRUCTURE.findIndex((t) => t.id === 'strategy');

    // Strategy ('Drawdown Planning') is placed directly after inputs ('Input & Accumulation')
    expect(strategyIndex).toBe(inputsIndex + 1);
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
    const advRisk = advancedNav.find((t) => t.id === 'risk');

    expect(advInputs?.label).toBe('Input & Accumulation');
    expect(advStrategy?.label).toBe('Drawdown Planning');
    expect(advMortgage?.label).toBe('Property Planning');
    expect(advRisk?.label).toBe('Risk Projection');
  });
});
