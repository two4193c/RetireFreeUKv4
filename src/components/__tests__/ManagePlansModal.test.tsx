import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ManagePlansModal } from '../ManagePlansModal';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('ManagePlansModal', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'plan-1',
      name: 'Alpha Plan',
      profile: {
        ...DEFAULT_PROFILE,
        grossAnnualSalary: 60000,
        targetRetirementAge: 62,
        targetRetirementIncomeAnnual: 35000,
      },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-05T10:00:00Z',
    },
    {
      id: 'plan-2',
      name: 'Beta Plan',
      profile: {
        ...DEFAULT_PROFILE,
        grossAnnualSalary: 85000,
        targetRetirementAge: 58,
        targetRetirementIncomeAnnual: 42000,
      },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01T10:00:00Z',
    },
  ];

  it('returns null when isOpen is false', () => {
    const { container } = render(
      <ManagePlansModal
        isOpen={false}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRenameScenario={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders plans overview with search, sort, switch, and duplicate features', () => {
    const onSelectScenario = vi.fn();
    const onDuplicateScenario = vi.fn();
    const onClose = vi.fn();

    render(
      <ManagePlansModal
        isOpen={true}
        onClose={onClose}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={onSelectScenario}
        onRequestDeleteScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onDuplicateScenario={onDuplicateScenario}
      />
    );

    expect(screen.getByText('Plan Management & JSON Backup')).toBeInTheDocument();
    expect(screen.getByText('Alpha Plan')).toBeInTheDocument();
    expect(screen.getByText('Beta Plan')).toBeInTheDocument();
    expect(screen.getByText('Active Plan')).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Search plans by name/i);
    fireEvent.change(searchInput, { target: { value: 'Beta' } });
    expect(screen.queryByText('Alpha Plan')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Plan')).toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Alpha Plan')).toBeInTheDocument();

    // Switch to Beta Plan
    const switchBtn = screen.getByRole('button', { name: /Switch to Plan/i });
    fireEvent.click(switchBtn);
    expect(onSelectScenario).toHaveBeenCalledWith('plan-2');
    expect(onClose).toHaveBeenCalled();

    // Duplicate plan
    const duplicateBtns = screen.getAllByTitle(/Duplicate plan/i);
    fireEvent.click(duplicateBtns[0]);
    expect(onDuplicateScenario).toHaveBeenCalledWith('plan-1');
  });

  it('handles inline rename, delete request, and new plan creation', () => {
    const onRenameScenario = vi.fn();
    const onRequestDeleteScenario = vi.fn();
    const onNewScenario = vi.fn();
    const onClose = vi.fn();

    render(
      <ManagePlansModal
        isOpen={true}
        onClose={onClose}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onRequestDeleteScenario={onRequestDeleteScenario}
        onNewScenario={onNewScenario}
        onRenameScenario={onRenameScenario}
      />
    );

    // Click rename on Alpha Plan
    const renameBtns = screen.getAllByTitle('Rename plan');
    fireEvent.click(renameBtns[0]);

    const editInput = screen.getByDisplayValue('Alpha Plan');
    fireEvent.change(editInput, { target: { value: 'Renamed Alpha' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });
    expect(onRenameScenario).toHaveBeenCalledWith('plan-1', 'Renamed Alpha');

    // Click delete on Beta Plan
    const deleteBtns = screen.getAllByTitle(/Remove plan/i);
    fireEvent.click(deleteBtns[1]);
    expect(onRequestDeleteScenario).toHaveBeenCalledWith('plan-2', 'Beta Plan');

    // New Plan button
    const newPlanBtn = screen.getByRole('button', { name: /New Plan/i });
    fireEvent.click(newPlanBtn);
    expect(onNewScenario).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('exports single scenario and all scenarios as JSON', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(
      <ManagePlansModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRenameScenario={vi.fn()}
      />
    );

    // Export single scenario
    const exportSingleBtn = screen.getByTitle(/Export plan "Alpha Plan" as JSON/i);
    fireEvent.click(exportSingleBtn);
    expect(createObjectURL).toHaveBeenCalled();

    // Switch to JSON Backup tab
    const jsonTabBtn = screen.getByRole('button', { name: /JSON Backup & Import/i });
    fireEvent.click(jsonTabBtn);

    // Export all scenarios
    const exportAllBtn = screen.getByRole('button', { name: /Download All Plans/i });
    fireEvent.click(exportAllBtn);
    expect(createObjectURL).toHaveBeenCalledTimes(2);
  });

  it('imports JSON backup files with validation and error handling', async () => {
    const onImportScenarios = vi.fn();

    render(
      <ManagePlansModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={onImportScenarios}
        initialTab="json_backup"
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Valid JSON array
    const validJson = JSON.stringify(mockScenarios);
    const validFile = new File([validJson], 'backup.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(onImportScenarios).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'plan-1' })
      ]));
      expect(screen.getByText(/Loaded 2 scenario\(s\)/i)).toBeInTheDocument();
    });

    // Malformed JSON
    const badFile = new File(['{ malformed'], 'bad.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed to parse JSON file/i)).toBeInTheDocument();
    });
  });

  it('triggers onOpenResetPresets when reset presets button is clicked', () => {
    const onOpenResetPresets = vi.fn();

    render(
      <ManagePlansModal
        isOpen={true}
        onClose={vi.fn()}
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onOpenResetPresets={onOpenResetPresets}
        initialTab="json_backup"
      />
    );

    const resetBtn = screen.getByRole('button', { name: /Reset Presets/i });
    fireEvent.click(resetBtn);
    expect(onOpenResetPresets).toHaveBeenCalled();
  });
});
