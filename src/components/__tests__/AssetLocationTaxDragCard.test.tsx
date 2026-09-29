import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetLocationTaxDragCard } from '../AssetLocationTaxDragCard';
import { DEFAULT_PROFILE, ZERO_POTS } from '../../utils/defaultData';

describe('AssetLocationTaxDragCard', () => {
  it('renders single person mode with 0%, 20%, and 40% decumulation tax options', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      partnerPots: { ...ZERO_POTS },
    };
    const pots = {
      ...ZERO_POTS,
      workplacePensionBalance: 100000,
      stocksAndSharesIsaBalance: 50000,
    };

    render(<AssetLocationTaxDragCard profile={profile} pots={pots} />);

    // Header and title check
    expect(screen.getByText(/Tax Wrapper “Asset Location” Treemap & Tax-Drag Ring/i)).toBeInTheDocument();

    // Decumulation tax buttons check
    expect(screen.getByText('Decumulation Tax:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '0% (Tax Free)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20% (Basic)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '40% (Higher)' })).toBeInTheDocument();

    // Default is 20% (Basic):
    // 100k pension -> 25k PCLS, 75k taxable * 20% = £15,000 tax drag
    expect(screen.getByText(/-£15,000/i)).toBeInTheDocument();

    // Click 0% (Tax Free)
    fireEvent.click(screen.getByRole('button', { name: '0% (Tax Free)' }));
    // 75k taxable * 0% = £0 tax drag
    expect(screen.getByText(/-£0/i)).toBeInTheDocument();

    // Click 40% (Higher)
    fireEvent.click(screen.getByRole('button', { name: '40% (Higher)' }));
    // 75k taxable * 40% = £30,000 tax drag
    expect(screen.getByText(/-£30,000/i)).toBeInTheDocument();
  });

  it('renders couple mode with separate per-person decumulation tax rate controls', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alice',
      partnerName: 'Bob',
      partnerPots: {
        ...ZERO_POTS,
        workplacePensionBalance: 100000,
      },
    };
    const pots = {
      ...ZERO_POTS,
      workplacePensionBalance: 100000,
    };

    render(<AssetLocationTaxDragCard profile={profile} pots={pots} />);

    // Check separate label controls
    expect(screen.getByText('Alice Tax:')).toBeInTheDocument();
    expect(screen.getByText('Bob Tax:')).toBeInTheDocument();

    // Both should have 0%, 20%, 40%
    const zeroButtons = screen.getAllByRole('button', { name: '0% (Tax Free)' });
    const basicButtons = screen.getAllByRole('button', { name: '20% (Basic)' });
    const higherButtons = screen.getAllByRole('button', { name: '40% (Higher)' });

    expect(zeroButtons).toHaveLength(2);
    expect(basicButtons).toHaveLength(2);
    expect(higherButtons).toHaveLength(2);

    // Initial state: both at 20%
    // Alice 75k * 20% = 15k, Bob 75k * 20% = 15k => Total 30k drag
    expect(screen.getByText(/-£30,000/i)).toBeInTheDocument();

    // Set Alice to 0% (Tax Free), keep Bob at 20% (Basic)
    fireEvent.click(zeroButtons[0]);
    // Alice 0 + Bob 15k = £15,000
    expect(screen.getByText(/-£15,000/i)).toBeInTheDocument();

    // Set Bob to 40% (Higher)
    fireEvent.click(higherButtons[1]);
    // Alice 0 + Bob 30k = £30,000
    expect(screen.getByText(/-£30,000/i)).toBeInTheDocument();

    // Filter to Alice only
    fireEvent.click(screen.getByRole('button', { name: /Alice/i }));
    // In Alice only view: Alice is 0% -> £0 drag
    expect(screen.getByText(/-£0/i)).toBeInTheDocument();

    // Filter to Bob only
    fireEvent.click(screen.getByRole('button', { name: /Bob/i }));
    // In Bob only view: Bob is 40% -> £30,000 drag
    expect(screen.getByText(/-£30,000/i)).toBeInTheDocument();
  });
});
