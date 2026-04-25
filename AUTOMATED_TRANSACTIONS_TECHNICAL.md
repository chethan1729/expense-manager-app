# Automated Transactions - Technical Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                       │
├──────────────────────────────┬──────────────────────────────────┤
│  MainMenu                    │  AutomatedTransactionsPage       │
│  - Shows badge with count    │  - Pending transactions tab      │
│  - Navigates to feature      │  - Processed transactions tab    │
│                              │  - Approval UI per transaction   │
└──────────────────────────────┴──────────────────────────────────┘
                                        ↑
                                        │
                                  Props & Handlers
                                        │
                                        ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Index.tsx (Orchestrator)                    │
├─────────────────────────────────────────────────────────────────┤
│  - Initializes useAutomatedTransactions                          │
│  - Routes to AutomatedTransactionsPage                           │
│  - Handles approval via handleApproveAutomatedTransaction        │
│  - Integrates with existing transaction system                   │
└──────────────┬────────────────────────────────────────────┬─────┘
               │                                            │
               ↓                                            ↓
   ┌──────────────────────────┐        ┌──────────────────────────┐
   │ useAutomatedTransactions │        │ useTransactions (existing)│
   │ (new hook)               │        │                          │
   │ - Read SMS               │        │ - Record transaction     │
   │ - Categorize             │        │ - Update expense spent   │
   │ - Approve/Reject         │        │ - Persist to storage     │
   └──────────────────────────┘        └──────────────────────────┘
               ↓
   ┌──────────────────────────┐
   │  Capacitor Preferences   │
   │  (Persistent Storage)    │
   │  - Last SMS timestamp    │
   │  - Pending transactions  │
   │  - Processed transactions│
   └──────────────────────────┘
```

## Component Hierarchy

### 1. useAutomatedTransactions Hook

**Location**: `src/hooks/useAutomatedTransactions.ts`

**Responsibilities**:
- Simulate/read SMS messages
- Extract transaction details from SMS text
- Categorize transactions using keyword matching
- Store pending/processed transactions
- Track last processed timestamp for deduplication

**Key State**:
```typescript
pendingTransactions: SMSTransaction[]     // Awaiting approval
processedTransactions: SMSTransaction[]   // Already approved
loading: boolean                           // Scanning status
```

**Key Functions**:
```typescript
readSMSTransactions()                     // Scan for new SMS
categorizeTransaction(tx)                 // Assign fund/expense
approveTransaction(id, fund, expense)     // Move to processed
rejectTransaction(id)                     // Remove from pending
```

**Data Structure**:
```typescript
interface SMSTransaction {
  id: string                              // Unique ID
  timestamp: number                       // SMS received time
  messageText: string                     // Full SMS content
  amount: number                          // Extracted amount
  date: string                            // YYYY-MM-DD format
  type: "upi"|"credit-card"|...          // Payment method
  status: "pending"|"approved"|"rejected" // Current status
  categorization?: {
    fundId: string                        // Target fund
    expenseId: string                     // Target expense
    confidence: number                    // 0-1 confidence score
  }
}
```

### 2. AutomatedTransactionsPage Component

**Location**: `src/components/AutomatedTransactionsPage.tsx`

**Responsibilities**:
- Display pending transactions in card format
- Show approved transactions in history
- Provide UI to modify categorization
- Handle approve/reject actions

**Key Sections**:
```
Header
├─ Scan Button (calls onRefresh)
├─ Tabs: Pending | Processed
└─ Content
   ├─ If Pending Tab:
   │  ├─ TransactionApprovalCard (per transaction)
   │  │  ├─ SMS preview + Amount
   │  │  ├─ Fund selector
   │  │  ├─ Expense selector
   │  │  ├─ Payment mode selector
   │  │  └─ Approve/Reject buttons
   │  └─ Empty state if no pending
   └─ If Processed Tab:
      ├─ Transaction cards (read-only)
      └─ Empty state if none
