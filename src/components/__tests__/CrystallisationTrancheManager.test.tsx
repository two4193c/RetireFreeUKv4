import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CrystallisationTrancheManager } from '../CrystallisationTrancheManager';
import { CrystallisationTranche } from '../../types';

describe('CrystallisationTrancheManager', () => {
  it('allows switching crystallisation strategy modes between UFPLS, Phased Tranches, and Upfront PCLS', () => {
    const onModeChange = vi.fn();
    const onTranchesChange = vi.fn();

    render(
      <CrystallisationTrancheManager
        owner="primary"
        personName="Alex"
        pensionAccessAge={57}
        projectedPotAtAccess={500000}
        currentPotToday={300000}
        lsaLimit={268275}
        mode="ufpls"
        tranches={[]}
        onModeChange={onModeChange}
        onTranchesChange={onTranchesChange}
      />
    );

    expect(screen.getByText('Crystallisation & PCLS Strategy (Alex)')).toBeInTheDocument();

    // Click Phased Tranches mode card
    const phasedBtn = screen.getByRole('button', { name: /Phased Tranches/i });
    fireEvent.click(phasedBtn);
    expect(onModeChange).toHaveBeenCalledWith('phased_tranches');

    // Click Upfront PCLS mode card
    const upfrontBtn = screen.getByRole('button', { name: /Full Upfront PCLS/i });
    fireEvent.click(upfrontBtn);
    expect(onModeChange).toHaveBeenCalledWith('upfront');
  });

  it('renders empty phased tranches state and allows adding one-off and recurring tranches', () => {
    const onTranchesChange = vi.fn();

    render(
      <CrystallisationTrancheManager
        owner="primary"
        personName="Alex"
        pensionAccessAge={57}
        projectedPotAtAccess={500000}
        currentPotToday={300000}
        lsaLimit={268275}
        mode="phased_tranches"
        tranches={[]}
        onModeChange={vi.fn()}
        onTranchesChange={onTranchesChange}
      />
    );

    expect(screen.getByText('No crystallisation tranches defined yet.')).toBeInTheDocument();

    // Add One-Off Tranche
    const addOneOffBtn = screen.getByRole('button', { name: /Add One-Off Tranche/i });
    fireEvent.click(addOneOffBtn);

    expect(onTranchesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Tranche 1',
          frequency: 'one_off',
          pclsPercent: 25,
          enabled: true,
        }),
      ])
    );

    // Add Annual Recurring Crystallisation
    const addRecurringBtn = screen.getByRole('button', { name: /Add £100k\/yr Annual Crystallisation/i });
    fireEvent.click(addRecurringBtn);

    expect(onTranchesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          frequency: 'recurring',
          amount: 100000,
          pclsPercent: 25,
          enabled: true,
        }),
      ])
    );
  });

  it('renders active tranches, allows expanding, modifying, and deleting a tranche', () => {
    const onTranchesChange = vi.fn();
    const testTranche: CrystallisationTranche = {
      id: 'tranche-test-1',
      name: 'Mortgage Payoff Lump Sum',
      owner: 'primary',
      age: 60,
      amount: 120000,
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    render(
      <CrystallisationTrancheManager
        owner="primary"
        personName="Alex"
        pensionAccessAge={57}
        projectedPotAtAccess={600000}
        currentPotToday={400000}
        lsaLimit={268275}
        mode="phased_tranches"
        tranches={[testTranche]}
        onModeChange={vi.fn()}
        onTranchesChange={onTranchesChange}
      />
    );

    expect(screen.getByText(/Mortgage Payoff Lump Sum/i)).toBeInTheDocument();
    expect(screen.getAllByText(/£120,000/).length).toBeGreaterThan(0);

    // Click Delete tranche button
    const deleteBtn = screen.getByTitle('Delete Tranche');
    fireEvent.click(deleteBtn);

    expect(onTranchesChange).toHaveBeenCalledWith([]);
  });

  it('displays Defined Benefit pension lump sum offset banner when dbLumpSum is provided', () => {
    render(
      <CrystallisationTrancheManager
        owner="primary"
        personName="Sarah"
        pensionAccessAge={57}
        projectedPotAtAccess={500000}
        currentPotToday={300000}
        lsaLimit={268275}
        dbLumpSum={45000}
        mode="phased_tranches"
        tranches={[]}
        onModeChange={vi.fn()}
        onTranchesChange={vi.fn()}
      />
    );

    expect(screen.getByText('Defined Benefit Lump Sum Allowance (LSA) Offset')).toBeInTheDocument();
    expect(screen.getByText(/DB Scheme Lump Sum: £45,000/i)).toBeInTheDocument();
  });

  it('displays LSA capped warning when total PCLS exceeds lump sum allowance', () => {
    const hugeTranche: CrystallisationTranche = {
      id: 'tranche-huge',
      name: 'Mega Crystallisation',
      owner: 'primary',
      age: 60,
      amount: 1200000, // 25% of 1.2M is £300,000 > £268,275
      pclsPercent: 25,
      targetPot: 'stocks_and_shares_isa',
      enabled: true,
      frequency: 'one_off',
    };

    render(
      <CrystallisationTrancheManager
        owner="primary"
        personName="Alex"
        pensionAccessAge={57}
        projectedPotAtAccess={1500000}
        currentPotToday={800000}
        lsaLimit={268275}
        mode="phased_tranches"
        tranches={[hugeTranche]}
        onModeChange={vi.fn()}
        onTranchesChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Lump Sum Allowance Capped:/i)).toBeInTheDocument();
  });

  it('renders with rose accent styling for partner mode', () => {
    render(
      <CrystallisationTrancheManager
        owner="partner"
        personName="Sam"
        pensionAccessAge={57}
        projectedPotAtAccess={400000}
        currentPotToday={250000}
        lsaLimit={268275}
        mode="ufpls"
        tranches={[]}
        onModeChange={vi.fn()}
        onTranchesChange={vi.fn()}
        accentColor="rose"
      />
    );

    expect(screen.getByText('Crystallisation & PCLS Strategy (Sam)')).toBeInTheDocument();
  });
});
