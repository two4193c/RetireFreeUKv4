import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpendingPhasesCard } from '../SpendingPhasesCard';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('SpendingPhasesCard - Retirement Income Requirement & Essential Floor', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    targetRetirementIncomeAnnual: 40000,
    essentialRetirementIncomeAnnual: 26000, // 65% of 40,000
  };

  it('renders the Retirement Income Requirement title and Essential Spending Floor', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    expect(screen.getByText('Retirement Income Requirement')).toBeDefined();
    expect(screen.getByText('Essential Spending Floor')).toBeDefined();
    expect(screen.getByText('65% of Target')).toBeDefined();
  });

  it('allows user to change the essential spending floor directly via input', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    const inputs = screen.getAllByRole('spinbutton');
    // Find the essential floor input with value 26000
    const essentialInput = inputs.find((inp) => (inp as HTMLInputElement).value === '26000');
    expect(essentialInput).toBeDefined();

    if (essentialInput) {
      fireEvent.change(essentialInput, { target: { value: '28000' } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          essentialRetirementIncomeAnnual: 28000,
        })
      );
    }
  });

  it('allows user to quickly set essential spending floor using quick percentage buttons', () => {
    const onChange = vi.fn();
    render(<SpendingPhasesCard profile={baseProfile} onChange={onChange} />);

    // Click 70% button (70% of £40,000 = £28,000)
    const btn70 = screen.getByRole('button', { name: '70%' });
    expect(btn70).toBeDefined();

    fireEvent.click(btn70);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        essentialRetirementIncomeAnnual: 28000,
      })
    );
  });
});