```

**Props**:
```typescript
interface AutomatedTransactionsPageProps {
  pendingTransactions: SMSTransaction[]
  processedTransactions: SMSTransaction[]
  onApprove: (id, fundId, expenseId, mode?) => void
  onReject: (id) => void
  onRefresh: () => void
  loading: boolean
  sections: Fund[]  // For dropdown options
}
```

### 3. MainMenu Component Updates

**Location**: `src/components/MainMenu.tsx`

**Changes**:
- Added "Automated Transactions" card to menuCards
- Display badge with pending count on card
- Icon: Zap (Lucide), Color: Purple (bg-purple-100 text-purple-600)

**Badge Logic**:
```tsx
{card.badge && pendingAutomatedTransactionCount > 0 && (
  <div className="badge">{Math.min(count, 9)}</div>
)}
```

### 4. Index.tsx Integration

**Location**: `src/pages/Index.tsx`

**Changes**:

1. **Import Hook & Component**:
```typescript
import { useAutomatedTransactions } from "@/hooks/useAutomatedTransactions";
import { AutomatedTransactionsPage } from "@/components/AutomatedTransactionsPage";
```

2. **Initialize Hook**:
```typescript
const automatedTransactionsHook = useAutomatedTransactions(
  sections.map((section) => ({
    id: section.id,
    name: section.name,
    expenses: section.expenses.map((exp) => ({
      id: exp.id,
      description: exp.description,
    })),
  }))
);
```

3. **Approval Handler**:
```typescript
const handleApproveAutomatedTransaction = (id, fundId, expenseId, mode) => {
  // 1. Find transaction in pending
  const tx = automatedTransactionsHook.pendingTransactions.find(t => t.id === id);
  
  // 2. Record in transaction system (same as manual recording)
  handleRecordTransaction(tx.date, fundId, tx.amount, expenseId, mode);
  
  // 3. Move from pending to processed
  automatedTransactionsHook.approveTransaction(id, fundId, expenseId, mode);
};
```

4. **Routing**:
```typescript
if (mainMenuPage === "automated-transactions") {
  return (
    <AutomatedTransactionsPage
      pendingTransactions={automatedTransactionsHook.pendingTransactions}
      processedTransactions={automatedTransactionsHook.processedTransactions}
      onApprove={handleApproveAutomatedTransaction}
      onReject={automatedTransactionsHook.rejectTransaction}
      onRefresh={automatedTransactionsHook.readSMSTransactions}
      loading={automatedTransactionsHook.loading}
      sections={sections}
    />
  );
}
```

5. **Badge Display**:
```typescript
<MainMenu 
  onNavigate={handleMainNavigate}
  pendingAutomatedTransactionCount={automatedTransactionsHook.pendingTransactions.length}
/>
```

## Data Flow

### Scan Flow
```
User clicks "Scan for New Transactions"
  ↓
readSMSTransactions() called
  ↓
Get lastProcessedTimestamp from Preferences
  ↓
Simulate/read SMS newer than lastProcessedTimestamp
  ↓
For each new SMS:
  - Extract amount using regex
  - Detect payment type
  - Categorize using keywords
  - Create SMSTransaction object
  ↓
Store in Preferences: automated-transactions-pending
  ↓
Update Preferences: automated-transactions-last-sms-timestamp
  ↓
UI updates with new pending transactions
```

### Approval Flow
```
User reviews transaction and clicks Approve
  ↓
handleApproveAutomatedTransaction() called
  with (transactionId, fundId, expenseId, paymentMode)
  ↓
Find transaction in pendingTransactions
  ↓
handleRecordTransaction() called
  - Adds to transactions array
  - Updates expense.spent
  - Mirrors to Capacitor Preferences
  ↓
automatedTransactionsHook.approveTransaction() called
  - Moves from pending to processed
  - Updates Preferences
  ↓
Fund balance updates via getSectionTotals() calculations
  ↓
Transaction now visible in:
  - TransactionsPage
  - ReportsPage
  - Fund balance calculations
```

### Rejection Flow
```
User clicks Reject
  ↓
rejectTransaction(id) called
  ↓
Remove from pendingTransactions
  ↓
Update Preferences: automated-transactions-pending
  ↓
(Transaction NOT added to transaction system)
  ↓
User can manually record if needed
```

## Storage Schema

### Capacitor Preferences Keys

**1. Last SMS Timestamp**
```
Key: automated-transactions-last-sms-timestamp
Value: "1713264000000"  // Unix timestamp in milliseconds
Purpose: Prevent duplicate SMS processing
```

**2. Pending Transactions**
```
Key: automated-transactions-pending
Value: JSON.stringify([
  {
    id: "sms-1713264000000-0.123",
    timestamp: 1713264000000,
    messageText: "UPI payment of ₹500...",
    amount: 500,
    date: "2024-04-16",
    type: "upi",
    status: "pending",
    categorization: {
      fundId: "daily-expenses",
      expenseId: "exp-1",
      confidence: 0.92
    }
  },
  ...
])
Purpose: Queue of transactions awaiting user approval
```

**3. Processed Transactions**
```
Key: automated-transactions-processed
Value: JSON.stringify([...approved transactions...])
Purpose: Historical record of approved transactions
```

## Categorization Algorithm

### Step 1: Extract Amount
```typescript
const amountMatch = messageText.match(/₹[\s]?(\d+[,\d]*)/);
const amount = parseInt(amountMatch[1].replace(/,/g, ""));
```

### Step 2: Detect Type
```typescript
const text = messageText.toLowerCase();
if (text.includes("upi")) type = "upi";
else if (text.includes("credit card") || text.includes("cc ")) type = "credit-card";
else if (text.includes("neft") || text.includes("imps")) type = "net-banking";
else if (text.includes("cash")) type = "cash";
```

### Step 3: Keyword Match
```typescript
let bestMatch = { fundId: "daily-expenses", expenseId: "1", confidence: 0.3 };

