import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppearanceModal } from '../AppearanceModal';

describe('AppearanceModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <AppearanceModal
        isOpen={false}
        onClose={vi.fn()}
        colorTheme="emerald"
        onColorThemeChange={vi.fn()}
        uiScale="normal"
        onUiScaleChange={vi.fn()}
        theme="light"
        onThemeChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal and handles color mode toggling', () => {
    const onThemeChange = vi.fn();
    const onClose = vi.fn();

    render(
      <AppearanceModal
        isOpen={true}
        onClose={onClose}
        colorTheme="emerald"
        onColorThemeChange={vi.fn()}
        uiScale="normal"
        onUiScaleChange={vi.fn()}
        theme="light"
        onThemeChange={onThemeChange}
      />
    );

    expect(screen.getByText('Appearance Settings')).toBeInTheDocument();

    // Clicking Dark mode button when current is light triggers onThemeChange
    const darkBtn = screen.getByRole('button', { name: /Dark/i });
    fireEvent.click(darkBtn);
    expect(onThemeChange).toHaveBeenCalledTimes(1);

    // Clicking close
    const doneBtn = screen.getByRole('button', { name: 'Done' });
    fireEvent.click(doneBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles accent color and UI scale selections and app branding input', () => {
    const onColorThemeChange = vi.fn();
    const onUiScaleChange = vi.fn();
    const onAppNameChange = vi.fn();

    render(
      <AppearanceModal
        isOpen={true}
        onClose={vi.fn()}
        colorTheme="emerald"
        onColorThemeChange={onColorThemeChange}
        uiScale="normal"
        onUiScaleChange={onUiScaleChange}
        theme="dark"
        onThemeChange={vi.fn()}
        appName="Custom Planner"
        onAppNameChange={onAppNameChange}
      />
    );

    // App Branding input
    const input = screen.getByDisplayValue('Custom Planner');
    fireEvent.change(input, { target: { value: 'My Plan Studio' } });
    expect(onAppNameChange).toHaveBeenCalledWith('My Plan Studio');

    // Accent color picker (e.g. Blue, Rose, Amber)
    const blueBtn = screen.getByTitle('Blue');
    fireEvent.click(blueBtn);
    expect(onColorThemeChange).toHaveBeenCalledWith('blue');

    const roseBtn = screen.getByTitle('Rose');
    fireEvent.click(roseBtn);
    expect(onColorThemeChange).toHaveBeenCalledWith('rose');

    // UI Scale / Interface Density
    const compactBtn = screen.getByRole('button', { name: /Compact/i });
    fireEvent.click(compactBtn);
    expect(onUiScaleChange).toHaveBeenCalledWith('compact');

    const largeBtn = screen.getByRole('button', { name: /Large/i });
    fireEvent.click(largeBtn);
    expect(onUiScaleChange).toHaveBeenCalledWith('large');
  });
});
