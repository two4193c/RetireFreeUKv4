import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EssentialFloorSplitCard } from '../EssentialFloorSplitCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('EssentialFloorSplitCard', () => {
  it('renders essential floor header, ratio slider, and tier breakdowns', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 40000,
      essentialRetirementIncomeAnnual: 26000, // 65%
    };

    render(
      <EssentialFloorSplitCard
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText(/Essential Floor vs\. Discretionary Spending Split/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 1: Essential Needs Floor/i)).toBeInTheDocument();
    expect(screen.getByText(/Tier 2: Discretionary Lifestyle/i)).toBeInTheDocument();
  });

  it('adjusts slider and triggers onChange with rounded essential income', () => {
    const onChange = vi.fn();
    const profile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 40000,
      essentialRetirementIncomeAnnual: 24000, // 60%
    };

    render(
      <EssentialFloorSplitCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '75' } });

    expect(onChange).toHaveBeenCalled();
    const updatedProfile = onChange.mock.calls[0][0];
    expect(updatedProfile.essentialRetirementIncomeAnnual).toBe(30000); // 75% of 40,000
  });

  it('calculates guaranteed income coverage correctly for couple with State Pension and DB pension', () => {
    const coupleProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 40000,
      essentialRetirementIncomeAnnual: 20000,
      isCouplePlanning: true,
      includeStatePension: true,
      statePensionAmountAnnual: 11500,
      partnerIncludeStatePension: true,
      partnerStatePensionAmountAnnual: 8500,
      dbPensions: [
        {
          id: 'db1',
          name: 'Primary DB',
          owner: 'primary' as const,
          startAge: 60,
          annualIncome: 5000,
          enabled: true,
        },
      ],
    };

    render(
      <EssentialFloorSplitCard
        profile={coupleProfile}
        pots={DEFAULT_POTS}
      />
    );

    // Guaranteed: 11500 + 8500 + 5000 = 25000. Essential is 20000, so coverage is 100% (clamped at 100%)
    expect(screen.getByText(/100% Covered/i)).toBeInTheDocument();
  });
});
