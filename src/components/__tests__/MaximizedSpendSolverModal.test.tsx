import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MaximizedSpendSolverModal } from '../MaximizedSpendSolverModal';
import { solveMaximizedSpend } from '../../utils/maximizedSpendSolver';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('MaximizedSpendSolverModal', () => {
  let originalWorker: any;

  beforeEach(() => {
    originalWorker = global.Worker;
    class MockWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage(message: any) {
        if (message.type === 'SOLVE_MAX_SPEND') {
          const result = solveMaximizedSpend(message.payload);
          setTimeout(() => {
            this.onmessage?.({
              data: {
                id: message.id,
                type: 'SOLVE_MAX_SPEND_SUCCESS',
                payload: result,
              },
            } as MessageEvent);
          }, 0);
        }
      }
      terminate() {}
    }
    global.Worker = MockWorker as any;
  });

  afterEach(() => {
    global.Worker = originalWorker;
  });

  const testProfile: UserProfile = {
    ...DEFAULT_PROFILE,
    currentAge: 55,
    targetRetirementAge: 60,
    lifeExpectancyAge: 90,
    targetRetirementIncomeAnnual: 25000,
  };

  const testPots: InvestmentPots = {
    ...DEFAULT_POTS,
    workplacePensionBalance: 350000,
    stocksAndSharesIsaBalance: 100000,
    cashSavingsBalance: 50000,
  };

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <MaximizedSpendSolverModal
        isOpen={false}
        onClose={vi.fn()}
        profile={testProfile}
        pots={testPots}
        onApplyMaximizedSpend={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal, solves for max spend, and displays KPIs', async () => {
    const onClose = vi.fn();
    const onApply = vi.fn();

    render(
      <MaximizedSpendSolverModal
        isOpen={true}
        onClose={onClose}
        profile={testProfile}
        pots={testPots}
        onApplyMaximizedSpend={onApply}
      />
    );

    expect(screen.getByText('Maximized Spend Solver')).toBeInTheDocument();
    expect(screen.getByText('Die With Zero Engine')).toBeInTheDocument();

    // Wait for the worker to return the calculation
    await waitFor(() => {
      expect(screen.getByText(/Annual Income Boost/i)).toBeInTheDocument();
      expect(screen.getByText(/Lifetime Extra Cash Unlocked/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Target Plan End Age/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Legacy Buffer/i)).toBeInTheDocument();
  });

  it('allows changing target end age and target legacy buffer presets', async () => {
    render(
      <MaximizedSpendSolverModal
        isOpen={true}
        onClose={vi.fn()}
        profile={testProfile}
        pots={testPots}
        onApplyMaximizedSpend={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Target Plan End Age/i)).toBeInTheDocument();
    });

    // Click age 85 preset
    const age85Btn = screen.getByRole('button', { name: '85' });
    fireEvent.click(age85Btn);

    // Click legacy buffer preset £50k
    const buffer50kBtn = screen.getByRole('button', { name: '£50k' });
    fireEvent.click(buffer50kBtn);

    expect(screen.getByText('£50,000')).toBeInTheDocument();
  });

  it('supports couple planning scope selection when couple planning is enabled', async () => {
    const coupleProfile: UserProfile = {
      ...testProfile,
      isCouplePlanning: true,
      partnerName: 'Alex',
    };

    render(
      <MaximizedSpendSolverModal
        isOpen={true}
        onClose={vi.fn()}
        profile={coupleProfile}
        pots={testPots}
        onApplyMaximizedSpend={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Couple Planning Active/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/As a Couple/i)).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();

    // Select partner scope
    const partnerBtn = screen.getByRole('button', { name: /Alex/i });
    fireEvent.click(partnerBtn);
  });

  it('allows changing spending pattern and adjusting target income slider', async () => {
    render(
      <MaximizedSpendSolverModal
        isOpen={true}
        onClose={vi.fn()}
        profile={testProfile}
        pots={testPots}
        onApplyMaximizedSpend={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Drawdown Spending Pattern/i)).toBeInTheDocument();
    });

    const patternSelect = screen.getByRole('combobox');
    fireEvent.change(patternSelect, { target: { value: 'front_loaded' } });
    expect(patternSelect).toHaveValue('front_loaded');

    // Adjust target income using number input
    const numberInputs = screen.getAllByRole('spinbutton');
    if (numberInputs.length > 0) {
      fireEvent.change(numberInputs[0], { target: { value: '32000' } });
    }
  });

  it('calls onApplyMaximizedSpend and onClose when user clicks apply', async () => {
    const onApply = vi.fn();
    const onClose = vi.fn();

    render(
      <MaximizedSpendSolverModal
        isOpen={true}
        onClose={onClose}
        profile={testProfile}
        pots={testPots}
        onApplyMaximizedSpend={onApply}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Apply Maximized Spend/i })).toBeInTheDocument();
    });

    const applyBtn = screen.getByRole('button', { name: /Apply Maximized Spend/i });
    fireEvent.click(applyBtn);

    expect(onApply).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
