const fs = require('fs');
const file = 'src/utils/ukTaxEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `  // Calculate ISA & LISA annual contributions
  const ssIsaAnnual = regularSsIsaAnnual + oneOffSsIsa;
  const cashIsaAnnual = regularCashIsaAnnual + oneOffCashIsa;
  const lisaAnnual = regularLisaAnnual + oneOffLisa;
  const giaAnnual = regularGiaAnnual + oneOffGia;
  const cashSavingsAnnual = regularCashSavingsAnnual + oneOffCashSavings;

  const lisaLimit = profile.customTaxBands?.enabled 
    ? (profile.customTaxBands.lisaAnnualAllowance ?? LISA_ANNUAL_LIMIT)
    : LISA_ANNUAL_LIMIT;

  const lisaEligibleAge = currentEvalAge < 50;
  const totalIsaAnnual = ssIsaAnnual + cashIsaAnnual + lisaAnnual;
  const lisaBonusAnnual = lisaEligibleAge ? Math.min(lisaAnnual, lisaLimit) * 0.25 : 0;`;

const rep = `  // Calculate ISA & LISA annual contributions
  let ssIsaAnnual = regularSsIsaAnnual + oneOffSsIsa;
  let cashIsaAnnual = regularCashIsaAnnual + oneOffCashIsa;
  let lisaAnnual = regularLisaAnnual + oneOffLisa;
  let giaAnnual = regularGiaAnnual + oneOffGia;
  let cashSavingsAnnual = regularCashSavingsAnnual + oneOffCashSavings;

  const isaLimit = profile.customTaxBands?.enabled 
    ? (profile.customTaxBands.isaAnnualAllowance ?? ISA_ANNUAL_LIMIT)
    : ISA_ANNUAL_LIMIT;

  let totalIsaAnnual = ssIsaAnnual + cashIsaAnnual + lisaAnnual;
  const excessIsa = Math.max(0, totalIsaAnnual - isaLimit);
  if (excessIsa > 0 && totalIsaAnnual > 0) {
    // Re-allocate excess to GIA
    regularGiaAnnual += excessIsa;
    giaAnnual += excessIsa;
    
    // Scale down all ISA contributions proportionally
    const scale = isaLimit / totalIsaAnnual;
    regularSsIsaAnnual *= scale;
    oneOffSsIsa *= scale;
    regularCashIsaAnnual *= scale;
    oneOffCashIsa *= scale;
    regularLisaAnnual *= scale;
    oneOffLisa *= scale;
    
    ssIsaAnnual = regularSsIsaAnnual + oneOffSsIsa;
    cashIsaAnnual = regularCashIsaAnnual + oneOffCashIsa;
    lisaAnnual = regularLisaAnnual + oneOffLisa;
    totalIsaAnnual = ssIsaAnnual + cashIsaAnnual + lisaAnnual;
  }

  const lisaLimit = profile.customTaxBands?.enabled 
    ? (profile.customTaxBands.lisaAnnualAllowance ?? LISA_ANNUAL_LIMIT)
    : LISA_ANNUAL_LIMIT;

  const lisaEligibleAge = currentEvalAge < 50;
  const lisaBonusAnnual = lisaEligibleAge ? Math.min(lisaAnnual, lisaLimit) * 0.25 : 0;`;

code = code.replace(target, rep);

fs.writeFileSync(file, code);
