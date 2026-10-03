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

describe('DynamicSpendingCard - Guyton-Klinger Spending Rules & Visualization', () => {
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

  it('renders complete visualization, scenario switcher, and guardrail corridor when active', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileEnabled} pots={DEFAULT_POTS} onChange={onChange} />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText(/Live Guardrail Trigger Boundaries/i)).toBeInTheDocument();
    expect(screen.getByText('Dynamic Income Trajectory & Trigger Points')).toBeInTheDocument();

    // Verify scenario buttons
    expect(screen.getByRole('button', { name: /Early Bear Market/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Market Cycle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bull Market/i })).toBeInTheDocument();

    // Verify KPI strip
    expect(screen.getByText('Preservation Cuts')).toBeInTheDocument();
    expect(screen.getByText('Prosperity Raises')).toBeInTheDocument();
    expect(screen.getByText('Floor Breaches')).toBeInTheDocument();
    expect(screen.getByText('0 (100% Protected)')).toBeInTheDocument();
    expect(screen.getByText(/Longevity Shield/i)).toBeInTheDocument();

    // Verify responsive container rendered for chart
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('switches simulation scenarios and updates scenario description', () => {
    const onChange = vi.fn();
    render(<DynamicSpendingCard profile={baseProfileEnabled} pots={DEFAULT_POTS} onChange={onChange} />);

    // Click Bull Market button
    const bullBtn = screen.getByRole('button', { name: /Bull Market/i });
    fireEvent.click(bullBtn);

    expect(screen.getByText(/Bull Market Scenario:/i)).toBeInTheDocument();

    // Click Market Cycle button
    const cycleBtn = screen.getByRole('button', { name: /Market Cycle/i });
    fireEvent.click(cycleBtn);

    expect(screen.getByText(/Alternating Economic Cycles:/i)).toBeInTheDocument();
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
});
