import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MortgageArbitrageInsight } from '../MortgageArbitrageInsight';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('MortgageArbitrageInsight', () => {
  it('returns null when mortgage is disabled or balance is zero', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      mortgage: {
        enabled: false,
        propertyName: 'Home',
        propertyValue: 350000,
        currentBalance: 0,
        interestRatePercent: 4.5,
        remainingTermYears: 20,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 0,
        payoffAtRetirement: false,
        deductFromRetirementIncome: true,
      },
    };

    const { container } = render(<MortgageArbitrageInsight profile={profile} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders investing verdict when investment return exceeds mortgage rate', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      postRetirementReturn: 7.0,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        propertyValue: 400000,
        currentBalance: 250000,
        interestRatePercent: 4.0,
        remainingTermYears: 20,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 300,
        payoffAtRetirement: false,
        deductFromRetirementIncome: true,
        ercEnabled: false,
      },
    };

    render(<MortgageArbitrageInsight profile={profile} />);

    expect(screen.getByText('Overpay vs Invest Arbitrage Strategy')).toBeInTheDocument();
    expect(screen.getByText('Investing Captures the Yield Spread')).toBeInTheDocument();
    expect(screen.getByText(/Your effective mortgage cost is/i)).toBeInTheDocument();
    expect(screen.getAllByText(/4.00%/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/7.00%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Invest surplus to generate an extra/i)).toBeInTheDocument();
  });

  it('renders overpaying debt verdict when mortgage rate with ERC penalty exceeds investment return', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      postRetirementReturn: 4.0,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        propertyValue: 200000,
        currentBalance: 100000,
        interestRatePercent: 5.5,
        remainingTermYears: 15,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 1500, // annual = 18000 > 10000 (10% threshold)
        payoffAtRetirement: false,
        deductFromRetirementIncome: true,
        ercEnabled: true,
        ercPercent: 3.0,
        ercThresholdPercent: 10,
      },
    };

    render(<MortgageArbitrageInsight profile={profile} />);

    expect(screen.getByText('Overpaying Guarantees the Best Return')).toBeInTheDocument();
    expect(screen.getByText(/includes 3% ERC penalty/i)).toBeInTheDocument();
    expect(screen.getByText(/Overpay debt to save an extra/i)).toBeInTheDocument();
  });

  it('handles hypothetical monthly surplus and lump sum overpayments', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 40,
      mortgage: {
        enabled: true,
        propertyName: 'Home',
        propertyValue: 300000,
        currentBalance: 180000,
        interestRatePercent: 3.8,
        remainingTermYears: 10,
        repaymentType: 'repayment',
        regularMonthlyOverpayment: 0, // hypothetical surplus triggers £500/mo
        payoffAtRetirement: false,
        deductFromRetirementIncome: true,
        lumpSumOverpayments: [
          { id: 'ls-1', name: 'Bonus Lump Sum', age: 45, amount: 20000, enabled: true },
        ],
      },
    };

    render(<MortgageArbitrageInsight profile={profile} />);

    expect(screen.getByText(/10-Year Trajectory/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Yield Arbitrage Heatmap/i)).toBeInTheDocument();
  });
});
