import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RetirementTargetInput } from '../RetirementTargetInput';

describe('RetirementTargetInput', () => {
  const defaultProps = {
    dob: '1989-06-15',
    currentAge: 35,
    targetAge: 60,
    targetDate: '2049-06-15',
    onChange: vi.fn(),
  };

  it('renders in age mode by default and displays the calculated retirement date', () => {
    render(<RetirementTargetInput {...defaultProps} />);

    // Check age input is rendered with value 60
    const ageInput = screen.getByPlaceholderText('e.g. 60') as HTMLInputElement;
    expect(ageInput).toBeInTheDocument();
    expect(ageInput.value).toBe('60');

    // Check displayed retirement date
    expect(screen.getByText('Retirement Date:')).toBeInTheDocument();
    expect(screen.getByText('15 Jun 2049')).toBeInTheDocument();
  });

  it('updates retirement date display when age is changed', () => {
    const onChange = vi.fn();
    render(<RetirementTargetInput {...defaultProps} onChange={onChange} />);

    const ageInput = screen.getByPlaceholderText('e.g. 60');
    fireEvent.change(ageInput, { target: { value: '58' } });

    // onChange should be called with new age and recalculated date
    expect(onChange).toHaveBeenCalledWith(58, '2047-06-15', 'age');
  });

  it('switches to date mode and displays the calculated age', () => {
    const onChange = vi.fn();
    render(<RetirementTargetInput {...defaultProps} onChange={onChange} />);

    // Click "Date" button
    const dateBtn = screen.getByTitle('Enter retirement by exact date');
    fireEvent.click(dateBtn);

    // Should switch to date input
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    expect(dateInput.value).toBe('2049-06-15');

    // Should display calculated age
    expect(screen.getByText('Retirement Age:')).toBeInTheDocument();
    expect(screen.getByText(/Age 60/)).toBeInTheDocument();
  });

  it('updates age when a date is selected in date mode', () => {
    const onChange = vi.fn();
    render(<RetirementTargetInput {...defaultProps} initialMode="date" onChange={onChange} />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();

    // Change date to 2045-09-01 (born 1989-06-15 => age 56 on that date)
    fireEvent.change(dateInput, { target: { value: '2045-09-01' } });

    expect(onChange).toHaveBeenCalledWith(56, '2045-09-01', 'date');
  });

  it('supports partner accent color', () => {
    const { container } = render(
      <RetirementTargetInput
        {...defaultProps}
        accentColor="indigo"
        label="Partner Target Retirement"
      />
    );

    expect(screen.getByText('Partner Target Retirement')).toBeInTheDocument();
    expect(container.querySelector('.border-indigo-200\\/60, .dark\\:border-indigo-800\\/60')).toBeDefined();
  });
});
