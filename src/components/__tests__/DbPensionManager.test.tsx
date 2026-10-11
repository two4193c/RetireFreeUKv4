import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DbPensionManager } from '../DbPensionManager';
import { UserProfile, DbPension } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('DbPensionManager', () => {
  it('renders empty state when no DB pensions are present and allows opening add modal', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dbPensions: [],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Defined Benefit Pensions')).toBeInTheDocument();
    expect(screen.getByText('No Defined Benefit Pensions Added')).toBeInTheDocument();

    // Open add modal
    const addBtn = screen.getByRole('button', { name: /Add DB Pension Scheme/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole('heading', { name: 'Add DB Pension' })).toBeInTheDocument();

    // Scheme Name input
    const nameInput = screen.getByPlaceholderText('e.g. NHS Pension');
    fireEvent.change(nameInput, { target: { value: 'Civil Service Alpha' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPensions: expect.arrayContaining([
          expect.objectContaining({
            name: 'Civil Service Alpha',
            annualIncome: 10000,
            startAge: 65,
          }),
        ]),
      })
    );
  });

  it('renders active DB pensions with income & lump sum summary cards', () => {
    const testDb: DbPension = {
      id: 'db-1',
      name: 'NHS 1995 Section',
      owner: 'primary',
      startAge: 60,
      annualIncome: 15000,
      taxFreeLumpSum: 45000,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dbPensions: [testDb],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('NHS 1995 Section')).toBeInTheDocument();
    expect(screen.getByText('1 Active')).toBeInTheDocument();
    expect(screen.getAllByText('£15,000/yr').length).toBeGreaterThan(0);
    expect(screen.getByText('£45,000')).toBeInTheDocument();
  });

  it('allows editing an existing DB pension via modal', () => {
    const onChange = vi.fn();
    const testDb: DbPension = {
      id: 'db-2',
      name: 'Teachers Pension Scheme',
      owner: 'primary',
      startAge: 65,
      annualIncome: 12000,
      taxFreeLumpSum: 36000,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dbPensions: [testDb],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={onChange}
      />
    );

    // Click edit button
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: 'Edit DB Pension' })).toBeInTheDocument();

    // Change scheme name
    const nameInput = screen.getByDisplayValue('Teachers Pension Scheme');
    fireEvent.change(nameInput, { target: { value: 'Teachers TPS Enhanced' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPensions: [
          expect.objectContaining({
            id: 'db-2',
            name: 'Teachers TPS Enhanced',
          }),
        ],
      })
    );
  });

  it('allows deleting an existing DB pension', () => {
    const onChange = vi.fn();
    const testDb: DbPension = {
      id: 'db-3',
      name: 'Old Company Final Salary',
      owner: 'primary',
      startAge: 65,
      annualIncome: 8000,
      taxFreeLumpSum: 24000,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dbPensions: [testDb],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={onChange}
      />
    );

    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dbPensions: [],
      })
    );
  });

  it('supports couple planning mode with person filtering tabs', () => {
    const primaryDb: DbPension = {
      id: 'db-p1',
      name: 'Alex NHS Pension',
      owner: 'primary',
      startAge: 60,
      annualIncome: 14000,
      taxFreeLumpSum: 42000,
      inflationLinked: true,
      enabled: true,
    };

    const partnerDb: DbPension = {
      id: 'db-p2',
      name: 'Sam USS Pension',
      owner: 'partner',
      startAge: 65,
      annualIncome: 10000,
      taxFreeLumpSum: 30000,
      inflationLinked: true,
      enabled: true,
    };

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alex',
      partnerName: 'Sam',
      dbPensions: [primaryDb, partnerDb],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Alex NHS Pension')).toBeInTheDocument();
    expect(screen.getByText('Sam USS Pension')).toBeInTheDocument();

    // Click Alex (Primary) filter button
    const alexBtn = screen.getByRole('button', { name: /Alex/i });
    fireEvent.click(alexBtn);

    expect(screen.getByText('Alex NHS Pension')).toBeInTheDocument();
    expect(screen.queryByText('Sam USS Pension')).toBeNull();

    // Click Sam (Partner) filter button
    const samBtn = screen.getByRole('button', { name: /Sam/i });
    fireEvent.click(samBtn);

    expect(screen.getByText('Sam USS Pension')).toBeInTheDocument();
    expect(screen.queryByText('Alex NHS Pension')).toBeNull();

    // Click All filter button
    const allBtn = screen.getByRole('button', { name: /All/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Alex NHS Pension')).toBeInTheDocument();
    expect(screen.getByText('Sam USS Pension')).toBeInTheDocument();
  });

  it('renders in studio mode cleanly with compact styling', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      dbPensions: [],
    };

    render(
      <DbPensionManager
        profile={profile}
        onChange={vi.fn()}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Defined Benefit Pensions')).toBeInTheDocument();
  });
});
