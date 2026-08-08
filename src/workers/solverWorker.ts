import { solveMaximizedSpend, SolveMaximizedSpendResult } from '../utils/maximizedSpendSolver';
import { UserProfile, InvestmentPots } from '../types';

self.onmessage = (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  if (type === 'SOLVE_MAX_SPEND') {
    try {
      const result = solveMaximizedSpend(payload);
      self.postMessage({ id, type: 'SOLVE_MAX_SPEND_SUCCESS', payload: result });
    } catch (error) {
      console.error('Worker Error:', error);
      self.postMessage({ id, type: 'SOLVE_MAX_SPEND_ERROR', error: String(error) });
    }
  }
};
