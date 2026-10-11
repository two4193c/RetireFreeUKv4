import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProjectionChart } from '../ProjectionChart';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS, ZERO_POTS } from '../../utils/defaultData';
import { UserProfile, YearProjection } from '../../types';
import { calculateUKTax } from '../../utils/ukTaxEngine';
import { generateProjections } from '../../utils/projectionEngine';

// Mock ResponsiveContainer for clean rendering in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 400 }}>
        {children}
      </div>
    ),
  };
});

describe('ProjectionChart', () => {
  const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
  const realProjections = generateProjections(DEFAULT_PROFILE, DEFAULT_POTS, taxResult);

  it('renders standard overview, metrics, and allows toggling between Area and Line chart modes', () => {
    render(
      <ProjectionChart
        projections={realProjections}
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        appMode="basic"
      />
    );

    expect(screen.getByText(/Deterministic Overview & Plan Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Age 60 Pot/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Income Goal/i)).toBeInTheDocument();

    // Toggle pot chart type to line chart
    const lineBtn = screen.getByRole('button', { name: /Line Chart/i });
    fireEvent.click(lineBtn);
    expect(lineBtn).toHaveClass('font-black');

    // Toggle back to stacked area
    const areaBtn = screen.getByRole('button', { name: /Stacked Area/i });
    fireEvent.click(areaBtn);
    expect(areaBtn).toHaveClass('font-black');
  });

  it('renders couple mode with household, primary, and partner breakdown cards, and switches portfolio view mode', () => {
    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Morgan',
      partnerCurrentAge: 35,
      partnerTargetRetirementAge: 60,
      partnerPots: DEFAULT_PARTNER_POTS,
    };

    const coupleTax = calculateUKTax(coupleProfile, DEFAULT_POTS);
    const coupleProjections = generateProjections(coupleProfile, DEFAULT_POTS, coupleTax);

    render(
      <ProjectionChart
        projections={coupleProjections}
        profile={coupleProfile}
        pots={DEFAULT_POTS}
        appMode="basic"
      />
    );

    // Household, Primary, and Partner cards
    expect(screen.getAllByText('Household').length).toBeGreaterThan(0);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Morgan')).toBeInTheDocument();

    // Switch view mode to Primary and Partner
    const primaryBtns = screen.getAllByRole('button', { name: /Primary/i });
    fireEvent.click(primaryBtns[0]);

    const partnerBtns = screen.getAllByRole('button', { name: /Partner/i });
    fireEvent.click(partnerBtns[0]);

    const householdBtns = screen.getAllByRole('button', { name: /Household/i });
    fireEvent.click(householdBtns[0]);
  });

  it('renders plan deficit notice and handles deficit resolution via contribution solver', () => {
    const onChange = vi.fn();
    const deficitProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 90000, // Very high target leads to deficit
      currentAge: 50,
      targetRetirementAge: 55,
      grossAnnualSalary: 80000,
    };

    // Construct projections with shortfall
    const deficitProjections: YearProjection[] = realProjections.map((p) => ({
      ...p,
      isRetired: p.age >= 55,
      targetRetirementIncome: 90000,
      netRetirementIncome: p.age >= 55 ? 20000 : 0,
      incomeShortfall: p.age >= 55 ? 70000 : 0,
      potDepleted: p.age >= 70,
    }));

    render(
      <ProjectionChart
        projections={deficitProjections}
        profile={deficitProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Check plan failure banner
    expect(screen.getAllByText(/PLAN DEFICIT DETECTED/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/PLAN FAILURE DETECTED: Income Target Cannot Be Achieved/i)).toBeInTheDocument();

    // The contribution tab is default or can be clicked
    const contribTab = screen.getByRole('button', { name: /Increase Monthly Savings/i });
    fireEvent.click(contribTab);

    // Check if apply contribution button exists
    const applyBtns = screen.queryAllByRole('button', { name: /Apply to/i });
    if (applyBtns.length > 0) {
      fireEvent.click(applyBtns[0]);
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('handles delayed retirement feasibility solver and applies recommended delayed retirement age', () => {
    const onChange = vi.fn();
    const deficitProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 45000,
      currentAge: 55,
      targetRetirementAge: 58,
      grossAnnualSalary: 60000,
    };

    const deficitProjections: YearProjection[] = realProjections.map((p) => ({
      ...p,
      isRetired: p.age >= 58,
      targetRetirementIncome: 45000,
      netRetirementIncome: p.age >= 58 ? 25000 : 0,
      incomeShortfall: p.age >= 58 && p.age < 75 ? 20000 : 0,
    }));

    render(
      <ProjectionChart
        projections={deficitProjections}
        profile={deficitProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Switch to Delayed Retirement tab
    const delayTab = screen.getByRole('button', { name: /Delay Retirement Age/i });
    fireEvent.click(delayTab);

    expect(screen.getByText(/Delayed Retirement Feasibility Solver/i)).toBeInTheDocument();

    // Check candidate scenario cards exist and click one
    const candBtns = screen.getAllByRole('button', { name: /Age 6/i });
    expect(candBtns.length).toBeGreaterThan(0);
    fireEvent.click(candBtns[0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('renders all charts view when showAllCharts is true', () => {
    render(
      <ProjectionChart
        projections={realProjections}
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        showAllCharts={true}
      />
    );

    expect(screen.getByText(/1\. Portfolio Trajectory/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Drawdown Income Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Annual Income Shortfall \/ Deficit/i)).toBeInTheDocument();
  });


  it('renders studio mode compact layout without crashing', () => {
    render(
      <ProjectionChart
        projections={realProjections}
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        appMode="studio"
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});
