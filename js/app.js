// ── State ──────────────────────────────────────────────

/**
 * @typedef {'Food'|'Transport'|'Fun'} Category
 */

/**
 * @typedef {'default'|'amount-asc'|'amount-desc'|'category-asc'} SortOrder
 */

/**
 * @typedef {Object} Transaction
 * @property {string}   id        - UUID (crypto.randomUUID() or Date.now() fallback)
 * @property {string}   itemName  - User-entered item description
 * @property {number}   amount    - Positive float, stored as number
 * @property {Category} category  - 'Food' | 'Transport' | 'Fun'
 * @property {number}   timestamp - Unix ms timestamp of creation (for default sort)
 */

/**
 * @typedef {Object} Settings
 * @property {'light'|'dark'} theme        - Current theme preference
 * @property {number|null}    spendingLimit - User-defined limit, null if unset
 * @property {SortOrder}      sortOrder     - Active sort selection
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string|null} itemName  - Error message or null
 * @property {string|null} amount    - Error message or null
 * @property {string|null} category  - Error message or null
 */

/** @type {Transaction[]} */
let transactions = [];

/** @type {Settings} */
let settings = {
  theme: 'light',
  spendingLimit: null,
  sortOrder: '',
};

// ── Storage ────────────────────────────────────────────

/** Default settings returned when localStorage data is missing or corrupt. */
const DEFAULT_SETTINGS = {
  theme: 'light',
  spendingLimit: null,
  sortOrder: '',
};

const Storage = {
  /**
   * Reads `ebv_transactions` and `ebv_settings` from localStorage.
   * Wraps JSON.parse in try/catch and returns defaults on any failure.
   *
   * @returns {{ transactions: Transaction[], settings: Settings }}
   */
  load() {
    let loadedTransactions = [];
    let loadedSettings = { ...DEFAULT_SETTINGS };

    try {
      const rawTransactions = localStorage.getItem('ebv_transactions');
      if (rawTransactions !== null) {
        loadedTransactions = JSON.parse(rawTransactions);
      }
    } catch (err) {
      console.warn('EBV: Failed to parse ebv_transactions from localStorage.', err);
      loadedTransactions = [];
    }

    try {
      const rawSettings = localStorage.getItem('ebv_settings');
      if (rawSettings !== null) {
        loadedSettings = JSON.parse(rawSettings);
      }
    } catch (err) {
      console.warn('EBV: Failed to parse ebv_settings from localStorage.', err);
      loadedSettings = { ...DEFAULT_SETTINGS };
    }

    return { transactions: loadedTransactions, settings: loadedSettings };
  },

  /**
   * Serializes and writes the transactions array to `ebv_transactions`.
   * Wrapped in try/catch; logs a warning on failure and never throws.
   *
   * @param {Transaction[]} transactions
   */
  saveTransactions(transactions) {
    try {
      localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
    } catch (err) {
      console.warn('EBV: Failed to save ebv_transactions to localStorage.', err);
    }
  },

  /**
   * Serializes and writes the settings object to `ebv_settings`.
   * Wrapped in try/catch; logs a warning on failure and never throws.
   *
   * @param {Settings} settings
   */
  saveSettings(settings) {
    try {
      localStorage.setItem('ebv_settings', JSON.stringify(settings));
    } catch (err) {
      console.warn('EBV: Failed to save ebv_settings to localStorage.', err);
    }
  },
};

// ── Utilities ──────────────────────────────────────────

/**
 * Generates a unique id for a transaction.
 * Uses crypto.randomUUID() when available, falls back to a timestamp+random string.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Validation ─────────────────────────────────────────

/**
 * Validates the expense form fields.
 * @param {string} itemName
 * @param {string|number} amount
 * @param {string} category
 * @returns {ValidationResult|null} null if valid, ValidationResult with error messages if invalid
 */
