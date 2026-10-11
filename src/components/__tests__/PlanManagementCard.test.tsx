import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlanManagementCard } from '../PlanManagementCard';
import { PlannerScenario } from '../../types';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../../utils/defaultData';

describe('PlanManagementCard', () => {
  const mockScenarios: PlannerScenario[] = [
    {
      id: 'plan-1',
      name: 'Baseline Plan',
      profile: {
        ...DEFAULT_PROFILE,
        grossAnnualSalary: 60000,
        targetRetirementAge: 62,
        targetRetirementIncomeAnnual: 35000,
      },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-01',
    },
    {
      id: 'plan-2',
      name: 'Early Retirement',
      profile: {
        ...DEFAULT_PROFILE,
        grossAnnualSalary: 80000,
        targetRetirementAge: 55,
        targetRetirementIncomeAnnual: 40000,
      },
      pots: DEFAULT_POTS,
      updatedAt: '2026-01-02',
    },
  ];

  it('renders all scenarios and active scenario badge', () => {
    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={vi.fn()}
      />
    );

    expect(screen.getByText('Plan Management')).toBeInTheDocument();
    expect(screen.getByText('Baseline Plan')).toBeInTheDocument();
    expect(screen.getByText('Early Retirement')).toBeInTheDocument();
    expect(screen.getByText('Active Plan')).toBeInTheDocument();
    expect(screen.getByText('Loaded')).toBeInTheDocument();
    expect(screen.getByText(/Salary £60,000/)).toBeInTheDocument();
    expect(screen.getByText(/Retirement Age 62/)).toBeInTheDocument();
    expect(screen.getByText(/Salary £80,000/)).toBeInTheDocument();
    expect(screen.getByText(/Retirement Age 55/)).toBeInTheDocument();
  });

  it('handles creating a new plan and switching plans', () => {
    const onNewScenario = vi.fn();
    const onSelectScenario = vi.fn();

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={onSelectScenario}
        onSaveScenario={vi.fn()}
        onNewScenario={onNewScenario}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={vi.fn()}
      />
    );

    // Create New Plan
    fireEvent.click(screen.getByRole('button', { name: /Create New Plan/i }));
    expect(onNewScenario).toHaveBeenCalledTimes(1);

    // Switch to plan-2
    const switchBtn = screen.getByRole('button', { name: /Switch to Plan/i });
    fireEvent.click(switchBtn);
    expect(onSelectScenario).toHaveBeenCalledWith('plan-2');
  });

  it('handles inline renaming with Enter key and check button, plus Escape cancel', () => {
    const onRenameScenario = vi.fn();

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={onRenameScenario}
        onImportScenarios={vi.fn()}
      />
    );

    const renameBtns = screen.getAllByTitle('Rename plan');
    expect(renameBtns.length).toBe(2);

    // Click rename on first plan
    fireEvent.click(renameBtns[0]);
    const input = screen.getByDisplayValue('Baseline Plan');
    expect(input).toBeInTheDocument();

    // Escape cancels
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByDisplayValue('Baseline Plan')).not.toBeInTheDocument();

    // Click rename again and change name via Enter
    const activeRenameBtns = screen.getAllByTitle('Rename plan');
    fireEvent.click(activeRenameBtns[0]);
    const input2 = screen.getByDisplayValue('Baseline Plan');
    fireEvent.change(input2, { target: { value: 'Updated Plan Name' } });
    fireEvent.keyDown(input2, { key: 'Enter' });
    expect(onRenameScenario).toHaveBeenCalledWith('plan-1', 'Updated Plan Name');

    // Click rename on second plan and submit via save button
    const updatedRenameBtns = screen.getAllByTitle('Rename plan');
    fireEvent.click(updatedRenameBtns[1]);
    const input3 = screen.getByDisplayValue('Early Retirement');
    fireEvent.change(input3, { target: { value: 'FIRE Plan' } });
    const checkBtn = screen.getByTitle('Save name');
    fireEvent.click(checkBtn);
    expect(onRenameScenario).toHaveBeenCalledWith('plan-2', 'FIRE Plan');
  });

  it('handles scenario deletion requests', () => {
    const onRequestDelete = vi.fn();

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={onRequestDelete}
        onRenameScenario={vi.fn()}
        onImportScenarios={vi.fn()}
      />
    );

    const deleteBtns = screen.getAllByTitle('Remove plan');
    expect(deleteBtns.length).toBe(2);

    fireEvent.click(deleteBtns[1]);
    expect(onRequestDelete).toHaveBeenCalledWith('plan-2', 'Early Retirement');
  });

  it('exports scenarios JSON backup successfully', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={vi.fn()}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /Download Backup File/i });
    fireEvent.click(exportBtn);

    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('imports valid JSON backup scenarios', async () => {
    const onImportScenarios = vi.fn();

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={onImportScenarios}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // 1. Array format
    const validJsonArray = JSON.stringify(mockScenarios);
    const file1 = new File([validJsonArray], 'backup.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file1] } });

    await waitFor(() => {
      expect(onImportScenarios).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'plan-1' })
      ]));
      expect(screen.getByText(/Successfully imported 2 retirement plan scenario\(s\)/i)).toBeInTheDocument();
    });

    // 2. Object format with { scenarios: [...] }
    const validWrappedJson = JSON.stringify({ scenarios: [mockScenarios[0]] });
    const file2 = new File([validWrappedJson], 'backup_wrapped.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file2] } });

    await waitFor(() => {
      expect(onImportScenarios).toHaveBeenCalledWith([expect.objectContaining({ id: 'plan-1' })]);
    });

    // 3. Single scenario format { profile: ..., pots: ... }
    const singleScenarioJson = JSON.stringify({
      id: 'single-1',
      profile: DEFAULT_PROFILE,
      pots: DEFAULT_POTS,
    });
    const file3 = new File([singleScenarioJson], 'single.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file3] } });

    await waitFor(() => {
      expect(onImportScenarios).toHaveBeenCalledWith([expect.objectContaining({ id: 'single-1' })]);
    });
  });

  it('shows error messages on invalid or malformed JSON file', async () => {
    const onImportScenarios = vi.fn();

    render(
      <PlanManagementCard
        scenarios={mockScenarios}
        activeScenarioId="plan-1"
        onSelectScenario={vi.fn()}
        onSaveScenario={vi.fn()}
        onNewScenario={vi.fn()}
        onRequestDeleteScenario={vi.fn()}
        onRenameScenario={vi.fn()}
        onImportScenarios={onImportScenarios}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Malformed JSON string
    const malformedFile = new File(['{ invalid json'], 'bad.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [malformedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed to parse JSON file/i)).toBeInTheDocument();
    });

    // Valid JSON but empty object / invalid scenario structure
    const emptyJsonFile = new File([JSON.stringify({ someKey: 123 })], 'empty.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [emptyJsonFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON format: No valid scenario objects found/i)).toBeInTheDocument();
    });
  });
});
