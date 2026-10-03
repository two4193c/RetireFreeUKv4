import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicSpendingCard } from '../DynamicSpendingCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { UserProfile } from '../../types';

// Mock Recharts ResponsiveContainer to avoid SVG size rendering issues in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('DynamicSpendingCard - Guyton-Klinger Spending Rules & Monte Carlo Paths', () => {
  const baseProfileDisabled: UserProfile = {
    ...DEFAULT_PROFILE,
    targetRetirementIncomeAnnual: 40000,
    essentialRetirementIncomeAnnual: 25000,
    dynamicSpendingRules: {
      enabled: false,
      capitalPreservationThresholdPercent: 20,
      capitalPreservationCutPercent: 10,
      prosperityThresholdPercent: 20,
      prosperityIncreasePercent: 10,
      skipInflationOnNegativeReturn: true,
    },
  };

  const baseProfileEnabled: UserProfile = {
    ...baseProfileDisabled,
    dynamicSpendingRules: {
      ...baseProfileDisabled.dynamicSpendingRules!,
      enabled: true,
    },
  };

  it('renders disabled state with enable prompt when rules are turned off', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileDisabled} pots={DEFAULT_POTS} onChange={onChange} />);

    expect(screen.getByText('Dynamic Spending Rules (Guyton-Klinger)')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText(/currently/i)).toBeInTheDocument();
  });

  it('enables dynamic spending rules when the toggle switch is clicked', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileDisabled} pots={DEFAULT_POTS} onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dynamicSpendingRules: expect.objectContaining({
          enabled: true,
          capitalPreservationThresholdPercent: 20,
          capitalPreservationCutPercent: 10,
        }),
      })
    );
  });

  it('renders complete visualization, Monte Carlo 10th/50th/90th percentile options, and guardrail corridor', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileEnabled} pots={DEFAULT_POTS} onChange={onChange} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Live Guardrail Trigger Boundaries/i)).toBeInTheDocument();
    expect(screen.getByText('Dynamic Income Trajectory & Trigger Points')).toBeInTheDocument();

    // Verify Monte Carlo scenario buttons
    expect(screen.getByRole('button', { name: /10th %ile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /50th %ile/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90th %ile/i })).toBeInTheDocument();

    // Verify historical preset buttons
    expect(screen.getByRole('button', { name: /Bear Shock/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cycle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bull Run/i })).toBeInTheDocument();

    // Verify KPI strip
    expect(screen.getByText('Preservation Cuts')).toBeInTheDocument();
    expect(screen.getByText('Prosperity Raises')).toBeInTheDocument();
    expect(screen.getByText('Floor Breaches')).toBeInTheDocument();
    expect(screen.getByText('0 (100% Protected)')).toBeInTheDocument();
    expect(screen.getByText(/Longevity Shield/i)).toBeInTheDocument();

    // Verify responsive container rendered for chart
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('switches to Monte Carlo 10th, 50th, and 90th percentile paths and updates banner descriptions', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileEnabled} pots={DEFAULT_POTS} onChange={onChange} />);

    // Default is 50th %ile
    expect(screen.getByText(/Monte Carlo 50th Percentile Path/i)).toBeInTheDocument();

    // Click 10th %ile button
    const mc10Btn = screen.getByRole('button', { name: /10th %ile/i });
    fireEvent.click(mc10Btn);
    expect(screen.getByText(/Monte Carlo 10th Percentile Path/i)).toBeInTheDocument();

    // Click 90th %ile button
    const mc90Btn = screen.getByRole('button', { name: /90th %ile/i });
    fireEvent.click(mc90Btn);
    expect(screen.getByText(/Monte Carlo 90th Percentile Path/i)).toBeInTheDocument();

    // Click Bear Shock button
    const bearBtn = screen.getByRole('button', { name: /Bear Shock/i });
    fireEvent.click(bearBtn);
    expect(screen.getByText(/Early Sequence Risk Shock:/i)).toBeInTheDocument();
  });

  it('allows editing trigger thresholds and cuts', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileEnabled} pots={DEFAULT_POTS} onChange={onChange} />);

    const inputs = screen.getAllByRole('spinbutton');
    // Preservation trigger input (value 20)
    const presInput = inputs.find((inp) => (inp as HTMLInputElement).value === '20');
    expect(presInput).toBeDefined();

    if (presInput) {
      fireEvent.change(presInput, { target: { value: '25' } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamicSpendingRules: expect.objectContaining({
            capitalPreservationThresholdPercent: 25,
          }),
        })
      );
    }
  });

  it('uses real simulation paths from monteCarloResult when provided', () => {
    const onChange = vi.fn();
    const mockMcResult = {
      params: { numSimulations: 500 } as any,
      agePercentiles: [],
      percentiles: [],
      successRate: 92,
      successRateAge85: 90,
      paths: {
        mc10Returns: [-0.05, -0.08, 0.01, 0.04],
        mc50Returns: [0.04, 0.05, 0.04, 0.05],
        mc90Returns: [0.12, 0.10, 0.09, 0.11],
      },
    };

    render(
      <DynamicSpendingCard
        profile={baseProfileEnabled}
        pots={DEFAULT_POTS}
        onChange={onChange}
        monteCarloResult={mockMcResult as any}
      />
    );

    // Verify Simulated (500 Runs) badge is shown
    expect(screen.getByText('Simulated (500 Runs)')).toBeInTheDocument();
  });
});
