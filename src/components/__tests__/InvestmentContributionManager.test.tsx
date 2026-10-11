import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InvestmentContributionManager } from '../InvestmentContributionManager';
import { UserProfile, OneOffContribution } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('InvestmentContributionManager', () => {
  it('renders empty state when no contributions exist and allows adding via custom preset', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Contributions')).toBeInTheDocument();
    expect(screen.getByText('No investment contributions added yet')).toBeInTheDocument();

    // Click quick preset "+ Regular Workplace Pension"
    const workplaceBtn = screen.getByRole('button', { name: /\+ Regular Workplace Pension/i });
    fireEvent.click(workplaceBtn);

    expect(screen.getByRole('heading', { name: 'Add Contribution' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Workplace Pension Monthly Contribution')).toBeInTheDocument();

    // Save contribution (last Add Contribution button is in the modal)
    const addButtons = screen.getAllByRole('button', { name: /Add Contribution/i });
    fireEvent.click(addButtons[addButtons.length - 1]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oneOffContributions: expect.arrayContaining([
          expect.objectContaining({
            name: 'Workplace Pension Monthly Contribution',
            targetPot: 'workplace_pension',
            frequency: 'regular_monthly',
            workplaceContributionType: 'percent',
            employeePercent: 5,
            employerPercent: 3,
            enabled: true,
          }),
        ]),
      })
    );
  });

  it('adds SIPP regular monthly contribution and bonus lump sum presets correctly', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Click Monthly SIPP
    const sippBtn = screen.getByRole('button', { name: /\+ Monthly SIPP \/ ISA Savings/i });
    fireEvent.click(sippBtn);

    expect(screen.getByDisplayValue('Regular Monthly SIPP Savings')).toBeInTheDocument();
    expect(screen.getByDisplayValue('300')).toBeInTheDocument();

    // Cancel modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: 'Add Contribution' })).not.toBeInTheDocument();

    // Click Bonus preset
    const bonusBtn = screen.getByRole('button', { name: /\+ Lump Sum Bonus \(£15k\)/i });
    fireEvent.click(bonusBtn);

    expect(screen.getByDisplayValue('Workplace Annual Bonus Lump Sum')).toBeInTheDocument();
    expect(screen.getByDisplayValue('15000')).toBeInTheDocument();

    // Save bonus
    const saveButtons = screen.getAllByRole('button', { name: /Add Contribution/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oneOffContributions: expect.arrayContaining([
          expect.objectContaining({
            name: 'Workplace Annual Bonus Lump Sum',
            targetPot: 'sipp',
            frequency: 'one_off',
            grossAmount: 15000,
          }),
        ]),
      })
    );
  });

  it('renders active contributions with summary header and allows editing and deleting', () => {
    const onChange = vi.fn();
    const sampleItem: OneOffContribution = {
      id: 'contrib-1',
      name: 'Monthly S&S ISA Growth',
      owner: 'primary',
      targetPot: 'stocks_and_shares_isa',
      frequency: 'regular_monthly',
      grossAmount: 500,
      startAge: 35,
      endAge: 60,
      enabled: true,
      description: 'Monthly Index tracker allocation',
    };
    const lumpSumItem: OneOffContribution = {
      id: 'contrib-2',
      name: 'Property Sale Windfall',
      owner: 'primary',
      targetPot: 'stocks_and_shares_isa',
      frequency: 'one_off',
      grossAmount: 50000,
      date: '2028-04-10',
      enabled: true,
      description: 'Proceeds from downsizing',
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [sampleItem, lumpSumItem],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Check summaries
    expect(screen.getByText('£500')).toBeInTheDocument();
    expect(screen.getByText('£50,000')).toBeInTheDocument();
    expect(screen.getByText('Monthly S&S ISA Growth')).toBeInTheDocument();
    expect(screen.getByText('Property Sale Windfall')).toBeInTheDocument();

    // Click edit on the first contribution
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);

    expect(screen.getByRole('heading', { name: 'Edit Contribution' })).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Monthly S&S ISA Growth');
    fireEvent.change(nameInput, { target: { value: 'Updated ISA Regular' } });

    // Save changes
    const saveChangesBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveChangesBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oneOffContributions: expect.arrayContaining([
          expect.objectContaining({
            id: 'contrib-1',
            name: 'Updated ISA Regular',
          }),
        ]),
      })
    );

    // Delete the second contribution
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oneOffContributions: [sampleItem],
      })
    );
  });

  it('handles workplace pension fixed monthly amounts calculation', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 60000,
      oneOffContributions: [],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Add workplace pension
    fireEvent.click(screen.getByRole('button', { name: /\+ Regular Workplace Pension/i }));

    // Switch contribution method from percent to fixed
    const methodSelect = screen.getByDisplayValue('% Salary Contributions');
    fireEvent.change(methodSelect, { target: { value: 'fixed' } });

    // Enter custom fixed amounts
    const empInput = screen.getByText('Employee Monthly (£/mo)').nextElementSibling as HTMLInputElement;
    fireEvent.change(empInput, { target: { value: '400' } });

    const emprInput = screen.getByText('Employer Monthly Match (£/mo)').nextElementSibling as HTMLInputElement;
    fireEvent.change(emprInput, { target: { value: '300' } });

    // Check calculated summary line
    expect(screen.getByText(/Calculated/i)).toBeInTheDocument();
    expect(screen.getByText(/£400\/mo/i)).toBeInTheDocument();
    expect(screen.getByText(/£300\/mo employer/i)).toBeInTheDocument();
    expect(screen.getByText(/= £700\/mo \(£8,400\/yr\)/i)).toBeInTheDocument();

    // Save
    const saveButtons = screen.getAllByRole('button', { name: /Add Contribution/i });
    fireEvent.click(saveButtons[saveButtons.length - 1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        oneOffContributions: expect.arrayContaining([
          expect.objectContaining({
            workplaceContributionType: 'fixed',
            employeeMonthlyAmount: 400,
            employerMonthlyAmount: 300,
          }),
        ]),
      })
    );
  });

  it('displays HMRC pension tax relief breakdown on SIPP contributions', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Click custom item
    fireEvent.click(screen.getByRole('button', { name: /Add Custom Item/i }));

    // Switch pot to SIPP
    const potSelect = screen.getByDisplayValue('Stocks & Shares ISA');
    fireEvent.change(potSelect, { target: { value: 'sipp' } });

    // SIPP basis select should appear
    expect(screen.getByText('SIPP Contribution Basis')).toBeInTheDocument();
    expect(screen.getByText('UK Pension Tax Relief Breakdown')).toBeInTheDocument();
    expect(screen.getByText('+25% HMRC Relief')).toBeInTheDocument();

    // Check net relief calculations for default 250
    // Net: 250, +20% relief (+25% on net): +63, Gross in SIPP: 313
    expect(screen.getByText('+£63')).toBeInTheDocument();
    expect(screen.getByText('£313')).toBeInTheDocument();

    // Switch basis to gross
    const basisSelect = screen.getByDisplayValue('Net (Out of Pocket Paid)');
    fireEvent.change(basisSelect, { target: { value: 'gross' } });

    // For gross 250: Net Paid 200, +20% relief 50, Gross in SIPP 250
    expect(screen.getByText('£200')).toBeInTheDocument();
    expect(screen.getByText('+£50')).toBeInTheDocument();
    expect(screen.getByText('£250')).toBeInTheDocument();
  });

  it('supports couple planning person filtering and partner ownership', () => {
    const onChange = vi.fn();
    const primaryContrib: OneOffContribution = {
      id: 'c-primary',
      name: 'Primary Bonus',
      owner: 'primary',
      targetPot: 'sipp',
      frequency: 'one_off',
      grossAmount: 10000,
      enabled: true,
    };
    const partnerContrib: OneOffContribution = {
      id: 'c-partner',
      name: 'Partner ISA Savings',
      owner: 'partner',
      targetPot: 'stocks_and_shares_isa',
      frequency: 'regular_monthly',
      grossAmount: 400,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Jordan',
      oneOffContributions: [primaryContrib, partnerContrib],
    };

    render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Check filter buttons
    expect(screen.getByRole('button', { name: /All \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alex \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Jordan \(1\)/i })).toBeInTheDocument();

    // Filter to Jordan (partner)
    fireEvent.click(screen.getByRole('button', { name: /Jordan \(1\)/i }));

    expect(screen.getByText('Partner ISA Savings')).toBeInTheDocument();
    expect(screen.queryByText('Primary Bonus')).not.toBeInTheDocument();

    // In Studio Mode
    const { unmount } = render(
      <InvestmentContributionManager
        profile={profile}
        onChange={onChange}
        isStudioMode={true}
      />
    );

    expect(screen.getByRole('button', { name: /Add Contribution/i })).toBeInTheDocument();
  });
});
