# RetireFree UK v4 - Codebase Audit & Bug Report

I have conducted a systematic code review of the 8 specified component files and PDF export handlers in RetireFree UK v4 (`C:\Users\two41\.gemini\antigravity\scratch\RetireFreeUKv4`). Below is the structured breakdown of findings categorized by file, severity, description, line numbers, and recommended fixes.

---

### 1. `src/components/ExportSection.tsx` (PDF Report & CSV Export)

#### Issue 1.1: PDF Page Numbering & Footer Out of Sync (Mismatched Total Page Count & Reset Page Numbers)
- **Severity**: HIGH
- **Line Numbers**: Lines 477–500, 1048–1052, 1226–1230, 1329–1333, 1424
- **Description**: 
  - `TOTAL_PAGES` is calculated statically at line 477 as `12 + totalAccumPages + totalDecumPages + totalHistoricPages + totalMortgagePages`.
  - However, during PDF generation, extra pages are conditionally added via `doc.addPage()` when tables exceed vertical thresholds (e.g., line 1048 in tax relief breakdown, line 1226 in asset breakdown, line 1329 in PCLS analysis).
  - Furthermore, at line 1424 (Page 5: Spending Phase Profile), `curPageNum` is explicitly reset to `5` (`curPageNum = 5`). If Page 4 wrapped onto an extra page during Section 4a/5 execution, `curPageNum` was already incremented to 5; resetting it causes page number regression (rendering Page 5 twice) and total page count mismatch (e.g. rendering "Page 16 of 14" in footers).
- **Suggested Fix**: 
  - Remove hardcoded `curPageNum = 5` reassignments. Maintain a running `curPageNum++` counter across all `doc.addPage()` calls.
  - Implement jsPDF's standard two-pass page numbering pattern (`for (let i = 1; i <= doc.getNumberOfPages(); i++) { doc.setPage(i); ... }`) at the end of `handleExportPdfReport` to render footers dynamically with the true total page count `doc.getNumberOfPages()`.

#### Issue 1.2: Unsafe `encodeURI` Data Link Generation for CSV and JSON Exports
- **Severity**: MEDIUM
- **Line Numbers**: Lines 91–97 (`handleExportCsv`), Lines 4384–4395 & 4543–4554 (`JSON Settings Backup`)
- **Description**: 
  - `encodeURI` is used to construct data URIs (`data:text/csv...` and `data:text/json...`). `encodeURI` does not escape `#`, `%`, or `+` characters. If plan names, descriptions, or data contain these characters, Chromium browsers truncate the data URI download link, causing missing export data or corrupted files.
- **Suggested Fix**: 
  - Replace data URI string encoding with Blob objects and `URL.createObjectURL`:
    ```ts
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    ```

#### Issue 1.3: Heavy Synchronous Stochastic Simulations Blocking UI Thread
- **Severity**: MEDIUM
- **Line Numbers**: Line 539, Line 2736, Line 3677
- **Description**: 
  - Inside `handleExportPdfReport`, two separate 500-run Monte Carlo simulations (`runMonteCarloSimulation`) and a 75-run historic simulation (`runHistoricSimulation`) are executed synchronously on the main thread when the user clicks "Export PDF Report". On lower-spec client hardware, this causes noticeable UI freezing/unresponsiveness before PDF generation starts.
- **Suggested Fix**: 
  - Wrap the simulation calls in asynchronous microtask yields (e.g. `await new Promise(r => setTimeout(r, 0))`) or pass precomputed simulation results from state into the export function.

#### Issue 1.4: Redundant Fallback Evaluation Syntax
- **Severity**: LOW
- **Line Numbers**: Line 2154, Line 2158, Line 2162
- **Description**: 
  - Contains expression `(retirementYear.pensionPot || (0) || 0)`. While evaluating safely at runtime, `(0) || 0` is redundant leftover dead syntax.
- **Suggested Fix**: Clean up syntax to `(retirementYear.pensionPot || 0)`.

---

### 2. `src/components/ScenarioComparer.tsx` (Side-by-Side Comparison & PDF Export)

