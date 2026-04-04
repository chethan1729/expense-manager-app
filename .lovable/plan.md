
## Phase 1: Core Logic Updates
1. **Auto-allocate Free Fund** — Free Fund budget = totalBudget - sum of all other fund budgets
2. **Fund Overview remaining indicator** — Show unallocated amount (excluding Free Fund) on the right side of "Fund Overview"
3. **Investment Fund P/L amount** — Show profit/loss amount alongside percentage

## Phase 2: FD (Fixed Deposit) Tracking
4. **FD option on expenses** — For Loan, Wishlist, Emergency, Saving funds: add "Kept in FD" toggle when adding/editing expenses
5. **FD logic** — New FD allocations count as "Spent". Pre-existing FD amounts don't affect current month counts
6. **FD data model** — Add `isFD` and `isPreExisting` flags to expenses; track cumulative FD totals per fund

## Phase 3: Bottom Navigation & New Pages
7. **Bottom tab bar** — 3 tabs: Main Menu, Expense Manager, Debt
8. **Main Menu page** — 2-column card grid linking to: Expense Manager, Properties, Reports
9. **Expense Manager** — Existing page, accessed from tab or card

## Phase 4: Properties Page
10. **Properties tracking** — Add/edit properties with: name, total sqft, purchase price per sqft (auto-calc total), current market rate per sqft, description, percentage appreciation display

## Phase 5: Reports Page
11. **Budget overview chart** — Total budget vs allocated vs spent (animated bar/pie chart using recharts)
12. **Investment breakdown** — Total invested, Total in FD, Floating amount
13. **Net worth calculation** — Sum of: bank balance (budget remaining), investments (current value), FD totals, property values minus outstanding loans
14. **Additional charts** — Monthly trend, fund-wise spending distribution

## Phase 6: Debt Management Page
15. **Personal debts** — Track money owed to/from people (name, amount, date, notes)
16. **Loan tracker** — Sanctioned amount, outstanding, principal paid, interest paid, auto-calc total paid, interest rate, tenure vs months paid (auto-increment monthly)

## Technical Notes
- New routes: `/`, `/expenses`, `/properties`, `/reports`, `/debts`
- All data persisted in localStorage
- Recharts for animated graphs
- Bottom nav fixed at bottom with icons