function validateForm(itemName, amount, category) {
  const errors = {
    itemName: null,
    amount: null,
    category: null,
  };

  // Item name: reject empty or whitespace-only strings
  if (typeof itemName !== 'string' || itemName.trim() === '') {
    errors.itemName = 'Item name is required.';
  }

  // Amount: reject missing, zero, or negative values
  const parsedAmount = parseFloat(amount);
  if (amount === '' || amount === null || amount === undefined || isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = 'A valid positive amount is required.';
  }

  // Category: reject empty/unselected value
  if (typeof category !== 'string' || category.trim() === '') {
    errors.category = 'Please select a category.';
  }

  const hasErrors = errors.itemName !== null || errors.amount !== null || errors.category !== null;
  return hasErrors ? errors : null;
}

// ── Event Handlers ─────────────────────────────────────

/**
 * Shows an inline error message for a form field.
 * Adds the 'error-visible' class and removes the 'hidden' attribute.
 * @param {HTMLElement} spanEl - The error <span> element
 * @param {string} message - The error message to display
 */
function showFieldError(spanEl, message) {
  spanEl.textContent = message;
  spanEl.classList.add('error-visible');
  spanEl.removeAttribute('hidden');
}

/**
 * Clears an inline error message for a form field.
 * Removes the 'error-visible' class and clears the text content.
 * @param {HTMLElement} spanEl - The error <span> element
 */
function clearFieldError(spanEl) {
  spanEl.textContent = '';
  spanEl.classList.remove('error-visible');
}

/**
 * Clears all three form field error spans at once.
 * Useful on the success path of handleFormSubmit.
 */
function clearFormErrors() {
  clearFieldError(document.getElementById('item-name-error'));
  clearFieldError(document.getElementById('amount-error'));
  clearFieldError(document.getElementById('category-error'));
}

// Note: `input` event listeners on #item-name, #amount, and #category that call
// clearFieldError() on their respective error spans are attached in init() (task 10.2).

/**
 * Handles the expense form submit event.
 * - Prevents default form submission
 * - Validates all fields; shows inline errors and returns early if invalid
 * - On valid input: creates a Transaction, persists it, re-renders, and resets the form
 *
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();

  const itemNameInput = document.getElementById('item-name');
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');

  const itemNameErrorSpan = document.getElementById('item-name-error');
  const amountErrorSpan = document.getElementById('amount-error');
  const categoryErrorSpan = document.getElementById('category-error');

  const itemName = itemNameInput.value;
  const amount = amountInput.value;
  const category = categorySelect.value;

  const errors = validateForm(itemName, amount, category);

  if (errors !== null) {
    // Display inline errors for any invalid fields
    if (errors.itemName) {
      showFieldError(itemNameErrorSpan, errors.itemName);
    } else {
      clearFieldError(itemNameErrorSpan);
    }

    if (errors.amount) {
      showFieldError(amountErrorSpan, errors.amount);
    } else {
      clearFieldError(amountErrorSpan);
    }

    if (errors.category) {
      showFieldError(categoryErrorSpan, errors.category);
    } else {
      clearFieldError(categoryErrorSpan);
    }

    // Do not mutate state — return early
    return;
  }

  // All fields are valid — create and persist the transaction
  /** @type {Transaction} */
  const transaction = {
    id: generateId(),
    itemName: itemName.trim(),
    amount: parseFloat(amount),
    category: /** @type {Category} */ (category),
    timestamp: Date.now(),
  };

  transactions.push(transaction);
  Storage.saveTransactions(transactions);

  // Clear all error messages on successful submission
  clearFormErrors();

  // Re-render the UI
  render();

  // Reset the form fields
  event.target.reset();
}

// ── Sorting ────────────────────────────────────────────

/**
 * Returns a new array of transactions sorted according to the given order.
 * The source array is never mutated.
 *
 * Supported orders:
 *   'amount-asc'   — ascending by amount
 *   'amount-desc'  — descending by amount
 *   'category-asc' — alphabetical by category string
 *   'default' (or any unrecognized value) — insertion order (ascending by timestamp)
 *
 * @param {Transaction[]} transactions
 * @param {SortOrder} order
 * @returns {Transaction[]}
 */
