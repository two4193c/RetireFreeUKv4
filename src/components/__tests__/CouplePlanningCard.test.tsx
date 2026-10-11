import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CouplePlanningCard } from '../CouplePlanningCard';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('CouplePlanningCard', () => {
  it('renders single individual mode by default with single tax allowances', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };

    render(<CouplePlanningCard profile={profile} onChange={onChange} />);

    expect(screen.getByRole('heading', { name: /Planning Mode/i })).toBeInTheDocument();
    expect(screen.getByText('Single Individual')).toBeInTheDocument();
    expect(screen.getByText(/Single Personal Allowance/i)).toBeInTheDocument();
    expect(screen.getByText('£12,570')).toBeInTheDocument();
    expect(screen.getByText(/Single State Pension/i)).toBeInTheDocument();
    expect(screen.getByText('£11,541.40')).toBeInTheDocument();
    expect(screen.getByText(/Single ISA Allowance/i)).toBeInTheDocument();
    expect(screen.getByText('£20,000')).toBeInTheDocument();
  });

  it('switches to couple planning mode when clicking Couple / Joint button', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };

    render(<CouplePlanningCard profile={profile} onChange={onChange} />);

    const coupleBtn = screen.getByRole('button', { name: /Couple \/ Joint Planner/i });
    fireEvent.click(coupleBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      isCouplePlanning: true,
    }));
  });

  it('renders joint couple mode with dual allowances when enabled', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Natasha',
    };

    render(<CouplePlanningCard profile={profile} onChange={onChange} />);

    expect(screen.getByText('Joint Household')).toBeInTheDocument();
    expect(screen.getByText(/Dual Personal Allowance/i)).toBeInTheDocument();
    expect(screen.getByText('£25,140')).toBeInTheDocument();
    expect(screen.getByText(/Dual Full State Pension/i)).toBeInTheDocument();
    expect(screen.getByText('£23,082.80')).toBeInTheDocument();
    expect(screen.getByText(/Dual ISA & LSA Allowance/i)).toBeInTheDocument();
    expect(screen.getByText('£40,000')).toBeInTheDocument();

    // Click single planner to revert back
    const singleBtn = screen.getByRole('button', { name: /Single Planner/i });
    fireEvent.click(singleBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      isCouplePlanning: false,
    }));
  });

  it('renders studio mode compact layout correctly and toggles mode', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };

    const { rerender } = render(
      <CouplePlanningCard
        profile={profile}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Single')).toBeInTheDocument();
    const coupleBtn = screen.getByRole('button', { name: /Couple \/ Joint/i });
    expect(coupleBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(coupleBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      isCouplePlanning: true,
    }));

    // Rerender as couple in studio mode
    rerender(
      <CouplePlanningCard
        profile={{ ...profile, isCouplePlanning: true }}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Joint')).toBeInTheDocument();
    const singleBtn = screen.getByRole('button', { name: /Single Planner/i });
    expect(singleBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(singleBtn);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      isCouplePlanning: false,
    }));
  });
});
