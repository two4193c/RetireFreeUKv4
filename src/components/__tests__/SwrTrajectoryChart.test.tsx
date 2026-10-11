import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SwrTrajectoryChart } from '../SwrTrajectoryChart';
import { YearProjection, UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('SwrTrajectoryChart', () => {
  const mockProjections: YearProjection[] = [
    {
      age: 58,
      year: 2026,
      isRetired: false,
      totalPot: 500000,
      totalWithdrawalAmount: 0,
    } as any,
    {
      age: 60,
      year: 2028,
      isRetired: true,
      totalPot: 500000,
      totalWithdrawalAmount: 20000,
    } as any,
    {
      age: 65,
      year: 2033,
      isRetired: true,
      totalPot: 480000,
      totalWithdrawalAmount: 25000,
    } as any,
    {
      age: 70,
      year: 2038,
      isRetired: true,
      totalPot: 400000,
      totalWithdrawalAmount: 30000,
    } as any,
  ];

  it('renders trajectory chart and computes peak effective withdrawal rate', () => {
    render(
      <SwrTrajectoryChart
        projections={mockProjections}
        profile={DEFAULT_PROFILE}
      />
    );

    expect(screen.getByText('Effective Withdrawal Rate Trajectory Chart')).toBeInTheDocument();
    expect(screen.getByText('Year-by-Year % Overlay')).toBeInTheDocument();
    expect(screen.getByText('Peak Effective Withdrawal Rate:')).toBeInTheDocument();

    // Peak rate is at age 70: 30000 / (400000 + 30000) * 100 = ~6.98%
    expect(screen.getByText(/at Age 70/i)).toBeInTheDocument();
  });

  it('handles empty retired projections without throwing', () => {
    const preRetirementOnly: YearProjection[] = [
      {
        age: 50,
        year: 2026,
        isRetired: false,
        totalPot: 200000,
        totalWithdrawalAmount: 0,
      } as any,
    ];

    render(
      <SwrTrajectoryChart
        projections={preRetirementOnly}
        profile={DEFAULT_PROFILE}
      />
    );

    expect(screen.getByText('Effective Withdrawal Rate Trajectory Chart')).toBeInTheDocument();
    expect(screen.getByText(/0% at Age 0/i)).toBeInTheDocument();
  });

  it('handles fallback drawdown calculation when totalWithdrawalAmount is 0 but component drawdowns exist', () => {
    const fallbackProjections: YearProjection[] = [
      {
        age: 62,
        year: 2030,
        isRetired: true,
        totalPot: 300000,
        totalWithdrawalAmount: 0,
        pensionDrawdown: 10000,
        isaDrawdown: 5000,
        cashDrawdown: 0,
      } as any,
    ];

    render(
      <SwrTrajectoryChart
        projections={fallbackProjections}
        profile={DEFAULT_PROFILE}
      />
    );

    expect(screen.getByText('Effective Withdrawal Rate Trajectory Chart')).toBeInTheDocument();
    expect(screen.getByText(/at Age 62/i)).toBeInTheDocument();
  });
});
