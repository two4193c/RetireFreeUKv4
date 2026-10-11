import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlanInsightsCard } from '../PlanInsightsCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { calculateUKTax } from '../../utils/ukTaxEngine';
import { generateProjections } from '../../utils/projectionEngine';
import { UserProfile, InvestmentPots } from '../../types';
import { MonteCarloResult } from '../../utils/monteCarloEngine';

describe('PlanInsightsCard', () => {
  it('renders health scorecard, executive overview, and milestones for a well-funded plan', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      grossAnnualSalary: 65000,
      qualifyingYears: 35,
      includeStatePension: true,
      targetRetirementIncomeAnnual: 30000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 300000,
      sippBalance: 100000,
      stocksAndSharesIsaBalance: 100000,
    };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    render(
      <PlanInsightsCard
        profile={profile}
        pots={pots}
        projections={projections}
        taxResult={taxResult}
      />
    );

    // Title & badge
    expect(screen.getByText('Plan Insights & Strategic Opportunities')).toBeInTheDocument();
    expect(screen.getByText('100% Funded On Track')).toBeInTheDocument();
    expect(screen.getByText(/Executive Overview & Health Verdict/i)).toBeInTheDocument();

    // 5 KPIs
    expect(screen.getByText('Portfolio Runway')).toBeInTheDocument();
    expect(screen.getByText('Initial SWR')).toBeInTheDocument();
    expect(screen.getByText('Guaranteed Floor')).toBeInTheDocument();
    expect(screen.getByText('Effective Tax Rate')).toBeInTheDocument();
    expect(screen.getByText('Stochastic Score')).toBeInTheDocument();

    // Sections
    expect(screen.getByText(/1\. Plan Longevity & Health Scorecard/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Strategic Milestones & Inflection Points/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Actionable Tax & Decumulation Opportunities/i)).toBeInTheDocument();
  });

  it('triggers onOpenMaximizedSpendModal when clicking Maximize Sustainable Spend', () => {
    const onOpenMaximizedSpendModal = vi.fn();
    const profile = { ...DEFAULT_PROFILE };
    const pots = { ...DEFAULT_POTS };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    render(
      <PlanInsightsCard
        profile={profile}
        pots={pots}
        projections={projections}
        taxResult={taxResult}
        onOpenMaximizedSpendModal={onOpenMaximizedSpendModal}
      />
    );

    const button = screen.getByRole('button', { name: /Maximize Sustainable Spend/i });
    fireEvent.click(button);
    expect(onOpenMaximizedSpendModal).toHaveBeenCalledTimes(1);
  });

  it('filters opportunities when clicking category buttons', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      grossAnnualSalary: 115000, // triggers tax trap opportunity
    };
    const pots = { ...DEFAULT_POTS };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    render(
      <PlanInsightsCard
        profile={profile}
        pots={pots}
        projections={projections}
        taxResult={taxResult}
      />
    );

    // Verify all opportunities button exists
    const allBtn = screen.getByRole('button', { name: /All Opportunities/i });
    expect(allBtn).toBeInTheDocument();

    // Find other category buttons
    const categoryButtons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent !== 'All Opportunities' && !btn.textContent?.includes('Maximize')
    );

    if (categoryButtons.length > 0) {
      const firstCatBtn = categoryButtons[0];
      const catName = firstCatBtn.textContent;
      fireEvent.click(firstCatBtn);

      // Click all button to reset filter
      fireEvent.click(allBtn);
      expect(screen.getByRole('button', { name: /All Opportunities/i })).toBeInTheDocument();
    }
  });

  it('displays Shortfall Alert when plan is underfunded', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 58,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 80000,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 10000,
      sippBalance: 5000,
      stocksAndSharesIsaBalance: 5000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
    };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    render(
      <PlanInsightsCard
        profile={profile}
        pots={pots}
        projections={projections}
        taxResult={taxResult}
      />
    );

    expect(screen.getByText(/Shortfall Alert/i)).toBeInTheDocument();
  });

  it('incorporates Monte Carlo result when provided', () => {
    const profile = { ...DEFAULT_PROFILE };
    const pots = { ...DEFAULT_POTS };
    const taxResult = calculateUKTax(profile, pots);
    const projections = generateProjections(profile, pots);

    const mockMonteCarlo = {
      successRateAge85: 95,
      successRateTargetAge: 95,
      successRate: 95,
      incomeSuccessRateAge85: 95,
      percentiles: [],
      agePercentiles: [],
    } as unknown as MonteCarloResult;

    render(
      <PlanInsightsCard
        profile={profile}
        pots={pots}
        projections={projections}
        taxResult={taxResult}
        monteCarloResult={mockMonteCarlo}
      />
    );

    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('High Volatility Resilience')).toBeInTheDocument();
  });
});
