const fs = require('fs');
let c = fs.readFileSync('src/components/ExportSection.tsx', 'utf8');

const regex = /doc\.text\('.{1,3} Standard Amortization', 120, mY \+ 8\);\s+doc\.setTextColor\(16, 185, 129\); doc\.setFont\('helvetica', 'bold'\); doc\.text\('.{1,3} Strategy Overpayment Balance', 152, mY \+ 8\);\s+\}\s+\} else \{/m;

const insertStr = `doc.text('— Standard Amortization', 120, mY + 8);
            doc.setTextColor(16, 185, 129); doc.setFont('helvetica', 'bold'); doc.text('— Strategy Overpayment Balance', 152, mY + 8);
          }
          
          // =========================================================================
          // ARBITRAGE STRATEGY SECTION
          // =========================================================================
          mY += 95; // Move cursor below the chart

          const expectedInvestmentReturn = profile.potReturnOverrides?.enabled 
              ? (profile.potReturnOverrides.stocksAndSharesIsaReturn || 5.0)
              : (profile.postRetirementReturn || 5.0);
              
          const annualOverpayment = mRegOverpay * 12;
          const penaltyFreeAllowance = mConfig.ercEnabled ? mCurBal * ((mConfig.ercThresholdPercent || 10) / 100) : Infinity;
          const incursERC = mConfig.ercEnabled && annualOverpayment > penaltyFreeAllowance;
          const effectiveMortgageCost = incursERC ? mRatePct + (mConfig.ercPercent || 0) : mRatePct;
          const isBetterToInvest = expectedInvestmentReturn > effectiveMortgageCost;

          const mortgageYears = mConfig.remainingTermYears || 10;
          const years = Math.min(25, Math.max(5, mortgageYears));
          const rMort = (effectiveMortgageCost / 100) / 12;
          const rConfig = (expectedInvestmentReturn / 100) / 12;
          const rLow = (Math.max(1, expectedInvestmentReturn - 3) / 100) / 12;
          const rHigh = ((expectedInvestmentReturn + 3) / 100) / 12;

          const hasLumpSumsWithinTerm = mLumpSums.some(ls => ls.age >= currentAge && ls.age <= currentAge + years);
          const isHypothetical = mRegOverpay === 0 && !hasLumpSumsWithinTerm;
          const monthlySurplus = isHypothetical ? 500 : mRegOverpay;

          let overpayBal = 0, configBal = 0, lowBal = 0, highBal = 0;
          for(let y = 1; y <= years; y++) {
            const currentAgeLoop = currentAge + y - 1;
            overpayBal = overpayBal * Math.pow(1 + rMort, 12);
            configBal = configBal * Math.pow(1 + rConfig, 12);
            lowBal = lowBal * Math.pow(1 + rLow, 12);
            highBal = highBal * Math.pow(1 + rHigh, 12);

            if (monthlySurplus > 0) {
              overpayBal += rMort === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rMort, 12) - 1) / rMort);
              configBal += rConfig === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rConfig, 12) - 1) / rConfig);
              lowBal += rLow === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rLow, 12) - 1) / rLow);
              highBal += rHigh === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rHigh, 12) - 1) / rHigh);
            }

            const yearLumpSums = mLumpSums.filter(ls => ls.age === currentAgeLoop).reduce((sum, ls) => sum + ls.amount, 0);
            if (yearLumpSums > 0 && !isHypothetical) {
              overpayBal += yearLumpSums;
              configBal += yearLumpSums;
              lowBal += yearLumpSums;
              highBal += yearLumpSums;
            }
          }

          const finalOverpay = Math.round(overpayBal);
          const finalInvest = Math.round(configBal);
          const difference = Math.abs(finalInvest - finalOverpay);

          doc.setFillColor(30, 41, 59);
          doc.rect(14, mY, 182, 6, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Overpay vs Invest Arbitrage Strategy', 18, mY + 4.2);
          
          mY += 10;
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.setFontSize(9);
          doc.text(isBetterToInvest ? 'Verdict: Investing Captures the Yield Spread' : 'Verdict: Overpaying Guarantees the Best Return', 14, mY);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          mY += 5;
          doc.text(\`Effective mortgage cost is \${effectiveMortgageCost.toFixed(2)}%\${incursERC ? \` (includes \${mConfig.ercPercent}% ERC penalty)\` : ''}. Expected tax-free return is \${expectedInvestmentReturn.toFixed(2)}%.\`, 14, mY);
          mY += 4;
          doc.text(isBetterToInvest 
            ? \`Invest surplus to generate an extra £\${difference.toLocaleString()} over \${years} years.\`
            : \`Overpay debt to save an extra £\${difference.toLocaleString()} over \${years} years.\`, 14, mY);
            
          mY += 8;
          
          // Draw the Summary Table
          doc.setFillColor(248, 250, 252);
          doc.rect(14, mY, 182, 6, 'F');
          doc.setDrawColor(226, 232, 240);
          doc.rect(14, mY, 182, 6, 'D');
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
          doc.text('Financial Strategy', 18, mY + 4.2);
          doc.text('Assumed Rate', 85, mY + 4.2);
          doc.text('Projected Value', 125, mY + 4.2);
          doc.text('Net Gain vs Overpaying', 160, mY + 4.2);
          
          const addArbitrageRow = (label, rate, val, highlight) => {
            mY += 6;
            if (highlight) {
              doc.setFillColor(238, 242, 255); // indigo-50
              doc.rect(14, mY, 182, 6, 'F');
            }
            doc.setDrawColor(226, 232, 240);
            doc.rect(14, mY, 182, 6, 'D');
            
            doc.setFont('helvetica', highlight ? 'bold' : 'normal');
            doc.setTextColor(highlight ? 79 : 51, highlight ? 70 : 65, highlight ? 229 : 85); // indigo-600 or slate-700
            doc.text(label, 18, mY + 4.2);
            doc.text(\`\${rate.toFixed(2)}%\`, 85, mY + 4.2);
            doc.text(\`£\${Math.round(val).toLocaleString()}\`, 125, mY + 4.2);
            
            const gain = val - finalOverpay;
            if (gain === 0) {
              doc.setTextColor(148, 163, 184);
              doc.text('Baseline', 160, mY + 4.2);
            } else {
              doc.setTextColor(gain > 0 ? 16 : 225, gain > 0 ? 185 : 29, gain > 0 ? 129 : 72); // emerald-600 or rose-600
              doc.text(\`\${gain > 0 ? '+' : ''}£\${Math.round(gain).toLocaleString()}\`, 160, mY + 4.2);
            }
          };
          
          addArbitrageRow('Overpay Debt (Guaranteed)', effectiveMortgageCost, finalOverpay, false);
          addArbitrageRow('Invest (Low Scenario)', Math.max(1, expectedInvestmentReturn - 3), lowBal, false);
          addArbitrageRow('Invest (Your Configured)', expectedInvestmentReturn, finalInvest, true);
          addArbitrageRow('Invest (High Scenario)', expectedInvestmentReturn + 3, highBal, false);
        } else {`;

if (regex.test(c)) {
  c = c.replace(regex, insertStr);
  fs.writeFileSync('src/components/ExportSection.tsx', c);
  console.log('Successfully injected regex replacement!');
} else {
  console.log('Regex did not match :(');
}
