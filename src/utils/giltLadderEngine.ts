import { GiltLadderConfig, GiltLadderRung, GiltLadderSummary, UserProfile, InvestmentPots } from '../types';

export interface GiltReferenceData {
  isin: string;
  name: string;
  shortCode: string;
  maturityYear: number;
  maturityDate: string;
  couponPercent: number;
  benchmarkPrice: number; // Clean price per £100 nominal
  category: 'low_coupon' | 'benchmark';
}

/**
 * Curated list of UK Government Gilts (DMO issues) commonly used for low-coupon tax arbitrage and liability matching.
 */
export const UK_GILT_DATABASE: GiltReferenceData[] = [
  // 2026
  { isin: 'GB00BL68HJ04', name: 'Treasury 0.125% 2026', shortCode: 'TN26', maturityYear: 2026, maturityDate: '31/01/2026', couponPercent: 0.125, benchmarkPrice: 97.40, category: 'low_coupon' },
  { isin: 'GB00BYYW2V44', name: 'Treasury 1.500% 2026', shortCode: 'T26', maturityYear: 2026, maturityDate: '22/07/2026', couponPercent: 1.500, benchmarkPrice: 96.80, category: 'benchmark' },
  { isin: 'GB00BYZNBH56', name: 'Treasury 0.375% 2026', shortCode: 'TG26', maturityYear: 2026, maturityDate: '22/10/2026', couponPercent: 0.375, benchmarkPrice: 95.20, category: 'low_coupon' },

  // 2027
  { isin: 'GB00BDRHNP05', name: 'Treasury 1.250% 2027', shortCode: 'TR27', maturityYear: 2027, maturityDate: '22/07/2027', couponPercent: 1.250, benchmarkPrice: 93.60, category: 'low_coupon' },
  { isin: 'GB00B16NNR78', name: 'Treasury 4.250% 2027', shortCode: 'T27', maturityYear: 2027, maturityDate: '07/12/2027', couponPercent: 4.250, benchmarkPrice: 99.80, category: 'benchmark' },

  // 2028
  { isin: 'GB00BMBL1D56', name: 'Treasury 0.125% 2028', shortCode: 'TG28', maturityYear: 2028, maturityDate: '31/01/2028', couponPercent: 0.125, benchmarkPrice: 89.10, category: 'low_coupon' },
  { isin: 'GB00BFX0RH92', name: 'Treasury 1.625% 2028', shortCode: 'T28', maturityYear: 2028, maturityDate: '22/10/2028', couponPercent: 1.625, benchmarkPrice: 91.20, category: 'benchmark' },

  // 2029
  { isin: 'GB00BJL47801', name: 'Treasury 0.500% 2029', shortCode: 'T29', maturityYear: 2029, maturityDate: '22/10/2029', couponPercent: 0.500, benchmarkPrice: 84.80, category: 'low_coupon' },
  { isin: 'GB00BJMHB534', name: 'Treasury 0.875% 2029', shortCode: 'T29B', maturityYear: 2029, maturityDate: '22/10/2029', couponPercent: 0.875, benchmarkPrice: 86.10, category: 'benchmark' },

  // 2030
  { isin: 'GB00BL68HH89', name: 'Treasury 0.375% 2030', shortCode: 'T30', maturityYear: 2030, maturityDate: '22/10/2030', couponPercent: 0.375, benchmarkPrice: 80.50, category: 'low_coupon' },
  { isin: 'GB00B24FF097', name: 'Treasury 4.750% 2030', shortCode: 'T30B', maturityYear: 2030, maturityDate: '07/12/2030', couponPercent: 4.750, benchmarkPrice: 101.40, category: 'benchmark' },

  // 2031
  { isin: 'GB00BMBL1G87', name: 'Treasury 0.250% 2031', shortCode: 'T31', maturityYear: 2031, maturityDate: '31/07/2031', couponPercent: 0.250, benchmarkPrice: 76.80, category: 'low_coupon' },
  { isin: 'GB00BN65R300', name: 'Treasury 1.000% 2031', shortCode: 'T31B', maturityYear: 2031, maturityDate: '22/04/2031', couponPercent: 1.000, benchmarkPrice: 80.20, category: 'benchmark' },

  // 2032
  { isin: 'GB00BM8Z2T38', name: 'Treasury 1.000% 2032', shortCode: 'T32', maturityYear: 2032, maturityDate: '22/04/2032', couponPercent: 1.000, benchmarkPrice: 76.50, category: 'low_coupon' },
  { isin: 'GB0004893086', name: 'Treasury 4.250% 2032', shortCode: 'T32B', maturityYear: 2032, maturityDate: '07/06/2032', couponPercent: 4.250, benchmarkPrice: 98.60, category: 'benchmark' },

  // 2033
  { isin: 'GB00BM8Z2S21', name: 'Treasury 0.625% 2033', shortCode: 'T33', maturityYear: 2033, maturityDate: '07/06/2033', couponPercent: 0.625, benchmarkPrice: 72.10, category: 'low_coupon' },
  { isin: 'GB00BMV7TC44', name: 'Treasury 3.250% 2033', shortCode: 'T33B', maturityYear: 2033, maturityDate: '22/01/2033', couponPercent: 3.250, benchmarkPrice: 91.80, category: 'benchmark' },

  // 2034
  { isin: 'GB00BLPK5R68', name: 'Treasury 0.625% 2034', shortCode: 'T34', maturityYear: 2034, maturityDate: '22/10/2034', couponPercent: 0.625, benchmarkPrice: 68.40, category: 'low_coupon' },
  { isin: 'GB00BPS9DL19', name: 'Treasury 4.625% 2034', shortCode: 'T34B', maturityYear: 2034, maturityDate: '31/01/2034', couponPercent: 4.625, benchmarkPrice: 100.20, category: 'benchmark' },

  // 2035
  { isin: 'GB00BMBL1H94', name: 'Treasury 0.625% 2035', shortCode: 'T35', maturityYear: 2035, maturityDate: '22/10/2035', couponPercent: 0.625, benchmarkPrice: 64.90, category: 'low_coupon' },
  { isin: 'GB00B06YGN05', name: 'Treasury 4.250% 2035', shortCode: 'T35B', maturityYear: 2035, maturityDate: '07/03/2035', couponPercent: 4.250, benchmarkPrice: 97.50, category: 'benchmark' },

  // 2036
  { isin: 'GB00BYY5F144', name: 'Treasury 1.250% 2036', shortCode: 'T36', maturityYear: 2036, maturityDate: '22/10/2036', couponPercent: 1.250, benchmarkPrice: 66.80, category: 'low_coupon' },

  // 2037
  { isin: 'GB00BZB26Y51', name: 'Treasury 1.750% 2037', shortCode: 'T37', maturityYear: 2037, maturityDate: '07/09/2037', couponPercent: 1.750, benchmarkPrice: 68.20, category: 'low_coupon' },

  // 2038
  { isin: 'GB00BF537038', name: 'Treasury 1.625% 2038', shortCode: 'T38', maturityYear: 2038, maturityDate: '22/10/2038', couponPercent: 1.625, benchmarkPrice: 64.50, category: 'low_coupon' },

  // 2039
  { isin: 'GB00BL68HJ04', name: 'Treasury 1.125% 2039', shortCode: 'T39', maturityYear: 2039, maturityDate: '22/10/2039', couponPercent: 1.125, benchmarkPrice: 59.80, category: 'low_coupon' },

  // 2040
  { isin: 'GB00B6460505', name: 'Treasury 1.250% 2040', shortCode: 'T40', maturityYear: 2040, maturityDate: '22/10/2040', couponPercent: 1.250, benchmarkPrice: 57.60, category: 'low_coupon' },
];