#### Issue 2.1: Page Overflow & Content Truncation in Vector PDF Export
- **Severity**: HIGH
- **Line Numbers**: Lines 635–880 (`handleExportComparisonPDF`)
- **Description**: 
  - In `handleExportComparisonPDF`, all sections (Header, Executive Takeaway Banner, 4D Scorecard, Milestone Table, Stress Benchmark Table) are drawn sequentially on Page 1 without checking vertical coordinate `y`.
  - When comparing 3 scenarios (`showScenarioC` enabled) or when `milestoneComparison` contains 8+ milestone ages, `y` exceeds 270mm on a 297mm A4 page, causing the 75-Year Historic Backtest table and footers to render off the bottom of the page or clip out.
- **Suggested Fix**: 
  - Add page height guards before rendering Section 2 and Section 3:
    ```ts
    if (y > 240) {
      pdf.addPage();
      addHeader(`${scenarioA.name} vs ${scenarioB.name}`, 'Page 2');
      y = 32;
    }
    ```

#### Issue 2.2: Data URI Link Failure in Comparison CSV Export
- **Severity**: MEDIUM
- **Line Numbers**: Lines 621–628 (`handleExportComparisonCSV`)
- **Description**: 
  - Similar to `ExportSection.tsx`, comparison CSV export uses `encodeURI(csvContent)`. Scenario names containing `#` or commas break the CSV download URL.
- **Suggested Fix**: Convert download handler to use `Blob` + `URL.createObjectURL(blob)`.

#### Issue 2.3: Performance: Synchronous 900 Monte Carlo Iterations on Modal Load
- **Severity**: LOW
- **Line Numbers**: Lines 994–1062
- **Description**: 
  - `useMemo` hooks run 3 Monte Carlo simulations (300 runs x 3 scenarios = 900 iterations) and 3 historic simulations whenever scenario selection changes. Opening the scenario comparison modal causes a brief UI lag.
- **Suggested Fix**: Lower default simulation iterations for initial modal render (e.g. 100 runs) or lazily evaluate risk simulations only when the user scrolls to the Risk Benchmark tab.

---

### 3. `src/components/MonteCarloCard.tsx` (Monte Carlo Simulation UI)

#### Issue 3.1: Wasted CPU Cycles from Unconditional 2,000 Simulation Runs
- **Severity**: HIGH
- **Line Numbers**: Lines 128–148
- **Description**: 
  - `MonteCarloCard` computes 4 separate Monte Carlo simulation runs (`mcResult`, `baseResult`, `stressedResult`, `crashResult`) via `useMemo` on every parameter change (500 runs x 4 = 2,000 runs).
  - Even when `showAllScenarios` is `false` (standard single view mode), `baseResult`, `stressedResult`, and `crashResult` are still executed on every slider update.
- **Suggested Fix**: 
  - Wrap scenario-specific calculations so `baseResult`, `stressedResult`, and `crashResult` only compute when `showAllScenarios` is `true`:
    ```ts
    const baseResult = useMemo(() => {
      if (!showAllScenarios) return mcResult;
      return runMonteCarloSimulation(profile, pots, taxResult, { ...params, marketScenario: 'standard' });
    }, [profile, pots, taxResult, params, showAllScenarios, mcResult]);
    ```

#### Issue 3.2: Undefined Check Guard in Cash Buffer Requirement Calculation
- **Severity**: MEDIUM
- **Line Numbers**: Lines 150–164
- **Description**: 
  - Line 152: `crashResult.agePercentiles.find((p) => p.age === currentCrashStartAge)` returns `undefined` if `currentCrashStartAge` is greater than `params.maxAge`.
  - While line 153 uses optional chaining `targetAgeData?.p50CashGiaPot`, passing `undefined` into `calculateCashBufferRequiredDetails` without an explicit fallback value can cause `NaN` propagation in cash buffer calculations.
- **Suggested Fix**: Pass explicit numeric fallback `targetAgeData?.p50CashGiaPot ?? 0`.

---

### 4. `src/components/HistoricModelingCard.tsx` (Historic Backtesting UI)

