# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with HTML, CSS, and Vanilla JavaScript. It enables users to record personal expenses, categorize them, visualize spending distribution via a Chart.js pie chart, and monitor a configurable spending limit — all without a backend or build toolchain.

The app is structured as three files:
- `index.html` — markup and Chart.js CDN script tag
- `css/style.css` — all visual styling including light/dark theme variables
- `js/app.js` — all application logic

It can be opened directly in a browser or packaged as a browser extension (Manifest V3 with `default_popup`).

### Design Goals

- **Zero dependencies beyond Chart.js** — no frameworks, no build tools, no package manager
- **Immediate feedback** — every user action (add, delete, sort, theme toggle) updates the UI synchronously within the same event loop tick
- **Resilient persistence** — all state is serialized to localStorage on every mutation; the app reconstructs full state on load
- **Accessible** — WCAG 2.1 AA contrast in both themes; keyboard-navigable form and controls

---

## Architecture

The app follows a simple **unidirectional data flow** pattern without a framework:

```
User Action
    │
    ▼
Event Handler (js/app.js)
    │
    ├─► State Mutation (in-memory array + settings object)
    │
    ├─► Storage.save() ──► localStorage
    │
    └─► render() ──► DOM update + Chart.js update
```

All mutable state lives in two top-level variables in `app.js`:

| Variable | Type | Description |
|---|---|---|
| `transactions` | `Transaction[]` | Ordered array of all expense records |
| `settings` | `Settings` | Theme, spending limit, active sort order |

There is no virtual DOM, no reactive framework, and no module bundler. Functions are organized into logical groups within the single `app.js` file using clear comment sections.

### Module Sections in `app.js`

```
// ── State ──────────────────────────────────────────────
// ── Storage ────────────────────────────────────────────
// ── Validation ─────────────────────────────────────────
// ── Sorting ────────────────────────────────────────────
// ── Rendering ──────────────────────────────────────────
// ── Chart ──────────────────────────────────────────────
// ── Event Handlers ─────────────────────────────────────
// ── Initialization ─────────────────────────────────────
```

---

## Components and Interfaces

### 1. Expense Input Form

**HTML element:** `<form id="expense-form">`

Fields:
- `#item-name` — `<input type="text">` — Item Name
- `#amount` — `<input type="number" min="0.01" step="0.01">` — Amount
- `#category` — `<select>` with options: Food, Transport, Fun
- `#submit-btn` — `<button type="submit">`

Inline error containers (one per field, hidden by default):
- `#item-name-error`
- `#amount-error`
- `#category-error`

**JavaScript interface:**

```js
// Returns null if valid, or an object with field-level error messages
function validateForm(itemName, amount, category): ValidationResult | null

// Reads form, validates, mutates state, persists, re-renders
function handleFormSubmit(event): void
```

### 2. Transaction List

**HTML element:** `<ul id="transaction-list">` inside a `<div class="list-container">` with `overflow-y: auto` and a fixed `max-height`.

Each list item:
```html
<li class="transaction-item" data-id="{id}">
  <span class="tx-name">{itemName}</span>
  <span class="tx-category">{category}</span>
  <span class="tx-amount">{formattedAmount}</span>
  <button class="delete-btn" aria-label="Delete {itemName}">✕</button>
</li>
```

Empty state:
```html
<li class="empty-state">No expenses recorded yet.</li>
```

**JavaScript interface:**

```js
function renderTransactionList(transactions: Transaction[]): void
function handleDeleteClick(event: Event): void  // event delegation on #transaction-list
```

### 3. Total Balance Display

**HTML element:** `<div id="balance-display">` containing `<span id="balance-amount">`.

**JavaScript interface:**

```js
function renderBalance(transactions: Transaction[]): void
// Computes sum, formats as currency, injects into #balance-amount
// Also triggers spending limit check
```

### 4. Pie Chart

**HTML element:** `<canvas id="spending-chart">` wrapped in `<div class="chart-container">`.

A single `Chart` instance is created on initialization and mutated (not recreated) on every update via `chart.data.datasets[0].data = ...` followed by `chart.update()`.

Empty state: when `transactions` is empty, the chart canvas is hidden and a `<p id="chart-empty">` placeholder is shown.

**JavaScript interface:**

```js
function initChart(): Chart          // creates Chart.js instance
function renderChart(transactions: Transaction[]): void  // updates existing instance
```

Chart configuration:
- Type: `'doughnut'` (visually cleaner than pie for this use case)
- Colors: Food → `#FF6384`, Transport → `#36A2EB`, Fun → `#FFCE56`
- Legend: displayed below chart
- Responsive: `true`, `maintainAspectRatio: false`

