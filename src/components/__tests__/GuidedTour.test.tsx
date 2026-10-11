import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuidedTour } from '../GuidedTour';

describe('GuidedTour', () => {
  beforeEach(() => {
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  it('returns null when run is false', () => {
    const { container } = render(<GuidedTour run={false} onFinish={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders step 1 with title, content, and controls', () => {
    const onFinish = vi.fn();
    render(<GuidedTour run={true} onFinish={onFinish} />);

    expect(screen.getByText('Welcome to RetireFree UK!')).toBeInTheDocument();
    expect(screen.getByText(/Guided Tour \(1\//i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip Tour/i })).toBeInTheDocument();
  });

  it('navigates forward and backward between tour steps and finishes', () => {
    const onFinish = vi.fn();
    const onSetTab = vi.fn();
    render(<GuidedTour run={true} onFinish={onFinish} onSetTab={onSetTab} />);

    // Click Next to step 2
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Step 1: Planning Mode/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();

    // Click Back to step 1
    const backBtn = screen.getByRole('button', { name: /Back/i });
    fireEvent.click(backBtn);
    expect(screen.getByText('Welcome to RetireFree UK!')).toBeInTheDocument();

    // Click Skip Tour
    const skipBtn = screen.getByRole('button', { name: /Skip Tour/i });
    fireEvent.click(skipBtn);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('calls onFinish when closing via X icon button', () => {
    const onFinish = vi.fn();
    render(<GuidedTour run={true} onFinish={onFinish} />);

    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find((b) => b.querySelector('svg.lucide-x'));
    expect(closeBtn).toBeDefined();
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onFinish).toHaveBeenCalled();
    }
  });

  it('handles drag pointer interactions smoothly', () => {
    render(<GuidedTour run={true} onFinish={vi.fn()} />);

    const header = screen.getByText(/Guided Tour \(1\//i).closest('div');
    expect(header).not.toBeNull();
    if (header) {
      fireEvent.pointerDown(header, { clientX: 100, clientY: 100, button: 0, pointerId: 1 });
      fireEvent.pointerMove(header, { clientX: 150, clientY: 150, pointerId: 1 });
      fireEvent.pointerUp(header, { pointerId: 1 });
    }
  });
});
