# RetireFree UK v4 Codebase Audit Report: Calculation Engines & Utilities

We have completed a comprehensive review of the calculation engines and utility files in `C:\Users\two41\.gemini\antigravity\scratch\RetireFreeUKv4`.

Below is the structured audit report detailing logic errors, edge cases, tax accuracy issues, NMPA/state pension discrepancies, inflation indexing bugs, couple parity defects, type safety issues, and performance bottlenecks.

---

## 1. `src/utils/ukTaxEngine.ts`

### Issue 1.1: Broken Scottish Tax Band Thresholds in `calculateStandardIncomeTax`
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 520–550
- **Severity**: CRITICAL
- **Description**: In `calculateStandardIncomeTax`, the Scottish tax calculation logic uses conflicting and incorrect upper thresholds for the Higher and Advanced rate bands:
  - Line 538: `const b4 = Math.min(rem, 75000 - 43662);` (uses £75,000 as higher rate threshold).
  - Line 543: `const b5 = Math.min(rem, 125140 - 62430);` (uses £62,430 as higher rate threshold).
  This causes a band overlap/discontinuity between £62,430 and £75,000 where taxable income is miscalculated across the 42% Higher and 45% Advanced bands.
- **Suggested Fix**: Update `calculateStandardIncomeTax` to use `SCOT_HIGHER_THRESHOLD` (62,430) and `SCOT_ADVANCED_THRESHOLD` (125,140) from `../config/ukTaxRates`.

---

### Issue 1.2: Incorrect NMPA Birth Year Calculation for Partner
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 301–303
- **Severity**: HIGH
- **Description**: `getPartnerPensionAccessAge` computes birth year as `new Date().getFullYear() - partnerAge` and checks `partnerBirthYear < 1971 ? 55 : 57`. 
  1. The official HMRC cutoff for NMPA 55 vs 57 is **6 April 1971**. Anyone born between 1 Jan 1971 and 5 April 1971 is born in 1971 but retains NMPA 55. Evaluating `1971 < 1971` evaluates to `false`, incorrectly setting NMPA to 57.
  2. Estimating birth year from current age without exact DOB causes off-by-one errors depending on whether the birthday has passed in the current year.
- **Suggested Fix**: Use `profile.partnerDateOfBirth` with exact date comparison against `'1971-04-06'` (matching the logic in `getPensionAccessAge`).

---

### Issue 1.3: Tapered Annual Allowance Tapering Overwrites MPAA Cap
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 1031–1040
- **Severity**: HIGH
- **Description**: When a user has triggered the Money Purchase Annual Allowance (`hasTriggeredMpaa = true`), line 1031 sets `pensionAnnualAllowanceLimit = 10000`. However, if the user's income exceeds the Tapered Annual Allowance thresholds (£200k threshold / £260k adjusted), line 1038 executes:
  `pensionAnnualAllowanceLimit = Math.max(10000, basePensionAnnualAllowance - taperedReduction);`
  This overwrites `pensionAnnualAllowanceLimit` back up to £50,000+, effectively bypassing the £10,000 MPAA restriction.
- **Suggested Fix**: Skip annual allowance tapering calculation if `hasTriggeredMpaa` is `true`.

---

### Issue 1.4: Scottish 45% Advanced Rate Band Width Discrepancy in `calculateUKTax`
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 917–925
- **Severity**: MEDIUM
- **Description**: In `calculateUKTax` for Scottish taxpayers, band 4 uses `75000 - 43662` while band 5 uses `Math.min(rem, 62710)` (width between 62,430 and 125,140). The lower bound of band 5 does not match the upper bound of band 4.
- **Suggested Fix**: Align Scottish tax band widths in `calculateUKTax` with the constants in `ukTaxRates.ts` (`SCOT_HIGHER_THRESHOLD` and `SCOT_ADVANCED_THRESHOLD`).

---

### Issue 1.5: Hardcoded Tax Constants Bypassing Central Rate File
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 508–568
- **Severity**: MEDIUM
- **Description**: `calculateStandardIncomeTax` hardcodes tax thresholds (£12,570, £37,700, £100,000, £125,140) rather than referencing `ukTaxRates.ts` or `profile.customTaxBands`.
- **Suggested Fix**: Refactor `calculateStandardIncomeTax` to import constants from `../config/ukTaxRates`.

