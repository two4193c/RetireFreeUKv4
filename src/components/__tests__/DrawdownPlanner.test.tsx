import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DrawdownPlanner } from '../DrawdownPlanner';
import { DEFAULT_PROFILE, DEFAULT_POTS, DEFAULT_PARTNER_POTS } from '../../utils/defaultData';
import { UserProfile, LumpSumSplit, AnnuityTranche } from '../../types';

describe('DrawdownPlanner', () => {
  const baseProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    name: 'Alex',
    currentAge: 55,
    targetRetirementAge: 60,
    statePensionAge: 67,
    pclsLumpSumPercent: 25,
    takeLumpSumAtStart: true,
    crystallisationMode: 'upfront',
    lumpSumTargetPot: 'stocks_and_shares_isa',
    incomeProductOption: 'flexi_drawdown',
  };

  it('renders standard header, lump sum details, and allows updating PCLS percentage', () => {
    const onChange = vi.fn();
    render(
      <DrawdownPlanner
        profile={baseProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Tax Free Lump Sum and Excess Income Destination/i)).toBeInTheDocument();
    expect(screen.getByText(/DC Pension Tax-Free Lump Sum/i)).toBeInTheDocument();

    // Find the PCLS slider (range input for PCLS %)
    const sliders = screen.getAllByRole('slider');
    expect(sliders.length).toBeGreaterThan(0);
    fireEvent.change(sliders[0], { target: { value: '20' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pclsLumpSumPercent: 20,
      })
    );
  });

  it('allows changing LSA protection type and updating custom allowance', () => {
    const onChange = vi.fn();
    render(
      <DrawdownPlanner
        profile={baseProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // LSA protection selector
    const lsaSelect = screen.getByDisplayValue(/Standard Limit/i);
    fireEvent.change(lsaSelect, { target: { value: 'fixed_2014' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lsaProtectionType: 'fixed_2014',
        customLsaAllowance: 375000,
      })
    );

    // Change to custom
    fireEvent.change(lsaSelect, { target: { value: 'custom' } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lsaProtectionType: 'custom',
        customLsaAllowance: 268275,
      })
    );
  });

  it('allows changing lump sum timing and custom age', () => {
    const onChange = vi.fn();
    const customAgeProfile: UserProfile = {
      ...baseProfile,
      lumpSumTiming: 'custom',
      lumpSumCustomAge: 58,
    };

    const { rerender } = render(
      <DrawdownPlanner
        profile={baseProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Timing selector
    const timingSelect = screen.getByDisplayValue(/When Private Pension is Accessed/i);
    fireEvent.change(timingSelect, { target: { value: 'custom' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lumpSumTiming: 'custom',
      })
    );

    // Rerender with custom timing active to expose the custom age input
    rerender(
      <DrawdownPlanner
        profile={customAgeProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    const customAgeInput = screen.getByDisplayValue('58');
    fireEvent.change(customAgeInput, { target: { value: '62' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lumpSumCustomAge: 62,
      })
    );
  });

  it('renders and manages multi-pot split editor when target pot is split', () => {
    const onChange = vi.fn();
    const existingSplits: LumpSumSplit[] = [
      { id: 's1', pot: 'stocks_and_shares_isa', mode: 'percentage', value: 50 },
      { id: 's2', pot: 'cash_savings', mode: 'amount', value: 20000 },
    ];

    const splitProfile: UserProfile = {
      ...baseProfile,
      lumpSumTargetPot: 'split',
      lumpSumSplits: existingSplits,
    };

    render(
      <DrawdownPlanner
        profile={splitProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Shows split editor
    expect(screen.getByText(/Multi-Pot Allocation Distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Allocated:/i)).toBeInTheDocument();

    // Add Split button
    const addSplitBtn = screen.getByRole('button', { name: /Add Destination Pot/i });
    fireEvent.click(addSplitBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lumpSumSplits: expect.arrayContaining([
          expect.objectContaining({ id: 's1' }),
          expect.objectContaining({ id: 's2' }),
          expect.objectContaining({ pot: 'stocks_and_shares_isa', value: 50 }),
        ]),
      })
    );

    // Remove first split
    const removeBtns = screen.getAllByTitle(/Remove Split/i);
    expect(removeBtns.length).toBe(2);
    fireEvent.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        lumpSumSplits: [existingSplits[1]],
      })
    );
  });

  it('renders couple mode, allows switching between primary and partner, and updates partner settings', () => {
    const onChange = vi.fn();
    const coupleProfile: UserProfile = {
      ...baseProfile,
      isCouplePlanning: true,
      partnerName: 'Morgan',
      partnerCurrentAge: 53,
      partnerTargetRetirementAge: 58,
      partnerStatePensionAge: 67,
      partnerTakeLumpSumAtStart: true,
      partnerCrystallisationMode: 'upfront',
      partnerPclsLumpSumPercent: 25,
      partnerPots: DEFAULT_PARTNER_POTS,
    };

    render(
      <DrawdownPlanner
        profile={coupleProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Couple Tax-Free Cash:/i)).toBeInTheDocument();

    // Switch to partner tab
    const partnerTabs = screen.getAllByRole('button', { name: /Morgan/i });
    expect(partnerTabs.length).toBeGreaterThan(0);
    fireEvent.click(partnerTabs[0]);

    // Check partner details are shown
    expect(screen.getByText(/Morgan Total Max Tax-Free Lump Sum/i)).toBeInTheDocument();

    // Change partner LSA protection
    const partnerLsaSelect = screen.getByDisplayValue(/Standard Limit/i);
    fireEvent.change(partnerLsaSelect, { target: { value: 'individual_2016' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerLsaProtectionType: 'individual_2016',
        partnerCustomLsaAllowance: 280000,
      })
    );
  });

  it('renders hybrid annuity product configuration and allows editing annuity parameters and tranches', () => {
    const onChange = vi.fn();
    const initialTranches: AnnuityTranche[] = [
      {
        id: 't1',
        enabled: true,
        purchaseAge: 65,
        allocationPercent: 30,
        annuityRatePercent: 5.5,
        annuityType: 'inflation_linked_single',
        durationOption: 'lifetime',
        owner: 'primary',
      },
    ];

    const hybridProfile: UserProfile = {
      ...baseProfile,
      incomeProductOption: 'hybrid',
      annuityAllocationPercent: 40,
      annuityType: 'inflation_linked_single',
      annuityRatePercent: 4.5,
      annuityPurchaseAge: 62,
      annuityTranches: initialTranches,
    };

    render(
      <DrawdownPlanner
        profile={hybridProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/1\. Retirement Income Product Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/Starting Annual Annuity Income/i)).toBeInTheDocument();

    // Change main annuity type dropdown
    const typeSelect = screen.getByDisplayValue(/Single Life - Inflation-Linked \(CPI\/RPI\)/i);
    fireEvent.change(typeSelect, { target: { value: 'level_single' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        annuityType: 'level_single',
      })
    );

    // Test tranche updates
    expect(screen.getByText(/Tranche #1: Purchase at Age 65/i)).toBeInTheDocument();
    const deleteTrancheBtn = screen.getByTitle(/Delete Tranche/i);
    fireEvent.click(deleteTrancheBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        annuityTranches: [],
      })
    );
  });

  it('updates excess income destination when clicking target pot buttons', () => {
    const onChange = vi.fn();
    render(
      <DrawdownPlanner
        profile={baseProfile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Excess Income Destination', { selector: 'span' })).toBeInTheDocument();

    // Click Cash ISA radio option
    const cashIsaRadio = screen.getByRole('radio', { name: /Cash ISA/i });
    fireEvent.click(cashIsaRadio);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        annuityExcessReinvestOption: 'cash_isa',
        reinvestDestinationPot: 'isa',
      })
    );

    // Click General Investment Account (GIA) radio option
    const giaRadio = screen.getByRole('radio', { name: /GIA Account/i });
    fireEvent.click(giaRadio);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        annuityExcessReinvestOption: 'gia',
        reinvestDestinationPot: 'gia',
      })
    );
  });



});
