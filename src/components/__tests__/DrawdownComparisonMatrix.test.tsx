import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DrawdownComparisonMatrix } from '../DrawdownComparisonMatrix';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('DrawdownComparisonMatrix', () => {
  it('renders matrix header, active strategy badge, and all 8 strategy cards', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      drawdownStrategy: 'tax_optimizer',
      takeLumpSumAtStart: false,
    };

    render(
      <DrawdownComparisonMatrix
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Draw Down Comparison Matrix')).toBeInTheDocument();
    expect(screen.getByText('Phased UFPLS Drip-Feed')).toBeInTheDocument();
    expect(screen.getAllByText('Tax Optimizer (Dynamic Solver)').length).toBeGreaterThan(0);
    expect(screen.getByText('Tax-Free Allowance Fill')).toBeInTheDocument();
    expect(screen.getByText('Basic Rate Band Fill')).toBeInTheDocument();
    expect(screen.getByText('Higher Rate Band Fill')).toBeInTheDocument();
    expect(screen.getByText('ISA & Cash First')).toBeInTheDocument();
    expect(screen.getByText('Cash Buffer First')).toBeInTheDocument();
    expect(screen.getByText('Pension First')).toBeInTheDocument();
    expect(screen.getByText('Pro Rata Balanced')).toBeInTheDocument();

    // Tax Optimizer should be selected
    expect(screen.getByText('Selected Strategy')).toBeInTheDocument();
  });

  it('selects a different strategy for primary and calls onChange', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      drawdownStrategy: 'isa_first',
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
    };

    render(
      <DrawdownComparisonMatrix
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Upfront 25% PCLS Taken')).toBeInTheDocument();

    // Select Basic Rate Band Fill
    const basicRateBtn = screen.getByRole('button', { name: /Select Basic Rate Band Fill/i });
    fireEvent.click(basicRateBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      drawdownStrategy: 'basic_rate_bracket',
    });
  });

  it('displays partial PCLS mode text when pclsPct is below 25', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      drawdownStrategy: 'tax_free_bracket',
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 15,
    };

    render(
      <DrawdownComparisonMatrix
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    expect(screen.getByText(/Upfront 15% PCLS/i)).toBeInTheDocument();
    expect(screen.getByText(/Partial PCLS Upfront \(15%\)/i)).toBeInTheDocument();
  });

  it('supports couple planning person selector and partner strategy selection', () => {
    const onChange = vi.fn();
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      name: 'Sam',
      partnerName: 'Charlie',
      drawdownStrategy: 'tax_optimizer',
      partnerDrawdownStrategy: 'isa_first',
      takeLumpSumAtStart: false,
      partnerTakeLumpSumAtStart: true,
      partnerPclsLumpSumPercent: 25,
    };

    render(
      <DrawdownComparisonMatrix
        profile={profile}
        pots={DEFAULT_POTS}
        onChange={onChange}
      />
    );

    // Person buttons
    expect(screen.getByRole('button', { name: /Sam/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Charlie/i })).toBeInTheDocument();

    // Switch to Partner (Charlie)
    fireEvent.click(screen.getByRole('button', { name: /Charlie/i }));

    expect(screen.getByText(/Active Lump Sum Mode for Charlie:/i)).toBeInTheDocument();
    expect(screen.getByText('Upfront 25% PCLS Taken')).toBeInTheDocument();

    // Select Tax Optimizer for Charlie
    const taxOptBtn = screen.getByRole('button', { name: /Select Tax Optimizer \(Dynamic Solver\)/i });
    fireEvent.click(taxOptBtn);

    expect(onChange).toHaveBeenCalledWith({
      partnerDrawdownStrategy: 'tax_optimizer',
    });
  });
});
