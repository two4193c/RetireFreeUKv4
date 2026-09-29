const fs = require('fs');

let c = fs.readFileSync('src/components/ExportSection.tsx', 'utf8');

const searchPoint = `      // Streamgraph Color Legend (bottom)
      const matLegY = p3Y + matBoxH - 5.5;`;

const newChartCode = `      p3Y += matBoxH + 4;

      // 4. Optimal Withdrawal Streamgraph (Bar Chart)
      const streamBoxH = 48;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, p3Y, 182, streamBoxH, 2.5, 2.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, p3Y, 182, streamBoxH, 2.5, 2.5, 'D');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text('Optimal Withdrawal Streamgraph', 18, p3Y + 5.5);

      const PA = 12570;
      const BASIC_CEIL = 50270;
      
      const streamData = optRetRows.map(r => {
        let sp = (r.primaryStatePensionReceived || 0) + (r.partnerStatePensionReceived || 0);
        let isaDrawdown = (r.primaryIsaDrawdown || 0) + (r.partnerIsaDrawdown || 0);
        let cashWithdrawal = (r.primaryCashDrawdown || 0) + (r.partnerCashDrawdown || 0) + (r.primaryTaxFreeFixedIncomeReceived || 0) + (r.partnerTaxFreeFixedIncomeReceived || 0) + (r.primaryGiltLadderIncomeReceived || 0) + (r.partnerGiltLadderIncomeReceived || 0);
        let pensionTaxFree = (r.primaryPensionDrawdownTaxFree || 0) + (r.partnerPensionDrawdownTaxFree || 0);
        let paCap = profile.isCouplePlanning ? PA * 2 : PA;
        let basicCap = profile.isCouplePlanning ? BASIC_CEIL * 2 : BASIC_CEIL;
        let taxableRemaining = (r.primaryDbPensionIncomeReceived || 0) + (r.partnerDbPensionIncomeReceived || 0) + (r.primaryTaxableFixedIncomeReceived || 0) + (r.partnerTaxableFixedIncomeReceived || 0) + (r.primaryAnnuityIncomeReceived || 0) + (r.partnerAnnuityIncomeReceived || 0) + (r.primaryPensionDrawdownTaxable || 0) + (r.partnerPensionDrawdownTaxable || 0);
        
        let paAlloc = Math.min(sp + taxableRemaining, paCap);
        let basicAlloc = Math.min(Math.max(0, sp + taxableRemaining - paCap), basicCap - paCap);
        let higherAlloc = Math.max(0, sp + taxableRemaining - basicCap);
        let taxFreeAlloc = isaDrawdown + cashWithdrawal + pensionTaxFree;
        
        return {
          age: r.age,
          pa: paAlloc,
          basic: basicAlloc,
          higher: higherAlloc,
          taxFree: taxFreeAlloc,
          total: paAlloc + basicAlloc + higherAlloc + taxFreeAlloc
        };
      });

      const maxStreamVal = Math.max(...streamData.map(d => d.total), 1);
      const chartW = 174;
      const chartH = 26;
      const chartX = 18;
      const chartY = p3Y + 12;
      const barW = chartW / Math.max(1, streamData.length);

      // Draw Grid Lines
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      [0, 0.5, 1].forEach(tick => {
        const lineY = chartY + chartH - (tick * chartH);
        doc.line(chartX, lineY, chartX + chartW, lineY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(148, 163, 184);
        doc.text(\`£\${Math.round(maxStreamVal * tick).toLocaleString()}\`, chartX - 1, lineY + 1.5, { align: 'right' });
      });

      streamData.forEach((d, i) => {
        const bx = chartX + i * barW;
        let currentY = chartY + chartH;

        // Draw PA (Green)
        if (d.pa > 0) {
          const bh = (d.pa / maxStreamVal) * chartH;
          currentY -= bh;
          doc.setFillColor(16, 185, 129); // emerald-500
          doc.rect(bx, currentY, Math.max(0.5, barW - 0.2), bh, 'F');
        }

        // Draw Basic (Blue)
        if (d.basic > 0) {
          const bh = (d.basic / maxStreamVal) * chartH;
          currentY -= bh;
          doc.setFillColor(14, 165, 233); // sky-500
          doc.rect(bx, currentY, Math.max(0.5, barW - 0.2), bh, 'F');
        }

        // Draw Higher (Red)
        if (d.higher > 0) {
          const bh = (d.higher / maxStreamVal) * chartH;
          currentY -= bh;
          doc.setFillColor(239, 68, 68); // red-500
          doc.rect(bx, currentY, Math.max(0.5, barW - 0.2), bh, 'F');
        }

        // Draw TaxFree (Indigo)
        if (d.taxFree > 0) {
          const bh = (d.taxFree / maxStreamVal) * chartH;
          currentY -= bh;
          doc.setFillColor(99, 102, 241); // indigo-500
          doc.rect(bx, currentY, Math.max(0.5, barW - 0.2), bh, 'F');
        }

        if (i % 5 === 0 || i === streamData.length - 1) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.setTextColor(100, 116, 139);
          doc.text(\`\${d.age}\`, bx + (barW/2), chartY + chartH + 3, { align: 'center' });
        }
      });

      // Streamgraph Color Legend (bottom)
      const matLegY = p3Y + streamBoxH - 5.5;`;

if (c.indexOf(searchPoint) !== -1) {
  c = c.replace(searchPoint, newChartCode);
  fs.writeFileSync('src/components/ExportSection.tsx', c);
  console.log('Success');
} else {
  console.log('Could not find search point');
}