function sortTransactions(transactions, order) {
  // Shallow-copy so the original array is never mutated
  const copy = transactions.slice();

  if (order === 'amount-asc') {
    copy.sort(function (a, b) { return a.amount - b.amount; });
  } else if (order === 'amount-desc') {
    copy.sort(function (a, b) { return b.amount - a.amount; });
  } else if (order === 'category-asc') {
    copy.sort(function (a, b) { return a.category.localeCompare(b.category); });
  } else {
    // 'default' or unrecognized — insertion order preserved via timestamp
    copy.sort(function (a, b) { return a.timestamp - b.timestamp; });
  }

  return copy;
}

// ── Rendering ──────────────────────────────────────────

/**
 * Formats a numeric amount as a USD currency string with exactly two decimal places.
 * Uses Intl.NumberFormat for locale-aware formatting.
 *
 * @param {number} amount
 * @returns {string} e.g. "$12.50"
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Clears and rebuilds the #transaction-list from the provided transactions array.
 * Renders each transaction as a <li class="transaction-item"> with name, category,
 * formatted amount, and a delete button.
 * When the array is empty, renders a single empty-state <li>.
 *
 * @param {Transaction[]} transactions - The (already sorted) transactions to display
 */
function renderTransactionList(transactions) {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';

  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-state';
    emptyItem.textContent = 'No expenses recorded yet.';
    list.appendChild(emptyItem);
    return;
  }

  transactions.forEach(function (tx) {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = tx.itemName;

    const categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = tx.category;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = formatCurrency(tx.amount);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.setAttribute('aria-label', 'Delete ' + tx.itemName);
    deleteBtn.textContent = '✕';

    li.appendChild(nameSpan);
    li.appendChild(categorySpan);
    li.appendChild(amountSpan);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  });
}

// ── Event Handlers (continued) ─────────────────────────

/**
 * Handles click events on #transaction-list via event delegation.
 * Identifies clicks on .delete-btn elements, reads the data-id from the
 * parent <li>, removes the matching transaction from state, persists the
 * change, and re-renders the UI.
 *
 * @param {Event} event
 */
function handleDeleteClick(event) {
  const btn = event.target.closest('.delete-btn');
  if (!btn) return;

  const li = btn.closest('li.transaction-item');
  if (!li) return;

  const id = li.dataset.id;
  transactions = transactions.filter(function (tx) {
    return tx.id !== id;
  });

  Storage.saveTransactions(transactions);
  render(); // render() is defined in task 10.1
}

// ── Rendering (balance & spending limit) ───────────────

/**
 * Computes the total balance as the arithmetic sum of all transaction amounts.
 * Returns 0 for an empty array.
 *
 * @param {Transaction[]} transactions
 * @returns {number}
 */
function computeBalance(transactions) {
  return transactions.reduce(function (sum, tx) {
    return sum + tx.amount;
  }, 0);
}

/**
 * Computes the current balance, formats it as currency, injects it into
 * #balance-amount, and triggers the spending limit check.
 *
 * @param {Transaction[]} transactions
 */
function renderBalance(transactions) {
  const balance = computeBalance(transactions);
  const balanceAmountEl = document.getElementById('balance-amount');
  if (balanceAmountEl) {
    balanceAmountEl.textContent = formatCurrency(balance);
  }
  checkSpendingLimit(balance, settings.spendingLimit);
}

/**
 * Shows or hides the #limit-warning banner based on whether the balance
 * exceeds the spending limit.
 *
 * - Shows the warning (removes `hidden`) when balance > limit and limit is a positive number.
 * - Hides the warning (adds `hidden`) in all other cases.
 *
 * @param {number} balance
 * @param {number|null} limit
 */
function checkSpendingLimit(balance, limit) {
  const warningEl = document.getElementById('limit-warning');
  if (!warningEl) return;

  if (typeof limit === 'number' && limit > 0 && balance > limit) {
    warningEl.removeAttribute('hidden');
  } else {
    warningEl.setAttribute('hidden', '');
  }
}

// ── Event Handlers (spending limit) ───────────────────

