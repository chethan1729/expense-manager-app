# Unallocated Amount Calculation - Fund Overview

## Overview
The **Unallocated Amount** in the Fund Overview represents the remaining budget that hasn't been allocated to any specific fund or goal.

## Formula
```
Unallocated Amount = Total Budget - Total Allocated Amount
```

## Parameters Used in Calculation

### 1. **Total Budget**
- The overall monthly budget set by the user
- Used as the starting point for all calculations
- Source: `totalBudget` from fund manager state

### 2. **Daily Expenses - Allocated**
- Sum of all estimated (monthly allocated) amounts for Daily Expenses items
- Includes all recurring expenses like maintenance, utilities, groceries, food, etc.
- **Example**: If Daily Expenses has items with estimated = [4500, 1500, 5000, 4000, ...], this sum is included
- Source: `dailyExpenses.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0)`

### 3. **Investment Fund - Allocated**
- Monthly allocated amount field for the Investment Fund (top-level budget for that month)
- Represents the total monthly allocation to be invested across all investment items
- Does NOT sum individual investment items; uses the fund's monthly allocation field
- **Example**: If you allocate ₹80,000/month to the Investment Fund
- Source: `investmentFund.budget` 

### 4. **Loan Fund - This Month**
- Sum of estimated amounts for current month's loan EMI or payments
- Represents the monthly loan obligation
- **Example**: EMI amount for home loan, vehicle loan, etc.
- Source: `loanFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0)`

### 5. **Wishlist Fund - This Month**
- Sum of estimated amounts for current month's wishlist allocation
- Represents planned spending for wishlist items like travel, home renovation, etc.
- **Example**: If you plan ₹10,000/month for travel fund
- Source: `wishlistFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0)`

### 6. **Wishlist Fund - Current Balance/Saved**
- Current accumulated balance in the Wishlist Fund
- Represents previously saved money that's now unavailable for new allocation
- **Example**: If you've saved ₹500,000 for a trip
- Source: `wishlistFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0)`

### 7. **Emergency Fund - This Month**
- Sum of estimated amounts for current month's emergency fund allocation
- Represents planned monthly contribution to emergency reserves
- **Example**: ₹5,000/month emergency fund savings
- Source: `emergencyFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0)`

### 8. **Emergency Fund - Current Saved**
- Current amount saved in the Emergency Fund
- Represents previously accumulated emergency reserves
- **Example**: If you've saved ₹300,000 in emergency fund
- Source: `emergencyFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0)`

### 9. **Savings Fund - This Month**
- Sum of estimated amounts for current month's savings allocation
- Represents planned monthly savings contributions
- **Example**: ₹20,000/month long-term savings
- Source: `savingsFund.expenses.reduce((sum, e) => sum + (e.estimated || 0), 0)`

### 10. **Savings Fund - Current Saved**
- Current amount saved in the Savings Fund
- Represents previously accumulated savings
- **Example**: If you've saved ₹1,000,000 in savings fund
- Source: `savingsFund.expenses.reduce((sum, e) => sum + (e.saved || 0), 0)`

## Complete Formula Breakdown

```
Unallocated Amount = 
  Total Budget 
  - Daily Expenses (Allocated)
  - Investment Fund (Allocated)
  - Loan Fund (This Month)
  - Wishlist Fund (This Month)
  - Wishlist Fund (Current Balance)
  - Emergency Fund (This Month)
  - Emergency Fund (Current Saved)
  - Savings Fund (This Month)
  - Savings Fund (Current Saved)
```

## Example Calculation

**Assumptions:**
- Total Budget: ₹200,000
- Daily Expenses (Allocated): ₹80,000
- Investment Fund (Allocated): ₹30,000
- Loan Fund (This Month): ₹20,000
- Wishlist Fund (This Month): ₹10,000
- Wishlist Fund (Current Balance): ₹50,000
- Emergency Fund (This Month): ₹5,000
- Emergency Fund (Current Saved): ₹100,000
- Savings Fund (This Month): ₹15,000
- Savings Fund (Current Saved): ₹200,000

**Calculation:**
```
Total Allocated = 80,000 + 30,000 + 20,000 + 10,000 + 50,000 + 5,000 + 100,000 + 15,000 + 200,000
                = ₹510,000

Unallocated Amount = 200,000 - 510,000 = -₹310,000 (Over-allocated)
```

## Color Coding in Dashboard

- **Green**: Positive unallocated amount (budget remaining)
- **Red**: Negative unallocated amount (budget over-allocated)
- **Primary**: Neutral/zero state

## Implementation Location

- **File**: `src/hooks/useExpenses.ts`
- **Function**: `useMemo` hook for `unallocatedBudget`
- **Updated**: April 15, 2026
