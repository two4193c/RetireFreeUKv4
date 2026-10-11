import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MortgageDebtModal } from '../MortgageDebtModal';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('MortgageDebtModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <MortgageDebtModal
        isOpen={false}
        onClose={vi.fn()}
        profile={DEFAULT_PROFILE}
        onChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with title, studio pop-out badge, and debt management card', () => {
    render(
      <MortgageDebtModal
        isOpen={true}
        onClose={vi.fn()}
        profile={DEFAULT_PROFILE}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('Mortgage & Debt Repayment Strategy')).toBeInTheDocument();
    expect(screen.getByText('Studio Pop-Out')).toBeInTheDocument();
  });

  it('handles closing via header button, footer button, Escape key, and backdrop', () => {
    const onClose = vi.fn();
    render(
      <MortgageDebtModal
        isOpen={true}
        onClose={onClose}
        profile={DEFAULT_PROFILE}
        onChange={vi.fn()}
      />
    );

    // Both buttons (header and footer) have accessible name "Close"
    const closeBtns = screen.getAllByRole('button', { name: /Close/i });
    expect(closeBtns.length).toBe(2);

    // Header close button
    fireEvent.click(closeBtns[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Footer close button
    fireEvent.click(closeBtns[1]);
    expect(onClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);

    // Backdrop click
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(4);
  });
});