---

## 2. `src/utils/projectionEngine.ts`

### Issue 2.1: Double Personal Allowance Tapering in Indexed Tax Band Calculations
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 253–270, 1622–1624
- **Severity**: CRITICAL
- **Description**: In `projectionEngine.ts`, `computeIncomeTax` accepts `taxableAboveAllowance`, which is calculated as `taxableIncome - singlePersonalAllowance` (where `singlePersonalAllowance` has ALREADY had Personal Allowance subtracted).
  Inside `computeIncomeTax`:
  - `nominalTaxable = taxableAboveAllowance / inflationMult`
  - `nominalGrossEquivalent = nominalTaxable + paValue` (adds £12,570 back)
  - `computeIncomeTaxOnAmount(nominalGrossEquivalent)` is called.
  When gross income exceeds £100,000 in real terms, `computeIncomeTaxOnAmount` applies the Personal Allowance taper (£1 for every £2 over £100k) AGAIN on `nominalGrossEquivalent`. This results in double PA tapering, over-taxing high-earning retirees.
- **Suggested Fix**: Pass actual gross taxable income into `computeIncomeTax` instead of pre-subtracting Personal Allowance, allowing `computeIncomeTaxOnAmount` to calculate PA tapering once accurately.

---

### Issue 2.2: Division by Zero and `NaN` Propagation in Drawdown Ratios
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 2260, 2273, 2324
- **Severity**: HIGH
- **Description**:
  - Line 2260: `const drawRatio = isaDrawdown / (isaPot + isaDrawdown);`
  - Line 2273: `const drawRatio = cashDrawdown / (cashGiaPot + cashDrawdown);`
  If `isaPot` and `isaDrawdown` are both 0, `0 / 0` evaluates to `NaN`. Subsequent multiplications (`primarySsIsaPot * (1 - NaN)`) propagate `NaN` into all pot balances, rendering projections invalid from that year onward.
- **Suggested Fix**: Wrap ratio calculations in guards: `const drawRatio = (isaPot + isaDrawdown) > 0 ? isaDrawdown / (isaPot + isaDrawdown) : 0;`.

---

### Issue 2.3: Double-Deduction of Crystallised Pension in Secondary Safety Net Pass
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 2088–2155
- **Severity**: HIGH
- **Description**: When the primary drawdown pass leaves a net income shortfall, the secondary safety net pass executes `getGrossPensionNeededForNet(remainingIncomeNeeded, pensionPot, curPriGross, curPartGross)`.
  Inside `getGrossPensionNeededForNet`, `priCrystDrawn` is computed as `Math.min(primaryCrystallisedPot, existingPriGross + extra)`. However, `primaryCrystallisedPot` was ALREADY reduced by `existingPriGross` in the primary pass. Deducting `existingPriGross` again from the remaining crystallised balance double-counts crystallised withdrawals, causing tax-free cash errors.
- **Suggested Fix**: Pass remaining crystallised pot balances into `getGrossPensionNeededForNet` or adjust baseline draw inputs.

---

### Issue 2.4: Negative Sub-Pot Balances via Decumulation Life Events
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 1558–1580
- **Severity**: HIGH
- **Description**: During decumulation expense life events, proportional deductions are made across ISA sub-pots: `primarySsIsaPot -= drawSs`. If one sub-pot balance is £0 while the total ISA pot is non-zero, floating-point operations can push sub-pots below zero into negative balances, which compound negatively in future growth steps.
- **Suggested Fix**: Clamp sub-pot deductions with `Math.max(0, ...)` after subtraction.

---

### Issue 2.5: Drawdown Strategy Overwrite for Couples
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 1664–1677
- **Severity**: MEDIUM
- **Description**: When primary and partner have different drawdown strategies (e.g. Primary = `isa_first`, Partner = `tax_free_bracket`), `effectiveStrategy` picks one strategy globally, overriding the other partner's chosen strategy.
- **Suggested Fix**: Maintain separate strategy execution paths for primary and partner pension/ISA withdrawals.

---

## 3. `src/utils/maximizedSpendSolver.ts`