### 5. Dark/Light Mode Toggle

**HTML element:** `<button id="theme-toggle" aria-label="Toggle dark mode">` with a sun/moon icon.

Theme is applied by toggling a `data-theme="dark"` attribute on `<html>`. All colors are defined as CSS custom properties scoped to `[data-theme="dark"]` and `:root` (light default).

**JavaScript interface:**

```js
function applyTheme(theme: 'light' | 'dark'): void
function handleThemeToggle(): void
```

### 6. Sort Control

**HTML element:** `<select id="sort-select">` with options:
- `""` — Default (insertion order)
- `"amount-asc"` — Amount: Low to High
- `"amount-desc"` — Amount: High to Low
- `"category-asc"` — Category: A–Z

**JavaScript interface:**

```js
function sortTransactions(transactions: Transaction[], order: SortOrder): Transaction[]
// Returns a new sorted array; does not mutate the source array
```

### 7. Spending Limit

**HTML element:** `<input type="number" id="spending-limit" min="0.01" step="0.01">` with a `<span id="limit-error">` for inline validation.

Warning banner: `<div id="limit-warning" hidden>` — shown/hidden based on balance vs. limit comparison.

**JavaScript interface:**

```js
function handleLimitChange(event: Event): void
function checkSpendingLimit(balance: number, limit: number | null): void
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string}   id        - UUID (crypto.randomUUID() or Date.now() fallback)
 * @property {string}   itemName  - User-entered item description
 * @property {number}   amount    - Positive float, stored as number
 * @property {Category} category  - 'Food' | 'Transport' | 'Fun'
 * @property {number}   timestamp - Unix ms timestamp of creation (for default sort)
 */
```

### Settings

```js
/**
 * @typedef {Object} Settings
 * @property {'light'|'dark'} theme        - Current theme preference
 * @property {number|null}    spendingLimit - User-defined limit, null if unset
 * @property {SortOrder}      sortOrder     - Active sort selection
 */
```

### SortOrder

```js
/**
 * @typedef {'default'|'amount-asc'|'amount-desc'|'category-asc'} SortOrder
 */
```

### Category

```js
/**
 * @typedef {'Food'|'Transport'|'Fun'} Category
 */
```

### ValidationResult

```js
/**
 * @typedef {Object} ValidationResult
 * @property {string|null} itemName  - Error message or null
 * @property {string|null} amount    - Error message or null
 * @property {string|null} category  - Error message or null
 */
```

### localStorage Schema

Two keys are used:

| Key | Value |
|---|---|
| `"ebv_transactions"` | `JSON.stringify(Transaction[])` |
| `"ebv_settings"` | `JSON.stringify(Settings)` |

**Storage interface:**

