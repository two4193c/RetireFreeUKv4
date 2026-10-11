import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DocumentationModal, ALL_GUIDE_OPTIONS, DocSubTabType } from '../DocumentationModal';
import { DEFAULT_PROFILE } from '../../utils/defaultData';
import { AppMode } from '../../types';

describe('DocumentationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    docSubTab: 'user_guide' as DocSubTabType,
    onSelectDocSubTab: vi.fn(),
    profile: DEFAULT_PROFILE,
    onProfileChange: vi.fn(),
    appMode: 'simple' as AppMode,
    onToggleAppMode: vi.fn(),
  };

  it('returns null when isOpen is false', () => {
    const { container } = render(<DocumentationModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal header, title, and quick guide switcher dropdown', () => {
    render(<DocumentationModal {...defaultProps} />);

    expect(screen.getByText('Documentation & Strategy Guides')).toBeInTheDocument();
    expect(screen.getByText(/Studio Pop-Out/i)).toBeInTheDocument();

    const selector = screen.getByLabelText(/Select documentation guide/i) as HTMLSelectElement;
    expect(selector).toBeInTheDocument();
    expect(selector.value).toBe('user_guide');

    // Check options count matches ALL_GUIDE_OPTIONS
    expect(selector.options.length).toBe(ALL_GUIDE_OPTIONS.length);
  });

  it('calls onSelectDocSubTab when dropdown selection changes', () => {
    const onSelectDocSubTab = vi.fn();
    render(<DocumentationModal {...defaultProps} onSelectDocSubTab={onSelectDocSubTab} />);

    const selector = screen.getByLabelText(/Select documentation guide/i);
    fireEvent.change(selector, { target: { value: 'features_guide' } });

    expect(onSelectDocSubTab).toHaveBeenCalledWith('features_guide');
  });

  it('calls onClose when close button, backdrop, or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<DocumentationModal {...defaultProps} onClose={onClose} />);

    // There are 2 close buttons (header icon and footer action)
    const closeBtns = screen.getAllByRole('button', { name: /Close Guide/i });
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

  it('renders various strategy guides correctly', () => {
    const { rerender } = render(<DocumentationModal {...defaultProps} docSubTab="user_guide" />);
    expect(screen.getByText(/RetireFree UK/i)).toBeInTheDocument();

    rerender(<DocumentationModal {...defaultProps} docSubTab="features_guide" />);
    expect(screen.getByText(/Comprehensive Feature List/i)).toBeInTheDocument();

    rerender(<DocumentationModal {...defaultProps} docSubTab="tax_rules" />);
    expect(screen.getAllByText(/Personal Allowance/i).length).toBeGreaterThan(0);

    rerender(<DocumentationModal {...defaultProps} docSubTab="cash_buffer_guide" />);
    expect(screen.getAllByText(/Emergency Fund & Cash Buffer/i).length).toBeGreaterThan(0);

    rerender(<DocumentationModal {...defaultProps} docSubTab="healthy_life" />);
    expect(screen.getAllByText(/Healthy Life Expectancy/i).length).toBeGreaterThan(0);

    rerender(<DocumentationModal {...defaultProps} docSubTab="four_percent_guide" />);
    expect(screen.getAllByText(/The 4% Rule vs UK Reality/i).length).toBeGreaterThan(0);

    rerender(<DocumentationModal {...defaultProps} docSubTab="fire_bridge_guide" />);
    expect(screen.getAllByText(/FIRE Pre-57 ISA Bridge/i).length).toBeGreaterThan(0);
  });

  it('renders every guide subtab in ALL_GUIDE_OPTIONS without error', () => {
    const { rerender } = render(<DocumentationModal {...defaultProps} docSubTab={ALL_GUIDE_OPTIONS[0].id} />);
    for (const option of ALL_GUIDE_OPTIONS) {
      rerender(<DocumentationModal {...defaultProps} docSubTab={option.id} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    }
    // Also test studio_guide subtab and mode toggle
    rerender(<DocumentationModal {...defaultProps} docSubTab="studio_guide" />);
    expect(screen.getByText(/Studio Mode Workspace Guide/i)).toBeInTheDocument();
    const switchBtn = screen.getByRole('button', { name: /Switch to Studio Mode/i });
    fireEvent.click(switchBtn);
    expect(defaultProps.onToggleAppMode).toHaveBeenCalledWith('studio');
  });



  it('allows applying target income from living standards guide', () => {
    const onProfileChange = vi.fn();
    render(
      <DocumentationModal
        {...defaultProps}
        docSubTab="living_standards"
        onProfileChange={onProfileChange}
      />
    );

    expect(screen.getAllByText(/Retirement Living Standards/i).length).toBeGreaterThan(0);
    const applyBtns = screen.getAllByRole('button', { name: /Set Target to/i });
    expect(applyBtns.length).toBeGreaterThan(0);
    fireEvent.click(applyBtns[0]);
    expect(onProfileChange).toHaveBeenCalled();
  });
});