/**
 * Estimates clean price for a gilt with given maturity year, coupon, and target yield to maturity (YTM).
 */
export function estimateGiltPrice(
  currentYear: number,
  maturityYear: number,
  couponPercent: number,
  ytmPercent: number = 4.35
): number {
  const yearsToMaturity = Math.max(1, maturityYear - currentYear);
  const r = ytmPercent / 100;
  const c = couponPercent;

  let presentValue = 0;
  for (let t = 1; t <= yearsToMaturity; t++) {
    presentValue += c / Math.pow(1 + r, t);
  }
  presentValue += 100 / Math.pow(1 + r, yearsToMaturity);

  return Math.round(presentValue * 100) / 100;
}

/**
 * Finds the most suitable UK Gilt from the database for a target calendar year and style,
 * or synthesizes an accurate synthetic bond if beyond the curated range.
 */
export function getGiltForYear(
  currentYear: number,
  targetCalendarYear: number,
  giltType: 'low_coupon' | 'benchmark' | 'custom' = 'low_coupon',
  customYieldPercent: number = 4.35
): { isin: string; name: string; couponPercent: number; cleanPrice: number; maturityDate: string } {
  const matches = UK_GILT_DATABASE.filter((g) => g.maturityYear === targetCalendarYear);

  if (matches.length > 0) {
    if (giltType === 'low_coupon') {
      const lowCoupon = matches.filter((m) => m.category === 'low_coupon').sort((a, b) => a.couponPercent - b.couponPercent)[0];
      if (lowCoupon) {
        return {
          isin: lowCoupon.isin,
          name: lowCoupon.name,
          couponPercent: lowCoupon.couponPercent,
          cleanPrice: lowCoupon.benchmarkPrice,
          maturityDate: lowCoupon.maturityDate,
        };
      }
    } else if (giltType === 'benchmark') {
      const benchmark = matches.filter((m) => m.category === 'benchmark').sort((a, b) => b.couponPercent - a.couponPercent)[0];
      if (benchmark) {
        return {
          isin: benchmark.isin,
          name: benchmark.name,
          couponPercent: benchmark.couponPercent,
          cleanPrice: benchmark.benchmarkPrice,
          maturityDate: benchmark.maturityDate,
        };
      }
    }
    // Fallback to first available match
    const first = matches[0];
    return {
      isin: first.isin,
      name: first.name,
      couponPercent: first.couponPercent,
      cleanPrice: first.benchmarkPrice,
      maturityDate: first.maturityDate,
    };
  }

  // Synthesize for future years beyond database
  const syntheticCoupon = giltType === 'low_coupon' ? 0.75 : 4.0;
  const synthPrice = estimateGiltPrice(currentYear, targetCalendarYear, syntheticCoupon, customYieldPercent);
  return {
    isin: `GB00SYNTH${targetCalendarYear}`,
    name: `UK Treasury ${syntheticCoupon.toFixed(3)}% ${targetCalendarYear}`,
    couponPercent: syntheticCoupon,
    cleanPrice: synthPrice,
    maturityDate: `22/10/${targetCalendarYear}`,
  };
}

