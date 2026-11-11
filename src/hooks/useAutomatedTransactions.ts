import { useState, useEffect, useCallback, useRef } from "react";
import { Preferences } from "@capacitor/preferences";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { useLLM } from "@/hooks/useLLM";
import { useSupabaseSnapshotSync } from "@/lib/expenseManagerSupabase";

interface SMSReaderNativePlugin {
  testConnection(): Promise<{ status: string }>;
  getSMSList(): Promise<{ smsList: Array<{ body: string; address: string; date: number }> }>;
}

const SMSReaderNative = registerPlugin<SMSReaderNativePlugin>("SMSReaderNative");

export interface SMSTransaction {
  id: string;
  timestamp: number;
  messageText: string;
  amount: number;
  date: string;
  type: "upi" | "credit-card" | "net-banking" | "cash" | "unknown";
  bank?: string;
  status: "pending" | "approved" | "rejected";
  categorization?: {
    fundId: string;
    expenseId: string;
    confidence: number;
    aiCategorized?: boolean;
  };
  alreadyApproved?: boolean;
}

interface Fund {
  id: string;
  name: string;
  expenses: Array<{
    id: string;
    description: string;
  }>;
}

const LAST_SMS_TIMESTAMP_KEY = "automated-transactions-last-sms-timestamp";
const PENDING_TRANSACTIONS_KEY = "automated-transactions-pending";
const PROCESSED_TRANSACTIONS_KEY = "automated-transactions-processed";
const APPROVED_SMS_HASHES_KEY = "automated-transactions-approved-hashes";
const LEARNED_MAPPINGS_KEY = "automated-transactions-learned-mappings";