/**
 * Handles the `change` event on the #spending-limit input.
 *
 * - Parses the input value as a float.
 * - If zero or negative: displays an inline error in #limit-error and restores
 *   the input to the current settings.spendingLimit; does not mutate state.
 * - If valid: updates settings.spendingLimit, persists via Storage.saveSettings,
 *   and calls checkSpendingLimit with the current balance.
 *
 * @param {Event} event
 */
function handleLimitChange(event) {
  const input = event.target;
  const parsed = parseFloat(input.value);
  const limitErrorEl = document.getElementById('limit-error');

  if (isNaN(parsed) || parsed <= 0) {
    // Invalid — show error and restore previous value
    if (limitErrorEl) {
      limitErrorEl.textContent = 'Spending limit must be a positive value.';
      limitErrorEl.classList.add('error-visible');
      limitErrorEl.removeAttribute('hidden');
    }
    // Restore the input to the last valid limit (or empty if none set)
    input.value = settings.spendingLimit !== null ? settings.spendingLimit : '';
    return;
  }

  // Valid — clear any existing error
  if (limitErrorEl) {
    limitErrorEl.textContent = '';
    limitErrorEl.classList.remove('error-visible');
  }

  // Update state and persist
  settings.spendingLimit = parsed;
  Storage.saveSettings(settings);

  // Re-evaluate the warning against the current balance
  const balance = computeBalance(transactions);
  checkSpendingLimit(balance, settings.spendingLimit);
}

// ── Chart ──────────────────────────────────────────────

/** @type {import('chart.js').Chart|null} */
let chart = null;

/** @type {Object.<string, string>} */
const CATEGORY_COLORS = {
  Food: '#FF6384',
  Transport: '#36A2EB',
  Fun: '#FFCE56',
};

/**
 * Creates a single Chart.js doughnut chart instance on <canvas id="spending-chart">.
 * Stores the instance in the module-level `chart` variable for later mutation.
 *
 * If Chart.js is unavailable (CDN failure), hides .chart-container and shows a
 * fallback message instead of throwing.
 *
 * @returns {void}
 */
function initChart() {
  try {
    if (typeof Chart === 'undefined') {
      throw new Error('Chart.js is not available.');
    }

    const canvas = document.getElementById('spending-chart');
    if (!canvas) return;

    chart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: [],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  } catch (err) {
    console.warn('EBV: Chart.js failed to initialize.', err);

    // Hide the chart container and show a fallback message
    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.hidden = true;
    }

    const chartEmpty = document.getElementById('chart-empty');
    if (chartEmpty) {
      chartEmpty.textContent = 'Chart unavailable — could not load Chart.js.';
      chartEmpty.hidden = false;
    }
  }
}

/**
 * Updates the doughnut chart to reflect current per-category spending totals.
 *
 * - If `transactions` is empty: hides the <canvas> and shows #chart-empty.
 * - Otherwise: shows the <canvas>, hides #chart-empty, computes per-category
 *   totals, updates chart.data.labels / .data / .backgroundColor to include
 *   only categories with at least one transaction, then calls chart.update().
 *
 * @param {Transaction[]} transactions
 * @returns {void}
 */
