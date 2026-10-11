import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilestoneTimelineCard } from '../MilestoneTimelineCard';
import { UserProfile, YearProjection } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('MilestoneTimelineCard', () => {
  const sampleProjections: YearProjection[] = [
    {
      age: 40,
      year: 2026,
      isRetired: false,
      totalPot: 200000,
      totalWithdrawalAmount: 0,
      netRetirementIncome: 0,
      totalTaxPaid: 6000,
    } as unknown as YearProjection,
    {
      age: 60,
      year: 2046,
      isRetired: true,
      totalPot: 650000,
      totalWithdrawalAmount: 35000,
      netRetirementIncome: 35000,
      targetRetirementIncome: 35000,
      totalTaxPaid: 3000,
    } as unknown as YearProjection,
    {
      age: 67,
      year: 2053,
      isRetired: true,
      totalPot: 500000,
      totalWithdrawalAmount: 24000,
      netRetirementIncome: 35500,
      statePensionReceived: 11500,
      totalTaxPaid: 2000,
    } as unknown as YearProjection,
  ];

  it('renders milestone timeline header, category filters, and active milestone card', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      statePensionAge: 67,
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Visual Milestone Timeline')).toBeInTheDocument();
    expect(screen.getByText('Interactive Map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Custom Milestone Event/i })).toBeInTheDocument();

    // Category filter buttons
    expect(screen.getByRole('button', { name: /^All \(/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Retirement/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^Pensions/i })).toBeInTheDocument();
  });

  it('filters milestones by category', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      statePensionAge: 67,
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
      />
    );

    // Switch to Pensions category
    const pensionBtn = screen.getByRole('button', { name: /^Pensions/i });
    fireEvent.click(pensionBtn);

    expect(screen.getAllByText(/State Pension/i).length).toBeGreaterThan(0);

    // Switch to Retirement category
    const retireBtn = screen.getByRole('button', { name: /^Retirement/i });
    fireEvent.click(retireBtn);

    expect(screen.getAllByText(/Retirement/i).length).toBeGreaterThan(0);
  });

  it('opens and submits Add Life Event modal', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      decumulationLifeEvents: [],
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
      />
    );

    // Open Add Modal
    const addBtn = screen.getByRole('button', { name: /Add Custom Milestone Event/i });
    fireEvent.click(addBtn);

    expect(screen.getByText('Add Life Milestone Event')).toBeInTheDocument();

    // Enter name
    const nameInput = screen.getByPlaceholderText('e.g. World Tour Cruise, Wedding, Inheritance');
    fireEvent.change(nameInput, { target: { value: 'World Cruise Holiday' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Save Milestone/i });
    fireEvent.click(submitBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decumulationLifeEvents: expect.arrayContaining([
          expect.objectContaining({
            name: 'World Cruise Holiday',
            amount: 15000,
            type: 'expense',
            enabled: true,
          }),
        ]),
      })
    );
  });

  it('updates retirement age when clicking Increase Age by 1 Year button', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
      statePensionAge: 67,
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
      />
    );

    // The default selected milestone is target retirement (Age 60)
    // Click increase age
    const increaseBtn = screen.getByRole('button', { name: /Increase Age by 1 Year/i });
    fireEvent.click(increaseBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRetirementAge: 61,
      })
    );
  });

  it('supports couple planning and displays partner retirement milestone', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Robin',
      partnerName: 'Casey',
      currentAge: 45,
      partnerCurrentAge: 43,
      targetRetirementAge: 60,
      partnerTargetRetirementAge: 62,
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
      />
    );

    expect(screen.getAllByText(/Casey/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Partner Retire/i).length).toBeGreaterThan(0);
  });

  it('renders correctly in embedded mode', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 60,
    };

    const { container } = render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        isEmbedded={true}
      />
    );

    expect(container.firstChild).toHaveClass('border-t');
  });

  it('selects milestone from roadmap list, steps age down, and edits or deletes custom life events', () => {
    const onChange = vi.fn();
    const onEditEvent = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      targetRetirementAge: 62,
      decumulationLifeEvents: [
        {
          id: 'ev-1',
          name: 'Classic Car Purchase',
          age: 62,
          amount: 25000,
          type: 'expense',
          enabled: true,
          owner: 'primary',
        },
      ],
    };

    render(
      <MilestoneTimelineCard
        profile={profile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
        onEditEvent={onEditEvent}
      />
    );

    // Click on custom event card in roadmap list
    const carMilestone = screen.getByText('Classic Car Purchase');
    fireEvent.click(carMilestone);

    // Edit event button (Pencil)
    const editBtn = screen.getByTitle('Edit Custom Life Event');
    fireEvent.click(editBtn);
    expect(onEditEvent).toHaveBeenCalledWith('ev-1');

    // Decrease age button
    const decreaseBtn = screen.getByTitle('Decrease Age by 1 Year');
    fireEvent.click(decreaseBtn);
    expect(onChange).toHaveBeenCalled();

    // Delete custom event button
    const deleteBtn = screen.getByTitle('Delete Custom Life Event');
    fireEvent.click(deleteBtn);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decumulationLifeEvents: [],
      })
    );
  });

  it('handles Add Life Event modal cancellation and partner ownership selection in couple mode', () => {
    const onChange = vi.fn();
    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Natasha',
      currentAge: 40,
      targetRetirementAge: 60,
      decumulationLifeEvents: [],
    };

    render(
      <MilestoneTimelineCard
        profile={coupleProfile}
        pots={DEFAULT_POTS}
        projections={sampleProjections}
        onChange={onChange}
      />
    );

    // Open Add Modal
    const addBtn = screen.getByRole('button', { name: /Add Custom Milestone Event/i });
    fireEvent.click(addBtn);

    // Select partner ownership
    const partnerOwnerBtn = screen.getByRole('button', { name: 'Natasha' });
    fireEvent.click(partnerOwnerBtn);

    // Change type to income
    const typeSelect = screen.getByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'income' } });

    // Set Name
    const nameInput = screen.getByPlaceholderText('e.g. World Tour Cruise, Wedding, Inheritance');
    fireEvent.change(nameInput, { target: { value: 'Property Downsizing Release' } });

    // Set Amount
    const amountInput = screen.getByDisplayValue('15000');
    fireEvent.change(amountInput, { target: { value: '80000' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save Milestone/i });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decumulationLifeEvents: expect.arrayContaining([
          expect.objectContaining({
            name: 'Property Downsizing Release',
            amount: 80000,
            type: 'income',
            owner: 'partner',
          }),
        ]),
      })
    );

    // Open again and click Cancel
    fireEvent.click(screen.getByRole('button', { name: /Add Custom Milestone Event/i }));
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Add Life Milestone Event')).not.toBeInTheDocument();
  });
});