### Issue 3.1: Runtime Property Access Bug (`partnerRetirementAge` vs `partnerTargetRetirementAge`)
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 196–198
- **Severity**: HIGH
- **Description**: Line 196 checks `if (profileInput.partnerRetirementAge)`. The property on `UserProfile` is named `partnerTargetRetirementAge`. `profileInput.partnerRetirementAge` evaluates to `undefined` at runtime.
  As a result, when solving for partner scope (`scope === 'partner'`), the solver never aligns the target retirement age to the partner's retirement age, generating invalid maximized spend results.
- **Suggested Fix**: Change `profileInput.partnerRetirementAge` to `profileInput.partnerTargetRetirementAge`.

---

### Issue 3.2: Severe UI Performance Lag from Nested Binary Search
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 592–615
- **Severity**: MEDIUM
- **Description**: The solver performs **28 outer binary search iterations**. In every iteration, `createCandidateProfile` calls `clampBridgeRangesIfNeeded`, which executes a **16-iteration nested binary search**. Each inner iteration runs `generateProjections` and `calculateUKTax`.
  This results in up to **476 full lifetime projections** per solve, causing noticeable UI freeze/lag.
- **Suggested Fix**: Memoize bridge feasibility checks or run bridge clamping only after finding the outer optimal income level.

---

### Issue 3.3: Unindexed Surplus Calculation in `reinvestExcessDetails`
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 729–734
- **Severity**: MEDIUM
- **Description**: `annualSurplusReinvested` is computed as `bestFeasibleIncome - actualSpendingTargetAnnual` in base-year terms. However, in `projectionEngine.ts`, annual surplus grows with CPI inflation. Reporting an unindexed surplus number in `reinvestExcessDetails` gives misleading summary metrics.
- **Suggested Fix**: Note or index surplus values to match nominal projection outputs.

---

## 4. `src/utils/historicModelingEngine.ts`

### Issue 4.1: Uncapped State Pension Qualifying Years Ratio
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 412, 420
- **Severity**: MEDIUM
- **Description**: In state pension calculations for historic backtesting:
  Line 420: `const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;`
  Line 412: `(primaryYears / 35)`
  Unlike `projectionEngine.ts`, `partnerYears` and `primaryYears` are NOT capped at 35 (`Math.min(years, 35)`). If a user inputs 40 qualifying years, state pension is incorrectly calculated as 114% of full statutory State Pension.
- **Suggested Fix**: Use `Math.min(partnerYears, 35)` and `Math.min(primaryYears, 35)`.

---

### Issue 4.2: Duplicate Line & Off-by-One Annuity Duration Check
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 447–448, 469
- **Severity**: HIGH
- **Description**:
  1. Lines 447–448 contain duplicate statements: `pensionPot = primaryPensionPot + partnerPensionPot; pensionPot = primaryPensionPot + partnerPensionPot;`.
  2. Line 469 checks `if (stream.durationOption === 'until_age' && streamOwnerAge > stream.durationUntilAge)`. In `projectionEngine.ts`, the check is `>=`. Using `>` causes fixed-term annuities to pay income for 1 extra year beyond `durationUntilAge`.
- **Suggested Fix**: Remove duplicate line 448 and change line 469 to `>=`.

---

### Issue 4.3: Broken Ternary Operator and Flawed 50/50 Income Attribution
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 690
- **Severity**: HIGH
- **Description**:
  Line 690: `+ (annuityIncomeThisYear + dbIncomeThisYr + (typeof fixedIncomeThisYr !== 'undefined' ? fixedIncomeThisYr : fixedIncomeThisYr)) / (profile.isCouplePlanning ? 2 : 1)`
  1. The ternary operator `(typeof fixedIncomeThisYr !== 'undefined' ? fixedIncomeThisYr : fixedIncomeThisYr)` is redundant since both branches return `fixedIncomeThisYr`.
  2. Dividing guaranteed income streams by 2 when `isCouplePlanning` is true incorrectly attributes 50% of single-owned pensions/annuities to the partner during tax bracket drawdown capacity checks.
- **Suggested Fix**: Calculate primary and partner guaranteed income separately instead of splitting aggregate income by 2.

---

