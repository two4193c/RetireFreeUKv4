import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SalarySacrificeOptimizerCard } from '../SalarySacrificeOptimizerCard';
import { DEFAULT_PROFILE, ZERO_POTS } from '../../utils/defaultData';

describe('SalarySacrificeOptimizerCard', () => {
  it('renders correctly with title, presets, 3-column table, and metrics', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 110000,
      currentAge: 45,
      targetRetirementAge: 60,
    };

    render(
      <SalarySacrificeOptimizerCard
        profile={profile}
        pots={ZERO_POTS}
      />
    );

    // Header check
    expect(
      screen.getByText(/Salary Sacrifice & Employer NI Pass-Through Optimizer/i)
    ).toBeInTheDocument();

    // 60% trap badge check for 110k earner
    expect(screen.getByText(/60% Personal Allowance Taper Trap/i)).toBeInTheDocument();

    // Preset buttons check
    expect(screen.getByText(/60% Personal Allowance Trap Buster/i)).toBeInTheDocument();
    expect(screen.getByText(/Higher Rate \(40%\) Bracket Buster/i)).toBeInTheDocument();

    // Comparison columns
    expect(screen.getByText(/1. No Sacrifice \(Cash\)/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Relief at Source \(RAS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Salary Sacrifice \(SMART\)/i)).toBeInTheDocument();

    // KPI Metric tiles
    expect(screen.getAllByText(/Net Take-Home Cost/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Total Pension Added/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Instant 'ROI' \/ Uplift/i)).toBeInTheDocument();
    expect(screen.getByText(/Extra Wealth by Ret\./i)).toBeInTheDocument();
  });

  it('updates sacrifice target when a 1-click preset is clicked', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 115000,
    };

    render(
      <SalarySacrificeOptimizerCard
        profile={profile}
        pots={ZERO_POTS}
      />
    );

    // Click 60% Personal Allowance Trap Buster (should target £15,000 sacrifice down to £100,000)
    const paPresetBtn = screen.getByText(/60% Personal Allowance Trap Buster/i).closest('button');
    expect(paPresetBtn).not.toBeNull();
    fireEvent.click(paPresetBtn!);

    // Should now show £15,000 as sacrificed amount
    expect(screen.getByText(/£15,000 \(13.0%\)/i)).toBeInTheDocument();
  });

  it('toggles Employer NI rate between 13.8% and 15.0%', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 80000,
    };

    render(
      <SalarySacrificeOptimizerCard
        profile={profile}
        pots={ZERO_POTS}
      />
    );

    const aprilBtn = screen.getByRole('button', { name: /15.0% \(April 2025\+\)/i });
    fireEvent.click(aprilBtn);

    // Metric display should reflect 15.0%
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('calls onChange with salary_sacrifice when Apply to Profile is clicked', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 90000,
      pensionContributionMethod: 'relief_at_source' as const,
    };

    const handleChange = vi.fn();

    render(
      <SalarySacrificeOptimizerCard
        profile={profile}
        pots={ZERO_POTS}
        onChange={handleChange}
      />
    );

    const applyBtn = screen.getByRole('button', { name: /Apply SMART Method to Profile/i });
    fireEvent.click(applyBtn);

    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pensionContributionMethod: 'salary_sacrifice',
      })
    );

    expect(screen.getByText(/Success! Updated/i)).toBeInTheDocument();
  });

  it('supports couple planning person switching', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Charlie',
      partnerName: 'Dana',
      grossAnnualSalary: 120000,
      partnerGrossAnnualSalary: 65000,
    };

    render(
      <SalarySacrificeOptimizerCard
        profile={profile}
        pots={ZERO_POTS}
      />
    );

    // Starts on Charlie
    expect(screen.getByText(/effective marginal loss per extra £1 earned \(Charlie\)/i)).toBeInTheDocument();

    // Switch to Dana
    const partnerBtn = screen.getByRole('button', { name: /Dana/i });
    fireEvent.click(partnerBtn);

    expect(screen.getByText(/effective marginal loss per extra £1 earned \(Dana\)/i)).toBeInTheDocument();
  });
});
