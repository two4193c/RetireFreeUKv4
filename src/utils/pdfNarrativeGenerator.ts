import { UserProfile, YearProjection, MonteCarloResult, IhtState } from '../types';

export interface NarrativeContext {
  profile: UserProfile;
  projections: YearProjection[];
  mcResult?: MonteCarloResult;
  ihtState?: IhtState;
  taxRegion?: string;
  drawdownStrategy?: string;
}

export interface GeneratedPlanNarrative {
  executiveSummary: string;
  decumulationStrategy: string;
  stochasticRisk: string;
  estateTaxSummary: string;
}

export function generatePlanNarrative(ctx: NarrativeContext): GeneratedPlanNarrative {
  const { profile, projections, mcResult, ihtState, drawdownStrategy } = ctx;

  const currentAge = profile.currentAge || 35;
  const retAge = profile.targetRetirementAge || 60;
  const maxAge = profile.lifeExpectancy || 90;
  const annualSpend = profile.annualRetirementSpend || 30000;
  const isCouple = profile.isCouple ?? false;

  const retiredYears = (projections || []).filter((p) => p.isRetired);
  const shortfallYears = retiredYears.filter((p) => (p.incomeShortfall || 0) > 0);
  const isPlanFeasible = shortfallYears.length === 0;
  const firstShortfall = shortfallYears[0];

  // ---------------------------------------------------------------------------
  // 1. EXECUTIVE SUMMARY NARRATIVE
  // ---------------------------------------------------------------------------
  let execNarrative = '';
  const mcSuccessRate = mcResult ? Math.round(mcResult.successRate ?? mcResult.successRateTargetAge ?? 0) : 0;

  if (isPlanFeasible) {
    execNarrative = `Your financial plan demonstrates strong long-term sustainability. Based on retiring at age ${retAge} with a desired net annual expenditure of £${annualSpend.toLocaleString()} (in present-day terms), your portfolio is projected to fund your retirement through age ${maxAge} without income shortfalls.`;
    if (mcResult) {
      execNarrative += ` Under stochastic stress-testing across ${mcResult.simulationsRun || 500} randomized market paths, your plan achieves a ${mcSuccessRate}% probability of success.`;
    }
  } else {
    const shortfallAge = firstShortfall ? firstShortfall.age : retAge;
    const totalShortfall = shortfallYears.reduce((sum, p) => sum + (p.incomeShortfall || 0), 0);
    execNarrative = `Your retirement plan projects a potential capital shortfall beginning at age ${shortfallAge}. While your portfolio successfully funds the initial ${Math.max(0, shortfallAge - retAge)} years of retirement, total cumulative income shortfalls of £${Math.round(totalShortfall).toLocaleString()} are anticipated between ages ${shortfallAge} and ${maxAge}.`;
    if (mcResult) {
      execNarrative += ` Under Monte Carlo market simulation, the plan achieves a ${mcSuccessRate}% probability of maintaining target spending without depletion.`;
    }
  }

  if (isCouple) {
    execNarrative += ` This evaluation incorporates joint income streams and combined tax allowances for both primary and partner profiles.`;
  }

  // ---------------------------------------------------------------------------
  // 2. DECUMULATION & TAX EFFICIENCY NARRATIVE
  // ---------------------------------------------------------------------------
  let decumNarrative = '';
  const strategyName = (drawdownStrategy || 'Tax-Optimised Waterfall').replace(/_/g, ' ');
  const firstRetYear = retiredYears[0];
  const pclsTaken = firstRetYear ? (firstRetYear.pclsTaxFreeLumpSum || 0) : 0;

  decumNarrative = `Your drawdown strategy is configured to '${strategyName}'. `;

  if (pclsTaken > 0) {
    decumNarrative += `At retirement (age ${retAge}), a Tax-Free Lump Sum (PCLS) of £${Math.round(pclsTaken).toLocaleString()} is extracted, remaining within the UK lifetime Lump Sum Allowance (LSA) cap of £268,275. `;
  } else {
    decumNarrative += `Uncrystallised funds remain invested to maximize compounding growth, taking tax-free cash dynamically alongside income drawdowns. `;
  }

  const regionLabel = profile.taxRegion === 'scotland' ? 'Scottish' : 'Rest of UK (RUK)';
  decumNarrative += `Tax computations apply ${regionLabel} tax bands, preserving the £12,570 Personal Allowance and optimizing withdrawals across Pension, ISA, and Cash/GIA wrappers to minimize income tax drag.`;

  // ---------------------------------------------------------------------------
  // 3. STOCHASTIC & SEQUENCE RISK NARRATIVE
  // ---------------------------------------------------------------------------
  let riskNarrative = '';

  if (mcResult) {
    const p50Final = Math.round(mcResult.p50EndBalance || 0);
    const p10Final = Math.round(mcResult.p10EndBalance || 0);
    const p90Final = Math.round(mcResult.p90EndBalance || 0);

    riskNarrative = `Stochastic modeling incorporates market volatility to evaluate sequence-of-returns risk. At age ${maxAge}, your median (p50) projected portfolio balance is £${p50Final.toLocaleString()}. `;
    
    if (p10Final <= 0) {
      riskNarrative += `In an adverse 10th percentile market downturn (p10), assets are depleted before age ${maxAge}. `;
    } else {
      riskNarrative += `Even in a conservative 10th percentile downturn scenario (p10), a residual portfolio balance of £${p10Final.toLocaleString()} is preserved. `;
    }

    riskNarrative += `Under strong market performance (p90), the portfolio grows to £${p90Final.toLocaleString()}. Maintaining a dedicated cash buffer strategy helps protect growth assets from forced liquidation during market corrections.`;
  } else {
    riskNarrative = `Deterministic projections assume a steady investment return profile. Incorporating Monte Carlo simulation enables dynamic stress-testing against market corrections and inflation shocks during early decumulation.`;
  }

  // ---------------------------------------------------------------------------
  // 4. ESTATE & INHERITANCE TAX (IHT) NARRATIVE
  // ---------------------------------------------------------------------------
  let estateNarrative = '';

  if (ihtState) {
    const primaryRes = ihtState.primaryResidenceValue || 0;
    const baseNrb = isCouple ? 650000 : 325000;
    const annualGifting = ihtState.annualGiftingStrategy || 0;

    estateNarrative = `Estate planning evaluation incorporates current UK Inheritance Tax rules, including a combined Nil-Rate Band (NRB) of £${baseNrb.toLocaleString()}`;
    
    if (ihtState.passMainResidenceToDescendants && primaryRes > 0) {
      const baseRnrb = isCouple ? 350000 : 175000;
      estateNarrative += ` and a Residence Nil-Rate Band (RNRB) of £${baseRnrb.toLocaleString()} for direct descendants. `;
    } else {
      estateNarrative += `. `;
    }

    if (annualGifting > 0) {
      estateNarrative += `Your active gifting strategy of £${annualGifting.toLocaleString()}/year utilizes the HMRC £3,000 annual exemption, reducing your taxable gross estate over time. `;
    }

    if (ihtState.includePensionsInEstate) {
      estateNarrative += `Calculations reflect the budget proposal to include unspent pension funds within the taxable estate from April 2027.`;
    } else {
      estateNarrative += `Uncrystallised pensions are currently excluded from the taxable estate under existing trust exemptions.`;
    }
  } else {
    estateNarrative = `Inheritance tax analysis projects total estate wealth transfer to heirs after accounting for Nil-Rate Bands, spousal exemptions, and property growth assumptions.`;
  }

  return {
    executiveSummary: execNarrative,
    decumulationStrategy: decumNarrative,
    stochasticRisk: riskNarrative,
    estateTaxSummary: estateNarrative,
  };
}
