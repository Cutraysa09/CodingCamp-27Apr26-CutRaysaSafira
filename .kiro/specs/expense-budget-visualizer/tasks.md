# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a three-file, client-side single-page application using HTML, CSS, and Vanilla JavaScript. The app records personal expenses, visualizes spending by category via a Chart.js doughnut chart, persists all data to localStorage, and supports dark/light theming, transaction sorting, and a configurable spending limit warning.

## Tasks

- [x] 1. Scaffold project structure and base HTML
  - Create `index.html` with semantic layout: header (balance + theme toggle), main (form, chart, list), and footer area for spending limit/sort controls
  - Add `<canvas id="spending-chart">` inside `<div class="chart-container">` and `<p id="chart-empty">` sibling for empty state
  - Add `<div id="limit-warning" hidden>` warning banner element
  - Load Chart.js via CDN `<script>` tag before `js/app.js`
  - Link `css/style.css` in `<head>`
  - Add `<script src="js/app.js" defer>` at end of `<body>`
  - Create empty `css/style.css` and `js/app.js` placeholder files
  - _Requirements: NFR-1.2, NFR-1.3, TC-1_

- [x] 2. Implement CSS layout and theming
  - [x] 2.1 Define CSS custom properties for light theme on `:root` and dark theme on `[data-theme="dark"]`
    - Cover background, surface, text, border, accent, and warning colors
    - Ensure ≥ 4.5:1 contrast ratio for text/background pairs in both themes
    - _Requirements: 6.1, 6.4, NFR-3.3_
  - [x] 2.2 Style the overall page layout for desktop and mobile
    - Use CSS Grid or Flexbox for the main two-column layout (form + chart left, list right on desktop; single column on mobile)
    - Set base font size ≥ 16px and comfortable line-height
    - Make `.list-container` scrollable with a fixed `max-height` and `overflow-y: auto`
    - _Requirements: 2.2, NFR-2, NFR-3.1, NFR-3.2_
  - [x] 2.3 Style form, transaction list items, balance display, sort control, spending limit input, and warning banner
    - Style inline error spans (hidden by default, visible when `.error-visible` class is present)
    - Style `.transaction-item` with name, category badge, amount, and delete button
    - Style `.empty-state` list item
    - Style `#limit-warning` banner with a distinct warning color
    - _Requirements: 1.1, 2.1, 2.4, 3.4, 8.2_
  - [x] 2.4 Add responsive breakpoint for mobile viewports
    - Stack layout to single column below ~640px
    - Ensure touch targets are adequately sized
    - _Requirements: NFR-2.3_

- [x] 3. Implement state, data models, and localStorage persistence
  - [x] 3.1 Define top-level state variables and data model JSDoc typedefs
    - Declare `let transactions = []` and `let settings = { theme, spendingLimit, sortOrder }` at module top
    - Add JSDoc typedefs for `Transaction`, `Settings`, `SortOrder`, `Category`, `ValidationResult`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.2 Implement the `Storage` module section
    - `Storage.load()` — reads `ebv_transactions` and `ebv_settings` from localStorage, wraps `JSON.parse` in try/catch, returns defaults on failure
    - `Storage.saveTransactions(transactions)` — serializes and writes `ebv_transactions`, wrapped in try/catch
    - `Storage.saveSettings(settings)` — serializes and writes `ebv_settings`, wrapped in try/catch
    - Log console warnings on parse or write errors; never throw
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.3 Implement `generateId()` utility
    - Use `crypto.randomUUID()` with `Date.now().toString(36) + Math.random().toString(36).slice(2)` fallback
    - _Requirements: TC-1_

- [x] 4. Implement form validation and expense submission
  - [x] 4.1 Implement `validateForm(itemName, amount, category)`
    - Return `null` when all fields are valid
    - Return a `ValidationResult` object with per-field error strings when any field is invalid
    - Item name: reject empty or whitespace-only strings
    - Amount: reject missing, zero, or negative values
    - Category: reject empty/unselected value
    - _Requirements: 1.3, 1.4, 1.5, 1.6_
  - [x] 4.2 Implement `handleFormSubmit(event)` event handler
    - Prevent default form submission
    - Call `validateForm`; if errors exist, display inline error messages and return without mutating state
    - If valid: create a `Transaction` object with `generateId()`, current timestamp, and form values; push to `transactions`; call `Storage.saveTransactions`; call `render()`; reset form fields
    - Clear error messages on successful submission
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 5.1_
  - [x] 4.3 Wire inline error clearing on `input` events for each form field
    - Attach `input` event listeners to `#item-name`, `#amount`, and `#category` that hide their respective error spans
    - _Requirements: 1.3, 1.4, 1.5_

- [x] 5. Implement transaction list rendering and deletion
  - [x] 5.1 Implement `renderTransactionList(transactions)`
    - Clear `#transaction-list` and rebuild from the current sorted transactions array
    - Render each `<li class="transaction-item" data-id="{id}">` with name, category, formatted amount, and delete button (`aria-label="Delete {itemName}"`)
    - When `transactions` is empty, render `<li class="empty-state">No expenses recorded yet.</li>`
    - Format amounts using `formatCurrency()`
    - _Requirements: 2.1, 2.4_
  - [x] 5.2 Implement `formatCurrency(amount)` utility
    - Return a string with currency symbol and exactly two decimal places (e.g., `$12.50`)
    - _Requirements: 2.1, 3.4_
  - [x] 5.3 Implement `handleDeleteClick(event)` via event delegation on `#transaction-list`
    - Identify the clicked delete button and read `data-id` from its parent `<li>`
    - Filter `transactions` to remove the matching id
    - Call `Storage.saveTransactions`; call `render()`
    - _Requirements: 2.3, 5.2_

