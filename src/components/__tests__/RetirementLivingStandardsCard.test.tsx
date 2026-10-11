import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RetirementLivingStandardsCard } from '../RetirementLivingStandardsCard';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('RetirementLivingStandardsCard', () => {
  it('renders single, rest of UK standards by default with tiers', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      targetRetirementIncomeAnnual: 31300,
    };

    render(<RetirementLivingStandardsCard profile={profile} />);

    expect(screen.getByText('UK Retirement Living Standards (PLSA Guide)')).toBeInTheDocument();
    expect(screen.getByText('Official UK Benchmark')).toBeInTheDocument();

    // Single Outside London benchmarks
    expect(screen.getByText('£14,400')).toBeInTheDocument(); // Minimum
    expect(screen.getAllByText('£31,300').length).toBeGreaterThanOrEqual(1); // Moderate
    expect(screen.getByText('£43,100')).toBeInTheDocument(); // Comfortable

    // Banner indicates Moderate Standard Achieved
    expect(screen.getByText(/Moderate Standard Achieved/i)).toBeInTheDocument();
  });

  it('defaults to couple when isCouplePlanning is true and updates when toggling location', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      targetRetirementIncomeAnnual: 60000,
    };

    render(<RetirementLivingStandardsCard profile={profile} />);

    // Couple Outside London: 22,400 / 43,100 / 59,000
    expect(screen.getByText('£22,400')).toBeInTheDocument();
    expect(screen.getByText('£59,000')).toBeInTheDocument();
    expect(screen.getByText(/Comfortable Standard Achieved/i)).toBeInTheDocument();

    // Switch location to London
    const londonBtn = screen.getByRole('button', { name: /London/i });
    fireEvent.click(londonBtn);

    // Couple London: 24,500 / 45,000 / 61,500
    expect(screen.getByText('£24,500')).toBeInTheDocument();
    expect(screen.getByText('£45,000')).toBeInTheDocument();
    expect(screen.getByText('£61,500')).toBeInTheDocument();

    // Switch back to Rest of UK
    const restOfUkBtn = screen.getByRole('button', { name: /Rest of UK/i });
    fireEvent.click(restOfUkBtn);
    expect(screen.getByText('£22,400')).toBeInTheDocument();
  });

  it('switches between Single and Couple modes manually', () => {
    render(<RetirementLivingStandardsCard />);

    const coupleBtn = screen.getByRole('button', { name: /Couple/i });
    fireEvent.click(coupleBtn);
    expect(screen.getByText('£22,400')).toBeInTheDocument();

    const singleBtn = screen.getByRole('button', { name: /Single/i });
    fireEvent.click(singleBtn);
    expect(screen.getByText('£14,400')).toBeInTheDocument();
  });

  it('triggers onApplyTargetIncome when clicking target buttons', () => {
    const onApplyTargetIncome = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };

    render(
      <RetirementLivingStandardsCard
        profile={profile}
        onApplyTargetIncome={onApplyTargetIncome}
      />
    );

    // Minimum button (£14,400)
    const minBtn = screen.getByRole('button', { name: /Set Target to Minimum/i });
    fireEvent.click(minBtn);
    expect(onApplyTargetIncome).toHaveBeenCalledWith(14400);

    // Moderate button (£31,300)
    const modBtn = screen.getByRole('button', { name: /Set Target to Moderate/i });
    fireEvent.click(modBtn);
    expect(onApplyTargetIncome).toHaveBeenCalledWith(31300);

    // Comfortable button (£43,100)
    const comfBtn = screen.getByRole('button', { name: /Set Target to Comfortable/i });
    fireEvent.click(comfBtn);
    expect(onApplyTargetIncome).toHaveBeenCalledWith(43100);
  });

  it('uses maximizedSpendConfig income when enabled', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 25000,
      maximizedSpendConfig: {
        enabled: true,
        targetAnnualIncome: 50000,
      },
    };

    render(<RetirementLivingStandardsCard profile={profile} />);

    expect(screen.getByText('£50,000/yr net')).toBeInTheDocument();
    expect(screen.getByText(/Comfortable Standard Achieved/i)).toBeInTheDocument();
  });

  it('displays Below Minimum when target income is very low', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      targetRetirementIncomeAnnual: 10000,
    };

    render(<RetirementLivingStandardsCard profile={profile} />);

    expect(screen.getByText(/Below Minimum Standard Achieved/i)).toBeInTheDocument();
  });
});
