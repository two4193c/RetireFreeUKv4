// @vitest-environment jsdom
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

expect.extend(matchers);
import { MonteCarloCard } from '../MonteCarloCard';
import * as monteCarloEngine from '../../utils/monteCarloEngine';
import { UserProfile, InvestmentPots, TaxCalculationResult } from '../../types';

// Mock dependencies
vi.mock('../../utils/monteCarloEngine', () => ({
  runMonteCarloSimulation: vi.fn(),
  calculateCashBufferRequiredDetails: vi.fn(),
}));

vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    AreaChart: () => <div data-testid="area-chart" />,
    LineChart: () => <div data-testid="line-chart" />,
    Area: () => null,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    CartesianGrid: () => null,
    ReferenceLine: () => null,
  };
});

const mockProfile = {
  currentAge: 50,
  targetRetirementAge: 60,
  lifeExpectancyAge: 95,
  name: 'Test',
} as UserProfile;

const mockPots = {} as InvestmentPots;
const mockTaxResult = {} as TaxCalculationResult;

describe('MonteCarloCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockResult = {
    successRateAge80: 95,
    successRateAge85: 90,
    successRateAge90: 85,
    incomeSuccessRateAge85: 95,
    agePercentiles: [
      { age: 60, year: 2034, isRetired: true, p50TotalPot: 100000, p10TotalPot: 50000, p90TotalPot: 150000, p50PensionPot: 80000, p50IsaPot: 10000, p50CashGiaPot: 10000, p25TotalPot: 75000, p75TotalPot: 125000, survivalRate: 100 },
      { age: 85, year: 2059, isRetired: true, p50TotalPot: 50000, p10TotalPot: 0, p90TotalPot: 100000, p50PensionPot: 40000, p50IsaPot: 5000, p50CashGiaPot: 5000, p25TotalPot: 25000, p75TotalPot: 75000, survivalRate: 90 },
    ],
  };

  it('renders automatically without requiring a manual run button', () => {
    (monteCarloEngine.runMonteCarloSimulation as any).mockReturnValue(mockResult);
    (monteCarloEngine.calculateCashBufferRequiredDetails as any).mockReturnValue({
      totalNetCashBufferRequired: 0,
      existingCashAvailable: 0,
      shortfallOrSurplus: 0,
      isFullyCovered: true,
      yearlyDetails: [],
    });

    render(<MonteCarloCard profile={mockProfile} pots={mockPots} taxResult={mockTaxResult} />);
    expect(screen.getByText(/Monte Carlo Volatility & Risk Simulation/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Simulated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Re-run Trials/i })).toBeInTheDocument();
  });

  it('displays success rate and percentiles immediately', () => {
    (monteCarloEngine.runMonteCarloSimulation as any).mockReturnValue(mockResult);
    (monteCarloEngine.calculateCashBufferRequiredDetails as any).mockReturnValue({
      totalNetCashBufferRequired: 0,
      existingCashAvailable: 0,
      shortfallOrSurplus: 0,
      isFullyCovered: true,
      yearlyDetails: [],
    });

    render(<MonteCarloCard profile={mockProfile} pots={mockPots} taxResult={mockTaxResult} />);
    expect(screen.getByText(/Pot Success Rate \(Age 85\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('90%')[0]).toBeInTheDocument();
  });

  it('uses precomputedResult directly when provided', () => {
    (monteCarloEngine.calculateCashBufferRequiredDetails as any).mockReturnValue({
      totalNetCashBufferRequired: 0,
      existingCashAvailable: 0,
      shortfallOrSurplus: 0,
      isFullyCovered: true,
      yearlyDetails: [],
    });

    render(
      <MonteCarloCard
        profile={mockProfile}
        pots={mockPots}
        taxResult={mockTaxResult}
        precomputedResult={mockResult as any}
      />
    );

    expect(screen.getByText(/Pot Success Rate \(Age 85\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('90%')[0]).toBeInTheDocument();
  });

  it('switches to Market Crash scenario when clicked', async () => {
    (monteCarloEngine.runMonteCarloSimulation as any).mockReturnValue(mockResult);
    (monteCarloEngine.calculateCashBufferRequiredDetails as any).mockReturnValue({
      totalNetCashBufferRequired: 0,
      existingCashAvailable: 0,
      shortfallOrSurplus: 0,
      isFullyCovered: true,
      yearlyDetails: [],
    });

    render(<MonteCarloCard profile={mockProfile} pots={mockPots} taxResult={mockTaxResult} />);

    const crashRadio = await screen.findByRole('radio', { name: /Market Crash/i });
    fireEvent.click(crashRadio);

    await waitFor(() => {
      expect(monteCarloEngine.runMonteCarloSimulation).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ marketScenario: 'early_crash' })
      );
    });
  });
});
