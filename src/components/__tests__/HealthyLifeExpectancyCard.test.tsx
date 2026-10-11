import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HealthyLifeExpectancyCard } from '../HealthyLifeExpectancyCard';
import { UserProfile } from '../../types';
import { DEFAULT_PROFILE } from '../../utils/defaultData';

describe('HealthyLifeExpectancyCard', () => {
  it('renders default male statistics, KPIs, and phases breakdown', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 58,
      targetRetirementAge: 60,
    };

    render(<HealthyLifeExpectancyCard profile={profile} />);

    expect(screen.getByText('Healthy Life Expectancy vs. Total Life Expectancy')).toBeInTheDocument();
    expect(screen.getByText('UK ONS Demographics Guide')).toBeInTheDocument();

    // Default male statistics
    expect(screen.getByText('Age 75')).toBeInTheDocument(); // Male HLE
    expect(screen.getByText('Age 85.5')).toBeInTheDocument(); // Male TLE
    expect(screen.getByText('10.5 Years')).toBeInTheDocument(); // Male Health Gap
    expect(screen.getByText('15 Years')).toBeInTheDocument(); // 75 - 60 = 15 yrs Go-Go Window

    // Visual Phases
    expect(screen.getByText(/Phase 1: Go-Go Active Years/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 2: Slow-Go & Care Years/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 3: No-Go \/ Care Phase/i)).toBeInTheDocument();

    // Drawdown strategy advice & sources
    expect(screen.getByText('What Does the Health Gap Mean for Your Drawdown Strategy?')).toBeInTheDocument();
    expect(screen.getByText('Official Data Sources:')).toBeInTheDocument();
  });

  it('switches to female statistics when female button is clicked', () => {
    const profile: UserProfile = {
      ...DEFAULT_PROFILE,
      currentAge: 55,
      targetRetirementAge: 60,
    };

    render(<HealthyLifeExpectancyCard profile={profile} />);

    const femaleBtn = screen.getByRole('button', { name: 'Female Statistics' });
    fireEvent.click(femaleBtn);

    // Female statistics
    expect(screen.getByText('Age 76.5')).toBeInTheDocument(); // Female HLE
    expect(screen.getByText('Age 87.8')).toBeInTheDocument(); // Female TLE
    expect(screen.getByText('11.3 Years')).toBeInTheDocument(); // Female Health Gap
    expect(screen.getByText('16.5 Years')).toBeInTheDocument(); // 76.5 - 60 = 16.5 yrs Go-Go Window
    expect(screen.getByText('UK National Averages (FEMALE)')).toBeInTheDocument();

    // Switch back to Male
    const maleBtn = screen.getByRole('button', { name: 'Male Statistics' });
    fireEvent.click(maleBtn);
    expect(screen.getByText('Age 75')).toBeInTheDocument();
    expect(screen.getByText('UK National Averages (MALE)')).toBeInTheDocument();
  });

  it('handles empty profile gracefully with default ages', () => {
    render(<HealthyLifeExpectancyCard />);

    expect(screen.getByText('Healthy Life Expectancy vs. Total Life Expectancy')).toBeInTheDocument();
    expect(screen.getByText('Age 75')).toBeInTheDocument();
    expect(screen.getByText('Age 85.5')).toBeInTheDocument();
  });
});
