import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FixedIncomeManager } from '../FixedIncomeManager';
import { UserProfile, FixedIncomeStream } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('FixedIncomeManager', () => {
  it('renders empty state and allows adding a tax-free PIP stream via quick preset', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fixedIncomeStreams: [],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Fixed Income & Disability Benefits')).toBeInTheDocument();
    expect(screen.getByText('No Fixed Income Streams Added')).toBeInTheDocument();

    // Click Add Tax-Free PIP Payment
    const addPipBtn = screen.getByRole('button', { name: /\+ Add PIP \(Tax-Free\)/i });
    fireEvent.click(addPipBtn);

    expect(screen.getByRole('heading', { name: 'Add Fixed Income' })).toBeInTheDocument();

    // Verify draft has PIP name prefilled
    expect(screen.getByDisplayValue('Personal Independence Payment (PIP)')).toBeInTheDocument();

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fixedIncomeStreams: expect.arrayContaining([
          expect.objectContaining({
            name: 'Personal Independence Payment (PIP)',
            type: 'tax_free',
            annualAmount: 8900,
          }),
        ]),
      })
    );
  });

  it('renders active streams with tax-free and taxable KPI summary cards', () => {
    const pipStream: FixedIncomeStream = {
      id: 'stream-1',
      name: 'PIP Higher Mobility',
      owner: 'primary',
      type: 'tax_free',
      annualAmount: 8900,
      startAge: 40,
      inflationLinked: true,
      enabled: true,
    };

    const rentalStream: FixedIncomeStream = {
      id: 'stream-2',
      name: 'Buy-to-Let Flat Income',
      owner: 'primary',
      type: 'taxable',
      annualAmount: 12000,
      startAge: 60,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fixedIncomeStreams: [pipStream, rentalStream],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('PIP Higher Mobility')).toBeInTheDocument();
    expect(screen.getByText('Buy-to-Let Flat Income')).toBeInTheDocument();

    // Summary KPIs
    expect(screen.getByText('2 Active')).toBeInTheDocument();
    expect(screen.getAllByText('£8,900/yr').length).toBeGreaterThan(0);
    expect(screen.getAllByText('£12,000/yr').length).toBeGreaterThan(0);
  });

  it('allows editing an existing income stream via modal', () => {
    const onChange = vi.fn();
    const testStream: FixedIncomeStream = {
      id: 'stream-edit-1',
      name: 'Consulting Advisory',
      owner: 'primary',
      type: 'taxable',
      annualAmount: 10000,
      startAge: 60,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fixedIncomeStreams: [testStream],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Click edit button
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: 'Edit Fixed Income' })).toBeInTheDocument();

    // Update income name
    const nameInput = screen.getByDisplayValue('Consulting Advisory');
    fireEvent.change(nameInput, { target: { value: 'Senior Consulting Advisory' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fixedIncomeStreams: [
          expect.objectContaining({
            id: 'stream-edit-1',
            name: 'Senior Consulting Advisory',
          }),
        ],
      })
    );
  });

  it('allows deleting an existing income stream', () => {
    const onChange = vi.fn();
    const testStream: FixedIncomeStream = {
      id: 'stream-del-1',
      name: 'Old Grant',
      owner: 'primary',
      type: 'tax_free',
      annualAmount: 3000,
      startAge: 55,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fixedIncomeStreams: [testStream],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={onChange}
      />
    );

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fixedIncomeStreams: [],
      })
    );
  });

  it('supports couple planning mode with person filtering tabs', () => {
    const primaryStream: FixedIncomeStream = {
      id: 'stream-p1',
      name: 'Alex PIP',
      owner: 'primary',
      type: 'tax_free',
      annualAmount: 8900,
      startAge: 50,
      inflationLinked: true,
      enabled: true,
    };

    const partnerStream: FixedIncomeStream = {
      id: 'stream-p2',
      name: 'Sam Rental',
      owner: 'partner',
      type: 'taxable',
      annualAmount: 9000,
      startAge: 55,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Sam',
      fixedIncomeStreams: [primaryStream, partnerStream],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Alex PIP')).toBeInTheDocument();
    expect(screen.getByText('Sam Rental')).toBeInTheDocument();

    // Filter by Alex
    const alexBtn = screen.getByRole('button', { name: /Alex/i });
    fireEvent.click(alexBtn);

    expect(screen.getByText('Alex PIP')).toBeInTheDocument();
    expect(screen.queryByText('Sam Rental')).toBeNull();

    // Filter by Sam
    const samBtn = screen.getByRole('button', { name: /Sam/i });
    fireEvent.click(samBtn);

    expect(screen.getByText('Sam Rental')).toBeInTheDocument();
    expect(screen.queryByText('Alex PIP')).toBeNull();

    // Filter by All
    const allBtn = screen.getByRole('button', { name: /All/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Alex PIP')).toBeInTheDocument();
    expect(screen.getByText('Sam Rental')).toBeInTheDocument();
  });

  it('renders in studio mode with compact styling', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      fixedIncomeStreams: [],
    };

    render(
      <FixedIncomeManager
        profile={profile}
        onChange={vi.fn()}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Fixed Income & Disability Benefits')).toBeInTheDocument();
  });
});
