export interface HistoricYearData {
  year: number;
  equityReturn: number; // % annual return
  bondReturn: number;   // % annual return
  cashReturn: number;   // % annual yield
  inflation: number;    // % annual UK inflation (CPI/RPI)
  event: string;        // Historical market context
}

export const HISTORIC_MARKET_DATA: HistoricYearData[] = [
  { year: 1950, equityReturn: 17.5, bondReturn: 3.2, cashReturn: 0.6, inflation: 3.1, event: "Post-WW2 Reconstruction & Korean War Outbreak" },
  { year: 1951, equityReturn: 11.2, bondReturn: -3.8, cashReturn: 0.8, inflation: 9.1, event: "Korean War Commodity Spike & Churchill Election" },
  { year: 1952, equityReturn: -7.5, bondReturn: 1.2, cashReturn: 2.0, inflation: 9.2, event: "Post-War Austerity & Bank Rate Hikes" },
  { year: 1953, equityReturn: 21.4, bondReturn: 8.5, cashReturn: 2.1, inflation: 3.1, event: "Coronation Year Boom & Ending of Food Rations" },
  { year: 1954, equityReturn: 41.6, bondReturn: 7.2, cashReturn: 1.8, inflation: 1.8, event: "Post-War Industrial Export Expansion Boom" },
  { year: 1955, equityReturn: 4.8, bondReturn: -10.5, cashReturn: 2.8, inflation: 3.5, event: "Credit Squeeze & Bank Rate Raised to 4.5%" },
  { year: 1956, equityReturn: -9.2, bondReturn: -2.1, cashReturn: 3.8, inflation: 4.9, event: "Suez Canal Crisis & Middle East Oil Shock" },
  { year: 1957, equityReturn: -5.4, bondReturn: -1.5, cashReturn: 4.8, inflation: 3.7, event: "7% Bank Rate Emergency Increase to Defend Sterling" },
  { year: 1958, equityReturn: 36.5, bondReturn: 14.2, cashReturn: 3.5, inflation: 2.6, event: "Macmillan's 'Never Had It So Good' Economic Surge" },
  { year: 1959, equityReturn: 51.2, bondReturn: 6.8, cashReturn: 2.8, inflation: 0.6, event: "Conservative Election Victory & Consumer Boom" },
  { year: 1960, equityReturn: -7.8, bondReturn: -4.2, cashReturn: 3.8, inflation: 1.0, event: "Credit Controls Re-imposed & Economic Slowdown" },
  { year: 1961, equityReturn: -3.2, bondReturn: -4.8, cashReturn: 5.2, inflation: 3.4, event: "'Pay Pause' Wage Controls & IMF Credit Line" },
  { year: 1962, equityReturn: 2.1, bondReturn: 15.4, cashReturn: 3.8, inflation: 4.3, event: "Cuban Missile Crisis & Bank Rate Reductions" },
  { year: 1963, equityReturn: 20.8, bondReturn: 4.8, cashReturn: 3.2, inflation: 2.0, event: "Economic Recovery & Pre-Election Expansion" },
  { year: 1964, equityReturn: -5.6, bondReturn: -4.1, cashReturn: 4.5, inflation: 3.3, event: "Labour Election Victory & Balance of Payments Crisis" },
  { year: 1965, equityReturn: 9.2, bondReturn: 2.8, cashReturn: 5.5, inflation: 4.8, event: "Corporation Tax & Capital Gains Tax Introduced" },
  { year: 1966, equityReturn: -6.8, bondReturn: -1.2, cashReturn: 5.8, inflation: 3.9, event: "Prices & Incomes Standstill & Sterling Pressure" },
  { year: 1967, equityReturn: 34.2, bondReturn: 5.2, cashReturn: 5.5, inflation: 2.5, event: "Devaluation of the Pound ($2.80 to $2.40)" },
  { year: 1968, equityReturn: 46.8, bondReturn: -5.8, cashReturn: 6.2, inflation: 4.7, event: "Post-Devaluation Export & Stock Market Speculation" },
  { year: 1969, equityReturn: -15.2, bondReturn: -9.8, cashReturn: 7.2, inflation: 5.4, event: "Global Monetary Tightening & Credit Restriction" },
  { year: 1970, equityReturn: -5.8, bondReturn: 8.2, cashReturn: 6.8, inflation: 6.4, event: "Stagflation Emerges & Heath Election Victory" },
  { year: 1971, equityReturn: 42.1, bondReturn: 20.5, cashReturn: 5.5, inflation: 9.4, event: "Barber Boom Credit Expansion & Nixon Shock" },
  { year: 1972, equityReturn: 12.5, bondReturn: -10.2, cashReturn: 5.0, inflation: 7.1, event: "Pound Floated & Miners' Strike / 3-Day Week Threat" },
  { year: 1973, equityReturn: -31.4, bondReturn: -18.5, cashReturn: 8.2, inflation: 9.2, event: "OPEC Oil Embargo & 1973 Global Banking Crisis" },
  { year: 1974, equityReturn: -55.3, bondReturn: -22.4, cashReturn: 11.2, inflation: 16.0, event: "1974 UK Stock Market Collapse & 3-Day Week Emergency" },
  { year: 1975, equityReturn: 146.2, bondReturn: 18.0, cashReturn: 10.5, inflation: 24.2, event: "Post-1974 Market Rebound & High UK Inflation Spike" },
  { year: 1976, equityReturn: 4.8, bondReturn: -2.0, cashReturn: 11.2, inflation: 16.5, event: "IMF Bailout & Sterling Crisis" },
  { year: 1977, equityReturn: 46.2, bondReturn: 28.0, cashReturn: 8.5, inflation: 15.8, event: "North Sea Oil Boom & Jubilee Recovery" },
  { year: 1978, equityReturn: 8.5, bondReturn: 3.0, cashReturn: 9.2, inflation: 8.3, event: "Winter of Discontent Approaching" },
  { year: 1979, equityReturn: 11.2, bondReturn: 4.5, cashReturn: 13.7, inflation: 17.2, event: "Second Oil Shock & Thatcher Election" },
  { year: 1980, equityReturn: 32.5, bondReturn: 18.2, cashReturn: 16.3, inflation: 18.0, event: "18% Interest Rate Peak & Early 80s Recession" },
  { year: 1981, equityReturn: 13.8, bondReturn: 3.1, cashReturn: 13.5, inflation: 11.9, event: "Austerity Budget & Industrial Restructuring" },
  { year: 1982, equityReturn: 28.5, bondReturn: 48.0, cashReturn: 12.0, inflation: 8.6, event: "Falklands War & Great 1980s Bull Market Launch" },
  { year: 1983, equityReturn: 25.2, bondReturn: 14.1, cashReturn: 9.8, inflation: 4.6, event: "Inflation Tamed & Privatization Era Begins" },
  { year: 1984, equityReturn: 31.8, bondReturn: 8.5, cashReturn: 9.6, inflation: 5.0, event: "Miners' Strike & Telecom Privatization Boom" },
  { year: 1985, equityReturn: 20.1, bondReturn: 11.2, cashReturn: 12.2, inflation: 5.7, event: "Plaza Accord & Strong Global Growth" },
  { year: 1986, equityReturn: 27.4, bondReturn: 15.8, cashReturn: 10.8, inflation: 3.4, event: "City of London 'Big Bang' Financial Deregulation" },
  { year: 1987, equityReturn: 8.2, bondReturn: 15.5, cashReturn: 9.5, inflation: 4.2, event: "Black Monday October 1987 Stock Crash" },
  { year: 1988, equityReturn: 11.5, bondReturn: 9.2, cashReturn: 10.2, inflation: 4.9, event: "Lawson Tax Cuts & Housing Market Boom" },
  { year: 1989, equityReturn: 35.4, bondReturn: 2.5, cashReturn: 13.8, inflation: 7.8, event: "Fall of Berlin Wall & High UK Interest Rates" },
  { year: 1990, equityReturn: -9.8, bondReturn: 7.8, cashReturn: 14.8, inflation: 9.5, event: "UK Joins ERM & Commercial Property Crash" },
  { year: 1991, equityReturn: 20.8, bondReturn: 18.4, cashReturn: 11.5, inflation: 5.9, event: "Gulf War & Early 90s Economic Slowdown" },
  { year: 1992, equityReturn: 20.2, bondReturn: 17.2, cashReturn: 9.2, inflation: 3.7, event: "Black Wednesday (UK Exit from ERM) & Devaluation Rally" },
  { year: 1993, equityReturn: 28.4, bondReturn: 26.8, cashReturn: 5.8, inflation: 1.6, event: "Low Inflation & Strong Bond/Equity Rally" },
  { year: 1994, equityReturn: -5.8, bondReturn: -8.2, cashReturn: 5.4, inflation: 2.4, event: "Global Fed Rate Hikes & Bond Market Shock" },
  { year: 1995, equityReturn: 23.8, bondReturn: 17.1, cashReturn: 6.6, inflation: 3.5, event: "Early Tech Boom & Strong Corporate Profits" },
  { year: 1996, equityReturn: 16.7, bondReturn: 8.8, cashReturn: 5.9, inflation: 2.4, event: "Steady Growth & Low Inflation Goldilocks Economy" },
  { year: 1997, equityReturn: 24.7, bondReturn: 18.2, cashReturn: 6.5, inflation: 3.1, event: "Bank of England Independence & Asian Financial Crisis" },
  { year: 1998, equityReturn: 14.5, bondReturn: 21.4, cashReturn: 7.2, inflation: 3.4, event: "Russian Default & LTCM Hedge Fund Bailout" },
  { year: 1999, equityReturn: 20.9, bondReturn: -2.8, cashReturn: 5.2, inflation: 1.8, event: "Peak Dot-Com Tech Bubble Euphoria" },
  { year: 2000, equityReturn: -10.2, bondReturn: 8.5, cashReturn: 6.0, inflation: 3.0, event: "Dot-Com Crash Begins & Telecom Debt Crisis" },
  { year: 2001, equityReturn: -16.2, bondReturn: 3.2, cashReturn: 5.0, inflation: 1.8, event: "9/11 Attacks & Global Tech Recession" },
  { year: 2002, equityReturn: -22.7, bondReturn: 8.8, cashReturn: 4.0, inflation: 1.7, event: "Enron/WorldCom Scandals & Bear Market Bottom" },
  { year: 2003, equityReturn: 17.9, bondReturn: 2.1, cashReturn: 3.7, inflation: 2.9, event: "Iraq War & Global Equity Recovery" },
  { year: 2004, equityReturn: 12.8, bondReturn: 6.8, cashReturn: 4.4, inflation: 1.6, event: "Commodity Supercycle & Housing Growth" },
  { year: 2005, equityReturn: 22.0, bondReturn: 8.2, cashReturn: 4.7, inflation: 2.1, event: "Global Economic Expansion & Low Volatility" },
  { year: 2006, equityReturn: 16.8, bondReturn: 0.5, cashReturn: 4.8, inflation: 2.3, event: "Mining & Resource Boom" },
  { year: 2007, equityReturn: 7.4, bondReturn: 6.2, cashReturn: 5.5, inflation: 2.3, event: "Northern Rock Bank Run & Subprime Warning" },
  { year: 2008, equityReturn: -31.0, bondReturn: 13.2, cashReturn: 4.7, inflation: 3.6, event: "Lehman Brothers Collapse & Global Financial Crisis" },
  { year: 2009, equityReturn: 30.1, bondReturn: -1.5, cashReturn: 0.8, inflation: 2.2, event: "Quantitative Easing & Post-GFC V-Shaped Bounce" },
  { year: 2010, equityReturn: 14.5, bondReturn: 8.2, cashReturn: 0.5, inflation: 3.3, event: "Eurozone Sovereign Debt Crisis (Greece)" },
  { year: 2011, equityReturn: -2.2, bondReturn: 15.8, cashReturn: 0.5, inflation: 4.5, event: "US Credit Downgrade & Euro Crisis Peak" },
  { year: 2012, equityReturn: 12.3, bondReturn: 2.7, cashReturn: 0.5, inflation: 2.8, event: "ECB 'Whatever It Takes' & London Olympics" },
  { year: 2013, equityReturn: 20.8, bondReturn: -5.2, cashReturn: 0.5, inflation: 2.6, event: "Fed Taper Tantrum & Equity Rally" },
  { year: 2014, equityReturn: 1.2, bondReturn: 13.8, cashReturn: 0.5, inflation: 1.5, event: "Oil Price Collapse & Scottish Independence Vote" },
  { year: 2015, equityReturn: 1.0, bondReturn: 0.6, cashReturn: 0.5, inflation: 0.0, event: "Zero Inflation & Chinese Market Devaluation" },
  { year: 2016, equityReturn: 16.8, bondReturn: 10.1, cashReturn: 0.4, inflation: 0.7, event: "Brexit Vote & US Presidential Election Rally" },
  { year: 2017, equityReturn: 13.1, bondReturn: 1.8, cashReturn: 0.3, inflation: 2.7, event: "Synchronized Global Growth & Sterling Weakness" },
  { year: 2018, equityReturn: -9.5, bondReturn: 0.6, cashReturn: 0.6, inflation: 2.5, event: "US-China Trade War & Q4 Market Sell-off" },
  { year: 2019, equityReturn: 19.2, bondReturn: 6.9, cashReturn: 0.7, inflation: 1.8, event: "Central Bank Rate Cuts & Strong Equity Returns" },
  { year: 2020, equityReturn: -12.4, bondReturn: 8.3, cashReturn: 0.2, inflation: 0.8, event: "COVID-19 Pandemic Crash & Massive Monetary Stimulus" },
  { year: 2021, equityReturn: 18.3, bondReturn: -5.2, cashReturn: 0.1, inflation: 2.6, event: "Post-Vaccine Economic Reopening & Tech Boom" },
  { year: 2022, equityReturn: -4.8, bondReturn: -23.8, cashReturn: 1.4, inflation: 9.1, event: "Ukraine War, Energy Shock, 9% Inflation & Bond Crash" },
  { year: 2023, equityReturn: 7.9, bondReturn: 3.8, cashReturn: 4.6, inflation: 7.3, event: "Central Bank Rate Hikes & AI Sector Boom" },
  { year: 2024, equityReturn: 11.2, bondReturn: 2.5, cashReturn: 5.2, inflation: 2.6, event: "Global Disinflation & Rate Cutting Cycle Begins" },
];

/**
 * Returns a looped sequence of length `numYears` starting at `startIndex` (0..74)
 */
export function getHistoricSequence(startIndex: number, numYears: number): HistoricYearData[] {
  const count = HISTORIC_MARKET_DATA.length; // 75
  const sequence: HistoricYearData[] = [];
  for (let i = 0; i < numYears; i++) {
    const idx = (startIndex + i) % count;
    sequence.push({
      ...HISTORIC_MARKET_DATA[idx],
    });
  }
  return sequence;
}
