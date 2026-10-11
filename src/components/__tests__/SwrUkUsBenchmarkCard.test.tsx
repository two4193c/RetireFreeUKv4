import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SwrUkUsBenchmarkCard } from '../SwrUkUsBenchmarkCard';

describe('SwrUkUsBenchmarkCard', () => {
  it('renders benchmark comparison header and default UK regime details', () => {
    render(<SwrUkUsBenchmarkCard />);

    expect(screen.getByText(/Bengen \(US\) vs\. UK Domestic Market Benchmark/i)).toBeInTheDocument();
    expect(screen.getByText(/UK Domestic Portfolio/i)).toBeInTheDocument();
    expect(screen.getByText(/US Bengen \/ Trinity/i)).toBeInTheDocument();
    expect(screen.getByText(/Global Diversified/i)).toBeInTheDocument();
  });

  it('switches between UK, US, and Global regimes when buttons are clicked', () => {
    render(<SwrUkUsBenchmarkCard />);

    const usButton = screen.getByRole('button', { name: /US Bengen/i });
    fireEvent.click(usButton);
    expect(usButton).toHaveClass('bg-white');

    const globalButton = screen.getByRole('button', { name: /Global Diversified/i });
    fireEvent.click(globalButton);
    expect(globalButton).toHaveClass('bg-white');

    const ukButton = screen.getByRole('button', { name: /UK Domestic Portfolio/i });
    fireEvent.click(ukButton);
    expect(ukButton).toHaveClass('bg-white');
  });
});