#### Issue 4.1: Unsafe Array Index Access in Trajectory Chart Data
- **Severity**: MEDIUM
- **Line Numbers**: Lines 195–210
- **Description**: 
  - In `chartData`, `selectedRun.trajectory[i]` is accessed by matching the loop index `i` of `simSummary.aggregateTrajectory`.
  - If a specific historic run has fewer snapshot items than `aggregateTrajectory` (e.g. if depleted early or initialized with different horizon ages), `selectedRun.trajectory[i]` returns `undefined`, triggering `TypeError: Cannot read properties of undefined (reading 'totalPotReal')`.
- **Suggested Fix**: 
  - Add optional chaining:
    ```ts
    const snap = selectedRun?.trajectory?.[i];
    const selectedVal = snap ? (adjustReal ? snap.totalPotReal : snap.totalPot) : null;
    ```

#### Issue 4.2: Un-debounced Asset Allocation Sliders
- **Severity**: LOW
- **Line Numbers**: Lines 140–186 (`handleEquityChange`, `handleBondChange`, `handleCashChange`)
- **Description**: 
  - Dragging asset allocation sliders fires state updates on every pixel, executing 75 historic sequence simulation runs on every mouse move event.
- **Suggested Fix**: Implement local state for slider dragging and debounce state updates sent to `setAllocation`.

---

### 5. `src/components/DrawdownPlanner.tsx` (Strategy Planner)

#### Issue 5.1: Negative Remaining Balance & Percentage NaN in `LumpSumSplitEditor`
- **Severity**: HIGH
- **Line Numbers**: Lines 83–91, 169–174
- **Description**: 
  - In `LumpSumSplitEditor`, line 171 calculates `Math.round((s.calculatedAmount / (lumpSumAmount || 1)) * 100)`.
  - If `lumpSumAmount` is 0 (e.g. no pension pot available yet) and a fixed £ amount split is entered (e.g. £10,000), `remaining = lumpSumAmount - totalAllocated` becomes negative (`-£10,000`), causing confusing UI state and invalid allocation data.
- **Suggested Fix**: 
  - Add a guard check in `LumpSumSplitEditor`: if `lumpSumAmount <= 0`, display a warning notice ("Tax-free lump sum is currently £0. Configure pension access age & pots above first.") and disable adding/editing split items.

#### Issue 5.2: Missing Default Guard for `profile.lumpSumSplits`
- **Severity**: MEDIUM
- **Line Numbers**: Lines 56–61
- **Description**: 
  - `splits` defaults to `[]` in props, but if parent updates omit `lumpSumSplits`, calling `onChange` without checking existing profile state can clear custom split allocations.
- **Suggested Fix**: Ensure `splits` is safely initialized from `profile.lumpSumSplits || []`.

---

### 6. `src/components/ProjectionChart.tsx` (Charts UI)

#### Issue 6.1: Inflation Discount Scale Division by Zero / NaN on Invalid Retirement Ages
- **Severity**: MEDIUM
- **Line Numbers**: Lines 135–138, 140–148
- **Description**: 
  - Line 135: `const offset = profile.targetRetirementAge - profile.currentAge;`
  - If `profile.targetRetirementAge < profile.currentAge` (invalid profile input), `offset` is negative, causing `Math.pow(1 + rate, offset)` to inflate rather than discount.
  - Line 137: `const scale = adjustInflation ? 1 / inflFactor : 1;`. If `inflFactor` is 0 or NaN, `scale` becomes `Infinity` or `NaN`, which breaks Recharts SVG path generation (`<path d="M... NaN ...">`).
- **Suggested Fix**: 
  - Clamp `offset`: `const offset = Math.max(0, profile.targetRetirementAge - profile.currentAge);`
  - Guard `scale`: `const scale = isFinite(s) && !isNaN(s) ? s : 1;`

#### Issue 6.2: 15-Run Delayed Retirement Calculation on Every Render When Plan Fails
- **Severity**: LOW
- **Line Numbers**: Lines 246–300 (`delayedRetirementAnalysis`)
- **Description**: 
  - When `hasPlanFailure` is true, a `for` loop executes up to 15 projection runs (`calculateUKTax` + `generateProjections`) inside `useMemo` on every render.
- **Suggested Fix**: Ensure `delayedRetirementAnalysis` dependencies are strictly scoped.

---

### 7. `src/components/MortgageDebtCard.tsx` (Mortgage Modeling UI)

