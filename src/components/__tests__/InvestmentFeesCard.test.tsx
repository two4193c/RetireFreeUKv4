import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvestmentFeesCard } from '../InvestmentFeesCard';
import { UserProfile } from '../../types';

// Mock Recharts to prevent SVG rendering issues in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual as any,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    ComposedChart: () => <div data-testid="composed-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
  };
});

// Mock projections
vi.mock('../../utils/projectionEngine', () => ({
  generateProjections: vi.fn(() => [
    { age: 50, year: 2024, totalPot: 100000, estimatedInvestmentFees: 1000, isRetired: false },
    { age: 60, year: 2034, totalPot: 150000, estimatedInvestmentFees: 1500, isRetired: true }
  ])
}));

const mockProfile: UserProfile = {
  name: 'John',
  isCouplePlanning: false,
  targetRetirementAge: 60,
  expectedInvestmentReturn: 6.5,
  postRetirementReturn: 4.5,
  workplacePensionBalance: 50000,
  sippBalance: 50000,
  investmentFees: {
    enabled: false,
    perPotFeesEnabled: false,
    platformFeePercent: 0.25,
    fundFeePercent: 0.40,
    advisorFeePercent: 0.0,
  }
};

describe('InvestmentFeesCard', () => {
  const onChangeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when fee drag modeling is disabled', () => {
    render(
      <InvestmentFeesCard profile={mockProfile} onChange={onChangeMock} />
    );

    expect(screen.getByText(/Fee drag modeling is currently disabled/i)).toBeInTheDocument();
    // The toggle should be present
    const toggle = screen.getByRole('checkbox');
    expect(toggle).not.toBeChecked();
  });

  it('renders correctly when fee drag modeling is enabled', () => {
    const enabledProfile = {
      ...mockProfile,
      investmentFees: {
        ...mockProfile.investmentFees,
        enabled: true,
      }
    };

    render(
      <InvestmentFeesCard profile={enabledProfile} onChange={onChangeMock} />
    );

    // Should not show disabled text
    expect(screen.queryByText(/Fee drag modeling is currently disabled/i)).not.toBeInTheDocument();
    
    // Should show interactive sections
    expect(screen.getByText(/Interactive Fee Drag Impact Visualiser/i)).toBeInTheDocument();
    
    // Should show default trajectory mode chart
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('toggles between trajectory and breakdown view modes', () => {
    const enabledProfile = {
      ...mockProfile,
      investmentFees: {
        ...mockProfile.investmentFees,
        enabled: true,
      }
    };

    render(
      <InvestmentFeesCard profile={enabledProfile} onChange={onChangeMock} />
    );

    // Default is trajectory
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();

    // Click on breakdown
    const breakdownBtn = screen.getByRole('button', { name: /Pot-by-Pot Annual Drag/i });
    fireEvent.click(breakdownBtn);

    // Should now show breakdown (bar chart)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();

    // Click back to trajectory
    const trajectoryBtn = screen.getByRole('button', { name: /Growth Trajectory/i });
    fireEvent.click(trajectoryBtn);

    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('calculates and displays the correct Total Fee Drag amounts', () => {
    const enabledProfile = {
      ...mockProfile,
      investmentFees: {
        ...mockProfile.investmentFees,
        enabled: true,
        platformFeePercent: 0.25,
        fundFeePercent: 0.40,
        advisorFeePercent: 0.0,
        perPotFeesEnabled: false
      }
    };
    // Total fee is 0.65%. Total pot is 100,000. So annual drag = 650.

    render(
      <InvestmentFeesCard profile={enabledProfile} onChange={onChangeMock} />
    );

    // Should display the total fee percent
    expect(screen.getByText(/Total Fee Drag: 0.65% p.a./i)).toBeInTheDocument();

    // Should display the annual drag pounds in the banner or KPI
    // The banner text is: "~£650 / year total fee drag"
    // But we might need to search with a regex or exact match depending on formatting
    expect(screen.getByText(/~£650 \/ year total fee drag/i)).toBeInTheDocument();
    
    // Check initial drag KPI card
    expect(screen.getByText(/-£650\/yr/i)).toBeInTheDocument();
  });
});
