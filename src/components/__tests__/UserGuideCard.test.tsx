import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UserGuideCard } from '../UserGuideCard';

describe('UserGuideCard', () => {
  it('renders in basic mode by default and allows toggling accordion sections', () => {
    render(<UserGuideCard />);

    expect(screen.getByText(/RetireFree Application User Guide/i)).toBeInTheDocument();
    expect(screen.getByText(/Basic Mode Active/i)).toBeInTheDocument();

    // The first section 'getting-started' is open by default
    expect(screen.getByText(/Welcome to/i)).toBeInTheDocument();

    // Click section title button to collapse it
    const section1Btn = screen.getByRole('button', { name: /1\. Getting Started & Quick Workflow/i });
    fireEvent.click(section1Btn);

    // Click another section button to expand it
    const section2Btn = screen.getByRole('button', { name: /2\. Managing Inputs & Asset Accounts/i });
    fireEvent.click(section2Btn);
    expect(screen.getByText(/Defined Contribution \(DC\) Pensions & SIPPs/i)).toBeInTheDocument();
  });

  it('switches internal mode when buttons in banner are clicked without onToggleAppMode prop', () => {
    render(<UserGuideCard />);

    // Click Advanced button in the banner
    const advBtn = screen.getByRole('button', { name: /Advanced ✨/i });
    fireEvent.click(advBtn);

    // Advanced mode is now active
    expect(screen.getByText(/Advanced Mode Active/i)).toBeInTheDocument();

    // Click Studio button
    const studioBtn = screen.getByRole('button', { name: /Studio 🚀/i });
    fireEvent.click(studioBtn);

    expect(screen.getByText(/Studio Mode Active/i)).toBeInTheDocument();

    // Click Basic button
    const basicBtn = screen.getByRole('button', { name: /Basic ⚡/i });
    fireEvent.click(basicBtn);

    expect(screen.getByText(/Basic Mode Active/i)).toBeInTheDocument();
  });

  it('calls external onToggleAppMode callback when provided', () => {
    const onToggleAppMode = vi.fn();
    render(<UserGuideCard appMode="advanced" onToggleAppMode={onToggleAppMode} />);

    expect(screen.getByText(/Advanced Mode Active/i)).toBeInTheDocument();

    const basicBtn = screen.getByRole('button', { name: /Basic ⚡/i });
    fireEvent.click(basicBtn);

    expect(onToggleAppMode).toHaveBeenCalledWith('basic');
  });

  it('renders studio mode sections and permits expanding studio sections', () => {
    render(<UserGuideCard appMode="studio" />);

    expect(screen.getByText(/Studio Mode Active/i)).toBeInTheDocument();

    // In studio mode, section 1 is Getting Started & Studio Mode Dual-Pane Workflow
    expect(screen.getByText(/1\. Getting Started & Studio Mode Dual-Pane Workflow/i)).toBeInTheDocument();

    // Click an unopened accordion header
    const popoutBtn = screen.getByRole('button', { name: /2\. Dedicated Pop-Out Analytical Windows/i });
    fireEvent.click(popoutBtn);
    expect(screen.getByText(/Studio Mode features dedicated pop-out windows/i)).toBeInTheDocument();
  });


});