export const useAutomatedTransactions = (funds: Fund[]) => {
  const [pendingTransactions, setPendingTransactions] = useState<SMSTransaction[]>([]);
  const [processedTransactions, setProcessedTransactions] = useState<SMSTransaction[]>([]);
  const [approvedHashes, setApprovedHashes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [learnedMappings, setLearnedMappings] = useState<Record<string, { fundId: string; expenseId: string; paymentMode?: string }>>({});
  const { initializeModel, generate, modelLoading } = useLLM();

  useSupabaseSnapshotSync({ pendingTransactions, processedTransactions, approvedHashes: [...approvedHashes], learnedMappings }, true);

  // Load pending transactions from storage
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const { value: pending } = await Preferences.get({ key: PENDING_TRANSACTIONS_KEY });
        const { value: processed } = await Preferences.get({ key: PROCESSED_TRANSACTIONS_KEY });
        const { value: hashes } = await Preferences.get({ key: APPROVED_SMS_HASHES_KEY });
        const { value: learned } = await Preferences.get({ key: LEARNED_MAPPINGS_KEY });
        
        if (pending) setPendingTransactions(JSON.parse(pending));
        if (processed) setProcessedTransactions(JSON.parse(processed));
        if (hashes) setApprovedHashes(new Set(JSON.parse(hashes)));
        if (learned) setLearnedMappings(JSON.parse(learned));
      } catch (error) {
        console.error("Failed to load transactions:", error);
      }
    };

    loadTransactions();
  }, []);

  const generateSMSHash = useCallback((text: string, timestamp: number, amount: number) => {
    // Simple but effective fingerprint: combine text, normalized date, and amount
    const date = new Date(timestamp).toDateString();
    return btoa(`${text}-${date}-${amount}`).substring(0, 32);
  }, []);

  // Model initialization is now handled by the shared useLLM hook

  // Create prompt for categorization
  const createCategorizationPrompt = useCallback((transaction: SMSTransaction): string => {
    const fundList = funds
      .map((f) => `- ${f.name} (${f.expenses.map((e) => e.description).join(", ")})`)
      .join("\n");

    return `Analyze the following bank transaction and categorize it.

Available Funds and Categories:
${fundList}

Transaction: "${transaction.messageText}"
Amount: ₹${transaction.amount}

Respond in exactly this format (3 lines):
FUND: [fund name]
CATEGORY: [category name]
CONFIDENCE: [0-100]

Example:
FUND: Daily Expenses
CATEGORY: Groceries
CONFIDENCE: 95`;
  }, [funds]);

  // Parse AI model response
  const parseAIResponse = useCallback(
    (response: string, transaction: SMSTransaction) => {
      try {
        const lines = response.split("\n").map((l) => l.trim());
        const fundLine = lines.find((l) => l.startsWith("FUND:"));
        const categoryLine = lines.find((l) => l.startsWith("CATEGORY:"));
        const confidenceLine = lines.find((l) => l.startsWith("CONFIDENCE:"));

        if (!fundLine || !categoryLine || !confidenceLine) {
          throw new Error("Invalid response format");
        }

        const fundName = fundLine.replace("FUND:", "").trim();
        const categoryName = categoryLine.replace("CATEGORY:", "").trim();
        const confidenceStr = confidenceLine.replace("CONFIDENCE:", "").trim();
        const confidence = Math.min(100, Math.max(0, parseInt(confidenceStr))) / 100;

        // Find matching fund
        const matchedFund = funds.find((f) => f.name.toLowerCase().includes(fundName.toLowerCase()));
        if (!matchedFund) {
          throw new Error(`Fund not found: ${fundName}`);
        }

        // Find matching expense
        const matchedExpense = matchedFund.expenses.find((e) =>
          e.description.toLowerCase().includes(categoryName.toLowerCase())
        );
        if (!matchedExpense) {
          throw new Error(`Category not found: ${categoryName}`);
        }

        return {
          fundId: matchedFund.id,
          expenseId: matchedExpense.id,
          confidence: confidence,
          aiCategorized: true,
        };
      } catch (error) {
        console.error("Error parsing AI response:", error);
        return null;
      }
    },
    [funds]
  );

  // Helper to filter out non-transactional messages
  const isTransactionalSMS = useCallback((text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    // Explicit Blacklist: If it has any of these, it's JUNK (OTPs, Ads, Promo)
    const blacklist = [
      "otp", "verificationcode", "verification code", "secret code", "linking code", "code is",
      "offer", "discount", "win ", "lucky", "cashback", "prizes", "reward points",
      "recharge now", "valid until", "pack expires", "unlimited data", "renew your",
      "special for you", "congratulations", "claimed", "gift card", "deal of"
    ];
    
    // Check if blacklisted words are present (but not as part of larger words if possible)
    if (blacklist.some(word => lowerText.includes(word))) {
      return false;
    }

    // Explicit Whitelist: Must have at least one of these to be a real transaction
    const whitelist = [
      "spent", "debited", "charged", "payment", "withdrawn", "paid", "sent to", 
      "purchase", "transaction", "received", "credited", "upi transfer"
    ];
    
    return whitelist.some(word => lowerText.includes(word));
  }, []);

  // Extract merchant/recipient name from SMS body
  const extractMerchantName = useCallback((text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    // Patterns for recipients in Indian SMS
    const patterns = [
      /(?:paid to|sent to|transfer to|payment to)\s+([a-zA-Z0-9\s*]+?)(?:\s+from|\s+ref|\s+on|\s+at|\.|\s+using|\s+upi|$)/i,
      /(?:spent|purchase|payment|spent on|at)\s+([a-zA-Z0-9\s*]+?)(?:\s+ref|\s+on|\s+at|\.|\s+using|$)/i,
      /(?:VPA)\s+([a-zA-Z0-9\s@.]+?)(?:\s+debited|$)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // Clean up common noise
        name = name.replace(/\s+/g, ' ');
        // Short merchant names are usually more reliable as keys
        if (name.length > 2 && name.length < 30) {
          return name.toUpperCase();
        }
      }
    }

    return null;
  }, []);

  // Save a learned mapping
  const saveLearnedMapping = useCallback(async (merchantName: string, fundId: string, expenseId: string, paymentMode?: string) => {
    const updated = {
      ...learnedMappings,
      [merchantName]: { fundId, expenseId, paymentMode }
    };
    setLearnedMappings(updated);
    await Preferences.set({ key: LEARNED_MAPPINGS_KEY, value: JSON.stringify(updated) });
  }, [learnedMappings]);

  // Categorize using AI model with fallback to keyword matching
  const categorizeTransaction = useCallback(
    async (transaction: SMSTransaction) => {
      const text = transaction.messageText.toLowerCase();

      // Transaction type detection
      if (text.includes("upi") || text.includes("upi transfer")) {
        transaction.type = "upi";
      } else if (text.includes("credit card") || text.includes("cc ") || text.includes("card")) {
        transaction.type = "credit-card";
      } else if (text.includes("net banking") || text.includes("neft") || text.includes("imps")) {
        transaction.type = "net-banking";
      } else if (text.includes("cash")) {
        transaction.type = "cash";
      }

      // 1. Check Learned Memory First (User's personal preferences)
      const merchant = extractMerchantName(transaction.messageText);
      if (merchant && learnedMappings[merchant]) {
        const learned = learnedMappings[merchant];
        transaction.categorization = {
          fundId: learned.fundId,
          expenseId: learned.expenseId,
          confidence: 1.0, // Absolute confidence for learned items
          aiCategorized: false
        };
        if (learned.paymentMode) {
          transaction.type = learned.paymentMode as SMSTransaction["type"];
        }
        return transaction;
      }

      // Priority Handlers for major Indian services/brands
      const priorities = [
        { keywords: ["swiggy", "zomato", "instamart", "zepto", "blinkit", "bigbasket"], fund: "daily-expenses", category: ["groceries", "food"] },
        { keywords: ["airtel", "jio", "vi ", "bsnl", "vodafone"], fund: "daily-expenses", category: ["bills", "recharge", "utility", "internet", "mobile"] },
        { keywords: ["netflix", "amazon prime", "hotstar", "sonyliv", "xstream", "spotify", "youtube"], fund: "daily-expenses", category: ["subscription", "entertainment", "internet"] },
        { keywords: ["uber", "ola", "rapido", "metro", "petrol", "shell", "hpcl", "bpcl"], fund: "daily-expenses", category: ["travel", "transport"] },
        { keywords: ["apollo", "pharmacy", "medicine", "netmeds", "pharmeasy", "clinic"], fund: "daily-expenses", category: ["health", "medical"] },
        { keywords: ["amazon", "flipkart", "myntra", "ajio"], fund: "daily-expenses", category: ["shopping"] }
      ];

      for (const group of priorities) {
        if (group.keywords.some(kw => text.includes(kw))) {
          const matchedFund = funds.find(f => f.id === group.fund);
          if (matchedFund) {
            const matchedCat = matchedFund.expenses.find(e => 
              group.category.some(cat => e.description.toLowerCase().includes(cat))
            );
            if (matchedCat) {
              transaction.categorization = {
                fundId: matchedFund.id,
                expenseId: matchedCat.id,
                confidence: 0.95,
                aiCategorized: false
              };
              return transaction;
            }
          }
        }
      }

      // Try AI categorization if priority failed
      try {
        await initializeModel();
        const rawPrompt = createCategorizationPrompt(transaction);
        const fullPrompt = `<|im_start|>system\nYou are a transaction categorization expert for expense tracking.<|im_end|>\n<|im_start|>user\n${rawPrompt}<|im_end|>\n<|im_start|>assistant\n`;
        const resultText = await generate(fullPrompt, {
          max_new_tokens: 100,
          temperature: 0.1,
        });

        const aiCategorization = parseAIResponse(resultText, transaction);
          if (aiCategorization) {
            transaction.categorization = aiCategorization;
            return transaction;
          }
      } catch (error) {
        console.error("AI categorization failed, falling back to keyword matching:", error);
      }

      // Fallback: Keyword matching
      let bestMatch = {
        fundId: "daily-expenses",
        expenseId: "1", // Default to first expense if no match
        confidence: 0.2,
        aiCategorized: false,
      };

      funds.forEach((fund) => {
        fund.expenses.forEach((expense) => {
          const keywords = expense.description.toLowerCase().split(" ");
          const matchCount = keywords.filter((kw) => text.includes(kw) && kw.length > 2).length;

          if (matchCount > 0) {
            const confidence = Math.min(1, matchCount / keywords.length);
            if (confidence > bestMatch.confidence) {
              bestMatch = {
                fundId: fund.id,
                expenseId: expense.id,
                confidence,
                aiCategorized: false,
              };
            }
          }
        });
      });

      // Default to Daily Expenses for low confidence
      if (bestMatch.confidence < 0.4) {
        const dailyExpensesFund = funds.find((f) => f.id === "daily-expenses");
        if (dailyExpensesFund && dailyExpensesFund.expenses.length > 0) {
          bestMatch = {
            fundId: "daily-expenses",
            expenseId: dailyExpensesFund.expenses[0].id,
            confidence: 0.1,
            aiCategorized: false,
          };
        }
      }

      transaction.categorization = bestMatch;
      return transaction;
    },
    [funds, initializeModel, createCategorizationPrompt, parseAIResponse, extractMerchantName, learnedMappings]
  );

  // Save pending transactions
  const savePendingTransactions = useCallback(async (transactions: SMSTransaction[]) => {
    setPendingTransactions(transactions);
    await Preferences.set({ key: PENDING_TRANSACTIONS_KEY, value: JSON.stringify(transactions) });
  }, []);

  // Mock SMS reading - in production, use a real SMS reading plugin
  const readSMSTransactions = useCallback(async (filters?: {
    type: "recent" | "date" | "on-after" | "between";
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    const now = Date.now();
    
    try {
      const { value: lastTimestamp } = await Preferences.get({ key: LAST_SMS_TIMESTAMP_KEY });
      const lastTS = lastTimestamp ? parseInt(lastTimestamp) : 0;
      const isAndroid = Capacitor.getPlatform() === "android";

      let rawSMS: Array<{ timestamp: number; text: string }> = [];

      if (isAndroid) {
        let bridgeWorks = false;
        console.log("Attempting to connect to SMSReaderNative...");
        
        // Timeout helper
        const withTimeout = (promise: Promise<unknown>, ms: number) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("Bridge timeout")), ms))
          ]);
        };
        
        try {
          // Test with a 3 second timeout
          const conn = await withTimeout(SMSReaderNative.testConnection(), 3000);
          console.log("Bridge connection SUCCESS:", conn.status);
          bridgeWorks = true;
        } catch (e) {
          console.warn("Initial bridge connection failed or timed out, retrying in 1s...");
          await new Promise(r => setTimeout(r, 1000));
          try {
            const conn = await withTimeout(SMSReaderNative.testConnection(), 3000);
            console.log("Bridge connection SUCCESS after retry:", conn.status);
            bridgeWorks = true;
          } catch (e2) {
            console.error("Bridge connection failed completely:", e2);
          }
        }

        if (bridgeWorks) {
          try {
            console.log("Fetching real SMS from Android inbox (with timeout)...");
            const result = await withTimeout(SMSReaderNative.getSMSList(), 5000) as { smsList: { body: string, date: number }[] };
            rawSMS = (result.smsList || []).map((sms) => ({
              timestamp: sms.date,
              text: sms.body
            }));
            console.log(`Successfully fetched ${rawSMS.length} messages from inbox.`);
          } catch (err) {
            console.error("Native SMS fetch failed or timed out:", err);
          }
        }
      }

      // If not android or native failed, use mock data
      if (rawSMS.length === 0) {
        // Expanded mock data to support date-based testing
        const mockSMSMessages = [
          { timestamp: now - 3600000, text: "UPI payment of ₹500 to Grocery Store. Balance: ₹50000" },
          { timestamp: now - 7200000, text: "Credit Card purchase ₹1500 at Petrol Pump. Available credit: ₹80000" },
          { timestamp: now - 10800000, text: "NEFT transfer ₹20000 received. New Balance: ₹150000" },
          // Older messages for date range testing
          { timestamp: now - (86400000 * 1), text: "UPI payment of ₹120 to Tea Stall. Balance: ₹49880" },
          { timestamp: now - (86400000 * 2), text: "Credit Card purchase ₹4500 at Amazon. Available credit: ₹75500" },
          { timestamp: now - (86400000 * 5), text: "UPI payment of ₹250 to Pharmacy. Balance: ₹75250" },
        ];
        rawSMS = mockSMSMessages;
      }

      let filteredSMS = rawSMS;

      if (filters) {
        if (filters.type === "date" && filters.startDate) {
          const targetDate = new Date(filters.startDate).toDateString();
          filteredSMS = rawSMS.filter(m => new Date(m.timestamp).toDateString() === targetDate);
        } else if (filters.type === "on-after" && filters.startDate) {
          const startTime = new Date(filters.startDate).setHours(0, 0, 0, 0);
          filteredSMS = rawSMS.filter(m => m.timestamp >= startTime);
        } else if (filters.type === "between" && filters.startDate && filters.endDate) {
          const startTime = new Date(filters.startDate).setHours(0, 0, 0, 0);
          const endTime = new Date(filters.endDate).setHours(23, 59, 59, 999);
          filteredSMS = rawSMS.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
        } else if (filters.type === "recent") {
          filteredSMS = rawSMS.filter((msg) => msg.timestamp > lastTS);
        }
      } else {
        filteredSMS = rawSMS.filter((msg) => msg.timestamp > lastTS);
      }

      if (filteredSMS.length === 0) {
        setLoading(false);
        return;
      }

      // Process filtered SMS messages
      const newTransactions: SMSTransaction[] = [];
      for (const msg of filteredSMS) {
        // JUNK FILTER: Skip if not an actual transaction (OTP, Ads, etc)
        if (!isTransactionalSMS(msg.text)) {
          continue;
        }

        // Improved amount extraction for Indian SMS formats
        const amountRegex = /(?:₹|Rs\.?|INR|Spent|Payment of)[\s]*([\d,]+(?:\.\d{2})?)/i;
        const amountMatch = msg.text.match(amountRegex);
        const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
        
        // Final sanity check: if amount is 0 and it's not a clear 'received' message, skip
        if (amount === 0 && !msg.text.toLowerCase().includes("received")) {
          continue;
        }

        const date = new Date(msg.timestamp);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        const hash = generateSMSHash(msg.text, msg.timestamp, amount);
        const isDuplicate = approvedHashes.has(hash);

        const transaction: SMSTransaction = {
          id: `sms-${msg.timestamp}-${hash.substring(0, 6)}`,
          timestamp: msg.timestamp,
          messageText: msg.text,
          amount,
          date: dateStr,
          type: "unknown",
          status: "pending",
          alreadyApproved: isDuplicate
        };

        // Only categorize if not a duplicate
        if (!isDuplicate) {
          await categorizeTransaction(transaction);
        }
        
        newTransactions.push(transaction);
      }

      // Merge and update (avoiding duplicates already in the pending list)
      const existingIds = new Set(pendingTransactions.map(t => t.id));
      const filteredNew = newTransactions.filter(t => !existingIds.has(t.id));
      
      const updated = [...pendingTransactions, ...filteredNew];
      await savePendingTransactions(updated);
      
      if (!filters || filters.type === "recent") {
        await Preferences.set({ key: LAST_SMS_TIMESTAMP_KEY, value: now.toString() });
      }
    } catch (error) {
      console.error("Error reading SMS transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [pendingTransactions, savePendingTransactions, categorizeTransaction, generateSMSHash, approvedHashes, isTransactionalSMS]);

  // Approve transaction
  const approveTransaction = useCallback(
    async (
      transactionId: string,
      fundId: string,
      expenseId: string,
      paymentMode?: "upi" | "credit-card" | "net-banking" | "cash"
    ) => {
      const transaction = pendingTransactions.find((t) => t.id === transactionId);
      if (!transaction) return;

      transaction.status = "approved";
      transaction.categorization = {
        fundId,
        expenseId,
        confidence: 0.95,
      };

      if (paymentMode) {
        if (paymentMode === "net-banking") {
          transaction.type = "net-banking";
        } else {
          transaction.type = paymentMode;
        }
      }

      const updated = pendingTransactions.filter((t) => t.id !== transactionId);
      await savePendingTransactions(updated);

      const processed = [...processedTransactions, transaction];
      setProcessedTransactions(processed);
      await Preferences.set({ key: PROCESSED_TRANSACTIONS_KEY, value: JSON.stringify(processed) });

      // Save hash for duplicate prevention
      const hash = generateSMSHash(transaction.messageText, transaction.timestamp, transaction.amount);
      const newHashes = new Set(approvedHashes);
      newHashes.add(hash);
      setApprovedHashes(newHashes);
      await Preferences.set({ key: APPROVED_SMS_HASHES_KEY, value: JSON.stringify(Array.from(newHashes)) });

      // Save learned mapping for this merchant
      const merchantName = extractMerchantName(transaction.messageText);
      if (merchantName) {
        await saveLearnedMapping(merchantName, fundId, expenseId, transaction.type);
      }
    },
    [pendingTransactions, processedTransactions, savePendingTransactions, approvedHashes, generateSMSHash, extractMerchantName, saveLearnedMapping]
  );

  // Reject transaction
  const rejectTransaction = useCallback(
    async (transactionId: string) => {
      const updated = pendingTransactions.filter((t) => t.id !== transactionId);
      await savePendingTransactions(updated);
    },
    [pendingTransactions, savePendingTransactions]
  );

  // Unprocess a transaction (remove from processed list and allowed hashes)
  const unprocessTransaction = useCallback(
    async (hash: string) => {
      // 1. Remove from processed list
      const updatedProcessed = processedTransactions.filter((t) => !t.id.includes(hash));
      setProcessedTransactions(updatedProcessed);
      await Preferences.set({ key: PROCESSED_TRANSACTIONS_KEY, value: JSON.stringify(updatedProcessed) });

      // 2. Remove from approved hashes
      const newHashes = new Set(approvedHashes);
      let found = false;
      newHashes.forEach(h => {
        if (h === hash) {
          newHashes.delete(h);
          found = true;
        }
      });
      
      if (found) {
        setApprovedHashes(newHashes);
        await Preferences.set({ key: APPROVED_SMS_HASHES_KEY, value: JSON.stringify(Array.from(newHashes)) });
      }

      console.log(`Unprocessed transaction with hash: ${hash}. Ready for re-scan.`);
    },
    [processedTransactions, approvedHashes]
  );

  return {
    pendingTransactions,
    processedTransactions,
    loading,
    modelLoading,
    readSMSTransactions,
    approveTransaction,
    rejectTransaction,
    unprocessTransaction,
    categorizeTransaction,
  };
};
