# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize spending, and visualize their budget through an interactive pie chart. The app runs entirely in the browser using HTML, CSS, and Vanilla JavaScript, persists data via localStorage, and is optimized for both desktop and mobile viewports. It includes a dark/light mode toggle, transaction sorting, and a configurable spending limit warning system.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application
- **Transaction**: A single expense entry consisting of an item name, amount, and category
- **Category**: One of three predefined spending classifications: Food, Transport, or Fun
- **Balance**: The running total of all transaction amounts displayed at the top of the App
- **Pie_Chart**: The Chart.js-rendered doughnut/pie chart showing spending distribution by Category
- **Transaction_List**: The scrollable list of all recorded Transactions
- **Spending_Limit**: A user-defined monetary threshold; when total spending exceeds it, a warning is shown
- **Theme**: The visual color scheme of the App, either light mode or dark mode
- **Validator**: The client-side input validation logic that checks form fields before submission
- **Storage**: The localStorage-based persistence layer that saves and retrieves Transactions and settings

## Requirements

### Requirement 1: Expense Input Form

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE App SHALL render an input form containing a text field for Item Name, a numeric field for Amount, and a dropdown selector for Category with options Food, Transport, and Fun.
2. WHEN the user submits the form with all fields populated and valid, THE App SHALL add the Transaction to the Transaction_List and clear the form fields.
3. WHEN the user submits the form with the Item Name field empty, THE Validator SHALL display an inline error message indicating the Item Name is required.
4. WHEN the user submits the form with the Amount field empty or containing a non-positive number, THE Validator SHALL display an inline error message indicating a valid positive amount is required.
5. WHEN the user submits the form with no Category selected, THE Validator SHALL display an inline error message indicating a Category must be selected.
6. IF the user submits the form and one or more fields are invalid, THEN THE Validator SHALL prevent the Transaction from being saved and keep the form populated with the entered values.

### Requirement 2: Transaction List

**User Story:** As a user, I want to view all my recorded expenses in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each Transaction showing its Item Name, Amount (formatted as currency), and Category.
2. WHILE the number of Transactions exceeds the visible area, THE Transaction_List SHALL remain scrollable without affecting the rest of the page layout.
3. WHEN the user clicks the delete control on a Transaction, THE App SHALL remove that Transaction from the Transaction_List and from Storage.
4. WHEN no Transactions exist, THE Transaction_List SHALL display an empty-state message indicating no expenses have been recorded.

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending at a glance, so that I can monitor my overall budget consumption.

#### Acceptance Criteria

1. THE App SHALL display the Balance as the sum of all Transaction amounts at the top of the page.
2. WHEN a Transaction is added, THE App SHALL update the Balance immediately without requiring a page reload.
3. WHEN a Transaction is deleted, THE App SHALL update the Balance immediately without requiring a page reload.
4. THE App SHALL format the Balance as a currency value with two decimal places.

### Requirement 4: Spending Category Pie Chart

**User Story:** As a user, I want to see a visual breakdown of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL render using the Chart.js library and display one segment per Category that has at least one Transaction.
2. WHEN a Transaction is added or deleted, THE Pie_Chart SHALL update to reflect the current spending totals per Category without requiring a page reload.
3. THE Pie_Chart SHALL display a legend identifying each Category and its corresponding color.
4. WHEN no Transactions exist, THE Pie_Chart SHALL display a placeholder or empty state rather than an empty chart.

### Requirement 5: Data Persistence

**User Story:** As a user, I want my expense data to be saved between sessions, so that I do not lose my records when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Storage SHALL persist the Transaction to localStorage immediately.
2. WHEN a Transaction is deleted, THE Storage SHALL remove the Transaction from localStorage immediately.
3. WHEN the App loads, THE Storage SHALL retrieve all previously saved Transactions from localStorage and render them in the Transaction_List.
4. WHEN the App loads, THE Storage SHALL retrieve the saved Spending_Limit and Theme preference from localStorage and apply them.

