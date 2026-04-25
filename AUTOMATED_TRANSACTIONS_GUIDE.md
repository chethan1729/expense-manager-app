# Automated Transactions Feature - User Guide

## Overview
The **Automated Transactions** feature processes bank SMS messages to automatically categorize transactions and create expense records. Instead of manually recording each transaction, the app reads SMS from your bank, intelligently categorizes them using keyword matching, and asks for your approval before updating your fund balances.

## How It Works

### Step 1: Scan for New Transactions
1. Open the Home page
2. Tap the **"Automated Transactions"** card (purple, with lightning bolt icon)
3. You'll see the Automated Transactions page
4. Tap **"Scan for New Transactions"** button
5. The app checks for new SMS messages from your bank that haven't been processed before

### Step 2: Review Pending Transactions
Each pending transaction shows:
- **Message Preview**: First 60 characters of the SMS
- **Amount**: The transaction amount in ₹
- **Date**: Transaction date in YYYY-MM-DD format
- **Type**: UPI, Credit Card, Net-Banking, etc.
- **Confidence Score**: How certain the AI is about the categorization (0-100%)
- **Raw Details**: Amount, type, date, confidence

### Step 3: Approve or Modify Categorization
For each transaction, you can:

#### Option A: Auto-Approve (if categorization looks good)
- Review the suggested Fund and Expense Category
- Review the detected Payment Mode (UPI/Card/Net-Banking)
- Click **Approve** button
- Transaction is added to your normal Transactions section
- Fund balance is updated automatically

#### Option B: Modify Before Approving
- Change the **Fund** using the dropdown (e.g., "Daily Expenses" → "Wishlist Fund")
- Change the **Expense Category** using the second dropdown
- Change the **Payment Mode** if the auto-detection was wrong
- Click **Approve** with your changes
- Transaction is recorded with your customized categorization

#### Option C: Reject
- Click the **Reject** button
- Transaction is discarded
- It won't be processed again (prevents duplicates via timestamp tracking)
- You can record it manually later if needed

### Step 4: Check Processed Transactions
- Switch to the **"Processed"** tab
- View all transactions you've already approved
- These are now reflected in your normal Transactions section and fund balances

## Key Features

### 🔍 Duplicate Prevention
- **How It Works**: The app tracks the timestamp of the last SMS processed
- **Benefit**: Even if you restart the app or open it multiple times, the same SMS won't be processed twice
- **Technical Detail**: Uses `automated-transactions-last-sms-timestamp` in storage

### 🎯 Smart Categorization
- **Keyword Matching**: The app analyzes the SMS text and matches it against your existing expense descriptions
- **Fund Detection**: Identifies which fund the transaction belongs to (Daily Expenses, Wishlist, etc.)
- **Confidence Scoring**: Shows how confident the AI is about its categorization (0-100%)
- **Fallback**: If unsure, defaults to "Daily Expenses" fund

### 💳 Transaction Type Detection
Auto-detects payment method:
- **UPI** (blue icon): "UPI", "UPI transfer"
- **Credit Card** (orange icon): "Credit Card", "CC", "Card"
- **Net-Banking** (green icon): "Net Banking", "NEFT", "IMPS"
- **Cash** (gray icon): "Cash"

### 🔔 Pending Count Badge
- Main menu shows a **red badge** on the "Automated Transactions" card
- Badge displays number of pending transactions (capped at 9+)
- Helps you quickly see if there are pending approvals

### ⚡ Fast Integration
- Approved transactions are instantly added to your normal Transaction section
- Fund balances update immediately
- No manual data entry needed

## Transaction Details Shown During Approval

| Detail | Example | Purpose |
|--------|---------|---------|
| **Date** | 2024-04-16 | When the transaction occurred |
| **Amount** | ₹500 | Transaction value |
| **Type** | UPI Transfer | How payment was made |
| **Fund** | Daily Expenses | Which fund it updates |
| **Expense Category** | Groceries | Which category within the fund |
| **Payment Mode** | UPI | For record-keeping in reports |
| **Confidence** | 85% | How certain the categorization is |

## Examples

### Example 1: Auto-Categorized UPI Payment
```
SMS: "UPI payment of ₹500 to Grocery Store. Balance: ₹50000"
Auto-Categorized To:
  - Fund: Daily Expenses
  - Category: Groceries
  - Type: UPI
  - Confidence: 92%
Action: Click Approve → Done!
```

### Example 2: Manual Adjustment Required
```
SMS: "CC purchase ₹1500 at Shell Petrol Pump. Credit limit: ₹80000"
Auto-Categorized To:
  - Fund: Daily Expenses (might be wrong)
  - Category: Groceries (definitely wrong)
  - Type: Credit Card ✓
  - Confidence: 35% (low confidence)
Action: 
  1. Change Fund to "Daily Expenses" ✓
  2. Change Category to "Petrol"
  3. Confirm Type: Credit Card ✓
  4. Click Approve
```

### Example 3: Bank Transfer
```
SMS: "NEFT transfer ₹20000 received. New Balance: ₹150000"
Auto-Categorized To:
  - Fund: Daily Expenses
  - Category: Income (if exists)
  - Type: Net-Banking ✓
  - Confidence: 60%
Action: Change as needed, then Approve
```

## Data Storage & Privacy

### What Gets Stored
- **Last Processed SMS Timestamp**: Only the timestamp, no SMS content
- **Pending Transactions**: Transaction details (amount, date, type, categorization)
- **Processed Transactions**: Transaction history
- **All Stored Locally**: No data sent to cloud or external services

### Storage Keys (Internal)
```
automated-transactions-last-sms-timestamp    // Timestamp to prevent duplicates
automated-transactions-pending                // Pending approval queue
automated-transactions-processed              // Archive of approved transactions
```

### Privacy Notes
- SMS content is parsed locally on your device
- Only the transaction details (amount, date, type) are stored
- Original SMS text is not permanently stored (only used for categorization)
- No external API calls made for categorization (uses keyword matching)

## Troubleshooting

### "No pending transactions"
**Cause**: No new SMS messages found since last scan
**Solution**: 
- Ask your bank to send you a test SMS
- Or wait for your next transaction
- Check that SMS permissions are granted (Android 12+)

### Categorization seems wrong
**Solution**: 
- Manually change the Fund/Category dropdowns before approving
- The app learns from keyword matching, so adjust as needed

### Same SMS processed twice
**Cause**: This shouldn't happen due to timestamp tracking
**Solution**: If it does, reject the duplicate transaction

### Missing SMS
**Cause**: Different SMS format from your bank
**Solution**: Check SMS content, manually edit categorization

## Future Enhancements

### Planned (Phase 4B)
- [ ] Real AI model integration (Google Gemma 2B/3B)
- [ ] Bank-specific SMS parsing for different formats
- [ ] Machine learning based on your approval history
- [ ] Bulk approve/reject for multiple transactions

### Possible
- [ ] Recurring transaction detection
- [ ] Merchant name normalization
- [ ] Transaction merging for split payments
- [ ] Export categorization rules

## Related Sections

- **Transactions Page**: View all transactions (manual + automated)
- **Reports Page**: See transaction breakdown by category
- **Daily Expenses Report**: Visualize spending patterns
- **Fund Balance**: Updated automatically after approval

## Support & Feedback

If the automated categorization doesn't work well for your bank:
1. Manually edit the categorization before approving
2. Your edits help train the system
3. Each approval improves future categorizations

---

**Last Updated**: April 2025
**Feature Status**: Phase 4 - Core implementation complete, AI model integration planned
