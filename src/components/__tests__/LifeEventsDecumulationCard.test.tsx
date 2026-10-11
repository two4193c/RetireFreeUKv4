import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LifeEventsDecumulationCard } from '../LifeEventsDecumulationCard';
import { UserProfile, DecumulationLifeEvent, InvestmentPots, YearProjection } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('LifeEventsDecumulationCard', () => {
  const mockPots: InvestmentPots = {
    ...DEFAULT_POTS,
    cashSavingsBalance: 50000,
    stocksAndSharesIsaBalance: 100000,
    cashIsaBalance: 20000,
    sippBalance: 300000,
    giaBalance: 10000,
  };

  const mockProjections: YearProjection[] = [
    {
      year: 2026,
      age: 60,
      cashSavingsPot: 50000,
      stocksAndSharesIsaPot: 100000,
      cashIsaPot: 20000,
      pensionPot: 300000,
      giaPot: 10000,
      totalPortfolioValue: 480000,
      realTotalPortfolio: 480000,
    } as any,
    {
      year: 2031,
      age: 65,
      cashSavingsPot: 40000,
      stocksAndSharesIsaPot: 120000,
      cashIsaPot: 25000,
      pensionPot: 350000,
      giaPot: 15000,
      totalPortfolioValue: 550000,
      realTotalPortfolio: 500000,
    } as any,
  ];

  it('renders empty state when no life events exist', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: [],
    };

    render(
      <LifeEventsDecumulationCard
        profile={profile}
        pots={mockPots}
        projections={mockProjections}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Life Events')).toBeInTheDocument();
    expect(screen.getByText('No Life Events Planned Yet')).toBeInTheDocument();
    expect(screen.getByText('Downsizing')).toBeInTheDocument();
    expect(screen.getByText('Inheritance')).toBeInTheDocument();
    expect(screen.getByText('New Vehicle')).toBeInTheDocument();
  });

  it('renders existing life events, KPI banners, and allows deletion', () => {
    const onChange = vi.fn();
    const existingEvents: DecumulationLifeEvent[] = [
      {
        id: 'event-1',
        name: 'Downsizing House',
        owner: 'primary',
        type: 'income',
        amount: 80000,
        age: 65,
        targetPot: 'cash_savings',
        inflationLinked: true,
        enabled: true,
      },
      {
        id: 'event-2',
        name: 'Campervan Purchase',
        owner: 'primary',
        type: 'expense',
        amount: 25000,
        age: 60,
        targetPot: 'cash_savings',
        inflationLinked: true,
        enabled: true,
      },
    ];

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: existingEvents,
    };

    render(
      <LifeEventsDecumulationCard
        profile={profile}
        pots={mockPots}
        projections={mockProjections}
        onChange={onChange}
      />
    );

    expect(screen.getAllByText('Downsizing House').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Campervan Purchase').length).toBeGreaterThan(0);
    expect(screen.getByText('+£80,000')).toBeInTheDocument();
    expect(screen.getByText('-£25,000')).toBeInTheDocument();
    expect(screen.getByText('+£55,000')).toBeInTheDocument(); // Net impact

    // Delete Campervan Purchase
    const deleteBtns = screen.getAllByTitle('Remove event');
    expect(deleteBtns.length).toBe(2);
    fireEvent.click(deleteBtns[1]);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decumulationLifeEvents: [existingEvents[0]],
      })
    );
  });

  it('opens quick-add preset modal and adds a new life event', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
      decumulationLifeEvents: [],
    };

    render(
      <LifeEventsDecumulationCard
        profile={profile}
        pots={mockPots}
        projections={mockProjections}
        onChange={onChange}
      />
    );

    // Click Downsizing preset
    fireEvent.click(screen.getByText('Downsizing'));

    // Modal should be open
    expect(screen.getByText('Add Life Event')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Property Downsizing Lump Sum');
    expect(nameInput).toBeInTheDocument();

    // Change name
    fireEvent.change(nameInput, { target: { value: 'Bungalow Sale' } });

    // Save
    const addBtn = screen.getByRole('button', { name: 'Add Event' });
    fireEvent.click(addBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    const updatedEvents = onChange.mock.calls[0][0].decumulationLifeEvents;
    expect(updatedEvents).toHaveLength(1);
    expect(updatedEvents[0].name).toBe('Bungalow Sale');
    expect(updatedEvents[0].type).toBe('income');
  });

  it('edits an existing event in the modal', () => {
    const onChange = vi.fn();
    const existingEvents: DecumulationLifeEvent[] = [
      {
        id: 'event-1',
        name: 'World Trip',
        owner: 'primary',
        type: 'expense',
        amount: 15000,
        age: 60,
        targetPot: 'cash_savings',
        inflationLinked: true,
        enabled: true,
      },
    ];

    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: existingEvents,
    };

    render(
      <LifeEventsDecumulationCard
        profile={profile}
        pots={mockPots}
        projections={mockProjections}
        onChange={onChange}
      />
    );

    const editBtn = screen.getByTitle('Edit event');
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Life Event')).toBeInTheDocument();
    const amountInput = screen.getByDisplayValue('15000');
    fireEvent.change(amountInput, { target: { value: '18000' } });

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decumulationLifeEvents: [
          expect.objectContaining({
            id: 'event-1',
            amount: 18000,
          }),
        ],
      })
    );
  });

  it('handles couple planning owner filters', () => {
    const onChange = vi.fn();
    const events: DecumulationLifeEvent[] = [
      {
        id: 'evt-1',
        name: 'Primary Car',
        owner: 'primary',
        type: 'expense',
        amount: 20000,
        age: 60,
        targetPot: 'cash_savings',
        inflationLinked: true,
        enabled: true,
      },
      {
        id: 'evt-2',
        name: 'Partner Studio Upgrade',
        owner: 'partner',
        type: 'expense',
        amount: 10000,
        age: 60,
        targetPot: 'cash_savings',
        inflationLinked: true,
        enabled: true,
      },
    ];

    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Alice',
      partnerName: 'Bob',
      decumulationLifeEvents: events,
    };

    render(
      <LifeEventsDecumulationCard
        profile={coupleProfile}
        pots={mockPots}
        projections={mockProjections}
        onChange={onChange}
      />
    );

    // Both should be visible initially (All filter)
    expect(screen.getAllByText('Primary Car').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partner Studio Upgrade').length).toBeGreaterThan(0);

    // Filter by Alice (Primary)
    fireEvent.click(screen.getByRole('button', { name: 'Alice' }));
    expect(screen.getAllByText('Primary Car').length).toBeGreaterThan(0);
    // In LifeEvents list, Partner Studio Upgrade is hidden, but in embedded milestone timeline it might also filter or show.
    // The filter specifically filters filteredEvents in the LifeEvents card list
    const partnerItems = document.querySelectorAll('h4.text-sm.font-bold');
    const partnerTitles = Array.from(partnerItems).map(el => el.textContent);
    expect(partnerTitles).toContain('Primary Car');
    expect(partnerTitles).not.toContain('Partner Studio Upgrade');

    // Filter by Bob (Partner)
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    const partnerItems2 = document.querySelectorAll('h4.text-sm.font-bold');
    const partnerTitles2 = Array.from(partnerItems2).map(el => el.textContent);
    expect(partnerTitles2).not.toContain('Primary Car');
    expect(partnerTitles2).toContain('Partner Studio Upgrade');

    // Reset to All
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    const allItems = document.querySelectorAll('h4.text-sm.font-bold');
    const allTitles = Array.from(allItems).map(el => el.textContent);
    expect(allTitles).toContain('Primary Car');
    expect(allTitles).toContain('Partner Studio Upgrade');
  });

  it('renders correctly in studio mode', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      decumulationLifeEvents: [],
    };

    render(
      <LifeEventsDecumulationCard
        profile={profile}
        pots={mockPots}
        projections={mockProjections}
        onChange={vi.fn()}
        isStudioMode={true}
      />
    );

    expect(screen.getByText('Add Event')).toBeInTheDocument();
    // In studio mode, the quick-add preset buttons grid is hidden
    expect(screen.queryByText('Downsizing')).not.toBeInTheDocument();
  });
});
