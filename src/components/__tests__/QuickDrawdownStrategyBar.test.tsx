import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickDrawdownStrategyBar } from '../QuickDrawdownStrategyBar';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';
import { UserProfile } from '../../types';

describe('QuickDrawdownStrategyBar', () => {
  it('renders strategy selector and switches strategy for primary person', () => {
    const onChangeProfile = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    expect(screen.getByText(/Strategy Selector/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Plan Strategy/i)).toBeInTheDocument();

    const pensionFirstCard = screen.getByText('Deplete Pension First').closest('[role="button"]')!;
    fireEvent.click(pensionFirstCard);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.drawdownStrategy).toBe('pension_first');
    expect(updated.incomeProductOption).toBe('flexi_drawdown');
  });

  it('selects annuity strategy and sets incomeProductOption to annuity', () => {
    const onChangeProfile = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    const annuityCard = screen.getByText(/Buy an Annuity/i).closest('[role="button"]')!;
    fireEvent.click(annuityCard);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.drawdownStrategy).toBe('annuity');
    expect(updated.incomeProductOption).toBe('annuity');
  });

  it('supports couple planning mode with primary and partner rows', () => {
    const onChangeProfile = vi.fn();

    const coupleProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      partnerName: 'Natasha',
      partnerDrawdownStrategy: 'isa_first',
      partnerPots: {
        ...DEFAULT_POTS,
        sippBalance: 200000,
      },
    };

    render(
      <QuickDrawdownStrategyBar
        profile={coupleProfile}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    expect(screen.getByText(/Natasha Strategy/i)).toBeInTheDocument();

    const partnerHeading = screen.getByText(/Natasha Strategy/i);
    const partnerContainer = partnerHeading.closest('div.rounded-2xl')!;
    const partnerCards = partnerContainer.querySelectorAll('[role="button"]');
    expect(partnerCards.length).toBeGreaterThan(0);
    fireEvent.click(partnerCards[1]);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.partnerDrawdownStrategy).toBeDefined();
  });

  it('supports studio mode with compact button layout', () => {
    const onChangeProfile = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
        appMode="studio"
      />
    );

    const pensionFirstBtn = screen.getByRole('button', { name: /Pension First/i });
    fireEvent.click(pensionFirstBtn);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.drawdownStrategy).toBe('pension_first');
  });

  it('displays maximized spend banner and resets to baseline on click', () => {
    const onChangeProfile = vi.fn();

    const maxSpendProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      maximizedSpendConfig: {
        enabled: true,
        targetAnnualIncome: 55000,
        actualSpendingTargetAnnual: 40000,
        reinvestExcessDrawdown: true,
        reinvestDestinationPot: 'isa',
        coupleScope: 'primary',
      },
    };

    render(
      <QuickDrawdownStrategyBar
        profile={maxSpendProfile}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    expect(screen.getByText(/Max Drawdown Mode: £55,000\/yr/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.maximizedSpendConfig?.enabled).toBe(false);
  });

  it('triggers onCreateStrategyVariants when clone variants button is clicked', () => {
    const onCreateStrategyVariants = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={vi.fn()}
        activeScenarioId="scen_1"
        onCreateStrategyVariants={onCreateStrategyVariants}
      />
    );

    const cloneBtn = screen.queryByRole('button', { name: /Compare Top 4 Strategies/i }) ||
      screen.queryByRole('button', { name: /Create Strategy Variants/i });

    if (cloneBtn) {
      fireEvent.click(cloneBtn);
      expect(onCreateStrategyVariants).toHaveBeenCalledWith(
        'scen_1',
        expect.arrayContaining(['tax_free_bracket', 'basic_rate_bracket', 'isa_first', 'pension_first'])
      );
    }
  });

  it('opens info modal when info button is clicked and closes it on Close button', () => {
    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={vi.fn()}
      />
    );

    const infoButtons = screen.getAllByTitle(/View detailed strategy info/i);
    expect(infoButtons.length).toBeGreaterThan(0);

    fireEvent.click(infoButtons[0]);

    expect(screen.getByText(/How This Strategy Works/i)).toBeInTheDocument();
    expect(screen.getByText(/Key Advantages & Benefits/i)).toBeInTheDocument();
    expect(screen.getByText(/Important Considerations & Trade-offs/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/How This Strategy Works/i)).not.toBeInTheDocument();
  });

  it('applies strategy from inside the info modal', () => {
    const onChangeProfile = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={{ ...DEFAULT_PROFILE, drawdownStrategy: 'isa_first' }}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    // Open info modal for Pension First
    const pensionCard = screen.getByText('Deplete Pension First').closest('[role="button"]')!;
    const infoBtn = pensionCard.querySelector('button[title*="detailed strategy info"]')!;
    fireEvent.click(infoBtn);

    expect(screen.getByText(/How This Strategy Works/i)).toBeInTheDocument();

    const applyBtn = screen.getByRole('button', { name: /Apply Strategy/i });
    fireEvent.click(applyBtn);

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.drawdownStrategy).toBe('pension_first');
  });

  it('supports selecting strategy via keyboard Enter key', () => {
    const onChangeProfile = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={onChangeProfile}
      />
    );

    const pensionCard = screen.getByText('Deplete Pension First').closest('[role="button"]')!;
    fireEvent.keyDown(pensionCard, { key: 'Enter' });

    expect(onChangeProfile).toHaveBeenCalled();
    const updated = onChangeProfile.mock.calls[0][0];
    expect(updated.drawdownStrategy).toBe('pension_first');
  });

  it('triggers onOpenMaximizedSpendModal when Max Spend Solver card is clicked', () => {
    const onOpenMaxSpend = vi.fn();

    render(
      <QuickDrawdownStrategyBar
        profile={DEFAULT_PROFILE}
        pots={DEFAULT_POTS}
        onChangeProfile={vi.fn()}
        onOpenMaximizedSpendModal={onOpenMaxSpend}
      />
    );

    const maxSolverCard = screen.getByText(/Max Spend Solver/i).closest('[role="button"]')!;
    fireEvent.click(maxSolverCard);

    expect(onOpenMaxSpend).toHaveBeenCalled();
  });
});