#### Issue 7.1: Overpayment Cancellation Bug When Custom Payment Is Less Than Interest
- **Severity**: HIGH
- **Line Numbers**: Lines 75–90, 163–175
- **Description**: 
  - Line 163: `let capital = Math.max(0, (stdPmt - interest) + totalOverpayment);`
  - If `stdPmt < interest` (e.g. custom monthly payment set below monthly interest or during high interest rates), `(stdPmt - interest)` produces a negative value (e.g., `-£300`).
  - This negative value offsets `totalOverpayment` (e.g., `-£300 + £200 = -£100`), preventing user overpayments from reducing debt capital as expected.
- **Suggested Fix**: 
  - Separate regular payment capital from overpayment capital:
    ```ts
    const regularCapital = Math.max(0, stdPmt - interest);
    let capital = Math.min(ovBal, regularCapital + totalOverpayment);
    ```

#### Issue 7.2: Termination Guard for 0-Year Remaining Term on Interest-Only Mortgages
- **Severity**: MEDIUM
- **Line Numbers**: Lines 136–138, 199–203
- **Description**: 
  - For Interest-Only mortgages, line 136 checks `if (m === mortgage.remainingTermYears * 12) break;`. If `remainingTermYears` is 0, `m === 0` is never hit because loop starts at `m = 1`, causing the loop to run for `maxMonths` (120+ extra iterations) with un-cleared debt.
- **Suggested Fix**: Clamp `remainingTermYears` to a minimum of 1 year or check `if (m >= Math.max(1, mortgage.remainingTermYears * 12)) break;`.

---

### 8. `src/components/IhtEstatePlanningCard.tsx` (IHT & Estate Planning UI)

#### Issue 8.1: Charitable Deduction Deduction Bug on Estates Below Allowance Thresholds
- **Severity**: HIGH
- **Line Numbers**: Lines 158–176
- **Description**: 
  - Line 163: `const charityDeduction = Math.round(netTaxableEstateBeforeAllowances * (charityPct / 100));`
  - Line 175: `const netPassedToHeirs = grossEstateValuation - netIhtLiability - charityDeduction;`
  - If an estate is below the Nil Rate Band threshold (IHT liability is £0), entering a charitable gifting percentage still subtracts `charityDeduction` from `netPassedToHeirs`, incorrectly reducing the inherited wealth displayed to users even when no IHT saving was achieved.
- **Suggested Fix**: 
  - Only apply `charityDeduction` to estate wealth reduction when `charityGiftingPercent > 0` and the gross estate exceeds available NRB/RNRB allowances.

#### Issue 8.2: Defensive Guards for `petGifts` Array Properties
- **Severity**: MEDIUM
- **Line Numbers**: Lines 62–80, 100–106
- **Description**: 
  - When editing Potentially Exempt Transfers (PET gifts), if a user leaves `amount` or `yearsAgo` blank in inputs, `g.amount` can be `undefined` or `NaN`, which bubbles up into milestone IHT calculations.
- **Suggested Fix**: Add default fallbacks: `(g.amount || 0)` and `(g.yearsAgo || 0)`.

---

### Summary Checklist of Recommendations
1. **PDF Exports (`ExportSection.tsx` & `ScenarioComparer.tsx`)**:
   - Implement dynamic page counting and two-pass footers in `ExportSection.tsx`.
   - Add page-break height checks in `ScenarioComparer.tsx`'s PDF export.
   - Replace `encodeURI` data links with `Blob` + `URL.createObjectURL`.
2. **Computational Performance**:
   - Lazy-evaluate/gate Monte Carlo simulations in `MonteCarloCard.tsx` so only active view scenarios run.
   - Debounce slider inputs in `HistoricModelingCard.tsx`.
3. **Financial Calculation Guards**:
   - Fix capital overpayment cancellation in `MortgageDebtCard.tsx`.
   - Add zero-lump-sum guard to `DrawdownPlanner.tsx`'s `LumpSumSplitEditor`.
   - Fix conditional charitable deduction logic in `IhtEstatePlanningCard.tsx`.
   - Clamp inflation discount factor calculations in `ProjectionChart.tsx`.