### Issue 4.4: Hardcoded Tax Thresholds Ignoring User Custom Bands
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 567–568, 670–677
- **Severity**: MEDIUM
- **Description**: Historic modeling hardcodes Personal Allowance (£12,570) and Higher Rate Threshold (£50,270) instead of checking `profile.customTaxBands`.
- **Suggested Fix**: Respect custom tax band overrides in `historicModelingEngine.ts`.

---

## 5. `src/types.ts`

### Issue 5.1: Mismatch in Partner Retirement Age Property Definition
- **File**: `src/types.ts`
- **Line(s)**: 282
- **Severity**: HIGH
- **Description**: `UserProfile` defines `partnerTargetRetirementAge?: number;`, but `maximizedSpendSolver.ts` line 196 queries `profileInput.partnerRetirementAge`.
- **Suggested Fix**: Add an optional alias `partnerRetirementAge?: number;` to `UserProfile` in `types.ts` or fix `maximizedSpendSolver.ts`.

---

## Summary of Action Plan

1. **Fix Critical Tax Calculation Error**: Correct `computeIncomeTax` in `projectionEngine.ts` to prevent double PA tapering on incomes > £100k.
2. **Fix Division-by-Zero Flaws**: Add zero-guards on pot drawdown ratio calculations to prevent `NaN` cascade into projections.
3. **Fix Scottish Tax Bands**: Align Scottish tax thresholds in `ukTaxEngine.ts` and `historicModelingEngine.ts` with `ukTaxRates.ts`.
4. **Fix Partner Solver Scope**: Update `maximizedSpendSolver.ts` line 196 from `partnerRetirementAge` to `partnerTargetRetirementAge`.
5. **Optimize Solver Performance**: De-nest bridge clamping loop inside `maximizedSpendSolver.ts` to eliminate UI lag.
6. **Fix Historic Engine Bugs**: Fix qualifying years cap, annuity duration off-by-one, and guaranteed income attribution logic in `historicModelingEngine.ts`.

# RetireFree UK v4 Codebase Audit Report: Calculation Engines & Utilities

We have completed a comprehensive review of the calculation engines and utility files in `C:\Users\two41\.gemini\antigravity\scratch\RetireFreeUKv4`.

Below is the structured audit report detailing logic errors, edge cases, tax accuracy issues, NMPA/state pension discrepancies, inflation indexing bugs, couple parity defects, type safety issues, and performance bottlenecks.

---

## 1. `src/utils/ukTaxEngine.ts`

### Issue 1.1: Broken Scottish Tax Band Thresholds in `calculateStandardIncomeTax`
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 520–550
- **Severity**: CRITICAL
- **Description**: In `calculateStandardIncomeTax`, the Scottish tax calculation logic uses conflicting and incorrect upper thresholds for the Higher and Advanced rate bands:
  - Line 538: `const b4 = Math.min(rem, 75000 - 43662);` (uses £75,000 as higher rate threshold).
  - Line 543: `const b5 = Math.min(rem, 125140 - 62430);` (uses £62,430 as higher rate threshold).
  This causes a band overlap/discontinuity between £62,430 and £75,000 where taxable income is miscalculated across the 42% Higher and 45% Advanced bands.
- **Suggested Fix**: Update `calculateStandardIncomeTax` to use `SCOT_HIGHER_THRESHOLD` (62,430) and `SCOT_ADVANCED_THRESHOLD` (125,140) from `../config/ukTaxRates`.

---

### Issue 1.2: Incorrect NMPA Birth Year Calculation for Partner
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 301–303
- **Severity**: HIGH
- **Description**: `getPartnerPensionAccessAge` computes birth year as `new Date().getFullYear() - partnerAge` and checks `partnerBirthYear < 1971 ? 55 : 57`. 
  1. The official HMRC cutoff for NMPA 55 vs 57 is **6 April 1971**. Anyone born between 1 Jan 1971 and 5 April 1971 is born in 1971 but retains NMPA 55. Evaluating `1971 < 1971` evaluates to `false`, incorrectly setting NMPA to 57.
  2. Estimating birth year from current age without exact DOB causes off-by-one errors depending on whether the birthday has passed in the current year.
