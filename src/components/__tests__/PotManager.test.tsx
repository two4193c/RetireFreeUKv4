import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PotManager } from '../PotManager';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../../utils/defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('PotManager', () => {
  it('renders single user mode with portfolio totals and pension tab active', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 60000,
      sippBalance: 40000,
      stocksAndSharesIsaBalance: 25000,
      cashIsaBalance: 5000,
      lisaBalance: 0,
      giaBalance: 10000,
      cashSavingsBalance: 10000,
    };

    render(
      <PotManager
        profile={profile}
        pots={pots}
        onChange={onChange}
      />
    );

    // Header & description
    expect(screen.getByRole('heading', { name: /Investment Pots Balance/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter current starting balances for your UK pension/i)).toBeInTheDocument();

    // Summary tiles
    expect(screen.getByText('Total Portfolio Balance')).toBeInTheDocument();
    expect(screen.getByText('£150,000')).toBeInTheDocument();
    expect(screen.getByText('Pension Pots Total')).toBeInTheDocument();
    expect(screen.getAllByText('£100,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ISA & Cash Total')).toBeInTheDocument();
    expect(screen.getAllByText('£50,000').length).toBeGreaterThanOrEqual(1);

    // Pension tab inputs
    expect(screen.getByText('Workplace Pension Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('SIPP / Personal Pension Starting Balance')).toBeInTheDocument();

    // Change workplacePensionBalance
    const workplaceInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(workplaceInput, { target: { value: '70000' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workplacePensionBalance: 70000,
      })
    );
  });

  it('switches between tabs and updates ISA and Cash/GIA balances', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 30000,
      cashIsaBalance: 10000,
      lisaBalance: 5000,
      giaBalance: 20000,
      cashSavingsBalance: 15000,
    };

    render(
      <PotManager
        profile={profile}
        pots={pots}
        onChange={onChange}
      />
    );

    // Switch to ISA tab
    const isaTabBtn = screen.getByRole('button', { name: /Tax-Free ISA Balances/i });
    fireEvent.click(isaTabBtn);

    expect(screen.getByText('Stocks & Shares ISA Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('Cash ISA Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('Lifetime ISA (LISA) Starting Balance')).toBeInTheDocument();

    const isaInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(isaInput, { target: { value: '35000' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        stocksAndSharesIsaBalance: 35000,
      })
    );

    // Switch to Cash & GIA tab
    const cashGiaTabBtn = screen.getByRole('button', { name: /Cash & GIA Balances/i });
    fireEvent.click(cashGiaTabBtn);

    expect(screen.getByText('General Investment Account (GIA) Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('Cash Savings Starting Balance')).toBeInTheDocument();

    const giaInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(giaInput, { target: { value: '25000' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        giaBalance: 25000,
      })
    );
  });

  it('renders couple mode with Household, Primary, and Partner summary cards', () => {
    const onChange = vi.fn();
    const onPartnerPotsChange = vi.fn();

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Emma',
      partnerName: 'Liam',
      isCouplePlanning: true,
    };

    const primaryPots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      sippBalance: 50000,
      stocksAndSharesIsaBalance: 30000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 20000,
    };

    const partnerPots: InvestmentPots = {
      ...DEFAULT_PARTNER_POTS,
      workplacePensionBalance: 80000,
      sippBalance: 20000,
      stocksAndSharesIsaBalance: 20000,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 10000,
    };

    render(
      <PotManager
        profile={profile}
        pots={primaryPots}
        partnerPots={partnerPots}
        onChange={onChange}
        onPartnerPotsChange={onPartnerPotsChange}
      />
    );

    expect(screen.getByText('Household Starting Balance')).toBeInTheDocument();
    expect(screen.getAllByText('Emma').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Liam').length).toBeGreaterThanOrEqual(1);

    // Switch to editing Partner
    const partnerButton = screen.getByRole('button', { name: /Liam/i });
    fireEvent.click(partnerButton);

    // Edit partner workplace pension
    const partnerWorkplaceInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(partnerWorkplaceInput, { target: { value: '95000' } });

    expect(onPartnerPotsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workplacePensionBalance: 95000,
      })
    );
  });

  it('updates profile when onPartnerPotsChange is omitted but onProfileChange is provided', () => {
    const onProfileChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Emma',
      partnerName: 'Liam',
      isCouplePlanning: true,
    };

    render(
      <PotManager
        profile={profile}
        pots={DEFAULT_POTS}
        partnerPots={DEFAULT_PARTNER_POTS}
        onChange={vi.fn()}
        onProfileChange={onProfileChange}
      />
    );

    // Switch to Partner
    const partnerBtn = screen.getByRole('button', { name: /Liam/i });
    fireEvent.click(partnerBtn);

    const partnerSippInput = screen.getAllByRole('spinbutton')[1];
    fireEvent.change(partnerSippInput, { target: { value: '15000' } });

    expect(onProfileChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerSippBalance: 15000,
      })
    );
  });

  it('renders correctly in studio mode without tab wrappers', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
    };

    render(
      <PotManager
        isStudioMode={true}
        profile={profile}
        pots={DEFAULT_POTS}
        partnerPots={DEFAULT_PARTNER_POTS}
        onChange={vi.fn()}
      />
    );

    // Studio mode uses short labels P1 and P2
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();

    // All categories should be rendered simultaneously in studio mode
    expect(screen.getByText('Workplace Pension Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('Stocks & Shares ISA Starting Balance')).toBeInTheDocument();
    expect(screen.getByText('General Investment Account (GIA) Starting Balance')).toBeInTheDocument();
  });

  it('allows switching active person by clicking portfolio cards and covers onFocus and empty value', () => {
    const onChange = vi.fn();
    const onPartnerPotsChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Emma',
      partnerName: 'Liam',
      isCouplePlanning: true,
    };

    render(
      <PotManager
        profile={profile}
        pots={DEFAULT_POTS}
        partnerPots={DEFAULT_PARTNER_POTS}
        onChange={onChange}
        onPartnerPotsChange={onPartnerPotsChange}
      />
    );

    // Click partner card (second occurrence of Liam, which is inside the summary card)
    const liamElements = screen.getAllByText('Liam');
    fireEvent.click(liamElements[1]);

    // Click primary card (second occurrence of Emma, inside the primary card)
    const emmaElements = screen.getAllByText('Emma');
    fireEvent.click(emmaElements[1]);

    // Test onFocus when value is 0
    const inputs = screen.getAllByRole('spinbutton');
    const firstInput = inputs[0];
    fireEvent.focus(firstInput);

    // Test entering empty string which resets to 0
    fireEvent.change(firstInput, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        workplacePensionBalance: 0,
      })
    );
  });

  it('updates cashIsa, lisa, and cashSavings inputs', () => {
    const onChange = vi.fn();
    render(
      <PotManager
        profile={{ ...DEFAULT_PROFILE, isCouplePlanning: false }}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // ISA Tab
    fireEvent.click(screen.getByRole('button', { name: /Tax-Free ISA Balances/i }));
    
    const cashIsaContainer = screen.getByText('Cash ISA Starting Balance').parentElement!;
    const cashIsaInput = cashIsaContainer.querySelector('input')!;
    fireEvent.change(cashIsaInput, { target: { value: '9500' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cashIsaBalance: 9500 }));

    const lisaContainer = screen.getByText('Lifetime ISA (LISA) Starting Balance').closest('div')!.parentElement!;
    const lisaInput = lisaContainer.querySelector('input')!;
    fireEvent.change(lisaInput, { target: { value: '6000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ lisaBalance: 6000 }));

    // Cash & GIA Tab
    fireEvent.click(screen.getByRole('button', { name: /Cash & GIA Balances/i }));

    const cashSavingsContainer = screen.getByText('Cash Savings Starting Balance').parentElement!;
    const cashSavingsInput = cashSavingsContainer.querySelector('input')!;
    fireEvent.change(cashSavingsInput, { target: { value: '15000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ cashSavingsBalance: 15000 }));
  });
});