# RetireFree UK v4 - Codebase Audit & Bug Report

I have conducted a systematic code review of the 8 specified component files and PDF export handlers in RetireFree UK v4 (`C:\Users\two41\.gemini\antigravity\scratch\RetireFreeUKv4`). Below is the structured breakdown of findings categorized by file, severity, description, line numbers, and recommended fixes.

---

### 1. `src/components/ExportSection.tsx` (PDF Report & CSV Export)

#### Issue 1.1: PDF Page Numbering & Footer Out of Sync (Mismatched Total Page Count & Reset Page Numbers)
- **Severity**: HIGH
- **Line Numbers**: Lines 477–500, 1048–1052, 1226–1230, 1329–1333, 1424
- **Description**: 
  - `TOTAL_PAGES` is calculated statically at line 477 as `12 + totalAccumPages + totalDecumPages + totalHistoricPages + totalMortgagePages`.
  - However, during PDF generation, extra pages are conditionally added via `doc.addPage()` when tables exceed vertical thresholds (e.g., line 1048 in tax relief breakdown, line 1226 in asset breakdown, line 1329 in PCLS analysis).
  - Furthermore, at line 1424 (Page 5: Spending Phase Profile), `curPageNum` is explicitly reset to `5` (`curPageNum = 5`). If Page 4 wrapped onto an extra page during Section 4a/5 execution, `curPageNum` was already incremented to 5; resetting it causes page number regression (rendering Page 5 twice) and total page count mismatch (e.g. rendering "Page 16 of 14" in footers).
- **Suggested Fix**: 
  - Remove hardcoded `curPageNum = 5` reassignments. Maintain a running `curPageNum++` counter across all `doc.addPage()` calls.
  - Implement jsPDF's standard two-pass page numbering pattern (`for (let i = 1; i <= doc.getNumberOfPages(); i++) { doc.setPage(i); ... }`) at the end of `handleExportPdfReport` to render footers dynamically with the true total page count `doc.getNumberOfPages()`.

#### Issue 1.2: Unsafe `encodeURI` Data Link Generation for CSV and JSON Exports
- **Severity**: MEDIUM
- **Line Numbers**: Lines 91–97 (`handleExportCsv`), Lines 4384–4395 & 4543–4554 (`JSON Settings Backup`)
- **Description**: 
  - `encodeURI` is used to construct data URIs (`data:text/csv...` and `data:text/json...`). `encodeURI` does not escape `#`, `%`, or `+` characters. If plan names, descriptions, or data contain these characters, Chromium browsers truncate the data URI download link, causing missing export data or corrupted files.
- **Suggested Fix**: 
  - Replace data URI string encoding with Blob objects and `URL.createObjectURL`:
    ```ts
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    ```

#### Issue 1.3: Heavy Synchronous Stochastic Simulations Blocking UI Thread
- **Severity**: MEDIUM
- **Line Numbers**: Line 539, Line 2736, Line 3677
- **Description**: 
  - Inside `handleExportPdfReport`, two separate 500-run Monte Carlo simulations (`runMonteCarloSimulation`) and a 75-run historic simulation (`runHistoricSimulation`) are executed synchronously on the main thread when the user clicks "Export PDF Report". On lower-spec client hardware, this causes noticeable UI freezing/unresponsiveness before PDF generation starts.
- **Suggested Fix**: 
  - Wrap the simulation calls in asynchronous microtask yields (e.g. `await new Promise(r => setTimeout(r, 0))`) or pass precomputed simulation results from state into the export function.

#### Issue 1.4: Redundant Fallback Evaluation Syntax
- **Severity**: LOW
- **Line Numbers**: Line 2154, Line 2158, Line 2162
- **Description**: 
  - Contains expression `(retirementYear.pensionPot || (0) || 0)`. While evaluating safely at runtime, `(0) || 0` is redundant leftover dead syntax.
- **Suggested Fix**: Clean up syntax to `(retirementYear.pensionPot || 0)`.

---

### 2. `src/components/ScenarioComparer.tsx` (Side-by-Side Comparison & PDF Export)