- **Suggested Fix**: Use `profile.partnerDateOfBirth` with exact date comparison against `'1971-04-06'` (matching the logic in `getPensionAccessAge`).

---

### Issue 1.3: Tapered Annual Allowance Tapering Overwrites MPAA Cap
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 1031–1040
- **Severity**: HIGH
- **Description**: When a user has triggered the Money Purchase Annual Allowance (`hasTriggeredMpaa = true`), line 1031 sets `pensionAnnualAllowanceLimit = 10000`. However, if the user's income exceeds the Tapered Annual Allowance thresholds (£200k threshold / £260k adjusted), line 1038 executes:
  `pensionAnnualAllowanceLimit = Math.max(10000, basePensionAnnualAllowance - taperedReduction);`
  This overwrites `pensionAnnualAllowanceLimit` back up to £50,000+, effectively bypassing the £10,000 MPAA restriction.
- **Suggested Fix**: Skip annual allowance tapering calculation if `hasTriggeredMpaa` is `true`.

---

### Issue 1.4: Scottish 45% Advanced Rate Band Width Discrepancy in `calculateUKTax`
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 917–925
- **Severity**: MEDIUM
- **Description**: In `calculateUKTax` for Scottish taxpayers, band 4 uses `75000 - 43662` while band 5 uses `Math.min(rem, 62710)` (width between 62,430 and 125,140). The lower bound of band 5 does not match the upper bound of band 4.
- **Suggested Fix**: Align Scottish tax band widths in `calculateUKTax` with the constants in `ukTaxRates.ts` (`SCOT_HIGHER_THRESHOLD` and `SCOT_ADVANCED_THRESHOLD`).

---

### Issue 1.5: Hardcoded Tax Constants Bypassing Central Rate File
- **File**: `src/utils/ukTaxEngine.ts`
- **Line(s)**: 508–568
- **Severity**: MEDIUM
- **Description**: `calculateStandardIncomeTax` hardcodes tax thresholds (£12,570, £37,700, £100,000, £125,140) rather than referencing `ukTaxRates.ts` or `profile.customTaxBands`.
- **Suggested Fix**: Refactor `calculateStandardIncomeTax` to import constants from `../config/ukTaxRates`.

---

## 2. `src/utils/projectionEngine.ts`

### Issue 2.1: Double Personal Allowance Tapering in Indexed Tax Band Calculations
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 253–270, 1622–1624
- **Severity**: CRITICAL
- **Description**: In `projectionEngine.ts`, `computeIncomeTax` accepts `taxableAboveAllowance`, which is calculated as `taxableIncome - singlePersonalAllowance` (where `singlePersonalAllowance` has ALREADY had Personal Allowance subtracted).
  Inside `computeIncomeTax`:
  - `nominalTaxable = taxableAboveAllowance / inflationMult`
  - `nominalGrossEquivalent = nominalTaxable + paValue` (adds £12,570 back)
  - `computeIncomeTaxOnAmount(nominalGrossEquivalent)` is called.
  When gross income exceeds £100,000 in real terms, `computeIncomeTaxOnAmount` applies the Personal Allowance taper (£1 for every £2 over £100k) AGAIN on `nominalGrossEquivalent`. This results in double PA tapering, over-taxing high-earning retirees.
- **Suggested Fix**: Pass actual gross taxable income into `computeIncomeTax` instead of pre-subtracting Personal Allowance, allowing `computeIncomeTaxOnAmount` to calculate PA tapering once accurately.

---

### Issue 2.2: Division by Zero and `NaN` Propagation in Drawdown Ratios
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 2260, 2273, 2324
- **Severity**: HIGH
- **Description**:
  - Line 2260: `const drawRatio = isaDrawdown / (isaPot + isaDrawdown);`
  - Line 2273: `const drawRatio = cashDrawdown / (cashGiaPot + cashDrawdown);`
  If `isaPot` and `isaDrawdown` are both 0, `0 / 0` evaluates to `NaN`. Subsequent multiplications (`primarySsIsaPot * (1 - NaN)`) propagate `NaN` into all pot balances, rendering projections invalid from that year onward.
- **Suggested Fix**: Wrap ratio calculations in guards: `const drawRatio = (isaPot + isaDrawdown) > 0 ? isaDrawdown / (isaPot + isaDrawdown) : 0;`.

