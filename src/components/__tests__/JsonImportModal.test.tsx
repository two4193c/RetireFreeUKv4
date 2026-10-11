import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { JsonImportModal } from '../JsonImportModal';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('JsonImportModal', () => {
  const currentScenarios: PlannerScenario[] = [
    {
      id: 'current-1',
      name: 'Baseline Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01T10:00:00Z',
    },
    {
      id: 'current-2',
      name: 'Early Fire Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-02T10:00:00Z',
    },
  ];

  const importedScenarios: PlannerScenario[] = [
    {
      id: 'current-1', // ID conflict with current-1
      name: 'Baseline Plan',
      profile: { ...DEFAULT_PROFILE, grossAnnualSalary: 75000 },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-05T10:00:00Z',
    },
    {
      id: 'imported-new',
      name: 'Coast Fire Plan',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-06T10:00:00Z',
    },
  ];

  it('returns null when isOpen is false or importedScenarios is empty', () => {
    const { container, rerender } = render(
      <JsonImportModal
        isOpen={false}
        onClose={vi.fn()}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <JsonImportModal
        isOpen={true}
        onClose={vi.fn()}
        importedScenarios={[]}
        currentScenarios={currentScenarios}
        onImport={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders in all mode and executes merge action', () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );

    expect(screen.getByText('Import Settings & Plans')).toBeInTheDocument();
    expect(screen.getByText(/2 plan\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText('Already Loaded')).toBeInTheDocument();
    expect(screen.getByText('New Plan')).toBeInTheDocument();

    // Click Merge (Keep All & Add as New Plans)
    const mergeBtn = screen.getByRole('button', { name: /Keep All & Add as New Plans/i });
    fireEvent.click(mergeBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Baseline Plan' }),
        expect.objectContaining({ name: 'Baseline Plan (Imported)' }),
        expect.objectContaining({ name: 'Coast Fire Plan' }),
      ]),
      expect.any(String)
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('executes overwrite and replace actions in all mode', () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );

    // Overwrite existing conflicts button
    const overwriteBtn = screen.getByRole('button', { name: /Overwrite Existing Conflicts/i });
    fireEvent.click(overwriteBtn);
    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'current-1', profile: expect.objectContaining({ grossAnnualSalary: 75000 }) }),
        expect.objectContaining({ id: 'imported-new' }),
      ]),
      'current-1'
    );
    expect(onClose).toHaveBeenCalled();

    // Replace entire list
    rerender(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );
    const replaceBtn = screen.getByRole('button', { name: /Replace Entire Plan List with Backup/i });
    fireEvent.click(replaceBtn);
    expect(onImport).toHaveBeenCalledWith(importedScenarios, 'current-1');
  });

  it('switches to single plan mode and handles conflict with rename', () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    render(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );

    // Switch to single plan mode
    const singleModeBtn = screen.getByRole('button', { name: /Import a Single Plan/i });
    fireEvent.click(singleModeBtn);

    expect(screen.getByText('Plan Already Loaded!')).toBeInTheDocument();
    expect(screen.getByText(/is already in your active plan list/i)).toBeInTheDocument();

    // Change custom plan name
    const nameInput = screen.getByPlaceholderText(/Enter custom plan name/i);
    fireEvent.change(nameInput, { target: { value: 'Baseline Plan Customized' } });

    // Submit single import
    const importSubmitBtn = screen.getByRole('button', { name: /Import as "Baseline Plan Customized"/i });
    fireEvent.click(importSubmitBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Baseline Plan Customized' }),
      ]),
      expect.any(String)
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('handles single plan overwrite conflict and non-conflicting plan import', () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );

    // Switch to single plan mode
    fireEvent.click(screen.getByRole('button', { name: /Import a Single Plan/i }));

    // Select overwrite radio
    const overwriteRadio = screen.getByRole('radio', { name: /Overwrite Existing Plan/i });
    fireEvent.click(overwriteRadio);

    // Click overwrite import button
    const overwriteSubmitBtn = screen.getByRole('button', { name: /Overwrite "Baseline Plan" & Import/i });
    fireEvent.click(overwriteSubmitBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'current-1', profile: expect.objectContaining({ grossAnnualSalary: 75000 }) }),
      ]),
      'current-1'
    );

    // Now test a plan with NO conflict
    const nonConflictingImported = [importedScenarios[1]]; // Coast Fire Plan
    rerender(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={nonConflictingImported}
        currentScenarios={currentScenarios}
        onImport={onImport}
      />
    );

    expect(screen.getByText(/No conflicts detected. This plan will be added as a new plan./i)).toBeInTheDocument();
    const nonConflictBtn = screen.getByRole('button', { name: /Import "Coast Fire Plan"/i });
    fireEvent.click(nonConflictBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'imported-new', name: 'Coast Fire Plan' }),
      ]),
      'imported-new'
    );
  });

  it('closes when close icon button is clicked', () => {
    const onClose = vi.fn();
    render(
      <JsonImportModal
        isOpen={true}
        onClose={onClose}
        importedScenarios={importedScenarios}
        currentScenarios={currentScenarios}
        onImport={vi.fn()}
      />
    );

    const closeBtn = screen.getAllByRole('button')[0];
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