#### Issue 2.1: Page Overflow & Content Truncation in Vector PDF Export
- **Severity**: HIGH
- **Line Numbers**: Lines 635–880 (`handleExportComparisonPDF`)
- **Description**: 
  - In `handleExportComparisonPDF`, all sections (Header, Executive Takeaway Banner, 4D Scorecard, Milestone Table, Stress Benchmark Table) are drawn sequentially on Page 1 without checking vertical coordinate `y`.
  - When comparing 3 scenarios (`showScenarioC` enabled) or when `milestoneComparison` contains 8+ milestone ages, `y` exceeds 270mm on a 297mm A4 page, causing the 75-Year Historic Backtest table and footers to render off the bottom of the page or clip out.
- **Suggested Fix**: 
  - Add page height guards before rendering Section 2 and Section 3:
    ```ts
    if (y > 240) {
      pdf.addPage();
      addHeader(`${scenarioA.name} vs ${scenarioB.name}`, 'Page 2');
      y = 32;
    }
    ```

#### Issue 2.2: Data URI Link Failure in Comparison CSV Export
- **Severity**: MEDIUM
- **Line Numbers**: Lines 621–628 (`handleExportComparisonCSV`)
- **Description**: 
  - Similar to `ExportSection.tsx`, comparison CSV export uses `encodeURI(csvContent)`. Scenario names containing `#` or commas break the CSV download URL.
- **Suggested Fix**: Convert download handler to use `Blob` + `URL.createObjectURL(blob)`.

#### Issue 2.3: Performance: Synchronous 900 Monte Carlo Iterations on Modal Load
- **Severity**: LOW
- **Line Numbers**: Lines 994–1062
- **Description**: 
  - `useMemo` hooks run 3 Monte Carlo simulations (300 runs x 3 scenarios = 900 iterations) and 3 historic simulations whenever scenario selection changes. Opening the scenario comparison modal causes a brief UI lag.
- **Suggested Fix**: Lower default simulation iterations for initial modal render (e.g. 100 runs) or lazily evaluate risk simulations only when the user scrolls to the Risk Benchmark tab.

---

### 3. `src/components/MonteCarloCard.tsx` (Monte Carlo Simulation UI)

#### Issue 3.1: Wasted CPU Cycles from Unconditional 2,000 Simulation Runs
- **Severity**: HIGH
- **Line Numbers**: Lines 128–148
- **Description**: 
  - `MonteCarloCard` computes 4 separate Monte Carlo simulation runs (`mcResult`, `baseResult`, `stressedResult`, `crashResult`) via `useMemo` on every parameter change (500 runs x 4 = 2,000 runs).
  - Even when `showAllScenarios` is `false` (standard single view mode), `baseResult`, `stressedResult`, and `crashResult` are still executed on every slider update.
- **Suggested Fix**: 
  - Wrap scenario-specific calculations so `baseResult`, `stressedResult`, and `crashResult` only compute when `showAllScenarios` is `true`:
    ```ts
    const baseResult = useMemo(() => {
      if (!showAllScenarios) return mcResult;
      return runMonteCarloSimulation(profile, pots, taxResult, { ...params, marketScenario: 'standard' });
    }, [profile, pots, taxResult, params, showAllScenarios, mcResult]);
    ```

#### Issue 3.2: Undefined Check Guard in Cash Buffer Requirement Calculation
- **Severity**: MEDIUM
- **Line Numbers**: Lines 150–164
- **Description**: 
  - Line 152: `crashResult.agePercentiles.find((p) => p.age === currentCrashStartAge)` returns `undefined` if `currentCrashStartAge` is greater than `params.maxAge`.
  - While line 153 uses optional chaining `targetAgeData?.p50CashGiaPot`, passing `undefined` into `calculateCashBufferRequiredDetails` without an explicit fallback value can cause `NaN` propagation in cash buffer calculations.
- **Suggested Fix**: Pass explicit numeric fallback `targetAgeData?.p50CashGiaPot ?? 0`.

---

### 4. `src/components/HistoricModelingCard.tsx` (Historic Backtesting UI)