---

### Issue 2.3: Double-Deduction of Crystallised Pension in Secondary Safety Net Pass
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 2088–2155
- **Severity**: HIGH
- **Description**: When the primary drawdown pass leaves a net income shortfall, the secondary safety net pass executes `getGrossPensionNeededForNet(remainingIncomeNeeded, pensionPot, curPriGross, curPartGross)`.
  Inside `getGrossPensionNeededForNet`, `priCrystDrawn` is computed as `Math.min(primaryCrystallisedPot, existingPriGross + extra)`. However, `primaryCrystallisedPot` was ALREADY reduced by `existingPriGross` in the primary pass. Deducting `existingPriGross` again from the remaining crystallised balance double-counts crystallised withdrawals, causing tax-free cash errors.
- **Suggested Fix**: Pass remaining crystallised pot balances into `getGrossPensionNeededForNet` or adjust baseline draw inputs.

---

### Issue 2.4: Negative Sub-Pot Balances via Decumulation Life Events
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 1558–1580
- **Severity**: HIGH
- **Description**: During decumulation expense life events, proportional deductions are made across ISA sub-pots: `primarySsIsaPot -= drawSs`. If one sub-pot balance is £0 while the total ISA pot is non-zero, floating-point operations can push sub-pots below zero into negative balances, which compound negatively in future growth steps.
- **Suggested Fix**: Clamp sub-pot deductions with `Math.max(0, ...)` after subtraction.

---

### Issue 2.5: Drawdown Strategy Overwrite for Couples
- **File**: `src/utils/projectionEngine.ts`
- **Line(s)**: 1664–1677
- **Severity**: MEDIUM
- **Description**: When primary and partner have different drawdown strategies (e.g. Primary = `isa_first`, Partner = `tax_free_bracket`), `effectiveStrategy` picks one strategy globally, overriding the other partner's chosen strategy.
- **Suggested Fix**: Maintain separate strategy execution paths for primary and partner pension/ISA withdrawals.

---

## 3. `src/utils/maximizedSpendSolver.ts`

### Issue 3.1: Runtime Property Access Bug (`partnerRetirementAge` vs `partnerTargetRetirementAge`)
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 196–198
- **Severity**: HIGH
- **Description**: Line 196 checks `if (profileInput.partnerRetirementAge)`. The property on `UserProfile` is named `partnerTargetRetirementAge`. `profileInput.partnerRetirementAge` evaluates to `undefined` at runtime.
  As a result, when solving for partner scope (`scope === 'partner'`), the solver never aligns the target retirement age to the partner's retirement age, generating invalid maximized spend results.
- **Suggested Fix**: Change `profileInput.partnerRetirementAge` to `profileInput.partnerTargetRetirementAge`.

---

### Issue 3.2: Severe UI Performance Lag from Nested Binary Search
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 592–615
- **Severity**: MEDIUM
- **Description**: The solver performs **28 outer binary search iterations**. In every iteration, `createCandidateProfile` calls `clampBridgeRangesIfNeeded`, which executes a **16-iteration nested binary search**. Each inner iteration runs `generateProjections` and `calculateUKTax`.
  This results in up to **476 full lifetime projections** per solve, causing noticeable UI freeze/lag.
- **Suggested Fix**: Memoize bridge feasibility checks or run bridge clamping only after finding the outer optimal income level.

---

### Issue 3.3: Unindexed Surplus Calculation in `reinvestExcessDetails`
- **File**: `src/utils/maximizedSpendSolver.ts`
- **Line(s)**: 729–734
- **Severity**: MEDIUM
- **Description**: `annualSurplusReinvested` is computed as `bestFeasibleIncome - actualSpendingTargetAnnual` in base-year terms. However, in `projectionEngine.ts`, annual surplus grows with CPI inflation. Reporting an unindexed surplus number in `reinvestExcessDetails` gives misleading summary metrics.
- **Suggested Fix**: Note or index surplus values to match nominal projection outputs.

---

## 4. `src/utils/historicModelingEngine.ts`