for each fund:
  for each expense in fund:
    keywords = expense.description.toLowerCase().split(" ");
    matchCount = keywords.filter(kw => text.includes(kw) && kw.length > 2).length;
    
    if (matchCount > 0):
      confidence = matchCount / keywords.length;  // Ratio of matched keywords
      
      if (confidence > bestMatch.confidence):
        bestMatch = { fundId, expenseId, confidence };
```

### Step 4: Confidence Check
```typescript
if (bestMatch.confidence < 0.4):  // Less than 40% confidence
  // Default to Daily Expenses
  bestMatch = {
    fundId: "daily-expenses",
    expenseId: "first-expense-id",
    confidence: 0.5  // Default lower confidence
  }
```

## Integration Points

### With Transaction System
- **Entry Point**: `handleApproveAutomatedTransaction()`
- **Calls**: `handleRecordTransaction()` (existing)
- **Side Effect**: Updates `expense.spent`, `transactions` array
- **Persistence**: Via `useTransactions()` hook

### With Fund System
- **Via**: Existing `updateExpense()` function
- **Updates**: `expense.spent` amount
- **Reflects In**: Fund totals, dashboard, reports

### With Report System
- **Data Flows To**: `transactions` array
- **Visible In**: TransactionsPage, ReportsPage
- **Charts Updated**: Payment mode breakdown, daily expense heatmap

## Error Handling

### SMS Reading Failures
```typescript
try {
  // Read SMS
} catch (error) {
  console.error("Error reading SMS:", error);
  // graceful degradation - show empty state
}
```

### Categorization Edge Cases
- Amount not found: Default to 0
- Type not detected: "unknown"
- No matching fund: "daily-expenses"
- No matching expense: First expense in fund

### Storage Issues
```typescript
try {
  await Preferences.get/set()
} catch (error) {
  console.error("Storage error:", error);
  // Use fallback in-memory storage
}
```

## Future Enhancement: AI Model Integration

### Option 1: TensorFlow Lite (Recommended)
```typescript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// Load quantized Gemma model
const model = await tf.loadLayersModel('file://./gemma-2b-quantized.tflite');

// Use for categorization instead of keyword matching
const output = model.predict(inputTensor);
```

### Option 2: ONNX Runtime
```typescript
import * as ort from 'onnxruntime-web';

// Load ONNX model
const model = await ort.InferenceSession.create('gemma.onnx');

// Run inference
const result = await model.run({ input: inputData });
```

### Option 3: Upgrade Keyword Matching
```typescript
// Enhanced keyword matching with NLP preprocessing
function categorizeWithNLP(transaction, funds) {
  // Tokenize SMS text
  const tokens = tokenize(transaction.messageText);
  
  // Remove stop words
  const filtered = removeStopWords(tokens);
  
  // Stemming/lemmatization
  const normalized = normalize(filtered);
  
  // Match against fund expenses
  return findBestMatch(normalized, funds);
}
```

### Integration Point
Replace this function:
```typescript
const categorizeTransaction = useCallback((transaction: SMSTransaction) => {
  // Current: Keyword matching
  
  // Future: Use AI model or enhanced NLP
  // const aiCategorization = await aiModel.categorize(transaction);
  // transaction.categorization = aiCategorization;
  
  return transaction;
}, [funds]);
```

## Performance Considerations

### Current Optimizations
- **Keyword matching is O(n*m)**: n = funds, m = expenses per fund
- **Regex amount extraction**: Single pass with `.match()`
- **Storage**: Preferences is async but doesn't block UI

### Potential Bottlenecks
1. **Large SMS history**: Each read-all from Preferences
   - Solution: Pagination or incremental reading
   
2. **Many pending transactions**: UI renders each in full
   - Solution: Virtualization (react-window)
   
3. **AI model loading**: First categorization may be slow
   - Solution: Pre-load model on app startup
   
4. **Duplicate timestamp checking**: Linear search
   - Solution: Set-based lookup or indexed storage

## Testing Strategy

### Unit Tests (useAutomatedTransactions)
```
- Test SMS parsing with various formats
- Test amount extraction regex
- Test type detection logic
- Test categorization confidence scoring
- Test duplicate prevention logic
- Test storage persistence
```

### Integration Tests
```
- Scan → Pending transactions flow
- Approve → Transaction created flow
- Reject → Transaction removed flow
- Multiple scans → No duplicates
- Storage → Data persists across sessions
```

### UI Tests (AutomatedTransactionsPage)
```
- Pending tab displays transactions
- Processed tab displays history
- Fund dropdown selects correctly
- Expense dropdown updates per fund
- Payment mode changes correctly
- Approve button triggers callback
- Reject button triggers callback
```

### E2E Tests (Full Integration)
```
- SMS arrives → Auto-categorized → Approved → Visible in Transactions
- Fund balance updates correctly after approval
- Badge count updates in main menu
- No duplicates after app restart
- Processed transactions visible in reports
```

---

**Document Version**: 1.0
**Last Updated**: April 2025
**Status**: Phase 4 implementation complete
