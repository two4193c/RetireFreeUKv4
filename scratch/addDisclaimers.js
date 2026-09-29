const fs = require('fs');

// Patch MortgageArbitrageInsight.tsx
let uiPath = 'src/components/MortgageArbitrageInsight.tsx';
let ui = fs.readFileSync(uiPath, 'utf8');

const uiTarget = `          </tbody>
        </table>
      </div>

    </div>
  );
};`;

const uiPatch = `          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
        <strong className="text-slate-700 dark:text-slate-300">Important Note:</strong> Overpaying your mortgage provides a 100% guaranteed, tax-free return equal to your mortgage interest rate. Investing in the stock market carries inherent risk; your capital can go down as well as up, and actual returns will fluctuate year over year.
      </div>

    </div>
  );
};`;

ui = ui.replace(uiTarget, uiPatch);
fs.writeFileSync(uiPath, ui);


// Patch ExportSection.tsx
let pdfPath = 'src/components/ExportSection.tsx';
let pdf = fs.readFileSync(pdfPath, 'utf8');

const pdfRegex = /addArbitrageRow\('Invest \(High Scenario\)', expectedInvestmentReturn \+ 3, highBal, false\);\s+\} else \{/m;

const pdfPatch = `addArbitrageRow('Invest (High Scenario)', expectedInvestmentReturn + 3, highBal, false);
          
          mY += 10;
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
          doc.text('Important Note: Overpaying your mortgage provides a 100% guaranteed, tax-free return equal to your mortgage interest rate.', 14, mY);
          doc.text('Investing in the stock market carries inherent risk; your capital can go down as well as up, and actual returns will fluctuate year over year.', 14, mY + 3.5);
        } else {`;

if (pdfRegex.test(pdf)) {
  pdf = pdf.replace(pdfRegex, pdfPatch);
  fs.writeFileSync(pdfPath, pdf);
  console.log('Successfully patched both files!');
} else {
  console.log('Regex did not match for ExportSection.tsx');
}