### Issue 4.1: Uncapped State Pension Qualifying Years Ratio
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 412, 420
- **Severity**: MEDIUM
- **Description**: In state pension calculations for historic backtesting:
  Line 420: `const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;`
  Line 412: `(primaryYears / 35)`
  Unlike `projectionEngine.ts`, `partnerYears` and `primaryYears` are NOT capped at 35 (`Math.min(years, 35)`). If a user inputs 40 qualifying years, state pension is incorrectly calculated as 114% of full statutory State Pension.
- **Suggested Fix**: Use `Math.min(partnerYears, 35)` and `Math.min(primaryYears, 35)`.

---

### Issue 4.2: Duplicate Line & Off-by-One Annuity Duration Check
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 447–448, 469
- **Severity**: HIGH
- **Description**:
  1. Lines 447–448 contain duplicate statements: `pensionPot = primaryPensionPot + partnerPensionPot; pensionPot = primaryPensionPot + partnerPensionPot;`.
  2. Line 469 checks `if (stream.durationOption === 'until_age' && streamOwnerAge > stream.durationUntilAge)`. In `projectionEngine.ts`, the check is `>=`. Using `>` causes fixed-term annuities to pay income for 1 extra year beyond `durationUntilAge`.
- **Suggested Fix**: Remove duplicate line 448 and change line 469 to `>=`.

---

### Issue 4.3: Broken Ternary Operator and Flawed 50/50 Income Attribution
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 690
- **Severity**: HIGH
- **Description**:
  Line 690: `+ (annuityIncomeThisYear + dbIncomeThisYr + (typeof fixedIncomeThisYr !== 'undefined' ? fixedIncomeThisYr : fixedIncomeThisYr)) / (profile.isCouplePlanning ? 2 : 1)`
  1. The ternary operator `(typeof fixedIncomeThisYr !== 'undefined' ? fixedIncomeThisYr : fixedIncomeThisYr)` is redundant since both branches return `fixedIncomeThisYr`.
  2. Dividing guaranteed income streams by 2 when `isCouplePlanning` is true incorrectly attributes 50% of single-owned pensions/annuities to the partner during tax bracket drawdown capacity checks.
- **Suggested Fix**: Calculate primary and partner guaranteed income separately instead of splitting aggregate income by 2.

---

### Issue 4.4: Hardcoded Tax Thresholds Ignoring User Custom Bands
- **File**: `src/utils/historicModelingEngine.ts`
- **Line(s)**: 567–568, 670–677
- **Severity**: MEDIUM
- **Description**: Historic modeling hardcodes Personal Allowance (£12,570) and Higher Rate Threshold (£50,270) instead of checking `profile.customTaxBands`.
- **Suggested Fix**: Respect custom tax band overrides in `historicModelingEngine.ts`.

---

## 5. `src/types.ts`

### Issue 5.1: Mismatch in Partner Retirement Age Property Definition
- **File**: `src/types.ts`
- **Line(s)**: 282
- **Severity**: HIGH
- **Description**: `UserProfile` defines `partnerTargetRetirementAge?: number;`, but `maximizedSpendSolver.ts` line 196 queries `profileInput.partnerRetirementAge`.
- **Suggested Fix**: Add an optional alias `partnerRetirementAge?: number;` to `UserProfile` in `types.ts` or fix `maximizedSpendSolver.ts`.

---

## Summary of Action Plan

1. **Fix Critical Tax Calculation Error**: Correct `computeIncomeTax` in `projectionEngine.ts` to prevent double PA tapering on incomes > £100k.
2. **Fix Division-by-Zero Flaws**: Add zero-guards on pot drawdown ratio calculations to prevent `NaN` cascade into projections.
3. **Fix Scottish Tax Bands**: Align Scottish tax thresholds in `ukTaxEngine.ts` and `historicModelingEngine.ts` with `ukTaxRates.ts`.
4. **Fix Partner Solver Scope**: Update `maximizedSpendSolver.ts` line 196 from `partnerRetirementAge` to `partnerTargetRetirementAge`.
5. **Optimize Solver Performance**: De-nest bridge clamping loop inside `maximizedSpendSolver.ts` to eliminate UI lag.
6. **Fix Historic Engine Bugs**: Fix qualifying years cap, annuity duration off-by-one, and guaranteed income attribution logic in `historicModelingEngine.ts`.

