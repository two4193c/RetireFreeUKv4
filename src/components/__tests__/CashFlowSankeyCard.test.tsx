import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CashFlowSankeyCard } from '../CashFlowSankeyCard';
import { UserProfile, YearProjection } from '../../types';

import { DEFAULT_PROFILE } from '../../utils/defaultData';

// Mock ResizeObserver for Recharts / Responsive components if any
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

const mockProfile: UserProfile = {
  ...DEFAULT_PROFILE,
  currentAge: 30,
  targetRetirementAge: 60,
  isCouplePlanning: true,
  name: 'John',
  partnerName: 'Jane',
  targetRetirementIncomeAnnual: 40000,
  grossAnnualSalary: 50000,
  partnerGrossAnnualSalary: 40000,
};

const mockProjections: YearProjection[] = [
  {
    age: 30,
    isRetired: false,
    primaryStatePensionReceived: 0,
    partnerStatePensionReceived: 0,
    statePensionReceived: 0,
    dbPensionIncomeReceived: 0,
    annuityIncomeReceived: 0,
  } as unknown as YearProjection,
];

describe('CashFlowSankeyCard', () => {
  it('renders the Sankey diagram header and view mode toggles', () => {
    render(<CashFlowSankeyCard projections={mockProjections} profile={mockProfile} />);
    
    expect(screen.getByText(/Interactive Cash Flow Waterfall & Sankey Diagram/i)).toBeInTheDocument();
    
    expect(screen.getByText('Combined')).toBeInTheDocument();
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('view mode toggles correctly update the internal state', () => {
    render(<CashFlowSankeyCard projections={mockProjections} profile={mockProfile} />);
    
    const combinedBtn = screen.getByText('Combined');
    const johnBtn = screen.getByText('John');
    
    // Default mode is 'combined'
    expect(combinedBtn.closest('button')).toHaveClass('text-sky-600');
    expect(johnBtn.closest('button')).not.toHaveClass('text-sky-600');

    // Click 'John' (primary view mode)
    fireEvent.click(johnBtn);

    expect(johnBtn.closest('button')).toHaveClass('text-sky-600');
    expect(combinedBtn.closest('button')).not.toHaveClass('text-sky-600');
  });

  it('handles rendering when pots data is empty or populated', () => {
    const emptyPots = undefined;
    const populatedPots = {
      primary: { pensionSipp: 10000, isaStocks: 5000, cashGia: 1000 },
      partner: { pensionSipp: 8000, isaStocks: 4000, cashGia: 500 }
    } as any;
    
    const { rerender } = render(
      <CashFlowSankeyCard 
        projections={mockProjections} 
        profile={mockProfile} 
        pots={emptyPots} 
      />
    );
    
    expect(screen.getByText('John')).toBeInTheDocument();
    
    rerender(
      <CashFlowSankeyCard 
        projections={mockProjections} 
        profile={mockProfile} 
        pots={populatedPots} 
      />
    );
    
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