```js
function Storage.load(): { transactions: Transaction[], settings: Settings }
function Storage.saveTransactions(transactions: Transaction[]): void
function Storage.saveSettings(settings: Settings): void
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list

*For any* transaction list and any valid transaction (non-empty item name, positive amount, valid category), adding that transaction to the list should result in the list length increasing by exactly one and the new transaction being present in the list with its item name, amount, and category intact.

**Validates: Requirements 1.2, 2.1**

### Property 2: Invalid transactions are rejected

*For any* form submission where at least one field is invalid (empty or whitespace-only item name, non-positive or missing amount, or missing category), the transaction list should remain completely unchanged — no new transaction is added and the list length is preserved.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

### Property 3: Delete removes exactly one transaction from list and storage

*For any* transaction list containing at least one transaction, deleting a transaction by its id should result in a list that contains every other transaction exactly once, does not contain the deleted transaction, and localStorage reflects the same removal.

**Validates: Requirements 2.3, 5.2**

### Property 4: Balance equals sum of all transaction amounts

*For any* set of transactions (including after additions and deletions), the computed balance should equal the arithmetic sum of all transaction amounts, and the formatted output should display exactly two decimal places with a currency symbol.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Chart data per category equals category sum

*For any* set of transactions, the chart data value for each category should equal the sum of amounts of all transactions in that category, and only categories with at least one transaction should appear as chart segments.

**Validates: Requirements 4.1, 4.2**

### Property 6: Sorting produces a valid ordering with identical elements

*For any* transaction list and any sort order (amount ascending, amount descending, category alphabetical), the sorted result should contain exactly the same transactions as the original list (same count, same ids) and every adjacent pair in the result should satisfy the ordering predicate for that sort order.

**Validates: Requirements 7.2, 7.3**

### Property 7: localStorage round-trip preserves transactions

*For any* array of transactions, serializing to localStorage and then deserializing should produce an array that is deeply equal to the original — same ids, item names, amounts, categories, and timestamps, in the same order.

**Validates: Requirements 5.1, 5.3**

### Property 8: Settings round-trip preserves all preferences

*For any* settings object (theme, spending limit, sort order), serializing to localStorage and then deserializing should produce a settings object that is deeply equal to the original, with all fields preserved exactly.

**Validates: Requirements 5.4, 6.3, 8.4**

### Property 9: Spending limit warning is visible if and only if balance exceeds limit

*For any* positive spending limit L and any set of transactions producing a balance B, the warning indicator should be visible when B > L and hidden when B ≤ L — the two conditions are mutually exclusive and exhaustive.

**Validates: Requirements 8.2, 8.3**

### Property 10: Invalid spending limit is rejected and previous limit is preserved

*For any* non-positive value (zero or negative) submitted as a spending limit, the validator should reject it, display an error, and the stored spending limit should remain equal to its value before the invalid submission.

**Validates: Requirements 8.5**

### Property 11: Theme toggle is a round-trip

*For any* starting theme (light or dark), toggling the theme twice should return the app to the original theme, and toggling once should produce the opposite theme.

**Validates: Requirements 6.2**

---

## Error Handling

### Form Validation Errors

- Errors are shown inline, adjacent to the offending field, using `aria-live="polite"` regions so screen readers announce them.
- The form is not cleared on invalid submission; entered values are preserved.
- Errors are cleared when the user begins correcting the field (on `input` event).

### Spending Limit Validation

- A limit of zero or negative is rejected with an inline error; the previous valid limit is retained in state and storage.

### localStorage Errors

- `Storage.load()` wraps `JSON.parse` in a try/catch. If parsing fails (corrupted data), it returns empty defaults and logs a console warning.
- `Storage.saveTransactions()` and `Storage.saveSettings()` wrap `localStorage.setItem` in a try/catch. If storage is full or unavailable (e.g., private browsing with storage disabled), the app logs a console warning and continues operating in-memory without crashing.

### Chart.js Errors

- If `Chart` is not available (CDN load failure), the chart container is hidden and a fallback message is shown. The rest of the app continues to function.

### Missing `crypto.randomUUID`

- If `crypto.randomUUID()` is unavailable (older browsers), the id falls back to `Date.now().toString(36) + Math.random().toString(36).slice(2)`.

---

## Testing Strategy

> **Note:** Per project constraints, no test framework is set up. The testing strategy below describes how correctness properties and behaviors can be manually verified or tested if a framework is added in the future.

### Manual Verification Checklist

**Form validation (Properties 1 & 2):**
- Submit with all fields valid → transaction appears in list, form clears
- Submit with empty item name → inline error shown, list unchanged
- Submit with amount = 0 or negative → inline error shown, list unchanged
- Submit with no category selected → inline error shown, list unchanged

**Delete (Property 3):**
- Add 3 transactions, delete the middle one → list shows exactly the other 2

**Balance (Property 4):**
- Add transactions with known amounts → verify displayed total matches manual sum
- Delete a transaction → verify balance updates immediately

**Spending limit (Property 5):**
- Set limit to 50, add transactions totaling 49 → no warning
- Add one more transaction pushing total to 51 → warning appears
- Delete a transaction bringing total back to 49 → warning disappears

**Sorting (Property 6):**
- Add transactions in random order, select "Amount: Low to High" → verify ascending order
- Select "Category: A–Z" → verify alphabetical order by category
- Add a new transaction while sorted → verify it appears in correct sorted position

**Persistence (Properties 7 & 8):**
- Add transactions and settings, reload page → all data restored correctly
- Verify theme preference and spending limit survive reload

### Unit-Testable Functions (if a framework is added)

The following pure or near-pure functions are directly unit-testable:

| Function | What to test |
|---|---|
| `validateForm()` | All valid/invalid input combinations |
| `sortTransactions()` | All three sort orders, empty array, single item |
| `computeBalance()` | Empty array → 0, mixed amounts, floating point |
| `Storage.load()` | Valid JSON, corrupted JSON, missing keys |
| `formatCurrency()` | Integer, float, zero, large number |
| `checkSpendingLimit()` | Balance < limit, balance = limit, balance > limit, null limit |

### Property-Based Testing Notes (if a framework is added)

If a property-based testing library (e.g., fast-check for JavaScript) is added, the correctness properties in this document map directly to test cases. Each property test should run a minimum of 100 iterations. Tag format: `Feature: expense-budget-visualizer, Property {N}: {property_text}`.
