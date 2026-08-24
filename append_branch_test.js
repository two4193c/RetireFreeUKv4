const fs = require('fs');

const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('triggers every major branch', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      planStartYear: 2026,
      currentAge: 55,
      targetRetirementAge: 58,
      lifeExpectancyAge: 95,
      isCouplePlanning: true,
      partnerCurrentAge: 53,
      partnerTargetRetirementAge: 58,
      partnerLifeExpectancyAge: 90,
      
      includeStatePension: true,
      enableTripleLock: true,
      statePensionAge: 67,
      statePensionAmountAnnual: 11000,
      qualifyingYears: 30,
      partnerIncludeStatePension: true,
      partnerEnableTripleLock: false,
      partnerStatePensionAge: 67,
      partnerStatePensionAmountAnnual: 10000,
      partnerQualifyingYears: 20,

      grossAnnualSalary: 100000,
      pensionContributionMethod: 'salary_sacrifice',
      partnerGrossAnnualSalary: 60000,
      
      expectedInvestmentReturn: 6.5,
      postRetirementReturn: 4.5,
      expectedInflationRate: 2.5,
      adjustForInflation: true,
      indexTaxBands: true,
      potReturnOverrides: {
        enabled: true,
        workplacePension: 7,
        sipp: 6,
        stocksAndSharesIsa: 5,
        cashIsa: 4,
        lisa: 5,
        gia: 6,
        cashSavings: 3,
      },
      investmentFees: {
        enabled: true,
        perPotFeesEnabled: true,
        globalPlatformFeePercent: 0.5,
        primaryPots: { workplacePension: { platformFeePercent: 1.0 } },
        partnerPots: { sipp: { platformFeePercent: 1.2 } }
      },

      incomeProductOption: 'annuity',
      annuityRatePercent: 5,
      annuityEscalationRate: 3,
      annuityPurchaseAge: 60,
      partnerAnnuityPurchaseAge: 62,

      drawdownStrategy: 'proportional_phases',
      partnerDrawdownStrategy: 'tax_optimizer',
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { id: 't1', age: 58, amount: 100000, enabled: true, owner: 'primary' },
        { id: 't2', age: 60, amount: 200000, enabled: true, owner: 'primary' }
      ],
      partnerCrystallisationMode: 'phased_tranches',
      partnerCrystallisationTranches: [
        { id: 'pt1', age: 58, amount: 50000, enabled: true, owner: 'partner' }
      ],

      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      lumpSumTiming: 'access_age',
      lsaProtectionType: 'standard',
      
      spendingPhases: {
        enabled: true,
        customRanges: [
          { id: 'sp1', startAge: 58, endAge: 65, annualTargetIncome: 120000 },
          { id: 'sp2', startAge: 66, endAge: 85, annualTargetIncome: 80000 }
        ]
      },

      dbPensions: [
        { id: 'db1', name: 'DB', owner: 'primary', startAge: 60, annualIncome: 20000, taxFreeLumpSum: 10000, inflationLinked: true, enabled: true, targetPot: 'cash_savings' },
        { id: 'db2', name: 'DB P', owner: 'partner', startAge: 62, annualIncome: 15000, taxFreeLumpSum: 0, inflationLinked: false, enabled: true, targetPot: 'isa' }
      ],

      fixedIncomeStreams: [
        { id: 'fi1', name: 'Rental', owner: 'primary', startAge: 55, annualAmount: 15000, type: 'taxable', enabled: true },
        { id: 'fi2', name: 'Gift', owner: 'partner', startAge: 55, annualAmount: 5000, type: 'tax_free', enabled: true }
      ],

      mortgage: {
        enabled: true,
        currentBalance: 200000,
        remainingTermYears: 15,
        repaymentType: 'repayment',
        payoffAtRetirement: true
      },

      propertyDownsizePlan: {
        enabled: true,
        downsizeAge: 75,
        currentPropertyValue: 800000,
        targetNewPropertyCostToday: 500000,
        sellingCostsPercent: 1.5,
        stampDutySecondHomeSurcharge: false,
        destinationPot: 'isa'
      },
      
      potTransfers: [
        { id: 'tr1', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'stocks_and_shares_isa', transferAge: 56, amount: 10000, enabled: true },
        { id: 'tr2', owner: 'primary', sourcePot: 'gia', destinationOwner: 'partner', destinationPot: 'sipp', transferAge: 57, amount: 20000, enabled: true }
      ],

      decumulationLifeEvents: [
        { id: 'le1', name: 'Car', age: 60, cost: 30000, enabled: true, owner: 'primary', targetPot: 'cash_savings', type: 'one_off_expense' },
        { id: 'le2', name: 'Inheritance', age: 65, cost: -50000, enabled: true, owner: 'partner', targetPot: 'stocks_and_shares_isa', type: 'property_downsize' } // negative cost = income
      ],

      oneOffContributions: [
        { id: 'oc1', name: 'Bonus', owner: 'primary', targetPot: 'workplace_pension', frequency: 'one_off', grossAmount: 20000, date: '2028-01-01', enabled: true }
      ],

      reinvestExcessDrawdown: true,
      reinvestDestinationPot: 'gia',
      partnerReinvestDestinationPot: 'isa',

      maximizedSpendConfig: {
        enabled: true,
        reinvestExcessDrawdown: true,
        reinvestDestinationPot: 'isa',
        drawdownStrategy: 'proportional_phases'
      }
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      sippBalance: 200000,
      stocksAndSharesIsaBalance: 100000,
      cashIsaBalance: 50000,
      giaBalance: 80000,
      cashSavingsBalance: 40000,
      lisaBalance: 20000,

      partnerWorkplacePensionBalance: 300000,
      partnerSippBalance: 100000,
      partnerStocksAndSharesIsaBalance: 80000,
      partnerCashIsaBalance: 20000,
      partnerGiaBalance: 30000,
      partnerCashSavingsBalance: 50000,
      partnerLisaBalance: 10000,
      
      workplacePensionMonthlyEmployee: 500,
      workplacePensionMonthlyEmployer: 500,
      sippMonthlyContribution: 200,
      stocksAndSharesIsaMonthlyContribution: 300,
      cashIsaMonthlyContribution: 100,
      giaMonthlyContribution: 100,
      cashSavingsMonthlyContribution: 200,
      lisaMonthlyContribution: 100,
      
      partnerWorkplacePensionMonthlyEmployee: 300,
      partnerWorkplacePensionMonthlyEmployer: 300,
      partnerSippMonthlyContribution: 100,
      partnerStocksAndSharesIsaMonthlyContribution: 200,
      partnerCashIsaMonthlyContribution: 100,
      partnerGiaMonthlyContribution: 100,
      partnerCashSavingsMonthlyContribution: 100,
      partnerLisaMonthlyContribution: 50,
    };

    generateProjections(profile, pots);
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended branch test successfully");