function renderChart(transactions) {
  const canvas = document.getElementById('spending-chart');
  const chartEmpty = document.getElementById('chart-empty');

  if (transactions.length === 0) {
    // Empty state — hide canvas, show placeholder
    if (canvas) canvas.hidden = true;
    if (chartEmpty) chartEmpty.hidden = false;
    return;
  }

  // Has transactions — show canvas, hide placeholder
  if (canvas) canvas.hidden = false;
  if (chartEmpty) chartEmpty.hidden = true;

  // Bail out if chart was never initialized (CDN failure path)
  if (!chart) return;

  // Compute per-category totals
  /** @type {Object.<string, number>} */
  const totals = {};
  transactions.forEach(function (tx) {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  // Build parallel arrays for labels, data, and colors — only categories present
  const labels = [];
  const data = [];
  const backgroundColors = [];

  Object.keys(totals).forEach(function (category) {
    labels.push(category);
    data.push(totals[category]);
    backgroundColors.push(CATEGORY_COLORS[category] || '#CCCCCC');
  });

  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[0].backgroundColor = backgroundColors;

  chart.update();
}

// ── Theme ──────────────────────────────────────────────

/**
 * Applies the given theme to the document by setting or removing the
 * `data-theme="dark"` attribute on `<html>`, and updates the toggle
 * button icon to reflect the active theme.
 *
 * - Dark mode: sets `data-theme="dark"` on `<html>`, sets button text to ☀️
 * - Light mode: removes `data-theme` from `<html>`, sets button text to 🌙
 *
 * @param {'light'|'dark'} theme
 */
function applyTheme(theme) {
  const htmlEl = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');

  if (theme === 'dark') {
    htmlEl.setAttribute('data-theme', 'dark');
    if (toggleBtn) {
      toggleBtn.textContent = '☀️';
    }
  } else {
    htmlEl.removeAttribute('data-theme');
    if (toggleBtn) {
      toggleBtn.textContent = '🌙';
    }
  }
}

/**
 * Handles a click on the #theme-toggle button.
 * Flips `settings.theme` between 'light' and 'dark', applies the new theme
 * to the DOM via `applyTheme`, and persists the updated settings to localStorage.
 */
function handleThemeToggle() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(settings.theme);
  Storage.saveSettings(settings);
}

/**
 * Handles the `change` event on the #sort-select dropdown.
 * Updates `settings.sortOrder` with the newly selected value, persists the
 * updated settings to localStorage, and re-renders the UI so the transaction
 * list immediately reflects the new sort order.
 *
 * @param {Event} event
 */
function handleSortChange(event) {
  settings.sortOrder = /** @type {SortOrder} */ (event.target.value);
  Storage.saveSettings(settings);
  render();
}

// ── Initialization ─────────────────────────────────────

/**
 * The single re-render entry point called after every state mutation.
 * Sorts the canonical transactions array according to the active sort order,
 * then delegates to the three render functions to update the DOM and chart.
 *
 * @returns {void}
 */
function render() {
  const sorted = sortTransactions(transactions, settings.sortOrder);
  renderTransactionList(sorted);
  renderBalance(sorted);
  renderChart(sorted);
}

/**
 * Bootstraps the application:
 * 1. Loads persisted state from localStorage and assigns it to module-level variables.
 * 2. Restores the saved theme, spending limit input, and sort select value.
 * 3. Initialises the Chart.js instance, then performs the first full render.
 * 4. Attaches all event listeners.
 *
 * Called once at the bottom of this file after all function definitions.
 *
 * @returns {void}
 */
function init() {
  // 1. Restore persisted state
  const loaded = Storage.load();
  transactions = loaded.transactions;
  settings = loaded.settings;

  // 2. Apply saved theme
  applyTheme(settings.theme);

  // 3. Restore control values from settings
  const spendingLimitInput = document.getElementById('spending-limit');
  if (spendingLimitInput && settings.spendingLimit !== null) {
    spendingLimitInput.value = settings.spendingLimit;
  }

  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = settings.sortOrder || '';
  }

  // 4. Initialise chart, then render the full UI
  initChart();
  render();

  // 5. Attach event listeners
  document.getElementById('expense-form')
    .addEventListener('submit', handleFormSubmit);

  document.getElementById('transaction-list')
    .addEventListener('click', handleDeleteClick);

  document.getElementById('theme-toggle')
    .addEventListener('click', handleThemeToggle);

  document.getElementById('sort-select')
    .addEventListener('change', handleSortChange);

  document.getElementById('spending-limit')
    .addEventListener('change', handleLimitChange);

  // Inline error clearing on field input/change
  document.getElementById('item-name')
    .addEventListener('input', function () {
      clearFieldError(document.getElementById('item-name-error'));
    });

  document.getElementById('amount')
    .addEventListener('input', function () {
      clearFieldError(document.getElementById('amount-error'));
    });

  document.getElementById('category')
    .addEventListener('change', function () {
      clearFieldError(document.getElementById('category-error'));
    });
}

// Kick off the app
init();
