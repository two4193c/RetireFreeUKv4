import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PotTransferManager } from '../PotTransferManager';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { UserProfile, PotTransfer, InvestmentPots } from '../../types';

describe('PotTransferManager', () => {
  it('renders empty state with strategy presets when no transfers exist', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      potTransfers: [],
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Investment Transfers')).toBeInTheDocument();
    expect(screen.getByText('No Investment Pot Transfers Configured')).toBeInTheDocument();
    expect(screen.getByText('Quick Strategy Presets')).toBeInTheDocument();

    // Standard single presets
    expect(screen.getByRole('button', { name: /ISA → SIPP Top-Up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bed & ISA/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cash Savings → Cash ISA/i })).toBeInTheDocument();

    // Couple presets should NOT be present
    expect(screen.queryByRole('button', { name: /Spouse ISA Transfer/i })).not.toBeInTheDocument();
  });

  it('renders couple mode presets and allows adding a cross-spouse transfer preset', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      name: 'Oliver',
      partnerName: 'Sophia',
      isCouplePlanning: true,
      potTransfers: [],
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Couple presets should be visible
    const spouseIsaBtn = screen.getByRole('button', { name: /Spouse ISA Transfer/i });
    expect(spouseIsaBtn).toBeInTheDocument();

    // Click preset to open modal
    fireEvent.click(spouseIsaBtn);
    expect(screen.getByRole('heading', { name: 'Add Pot Transfer' })).toBeInTheDocument();

    // Save transfer
    const saveBtn = screen.getByRole('button', { name: /Add Transfer/i });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potTransfers: expect.arrayContaining([
          expect.objectContaining({
            owner: 'primary',
            destinationOwner: 'partner',
            destinationPot: 'stocks_and_shares_isa',
            amount: 10000,
          }),
        ]),
      })
    );
  });

  it('renders existing scheduled transfers with SIPP relief banner and allows toggling enabled status', () => {
    const onChange = vi.fn();
    const testTransfer: PotTransfer = {
      id: 'transfer-1',
      name: 'ISA to SIPP Boost',
      owner: 'primary',
      sourcePot: 'stocks_and_shares_isa',
      destinationOwner: 'primary',
      destinationPot: 'sipp',
      amount: 10000,
      transferDate: '2028-04-06',
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      potTransfers: [testTransfer],
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 40000,
      sippBalance: 50000,
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={pots}
        onChange={onChange}
      />
    );

    expect(screen.getByText('ISA to SIPP Boost')).toBeInTheDocument();
    expect(screen.getByText(/Scheduled Transfers \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SIPP Pension Top-Up: Transfer of £10,000 qualifies for 20%\+ UK Pension Tax Relief!/i)).toBeInTheDocument();
    expect(screen.getByText(/\+£2,500 Basic Relief Added/i)).toBeInTheDocument();

    // Toggle enabled checkbox
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potTransfers: [expect.objectContaining({ id: 'transfer-1', enabled: false })],
      })
    );
  });

  it('allows editing an existing transfer via the modal', () => {
    const onChange = vi.fn();
    const testTransfer: PotTransfer = {
      id: 'transfer-2',
      name: 'Bed & ISA',
      owner: 'primary',
      sourcePot: 'gia',
      destinationOwner: 'primary',
      destinationPot: 'stocks_and_shares_isa',
      amount: 15000,
      transferDate: '2027-04-06',
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      potTransfers: [testTransfer],
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Click edit button
    const editBtn = screen.getByTitle('Edit Transfer');
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Pot Transfer')).toBeInTheDocument();

    // Change transfer amount input
    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '20000' } });

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potTransfers: [
          expect.objectContaining({
            id: 'transfer-2',
            amount: 20000,
          }),
        ],
      })
    );
  });

  it('allows deleting an existing transfer', () => {
    const onChange = vi.fn();
    const testTransfer: PotTransfer = {
      id: 'transfer-3',
      name: 'Old Transfer',
      owner: 'primary',
      sourcePot: 'cash_savings',
      destinationOwner: 'primary',
      destinationPot: 'cash_isa',
      amount: 5000,
      transferDate: '2026-04-06',
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      potTransfers: [testTransfer],
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    const deleteBtn = screen.getByTitle('Delete Transfer');
    fireEvent.click(deleteBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        potTransfers: [],
      })
    );
  });

  it('displays warning when transfer amount exceeds projected pot balance', () => {
    const testTransfer: PotTransfer = {
      id: 'transfer-4',
      name: 'Excessive Transfer',
      owner: 'primary',
      sourcePot: 'stocks_and_shares_isa',
      destinationOwner: 'primary',
      destinationPot: 'cash_isa',
      amount: 100000,
      transferDate: '2026-04-06',
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: false,
      potTransfers: [testTransfer],
    };

    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      stocksAndSharesIsaBalance: 20000,
    };

    render(
      <PotTransferManager
        profile={profile}
        pots={pots}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText(/exceeds the projected source pot balance/i)).toBeInTheDocument();
  });

  it('renders correctly in studio mode without preset wrappers', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      potTransfers: [],
    };

    render(
      <PotTransferManager
        isStudioMode={true}
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Investment Transfers')).toBeInTheDocument();
    // In studio mode, quick preset buttons are hidden
    expect(screen.queryByText('Quick Strategy Presets')).not.toBeInTheDocument();
  });
});
