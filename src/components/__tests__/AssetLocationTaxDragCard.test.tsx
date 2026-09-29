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

  it('bases Treemap and Tax-Drag on pots at retirement when in retirement basis with projections', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      isCouplePlanning: false,
      drawdownStrategy: 'basic_rate_bracket' as const,
    };
    // Today pots: 100k
    const pots = {
      ...ZERO_POTS,
      workplacePensionBalance: 100000,
    };
    // Projected pots at retirement (age 59 / 60): 400k pension, 100k ISA
    const projections = [
      {
        year: 2026,
        age: 55,
        isRetired: false,
        pensionPot: 100000,
        isaPot: 0,
        cashGiaPot: 0,
        totalPot: 100000,
      },
      {
        year: 2030,
        age: 59,
        isRetired: false,
        pensionPot: 400000,
        primaryPensionPot: 400000,
        isaPot: 100000,
        primaryStocksAndSharesIsaPot: 100000,
        cashGiaPot: 0,
        totalPot: 500000,
      },
      {
        year: 2031,
        age: 60,
        isRetired: true,
        pensionPot: 380000,
        primaryPensionPotBeforePcls: 400000,
        primaryPensionPot: 380000,
        isaPot: 100000,
        primaryStocksAndSharesIsaPot: 100000,
        cashGiaPot: 0,
        totalPot: 480000,
      },
    ];

    render(
      <AssetLocationTaxDragCard
        profile={profile}
        pots={pots}
        projections={projections as any}
        drawdownStrategy="basic_rate_bracket"
        basis="retirement"
      />
    );

    // Should indicate "At Retirement (Age 60)"
    expect(screen.getAllByText(/At Retirement \(Age 60\)/i).length).toBeGreaterThan(0);

    // Total gross should be £500,000 (400k pension + 100k ISA), not today's 100k
    expect(screen.getByText(/Total Gross: £500,000/i)).toBeInTheDocument();

    // 400k pension: 25% PCLS = 100k tax-free, 300k taxable * 20% (basic_rate_bracket) = £60,000 tax drag
    expect(screen.getByText(/-£60,000/i)).toBeInTheDocument();
  });

  it('sets decumulation tax based on drawdown strategy selected for each person in couple mode', () => {
    const profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      name: 'Alice',
      partnerName: 'Bob',
      drawdownStrategy: 'tax_free_bracket' as const, // 0% tax
      partnerDrawdownStrategy: 'higher_rate_bracket' as const, // 40% tax
      partnerPots: {
        ...ZERO_POTS,
        workplacePensionBalance: 100000,
      },
    };
    const pots = {
      ...ZERO_POTS,
      workplacePensionBalance: 100000,
    };

    render(
      <AssetLocationTaxDragCard
        profile={profile}
        pots={pots}
        drawdownStrategy="tax_free_bracket"
        partnerDrawdownStrategy="higher_rate_bracket"
      />
    );

    // Strategy badges should show on the tax buttons
    expect(screen.getByText(/Tax Free Bracket \(0%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Higher Rate Bracket \(40%\)/i)).toBeInTheDocument();

    // Alice: 75k taxable * 0% = £0 drag
    // Bob: 75k taxable * 40% = £30,000 drag
    // Household total = £30,000 drag
    expect(screen.getByText(/-£30,000/i)).toBeInTheDocument();
  });
});