/**
 * Determines the marginal income tax rate on Gilt coupons based on funding source and investor tax bracket.
 */
export function getCouponTaxRate(
  fundingSource: GiltLadderConfig['fundingSource'],
  taxBracketOverride?: GiltLadderConfig['taxBracketOverride'],
  profileGrossSalary: number = 50000
): number {
  // ISA and Pension are 100% tax sheltered
  if (fundingSource === 'isa' || fundingSource === 'pension') {
    return 0.0;
  }

  if (taxBracketOverride && taxBracketOverride !== 'auto') {
    switch (taxBracketOverride) {
      case 'basic':
        return 0.20;
      case 'higher':
        return 0.40;
      case 'additional':
        return 0.45;
    }
  }

  // Auto-detect from income
  if (profileGrossSalary > 125140) return 0.45;
  if (profileGrossSalary > 50270) return 0.40;
  return 0.20;
}

/**
 * Core UK Gilt Ladder matching and pricing engine.
 * Computes exact nominal bond requirements, cashflow deliveries, coupon cascades, and tax arbitrage savings.
 */
export function calculateGiltLadder(
  config: GiltLadderConfig,
  profile: UserProfile,
  pots?: InvestmentPots
): GiltLadderSummary {
  const startAge = Math.max(profile.currentAge, config.startAge || profile.targetRetirementAge);
  const durationYears = config.durationYears
    ? config.durationYears
    : config.endAge
    ? Math.max(1, config.endAge - startAge + 1)
    : Math.max(1, Math.min(10, (profile.statePensionAge || 67) - startAge));

  if (durationYears <= 0 || !config.targetAnnualIncome || config.targetAnnualIncome <= 0) {
    return {
      totalUpfrontCost: 0,
      totalNominal: 0,
      totalGuaranteedPayout: 0,
      totalPayoutDelivered: 0,
      totalTaxFreeGain: 0,
      totalTaxFreeCapitalGains: 0,
      totalTaxPaid: 0,
      taxSavedVsCash: 0,
      blendedNetYieldPercent: 0,
      effectiveAnnualYieldPercent: 0,
      equivalentGrossYieldPercent: 0,
      durationYears: 0,
      isFundingSufficient: true,
      rungs: [],
    };
  }

  const currentYear = new Date().getFullYear();
  const birthYear = profile.dateOfBirth
    ? new Date(profile.dateOfBirth).getFullYear()
    : currentYear - profile.currentAge;

  const couponTaxRate = getCouponTaxRate(
    config.fundingSource,
    config.taxBracketOverride,
    profile.grossAnnualSalary || 50000
  );

  const inflationRate = (profile.expectedInflationRate || 2.5) / 100;
  const isInflationLinked = Boolean(config.inflationLinked);
  const defaultYtm = config.customYieldPercent || 4.35;

  // Initialize rungs structure
  interface RawRung {
    index: number;
    year: number;
    age: number;
    targetNetCashflow: number;
    giltName: string;
    isin: string;
    maturityDate: string;
    couponPercent: number;
    cleanPrice: number;
    nominal: number;
    purchaseCost: number;
    redemptionValue: number;
    grossCouponIncome: number;
    netCouponIncome: number;
    futureCouponsReceived: number;
    totalNetPayout: number;
    taxFreeGain: number;
    taxPaid: number;
  }

  const rawRungs: RawRung[] = [];

  for (let i = 0; i < durationYears; i++) {
    const age = startAge + i;
    const year = birthYear + age;
    const targetNetCashflow = isInflationLinked
      ? Math.round(config.targetAnnualIncome * Math.pow(1 + inflationRate, i))
      : config.targetAnnualIncome;

    const giltInfo = getGiltForYear(currentYear, year, config.giltType, defaultYtm);

    rawRungs.push({
      index: i,
      year,
      age,
      targetNetCashflow,
      giltName: giltInfo.name,
      isin: giltInfo.isin,
      maturityDate: giltInfo.maturityDate,
      couponPercent: giltInfo.couponPercent,
      cleanPrice: giltInfo.cleanPrice,
      nominal: 0,
      purchaseCost: 0,
      redemptionValue: 0,
      grossCouponIncome: 0,
      netCouponIncome: 0,
      futureCouponsReceived: 0,
      totalNetPayout: 0,
      taxFreeGain: 0,
      taxPaid: 0,
    });
  }

  // Cascading Coupon Matching Algorithm (working backwards from final maturity rung)
  for (let i = durationYears - 1; i >= 0; i--) {
    const current = rawRungs[i];
    const netCouponPerPound = (current.couponPercent / 100) * (1 - couponTaxRate);

    // Sum net coupons coming in year `i` from all longer-dated gilts (j > i)
    let couponsFromFutureRungs = 0;
    for (let j = i + 1; j < durationYears; j++) {
      const futureRung = rawRungs[j];
      const futureNetCoupon = futureRung.nominal * (futureRung.couponPercent / 100) * (1 - couponTaxRate);
      couponsFromFutureRungs += futureNetCoupon;
    }
    current.futureCouponsReceived = Math.round(couponsFromFutureRungs);

    // Remaining cash needed from rung `i` at maturity
    const netCashNeeded = Math.max(0, current.targetNetCashflow - couponsFromFutureRungs);

    // Each £1 nominal of rung `i` delivers £1.00 principal at par + £(netCouponPerPound) coupon
    const cashDeliveredPerNominal = 1.0 + netCouponPerPound;
    const nominalRequired = Math.ceil(netCashNeeded / cashDeliveredPerNominal);

    current.nominal = nominalRequired;
    current.purchaseCost = Math.round(nominalRequired * (current.cleanPrice / 100));
    current.redemptionValue = nominalRequired;

    const grossCoupon = Math.round(nominalRequired * (current.couponPercent / 100));
    const netCoupon = Math.round(grossCoupon * (1 - couponTaxRate));
    const taxOnThisRungCoupon = grossCoupon - netCoupon;

    current.grossCouponIncome = grossCoupon;
    current.netCouponIncome = netCoupon;
    current.taxPaid = taxOnThisRungCoupon;
    current.totalNetPayout = current.redemptionValue + current.netCouponIncome + current.futureCouponsReceived;
    current.taxFreeGain = Math.max(0, current.redemptionValue - current.purchaseCost);
  }

  // Aggregate summary metrics
  const totalUpfrontCost = rawRungs.reduce((acc, r) => acc + r.purchaseCost, 0);
  const totalNominal = rawRungs.reduce((acc, r) => acc + r.nominal, 0);
  const totalGuaranteedPayout = rawRungs.reduce((acc, r) => acc + r.totalNetPayout, 0);
  const totalTaxFreeGain = rawRungs.reduce((acc, r) => acc + r.taxFreeGain, 0);
  const totalTaxPaid = rawRungs.reduce((acc, r) => acc + r.taxPaid, 0);

  // Calculate Tax Arbitrage vs Taxable Bank Cash Deposit:
  // In a taxable bank deposit, 100% of the interest return is taxed at the user's marginal rate.
  // Net cash deposit yield = gross yield * (1 - couponTaxRate).
  const bankGrossYield = defaultYtm / 100;
  const bankNetYield = bankGrossYield * (1 - couponTaxRate);
  let taxableCashUpfrontCost = 0;
  for (let i = 0; i < durationYears; i++) {
    const cashflow = rawRungs[i].targetNetCashflow;
    taxableCashUpfrontCost += cashflow / Math.pow(1 + bankNetYield, i + 1);
  }
  const taxSavedVsCash = Math.max(0, Math.round(taxableCashUpfrontCost - totalUpfrontCost));

  // Blended Net Internal Rate of Return (IRR) approximation
  const totalProfit = totalGuaranteedPayout - totalUpfrontCost;
  const avgDuration = durationYears > 0 ? (durationYears + 1) / 2 : 1;
  const blendedNetYieldPercent = totalUpfrontCost > 0 && avgDuration > 0
    ? Math.round(((totalProfit / totalUpfrontCost) / avgDuration) * 1000) / 10
    : 0;

  const equivalentGrossYieldPercent = couponTaxRate > 0 && couponTaxRate < 1
    ? Math.round((blendedNetYieldPercent / (1 - couponTaxRate)) * 10) / 10
    : blendedNetYieldPercent;

  // Check funding sufficiency if pots provided
  let isFundingSufficient = true;
  if (pots) {
    let available = 0;
    const source = config.fundingSource || 'gia';
    if (source === 'gia') {
      available = (pots.giaBalance || 0) + (pots.cashSavingsBalance || 0);
    } else if (source === 'isa') {
      available = (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.lisaBalance || 0);
    } else if (source === 'cash') {
      available = (pots.cashSavingsBalance || 0) + (pots.cashIsaBalance || 0);
    } else if (source === 'pension') {
      available = (pots.workplacePensionBalance || 0) + (pots.sippBalance || 0);
    } else {
      // blended
      available = (pots.giaBalance || 0) + (pots.stocksAndSharesIsaBalance || 0) + (pots.cashIsaBalance || 0) + (pots.cashSavingsBalance || 0) + (pots.lisaBalance || 0);
    }
    isFundingSufficient = available >= totalUpfrontCost;
  }

  const finalRungs: GiltLadderRung[] = rawRungs.map((r) => ({
    year: r.year,
    age: r.age,
    giltName: r.giltName,
    isin: r.isin,
    maturityDate: r.maturityDate,
    couponPercent: r.couponPercent,
    cleanPrice: r.cleanPrice,
    nominalRequired: r.nominal,
    purchaseCost: r.purchaseCost,
    redemptionValue: r.redemptionValue,
    maturingPrincipal: r.redemptionValue,
    grossCouponIncome: r.grossCouponIncome,
    netCouponIncome: r.netCouponIncome,
    annualCouponCashflow: r.netCouponIncome,
    futureCouponsReceived: r.futureCouponsReceived,
    totalNetPayout: r.totalNetPayout,
    taxFreeGain: r.taxFreeGain,
    taxFreeCapitalGain: r.taxFreeGain,
    taxPaid: r.taxPaid,
  }));

  return {
    totalUpfrontCost,
    totalNominal,
    totalGuaranteedPayout,
    totalPayoutDelivered: totalGuaranteedPayout,
    totalTaxFreeGain,
    totalTaxFreeCapitalGains: totalTaxFreeGain,
    totalTaxPaid,
    taxSavedVsCash,
    blendedNetYieldPercent,
    effectiveAnnualYieldPercent: blendedNetYieldPercent,
    equivalentGrossYieldPercent,
    durationYears,
    isFundingSufficient,
    rungs: finalRungs,
  };
}

/**
 * Creates default Gilt Ladder configuration tailored to user profile.
 */
export function getDefaultGiltLadderConfig(profile: UserProfile): GiltLadderConfig {
  const startAge = profile.targetRetirementAge || 60;
  const endAge = Math.max(startAge + 1, Math.min(startAge + 8, profile.statePensionAge || 67));
  const bridgeGap = Math.max(15000, profile.targetRetirementIncomeAnnual || 25000);

  return {
    enabled: false,
    startAge,
    endAge,
    targetAnnualIncome: bridgeGap,
    fundingSource: 'gia',
    giltType: 'low_coupon',
    customYieldPercent: 4.35,
    taxBracketOverride: 'auto',
    inflationLinked: false,
  };
}
