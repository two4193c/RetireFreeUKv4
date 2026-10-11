import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SwrMatrixCard } from '../SwrMatrixCard';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('SwrMatrixCard', () => {
  it('renders matrix card with controls and table columns', () => {
    render(
      <SwrMatrixCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
      />
    );

    expect(screen.getByText(/Safe Withdrawal Rate \(SWR\) Heatmap Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Retirement Horizon/i)).toBeInTheDocument();
    expect(screen.getByText(/Initial SWR \(%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Age 50/i)).toBeInTheDocument();
    expect(screen.getByText(/Age 65/i)).toBeInTheDocument();
  });

  it('updates horizon years when preset buttons are clicked and triggers callback', () => {
    const onHorizonChange = vi.fn();

    render(
      <SwrMatrixCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        horizonYears={30}
        onHorizonYearsChange={onHorizonChange}
      />
    );

    const btn40 = screen.getByText('40y');
    fireEvent.click(btn40);

    expect(onHorizonChange).toHaveBeenCalledWith(40);
  });

  it('updates equity allocation via range slider and fires onChange', () => {
    const onEquityChange = vi.fn();

    render(
      <SwrMatrixCard
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        equityPct={60}
        onEquityPctChange={onEquityChange}
      />
    );

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '80' } });

    expect(onEquityChange).toHaveBeenCalledWith(80);
  });
});