- [x] 6. Implement balance display and spending limit check
  - [x] 6.1 Implement `computeBalance(transactions)` and `renderBalance(transactions)`
    - `computeBalance` returns the arithmetic sum of all transaction amounts (0 for empty array)
    - `renderBalance` injects the formatted balance into `#balance-amount` and calls `checkSpendingLimit`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 6.2 Implement `checkSpendingLimit(balance, limit)`
    - Show `#limit-warning` (remove `hidden` attribute) when `balance > limit` and limit is a positive number
    - Hide `#limit-warning` (add `hidden` attribute) otherwise
    - _Requirements: 8.2, 8.3_
  - [x] 6.3 Implement `handleLimitChange(event)` for `#spending-limit` input
    - Parse the input value as a float
    - If zero or negative, display inline error in `#limit-error` and restore `settings.spendingLimit` to the input; do not mutate state
    - If valid, update `settings.spendingLimit`, call `Storage.saveSettings`, call `checkSpendingLimit`
    - _Requirements: 8.1, 8.4, 8.5_

- [x] 7. Implement Chart.js doughnut chart
  - [x] 7.1 Implement `initChart()`
    - Create a single `Chart` instance on `<canvas id="spending-chart">` with type `'doughnut'`
    - Configure colors: Food → `#FF6384`, Transport → `#36A2EB`, Fun → `#FFCE56`
    - Set `responsive: true`, `maintainAspectRatio: false`, legend position below chart
    - Wrap in try/catch: if `Chart` is undefined (CDN failure), hide `.chart-container` and show a fallback message
    - Store the instance in a module-level variable for later mutation
    - _Requirements: 4.1, 4.3_
  - [x] 7.2 Implement `renderChart(transactions)`
    - Compute per-category totals from the transactions array
    - If `transactions` is empty: hide `<canvas>`, show `#chart-empty` placeholder
    - Otherwise: show `<canvas>`, hide `#chart-empty`; update `chart.data.labels`, `chart.data.datasets[0].data`, and `chart.data.datasets[0].backgroundColor` to only include categories with at least one transaction; call `chart.update()`
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 8. Implement dark/light mode toggle
  - [x] 8.1 Implement `applyTheme(theme)` and `handleThemeToggle()`
    - `applyTheme` sets or removes `data-theme="dark"` on `<html>` and updates the toggle button icon (sun/moon)
    - `handleThemeToggle` flips `settings.theme` between `'light'` and `'dark'`, calls `applyTheme`, calls `Storage.saveSettings`
    - _Requirements: 6.1, 6.2_

- [x] 9. Implement transaction sorting
  - [x] 9.1 Implement `sortTransactions(transactions, order)`
    - Return a new sorted array (do not mutate the source)
    - `'amount-asc'`: sort by amount ascending
    - `'amount-desc'`: sort by amount descending
    - `'category-asc'`: sort alphabetically by category string
    - `'default'` or unrecognized: return transactions in insertion order (by `timestamp`)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 9.2 Implement `handleSortChange(event)` for `#sort-select`
    - Update `settings.sortOrder` with the selected value
    - Call `Storage.saveSettings`; call `render()`
    - _Requirements: 7.2, 7.3_

- [x] 10. Implement central `render()` function and initialization
  - [x] 10.1 Implement `render()`
    - Call `sortTransactions(transactions, settings.sortOrder)` to get the display-order array
    - Call `renderTransactionList`, `renderBalance`, and `renderChart` with the sorted array
    - This is the single re-render entry point called after every state mutation
    - _Requirements: 3.2, 3.3, 4.2, 7.3_
  - [x] 10.2 Implement `init()` and wire all event listeners
    - Call `Storage.load()` and assign results to `transactions` and `settings`
    - Call `applyTheme(settings.theme)` to restore saved theme
    - Restore `#spending-limit` input value and `#sort-select` value from `settings`
    - Call `initChart()` then `render()`
    - Attach event listeners: `#expense-form` submit → `handleFormSubmit`; `#transaction-list` click → `handleDeleteClick`; `#theme-toggle` click → `handleThemeToggle`; `#sort-select` change → `handleSortChange`; `#spending-limit` change → `handleLimitChange`
    - Call `init()` at the bottom of `app.js`
    - _Requirements: 5.3, 5.4, 6.3_

- [x] 11. Final checkpoint — verify end-to-end behavior
  - Open `index.html` directly in a browser (no server required)
  - Confirm: add a transaction → list updates, balance updates, chart updates
  - Confirm: delete a transaction → all three update
  - Confirm: sort control reorders list
  - Confirm: spending limit warning appears/disappears correctly
  - Confirm: theme toggle persists across page reload
  - Confirm: all data survives a page reload (localStorage round-trip)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All state mutations must go through the `render()` pipeline — no direct DOM writes outside render functions
- `sortTransactions` must return a new array; the canonical `transactions` array always stays in insertion order
- All localStorage operations are wrapped in try/catch per the design's error handling strategy
- The single Chart.js instance is mutated on updates, never destroyed and recreated
- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan, as testing tasks were excluded per project constraints)
- Each task references specific requirements for traceability
