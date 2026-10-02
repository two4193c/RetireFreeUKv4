import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AccumulationLedgerCard } from '../AccumulationLedgerCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('AccumulationLedgerCard Default View Mode', () => {
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

    // The active button has 'bg-white' and 'text-purple-700'
    expect(monthlyButton.className).toContain('bg-white');
    expect(monthlyButton.className).toContain('text-purple-700');

    // The inactive buttons do not have 'bg-white'
    expect(annualButton.className).not.toContain('bg-white');
    expect(groupedButton.className).not.toContain('bg-white');
  });

  it('respects defaultExpandMode override when explicitly provided', () => {
    render(
      <AccumulationLedgerCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        defaultExpandMode="annual"
      />
    );

    const annualButton = screen.getByRole('button', { name: /Annual Items/i });
    const monthlyButton = screen.getByRole('button', { name: /Monthly Items/i });

    expect(annualButton.className).toContain('bg-white');
    expect(monthlyButton.className).not.toContain('bg-white');
  });
});