#### Issue 4.1: Unsafe Array Index Access in Trajectory Chart Data
- **Severity**: MEDIUM
- **Line Numbers**: Lines 195–210
- **Description**: 
  - In `chartData`, `selectedRun.trajectory[i]` is accessed by matching the loop index `i` of `simSummary.aggregateTrajectory`.
  - If a specific historic run has fewer snapshot items than `aggregateTrajectory` (e.g. if depleted early or initialized with different horizon ages), `selectedRun.trajectory[i]` returns `undefined`, triggering `TypeError: Cannot read properties of undefined (reading 'totalPotReal')`.
- **Suggested Fix**: 
  - Add optional chaining:
    ```ts
    const snap = selectedRun?.trajectory?.[i];
    const selectedVal = snap ? (adjustReal ? snap.totalPotReal : snap.totalPot) : null;
    ```

#### Issue 4.2: Un-debounced Asset Allocation Sliders
- **Severity**: LOW
- **Line Numbers**: Lines 140–186 (`handleEquityChange`, `handleBondChange`, `handleCashChange`)
- **Description**: 
  - Dragging asset allocation sliders fires state updates on every pixel, executing 75 historic sequence simulation runs on every mouse move event.
- **Suggested Fix**: Implement local state for slider dragging and debounce state updates sent to `setAllocation`.

---

### 5. `src/components/DrawdownPlanner.tsx` (Strategy Planner)

#### Issue 5.1: Negative Remaining Balance & Percentage NaN in `LumpSumSplitEditor`
- **Severity**: HIGH
- **Line Numbers**: Lines 83–91, 169–174
- **Description**: 
  - In `LumpSumSplitEditor`, line 171 calculates `Math.round((s.calculatedAmount / (lumpSumAmount || 1)) * 100)`.
  - If `lumpSumAmount` is 0 (e.g. no pension pot available yet) and a fixed £ amount split is entered (e.g. £10,000), `remaining = lumpSumAmount - totalAllocated` becomes negative (`-£10,000`), causing confusing UI state and invalid allocation data.
- **Suggested Fix**: 
  - Add a guard check in `LumpSumSplitEditor`: if `lumpSumAmount <= 0`, display a warning notice ("Tax-free lump sum is currently £0. Configure pension access age & pots above first.") and disable adding/editing split items.

#### Issue 5.2: Missing Default Guard for `profile.lumpSumSplits`
- **Severity**: MEDIUM
- **Line Numbers**: Lines 56–61
- **Description**: 
  - `splits` defaults to `[]` in props, but if parent updates omit `lumpSumSplits`, calling `onChange` without checking existing profile state can clear custom split allocations.
- **Suggested Fix**: Ensure `splits` is safely initialized from `profile.lumpSumSplits || []`.

---

### 6. `src/components/ProjectionChart.tsx` (Charts UI)

#### Issue 6.1: Inflation Discount Scale Division by Zero / NaN on Invalid Retirement Ages
- **Severity**: MEDIUM
- **Line Numbers**: Lines 135–138, 140–148
- **Description**: 
  - Line 135: `const offset = profile.targetRetirementAge - profile.currentAge;`
  - If `profile.targetRetirementAge < profile.currentAge` (invalid profile input), `offset` is negative, causing `Math.pow(1 + rate, offset)` to inflate rather than discount.
  - Line 137: `const scale = adjustInflation ? 1 / inflFactor : 1;`. If `inflFactor` is 0 or NaN, `scale` becomes `Infinity` or `NaN`, which breaks Recharts SVG path generation (`<path d="M... NaN ...">`).
- **Suggested Fix**: 
  - Clamp `offset`: `const offset = Math.max(0, profile.targetRetirementAge - profile.currentAge);`
  - Guard `scale`: `const scale = isFinite(s) && !isNaN(s) ? s : 1;`

#### Issue 6.2: 15-Run Delayed Retirement Calculation on Every Render When Plan Fails
- **Severity**: LOW
- **Line Numbers**: Lines 246–300 (`delayedRetirementAnalysis`)
- **Description**: 
  - When `hasPlanFailure` is true, a `for` loop executes up to 15 projection runs (`calculateUKTax` + `generateProjections`) inside `useMemo` on every render.
- **Suggested Fix**: Ensure `delayedRetirementAnalysis` dependencies are strictly scoped.

---

### 7. `src/components/MortgageDebtCard.tsx` (Mortgage Modeling UI)

