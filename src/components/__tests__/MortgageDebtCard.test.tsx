import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MortgageDebtCard } from '../MortgageDebtCard';
import { DEFAULT_PROFILE, DEFAULT_MORTGAGE } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('MortgageDebtCard', () => {
  it('renders disabled state when mortgage is not enabled and toggles on', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: false,
      },
    };

    render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    expect(screen.getByText(/Standalone Planning Sandbox/i)).toBeInTheDocument();
    expect(screen.getByText(/Mortgage Module Currently Disabled/i)).toBeInTheDocument();

    const enableBtn = screen.getByRole('button', { name: /Enable Mortgage Module/i });
    fireEvent.click(enableBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({
        enabled: true,
      }),
    }));
  });

  it('renders property and debt inputs when enabled and updates fields', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 65,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        propertyName: 'Family Home',
        propertyValue: 400000,
        currentBalance: 200000,
        interestRatePercent: 4.0,
        remainingTermYears: 20,
        remainingTermMonths: 0,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 100,
      },
    };

    render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    expect(screen.getByText('Mortgage & Property Debt Inputs')).toBeInTheDocument();
    expect(screen.getByText('Property & Debt Parameters')).toBeInTheDocument();

    // Property name input
    const nameInput = screen.getByDisplayValue('Family Home');
    fireEvent.change(nameInput, { target: { value: 'Dream Cottage' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ propertyName: 'Dream Cottage' }),
    }));

    // Current Property Market Value input
    onChange.mockClear();
    const valueInput = screen.getByDisplayValue('400000');
    fireEvent.change(valueInput, { target: { value: '450000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ propertyValue: 450000 }),
    }));

    // Outstanding Mortgage Balance input
    onChange.mockClear();
    const balanceInput = screen.getByDisplayValue('200000');
    fireEvent.change(balanceInput, { target: { value: '180000' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ currentBalance: 180000 }),
    }));

    // Interest rate input
    onChange.mockClear();
    const rateInput = screen.getByDisplayValue('4');
    fireEvent.change(rateInput, { target: { value: '4.5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ interestRatePercent: 4.5 }),
    }));

    // Remaining term years input
    onChange.mockClear();
    const yearsInput = screen.getByDisplayValue('20');
    fireEvent.change(yearsInput, { target: { value: '15' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ remainingTermYears: 15 }),
    }));
  });

  it('switches to interest-only repayment type and displays balloon details', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 65,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        currentBalance: 150000,
        propertyValue: 300000,
        repaymentType: 'repayment',
      },
    };

    const { rerender } = render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    // Select interest-only
    const selectElem = screen.getByDisplayValue(/Repayment \(Capital & Interest\)/i);
    fireEvent.change(selectElem, { target: { value: 'interest_only' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ repaymentType: 'interest_only' }),
    }));

    // Re-render with interest_only
    rerender(
      <MortgageDebtCard
        profile={{
          ...profile,
          mortgage: { ...profile.mortgage!, repaymentType: 'interest_only' },
        }}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Interest-Only Balloon Payment Details/i)).toBeInTheDocument();
  });

  it('handles regular monthly overpayments and early repayment charge (ERC)', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        regularMonthlyOverpayment: 100,
        ercEnabled: false,
      },
    };

    render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    // Regular monthly overpayment input
    const overpaymentInput = screen.getAllByDisplayValue('100')[0];
    fireEvent.change(overpaymentInput, { target: { value: '250' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ regularMonthlyOverpayment: 250 }),
    }));

    // Toggle ERC checkbox
    onChange.mockClear();
    const ercContainer = screen.getByText('Early Repayment Charge (ERC)').closest('div')!;
    const ercCheckbox = within(ercContainer).getByRole('checkbox');
    expect(ercCheckbox).toBeInTheDocument();
    fireEvent.click(ercCheckbox);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      mortgage: expect.objectContaining({ ercEnabled: true }),
    }));
  });

  it('manages lump sum overpayments (toggle, delete, add)', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        lumpSumOverpayments: [
          {
            id: 'ls-1',
            name: 'Inheritance Payout',
            age: 50,
            amount: 30000,
            enabled: true,
          },
        ],
      },
    };

    render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    expect(screen.getByText('Inheritance Payout')).toBeInTheDocument();
    expect(screen.getByText('£30,000')).toBeInTheDocument();

    // Toggle lump sum enabled checkbox
    const lsCheckbox = screen.getAllByRole('checkbox').find((cb) => cb.className.includes('text-amber-500'))!;
    expect(lsCheckbox).toBeInTheDocument();
    fireEvent.click(lsCheckbox);
    expect(onChange).toHaveBeenCalled();
    const updatedLs = onChange.mock.calls[0][0].mortgage.lumpSumOverpayments[0];
    expect(updatedLs.enabled).toBe(false);

    // Open Add Lump Sum Modal
    const addLumpBtn = screen.getByRole('button', { name: /Add Lump Sum/i });
    fireEvent.click(addLumpBtn);

    expect(screen.getByText(/Add One-Off Lump Sum Overpayment/i)).toBeInTheDocument();

    // Fill in modal
    const nameInput = screen.getByDisplayValue('Tax-Free Cash Lump Sum');
    fireEvent.change(nameInput, { target: { value: 'Workplace Bonus' } });

    const saveBtn = screen.getByRole('button', { name: /Save Overpayment/i });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalled();
    const lumpSums = onChange.mock.calls[onChange.mock.calls.length - 1][0].mortgage.lumpSumOverpayments;
    expect(lumpSums.length).toBe(2);
    expect(lumpSums[1].name).toBe('Workplace Bonus');
  });

  it('switches between Debt Amortization Chart and Annual Amortization Table', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 45,
      targetRetirementAge: 65,
      mortgage: {
        ...DEFAULT_MORTGAGE,
        enabled: true,
        currentBalance: 120000,
        propertyValue: 350000,
        interestRatePercent: 3.5,
        remainingTermYears: 10,
      },
    };

    render(<MortgageDebtCard profile={profile} onChange={onChange} />);

    // Initially chart is visible
    expect(screen.getByRole('button', { name: /Debt Amortization Chart/i })).toBeInTheDocument();
    const tableTabBtn = screen.getByRole('button', { name: /Annual Amortization Table/i });
    expect(tableTabBtn).toBeInTheDocument();

    // Click table tab
    fireEvent.click(tableTabBtn);

    // Table headers should now be visible
    expect(screen.getByText('Start Balance')).toBeInTheDocument();
    expect(screen.getByText('Interest Paid')).toBeInTheDocument();
    expect(screen.getByText('Capital Paid')).toBeInTheDocument();
    expect(screen.getByText('End Balance')).toBeInTheDocument();

    // Switch back to chart tab
    const chartTabBtn = screen.getByRole('button', { name: /Debt Amortization Chart/i });
    fireEvent.click(chartTabBtn);

    expect(screen.queryByText('Start Balance')).not.toBeInTheDocument();
  });
});
