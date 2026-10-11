import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AccumulationLedgerCard } from '../AccumulationLedgerCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { UserProfile, InvestmentPots, OneOffContribution, PotTransfer } from '../../types';

describe('AccumulationLedgerCard Component', () => {
  it('defaults to "monthly" (Monthly Items) view when rendered', () => {
    render(
      <AccumulationLedgerCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
      />
    );

    const monthlyButton = screen.getByRole('button', { name: /Monthly Items/i });
    const annualButton = screen.getByRole('button', { name: /Annual Items/i });
    const groupedButton = screen.getByRole('button', { name: /Grouped/i });

    expect(monthlyButton).toBeInTheDocument();
    expect(annualButton).toBeInTheDocument();
    expect(groupedButton).toBeInTheDocument();

    expect(monthlyButton.className).toContain('bg-white');
    expect(monthlyButton.className).toContain('text-purple-700');
    expect(annualButton.className).not.toContain('bg-white');
    expect(groupedButton.className).not.toContain('bg-white');
  });

  it('respects defaultExpandMode override and switches view modes', () => {
    render(
      <AccumulationLedgerCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        defaultExpandMode="annual"
      />
    );

    const annualButton = screen.getByRole('button', { name: /Annual Items/i });
    const monthlyButton = screen.getByRole('button', { name: /Monthly Items/i });
    const groupedButton = screen.getByRole('button', { name: /Grouped/i });

    expect(annualButton.className).toContain('bg-white');
    expect(monthlyButton.className).not.toContain('bg-white');

    // Switch to Grouped
    fireEvent.click(groupedButton);
    expect(groupedButton.className).toContain('bg-white');
    expect(annualButton.className).not.toContain('bg-white');

    // Switch to Monthly
    fireEvent.click(monthlyButton);
    expect(monthlyButton.className).toContain('bg-white');
    expect(groupedButton.className).not.toContain('bg-white');
  });

  it('toggles date sort order between earliest first and latest first', () => {
    render(
      <AccumulationLedgerCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
      />
    );

    const sortButton = screen.getByRole('button', { name: /Earliest First/i });
    expect(sortButton).toBeInTheDocument();

    fireEvent.click(sortButton);
    expect(screen.getByRole('button', { name: /Latest First/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Latest First/i }));
    expect(screen.getByRole('button', { name: /Earliest First/i })).toBeInTheDocument();
  });

  it('toggles showing inactive events filter', () => {
    render(
      <AccumulationLedgerCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
      />
    );

    const toggleInactiveBtn = screen.getByRole('button', { name: /Showing Inactive/i });
    fireEvent.click(toggleInactiveBtn);

    expect(screen.getByRole('button', { name: /Active Only/i })).toBeInTheDocument();
  });

  it('renders KPI overview cards with totals', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [
        {
          id: 'oneoff-1',
          name: 'Inheritance Windfall',
          grossAmount: 25000,
          date: '2027-06-01',
          targetPot: 'stocks_and_shares_isa',
          enabled: true,
          frequency: 'one_off',
        },
      ],
      potTransfers: [
        {
          id: 'xfer-1',
          name: 'GIA to ISA Bed & ISA',
          amount: 20000,
          transferDate: '2028-04-10',
          sourcePot: 'gia',
          destinationPot: 'stocks_and_shares_isa',
          enabled: true,
        },
      ],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} />);

    expect(screen.getByText(/Total Monthly Rate/i)).toBeInTheDocument();
    expect(screen.getByText(/One-Off Contributions/i)).toBeInTheDocument();
    expect(screen.getByText(/Pot Transfers Planned/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Ledger Events/i)).toBeInTheDocument();
    expect(screen.getAllByText('£25,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('£20,000').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by category tabs (All, Contribs, Transfers)', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [
        {
          id: 'c1',
          name: 'Bonus to SIPP',
          grossAmount: 10000,
          date: '2027-01-15',
          targetPot: 'sipp',
          enabled: true,
          frequency: 'one_off',
        },
      ],
      potTransfers: [
        {
          id: 't1',
          name: 'Cash to Stocks ISA',
          amount: 5000,
          transferDate: '2027-05-20',
          sourcePot: 'cash_savings',
          destinationPot: 'stocks_and_shares_isa',
          enabled: true,
        },
      ],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} />);

    // Click Transfers
    const transfersTab = screen.getByRole('button', { name: /Transfers/i });
    fireEvent.click(transfersTab);
    expect(screen.getByText('Cash to Stocks ISA')).toBeInTheDocument();
    expect(screen.queryByText('Bonus to SIPP')).not.toBeInTheDocument();

    // Click Contribs
    const contribsTab = screen.getByRole('button', { name: /Contribs/i });
    fireEvent.click(contribsTab);
    expect(screen.getByText('Bonus to SIPP')).toBeInTheDocument();
    expect(screen.queryByText('Cash to Stocks ISA')).not.toBeInTheDocument();

    // Click All
    const allTab = screen.getByRole('button', { name: /^All/i });
    fireEvent.click(allTab);
    expect(screen.getByText('Bonus to SIPP')).toBeInTheDocument();
    expect(screen.getByText('Cash to Stocks ISA')).toBeInTheDocument();
  });

  it('supports couple planning mode and owner filters', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Arthur',
      partnerName: 'Guinevere',
      grossAnnualSalary: 60000,
      partnerGrossAnnualSalary: 45000,
      partnerCurrentAge: 40,
      partnerTargetRetirementAge: 60,
      oneOffContributions: [
        {
          id: 'c-primary',
          owner: 'primary',
          name: 'Arthur ISA Top-up',
          grossAmount: 8000,
          date: '2027-02-01',
          targetPot: 'stocks_and_shares_isa',
          enabled: true,
          frequency: 'one_off',
        },
        {
          id: 'c-partner',
          owner: 'partner',
          name: 'Guinevere SIPP Top-up',
          grossAmount: 5000,
          date: '2027-03-01',
          targetPot: 'sipp',
          enabled: true,
          frequency: 'one_off',
        },
      ],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} />);

    // Check Partner Pension Allowance box is displayed
    expect(screen.getByText(/Guinevere's Pension Allowance/i)).toBeInTheDocument();

    // Filter by Arthur (Primary)
    const primaryFilterBtn = screen.getByRole('button', { name: 'Arthur' });
    fireEvent.click(primaryFilterBtn);
    expect(screen.getByText('Arthur ISA Top-up')).toBeInTheDocument();
    expect(screen.queryByText('Guinevere SIPP Top-up')).not.toBeInTheDocument();

    // Filter by Guinevere (Partner)
    const partnerFilterBtn = screen.getByRole('button', { name: 'Guinevere' });
    fireEvent.click(partnerFilterBtn);
    expect(screen.getByText('Guinevere SIPP Top-up')).toBeInTheDocument();
    expect(screen.queryByText('Arthur ISA Top-up')).not.toBeInTheDocument();
  });

  it('searches events by name and shows empty state when no match is found', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [
        {
          id: 'c1',
          name: 'Unique Rocket Ship Windfall',
          grossAmount: 15000,
          date: '2027-08-01',
          targetPot: 'stocks_and_shares_isa',
          enabled: true,
          frequency: 'one_off',
        },
      ],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} />);

    const searchInput = screen.getByPlaceholderText(/Search ledger/i);
    fireEvent.change(searchInput, { target: { value: 'Rocket' } });
    expect(screen.getByText('Unique Rocket Ship Windfall')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'NonexistentKeyword12345' } });
    expect(screen.queryByText('Unique Rocket Ship Windfall')).not.toBeInTheDocument();
    expect(screen.getByText(/No events in accumulation ledger matching filters/i)).toBeInTheDocument();
  });

  it('toggles item enabled state when clicking the action button', () => {
    const onChange = vi.fn();
    const testContrib: OneOffContribution = {
      id: 'contrib-toggle-1',
      name: 'Bonus Top-Up',
      grossAmount: 12000,
      date: '2027-09-01',
      targetPot: 'sipp',
      enabled: true,
      frequency: 'one_off',
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [testContrib],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} onChange={onChange} />);

    const disableBtn = screen.getByTitle('Click to disable');
    fireEvent.click(disableBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0];
    expect(updated.oneOffContributions[0].enabled).toBe(false);
  });

  it('toggles pot transfer item enabled state when clicking the action button', () => {
    const onChange = vi.fn();
    const testTransfer: PotTransfer = {
      id: 'transfer-toggle-1',
      name: 'Cash to S&S ISA',
      amount: 10000,
      transferDate: '2028-01-10',
      sourcePot: 'cash_savings',
      destinationPot: 'stocks_and_shares_isa',
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: [],
      potTransfers: [testTransfer],
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} onChange={onChange} />);

    const disableBtn = screen.getByTitle('Click to disable');
    fireEvent.click(disableBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updated = onChange.mock.calls[0][0];
    expect(updated.potTransfers[0].enabled).toBe(false);
  });

  it('paginates correctly when item count exceeds 50 items', () => {
    // Generate 60 one-off contributions
    const items: OneOffContribution[] = Array.from({ length: 60 }, (_, i) => ({
      id: `item-${i}`,
      name: `Special Contribution #${i + 1}`,
      grossAmount: 1000 + i,
      date: `2027-01-${String((i % 28) + 1).padStart(2, '0')}`,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    }));

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      oneOffContributions: items,
    };

    render(<AccumulationLedgerCard profile={profile} pots={DEFAULT_POTS} defaultExpandMode="grouped" />);

    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    const nextBtn = screen.getByRole('button', { name: /^Next$/i });
    expect(nextBtn).toBeEnabled();

    // Click Next
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();

    // Previous button should now be enabled
    const prevBtn = screen.getByRole('button', { name: /^Previous$/i });
    expect(prevBtn).toBeEnabled();
    fireEvent.click(prevBtn);
    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
  });
});