#### Issue 7.1: Overpayment Cancellation Bug When Custom Payment Is Less Than Interest
- **Severity**: HIGH
- **Line Numbers**: Lines 75–90, 163–175
- **Description**: 
  - Line 163: `let capital = Math.max(0, (stdPmt - interest) + totalOverpayment);`
  - If `stdPmt < interest` (e.g. custom monthly payment set below monthly interest or during high interest rates), `(stdPmt - interest)` produces a negative value (e.g., `-£300`).
  - This negative value offsets `totalOverpayment` (e.g., `-£300 + £200 = -£100`), preventing user overpayments from reducing debt capital as expected.
- **Suggested Fix**: 
  - Separate regular payment capital from overpayment capital:
    ```ts
    const regularCapital = Math.max(0, stdPmt - interest);
    let capital = Math.min(ovBal, regularCapital + totalOverpayment);
    ```

#### Issue 7.2: Termination Guard for 0-Year Remaining Term on Interest-Only Mortgages
- **Severity**: MEDIUM
- **Line Numbers**: Lines 136–138, 199–203
- **Description**: 
  - For Interest-Only mortgages, line 136 checks `if (m === mortgage.remainingTermYears * 12) break;`. If `remainingTermYears` is 0, `m === 0` is never hit because loop starts at `m = 1`, causing the loop to run for `maxMonths` (120+ extra iterations) with un-cleared debt.
- **Suggested Fix**: Clamp `remainingTermYears` to a minimum of 1 year or check `if (m >= Math.max(1, mortgage.remainingTermYears * 12)) break;`.

---

### 8. `src/components/IhtEstatePlanningCard.tsx` (IHT & Estate Planning UI)

#### Issue 8.1: Charitable Deduction Deduction Bug on Estates Below Allowance Thresholds
- **Severity**: HIGH
- **Line Numbers**: Lines 158–176
- **Description**: 
  - Line 163: `const charityDeduction = Math.round(netTaxableEstateBeforeAllowances * (charityPct / 100));`
  - Line 175: `const netPassedToHeirs = grossEstateValuation - netIhtLiability - charityDeduction;`
  - If an estate is below the Nil Rate Band threshold (IHT liability is £0), entering a charitable gifting percentage still subtracts `charityDeduction` from `netPassedToHeirs`, incorrectly reducing the inherited wealth displayed to users even when no IHT saving was achieved.
- **Suggested Fix**: 
  - Only apply `charityDeduction` to estate wealth reduction when `charityGiftingPercent > 0` and the gross estate exceeds available NRB/RNRB allowances.

#### Issue 8.2: Defensive Guards for `petGifts` Array Properties
- **Severity**: MEDIUM
- **Line Numbers**: Lines 62–80, 100–106
- **Description**: 
  - When editing Potentially Exempt Transfers (PET gifts), if a user leaves `amount` or `yearsAgo` blank in inputs, `g.amount` can be `undefined` or `NaN`, which bubbles up into milestone IHT calculations.
- **Suggested Fix**: Add default fallbacks: `(g.amount || 0)` and `(g.yearsAgo || 0)`.

---

### Summary Checklist of Recommendations
1. **PDF Exports (`ExportSection.tsx` & `ScenarioComparer.tsx`)**:
   - Implement dynamic page counting and two-pass footers in `ExportSection.tsx`.
   - Add page-break height checks in `ScenarioComparer.tsx`'s PDF export.
   - Replace `encodeURI` data links with `Blob` + `URL.createObjectURL`.
2. **Computational Performance**:
   - Lazy-evaluate/gate Monte Carlo simulations in `MonteCarloCard.tsx` so only active view scenarios run.
   - Debounce slider inputs in `HistoricModelingCard.tsx`.
3. **Financial Calculation Guards**:
   - Fix capital overpayment cancellation in `MortgageDebtCard.tsx`.
   - Add zero-lump-sum guard to `DrawdownPlanner.tsx`'s `LumpSumSplitEditor`.
   - Fix conditional charitable deduction logic in `IhtEstatePlanningCard.tsx`.
   - Clamp inflation discount factor calculations in `ProjectionChart.tsx`.
