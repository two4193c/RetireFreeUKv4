import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrancheCrystallisationVisualiserCard } from '../TrancheCrystallisationVisualiserCard';
import { UserProfile, InvestmentPots, CrystallisationTranche, DbPension } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('TrancheCrystallisationVisualiserCard', () => {
  it('renders mode advisory notice when mode is not phased tranches and allows 1-click activation', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      crystallisationMode: 'ufpls',
      takeLumpSumAtStart: false,
      crystallisationTranches: [],
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Plan is currently set to “UFPLS \/ Drip-Feed”/i)).toBeInTheDocument();
    const activateBtn = screen.getByRole('button', { name: /Activate Phased Tranches Mode/i });
    expect(activateBtn).toBeInTheDocument();

    fireEvent.click(activateBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        crystallisationMode: 'phased_tranches',
        takeLumpSumAtStart: false,
      })
    );
  });

  it('renders empty tranches state and allows adding a sample tranche', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [],
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Look for add sample tranche button
    const addSampleBtn = screen.getByRole('button', { name: /Add Initial Phased Crystallisation Tranche/i });
    expect(addSampleBtn).toBeInTheDocument();

    fireEvent.click(addSampleBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        crystallisationMode: 'phased_tranches',
        crystallisationTranches: expect.arrayContaining([
          expect.objectContaining({
            name: 'Sample Tranche 1',
            pclsPercent: 25,
            enabled: true,
          }),
        ]),
      })
    );
  });

  it('renders configured active crystallisation tranches with TFC and residual drawdown metrics', () => {
    const testTranche: CrystallisationTranche = {
      id: 'tranche-1',
      name: 'Initial Mortgage Payoff Tranche',
      owner: 'primary',
      age: 60,
      amount: 100000,
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [testTranche],
      currentAge: 55,
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText('Phased Crystallisation Tranches Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('Initial Mortgage Payoff Tranche').length).toBeGreaterThan(0);

    // Verify 25% Tax-Free Cash (£25,000) and 75% Drawdown (£75,000)
    expect(screen.getAllByText('£25,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£75,000').length).toBeGreaterThan(0);
  });

  it('handles Defined Benefit pension lump sum integration and offers 1-click matching tranche', () => {
    const onChange = vi.fn();
    const dbPension: DbPension = {
      id: 'db-1',
      name: 'NHS Pension Scheme',
      owner: 'primary',
      annualIncome: 18000,
      startAge: 65,
      taxFreeLumpSum: 40000,
      enabled: true,
      inflationLinked: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [],
      dbPensions: [dbPension],
      currentAge: 55,
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Should display DB lump sum notification
    expect(screen.getByText(/Defined Benefit \(DB\) Pension Lump Sum Scheduled/i)).toBeInTheDocument();

    // Should display unmatched DB lump sum banner with 1-click add tranche button
    const addMatchingBtn = screen.getByRole('button', { name: /Add Tranche at Age 65/i });
    expect(addMatchingBtn).toBeInTheDocument();

    fireEvent.click(addMatchingBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        crystallisationMode: 'phased_tranches',
        crystallisationTranches: expect.arrayContaining([
          expect.objectContaining({
            age: 65,
            pclsPercent: 25,
            enabled: true,
          }),
        ]),
      })
    );
  });

  it('switches between Primary and Partner views in couple planning mode', () => {
    const partnerTranche: CrystallisationTranche = {
      id: 'tranche-p1',
      name: 'Partner Bridging Tranche',
      owner: 'partner',
      age: 58,
      amount: 80000,
      pclsPercent: 25,
      targetPot: 'cash_isa',
      enabled: true,
      frequency: 'one_off',
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Sam',
      crystallisationMode: 'phased_tranches',
      partnerCrystallisationMode: 'phased_tranches',
      crystallisationTranches: [partnerTranche],
      partnerCrystallisationTranches: [partnerTranche],
      currentAge: 55,
      partnerCurrentAge: 54,
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    // Both switcher buttons should exist
    const primaryBtn = screen.getByRole('button', { name: /Alex/i });
    const partnerBtn = screen.getByRole('button', { name: /Sam/i });

    expect(primaryBtn).toBeInTheDocument();
    expect(partnerBtn).toBeInTheDocument();

    // Click to view Partner tranches
    fireEvent.click(partnerBtn);
    expect(screen.getAllByText('Partner Bridging Tranche').length).toBeGreaterThan(0);

    // Click back to Primary view
    fireEvent.click(primaryBtn);
  });

  it('displays LSA capped warning when total tax-free cash exceeds lump sum allowance', () => {
    const largeTranche: CrystallisationTranche = {
      id: 'tranche-large',
      name: 'Large Tranche',
      owner: 'primary',
      age: 60,
      amount: 800000, // 25% is £200,000
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    const dbPension: DbPension = {
      id: 'db-huge',
      name: 'Executive Scheme',
      owner: 'primary',
      annualIncome: 30000,
      startAge: 60,
      taxFreeLumpSum: 100000, // £200,000 + £100,000 = £300,000 > £268,275
      enabled: true,
      inflationLinked: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [largeTranche],
      dbPensions: [dbPension],
      currentAge: 55,
    };

    render(
      <TrancheCrystallisationVisualiserCard
        profile={profile}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText(/Lump Sum Allowance \(LSA\) Capped:/i)).toBeInTheDocument();
    expect(screen.getByText(/exceeds your full £268,275 allowance/i)).toBeInTheDocument();
  });
});