### Requirement 6: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between light mode and dark mode.
2. WHEN the user activates the Theme toggle, THE App SHALL apply the selected Theme to all visible UI elements immediately.
3. WHEN the App loads, THE Storage SHALL restore the previously selected Theme; if no preference is saved, THE App SHALL default to light mode.
4. THE App SHALL maintain sufficient color contrast in both Theme modes to ensure readability.

### Requirement 7: Transaction Sorting

**User Story:** As a user, I want to sort my transactions by amount or category, so that I can find and analyze my expenses more easily.

#### Acceptance Criteria

1. THE App SHALL provide a sort control that allows the user to select a sort order: by Amount (ascending), by Amount (descending), or by Category (alphabetical).
2. WHEN the user selects a sort order, THE Transaction_List SHALL re-render the Transactions in the selected order immediately.
3. WHEN a new Transaction is added, THE Transaction_List SHALL display it according to the currently active sort order.
4. THE App SHALL default to displaying Transactions in the order they were added when no sort order has been selected.

### Requirement 8: Spending Limit Warning

**User Story:** As a user, I want to set a spending limit and be warned when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide an input field where the user can set a Spending_Limit as a positive monetary value.
2. WHEN the Balance exceeds the Spending_Limit and the Spending_Limit is set, THE App SHALL display a visible warning indicator to the user.
3. WHEN the Balance falls at or below the Spending_Limit, THE App SHALL remove the warning indicator.
4. WHEN the user updates the Spending_Limit, THE Storage SHALL persist the new value to localStorage immediately.
5. IF the user sets a Spending_Limit of zero or a negative value, THEN THE Validator SHALL display an inline error message and retain the previous valid Spending_Limit.

## Non-Functional Requirements

### NFR-1: Simplicity

**Goal:** The App shall be easy to understand and use without any setup overhead.

#### Acceptance Criteria

1. THE App SHALL provide a clean, minimal interface that presents only the controls and information relevant to the current task.
2. THE App SHALL be usable immediately upon opening in a browser without requiring account creation, installation, or configuration steps.
3. THE App SHALL require no build tools, package managers, or test framework setup to run.

### NFR-2: Performance

**Goal:** The App shall feel fast and responsive during normal use.

#### Acceptance Criteria

1. THE App SHALL complete initial load and render all persisted Transactions within 2 seconds on a standard broadband connection.
2. WHEN the user adds, deletes, or sorts a Transaction, THE App SHALL update the Transaction_List, Balance, and Pie_Chart within 100 milliseconds.
3. WHILE the user is interacting with any input control, THE App SHALL remain responsive with no perceptible lag.

### NFR-3: Visual Design

**Goal:** The App shall present a user-friendly aesthetic with clear visual hierarchy and readable typography.

#### Acceptance Criteria

1. THE App SHALL apply a consistent visual hierarchy that distinguishes primary actions, data displays, and secondary controls through size, weight, or spacing.
2. THE App SHALL use a base font size of at least 16px for body text and maintain a line-height that ensures comfortable reading.
3. THE App SHALL maintain a color contrast ratio of at least 4.5:1 between text and its background in both light and dark Theme modes, in accordance with WCAG 2.1 AA guidelines.

## Technical Constraints

### TC-1: Technology Stack

- THE App SHALL be structured using HTML.
- THE App SHALL be styled using CSS.
- THE App SHALL implement all interactive behavior using Vanilla JavaScript with no frameworks (React, Vue, Angular, or similar).
- THE App SHALL require no backend server to function.

### TC-2: Data Storage

- THE App SHALL use the browser's localStorage API as its sole persistence mechanism.
- THE App SHALL store all data client-side only, with no data transmitted to or stored on any external server.

### TC-3: Browser Compatibility

- THE App SHALL function correctly in current stable releases of Chrome, Firefox, Edge, and Safari.
- THE App SHALL be deployable as a standalone web application opened directly in a browser or as a browser extension.
