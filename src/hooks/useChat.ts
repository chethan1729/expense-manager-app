import { useState, useCallback } from "react";
import { Preferences } from "@capacitor/preferences";
import { useLLM } from "@/hooks/useLLM";
import { useSupabaseSnapshotSync } from "@/lib/expenseManagerSupabase";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface FinancialContext {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  fundSummaries: Array<{
    name: string;
    allocated: number;
    spent: number;
    remaining: number;
    currentBalance?: number;
  }>;
  totalInvested: number;
  totalPropertyValue: number;
  totalFD: number;
  totalEPF: number;
  totalMetalsValue: number;
  totalOutstanding: number;
  totalPersonalDebt: number;
  monthlyRemaining: number;
  cumulativeTrackingBalance: number;
  floatingAmount: number;
  goals: Array<{
    name: string;
    targetAmount: number;
    funded: number;
    targetDate: string;
  }>;
}

// Query type detection for better context
type QueryType = "spending-analysis" | "budget-planning" | "goal-tracking" | "investment-advice" | "debt-management" | "general" | "net-worth";

function detectQueryType(text: string): QueryType {
  const lowerText = text.toLowerCase();
  if (lowerText.match(/\b(spending|expense|spent|daily|monthly|category|fund|breakdown|parse)\b/i)) return "spending-analysis";
  if (lowerText.match(/\b(budget|allocate|plan|how|much|should|recommend)\b/i)) return "budget-planning";
  if (lowerText.match(/\b(goal|target|progress|achieve|when|timeline|milestone)\b/i)) return "goal-tracking";
  if (lowerText.match(/\b(invest|return|portfolio|stock|real estate|precious|metal)\b/i)) return "investment-advice";
  if (lowerText.match(/\b(debt|loan|outstanding|emi|interest|payoff)\b/i)) return "debt-management";
  if (lowerText.match(/\b(net worth|total|wealth|assets|liabilities)\b/i)) return "net-worth";
  return "general";
}

const CHAT_HISTORY_KEY = "finance-assistant-chat-history";
const MAX_HISTORY = 50;

// Enhanced system prompt with financial analysis framework
const SYSTEM_PROMPT = `You are a Financial Data Analyst. STRICT RULES - FOLLOW THESE EXACTLY:

1. **ONLY USE PROVIDED DATA**: Extract exact values from the financial snapshot. NEVER invent or calculate new values.
2. **NO FORMULAS**: Do NOT show mathematical formulas, equations, or hypothetical calculations.
3. **NO GENERIC ADVICE**: Do NOT explain general financial concepts. Only analyze the user's actual data.
4. **DIRECT ANSWERS**: Get straight to the point. Start with the answer, not explanations.
5. **CITE SOURCE**: Reference which data section each value comes from.
6. **CURRENCY**: Always use ₹ for amounts.
7. **NO CODE**: Never show Python code, API references, or technical jargon.
8. **SPECIFIC NAMES**: Use exact fund names from the provided data (e.g., "Daily Expenses Fund", not "spending").
9. **QUANTIFY EVERYTHING**: Show exact ₹ amounts, not percentages only.
10. **STOP AT PERIOD**: End response when done. No "let me know if you need more info" or follow-up questions.

RESPONSE FORMAT:
- First line: Direct answer to the question
- Next lines: Breakdown with exact values and fund names
- Last lines: One specific recommendation if applicable
- Total: 3-8 sentences maximum`;

export function useChat(financialContext: FinancialContext) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { generate, initializeModel, modelLoading, isModelReady } = useLLM();

  useSupabaseSnapshotSync(messages, true);

  // Load chat history
  const loadHistory = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: CHAT_HISTORY_KEY });
      if (value) {
        setMessages(JSON.parse(value));
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
    }
  }, []);

  // Save chat history
  const saveHistory = useCallback(async (msgs: ChatMessage[]) => {
    try {
      const trimmed = msgs.slice(-MAX_HISTORY);
      await Preferences.set({ key: CHAT_HISTORY_KEY, value: JSON.stringify(trimmed) });
    } catch (e) {
      console.error("Error saving chat history:", e);
    }
  }, []);

  // Helper: Format currency
  const formatCurrency = (value: number): string => {
    return `₹${Math.ceil(value).toLocaleString("en-IN")}`;
  };

  // Helper: Calculate metrics
  const calculateMetrics = () => {
    const netWorth = 
      financialContext.totalPropertyValue + 
      financialContext.totalInvested + 
      financialContext.totalMetalsValue + 
      financialContext.totalFD + 
      financialContext.totalEPF + 
      financialContext.cumulativeTrackingBalance + 
      financialContext.monthlyRemaining + 
      financialContext.floatingAmount - 
      financialContext.totalPersonalDebt;

    const netWorthWithLoans = netWorth - financialContext.totalOutstanding;
    const spendingPercentage = financialContext.totalBudget > 0 
      ? Math.round((Math.abs(financialContext.totalSpent) / financialContext.totalBudget) * 100)
      : 0;
    const savingsRate = 100 - spendingPercentage;

    return { netWorth, netWorthWithLoans, spendingPercentage, savingsRate };
  };

  // Helper: Get fund analysis
  const getFundAnalysis = (): string => {
    const fundDetails = financialContext.fundSummaries
      .map((f) => {
        const utilization = f.allocated > 0 ? Math.round((Math.abs(f.spent) / f.allocated) * 100) : 0;
        return `• ${f.name}: Spent ${formatCurrency(Math.abs(f.spent))} of ${formatCurrency(f.allocated)} (${utilization}% used, ${formatCurrency(f.remaining)} left)`;
      })
      .join("\n");
    return fundDetails;
  };

  // Helper: Get goals analysis
  const getGoalsAnalysis = (): string => {
    if (financialContext.goals.length === 0) return "No active goals set.";
    
    const goalsDetail = financialContext.goals
      .map((g) => {
        const funded = (g.funded / g.targetAmount) * 100;
        const remaining = g.targetAmount - g.funded;
        return `• ${g.name}: ${Math.round(funded)}% complete (${formatCurrency(g.funded)}/${formatCurrency(g.targetAmount)}, Need ${formatCurrency(remaining)} by ${g.targetDate})`;
      })
      .join("\n");
    return goalsDetail;
  };

  // Helper: Get enriched context based on query type
  const getEnrichedContext = (userText: string, queryType: QueryType): string => {
    const metrics = calculateMetrics();
    
    // Build spending-focused context
    let fundBreakdown = getFundAnalysis();
    if (!fundBreakdown || fundBreakdown.trim() === "") {
      fundBreakdown = "No fund data available yet";
    }

    // Create structured context with clear sections and exact values only
    let contextData = `=== YOUR REAL FINANCIAL DATA ===

CURRENT_NET_WORTH: ${formatCurrency(metrics.netWorth)}
TOTAL_ASSETS: ${formatCurrency(financialContext.totalPropertyValue + financialContext.totalInvested + financialContext.totalFD + financialContext.totalEPF + financialContext.totalMetalsValue + financialContext.cumulativeTrackingBalance + financialContext.monthlyRemaining + financialContext.floatingAmount)}
TOTAL_DEBTS: ${formatCurrency(financialContext.totalPersonalDebt + financialContext.totalOutstanding)}

ASSETS_BREAKDOWN:
- Property: ${formatCurrency(financialContext.totalPropertyValue)}
- Investments: ${formatCurrency(financialContext.totalInvested)}
- Fixed Deposits: ${formatCurrency(financialContext.totalFD)}
- EPF/PPF: ${formatCurrency(financialContext.totalEPF)}
- Precious Metals: ${formatCurrency(financialContext.totalMetalsValue)}
- Cash/Liquid: ${formatCurrency(financialContext.cumulativeTrackingBalance + financialContext.monthlyRemaining + financialContext.floatingAmount)}

DEBTS_BREAKDOWN:
- Personal Debt: ${formatCurrency(financialContext.totalPersonalDebt)}
- Outstanding Loans: ${formatCurrency(financialContext.totalOutstanding)}

THIS_MONTH:
- Budget: ${formatCurrency(financialContext.totalBudget)}
- Spent: ${formatCurrency(Math.abs(financialContext.totalSpent))}
- Remaining: ${formatCurrency(financialContext.monthlyRemaining)}
- Spending Percentage: ${metrics.spendingPercentage}%

FUNDS_SPENDING:
${fundBreakdown}

GOALS:
${getGoalsAnalysis()}

=== YOUR QUESTION TYPE ===`;

    // Add query-specific directives
    if (queryType === "spending-analysis") {
      contextData += `
ANALYZE: How much was spent this month and which funds exceeded budget.
USE: Budget, Spent, Remaining values above. Use fund names exactly as shown.
ANSWER: List each fund's spending status with exact ₹ amounts.`;
    } else if (queryType === "budget-planning") {
      contextData += `
ANALYZE: Which funds should be adjusted for better budget balance.
USE: Compare allocated vs spent for each fund above.
ANSWER: Recommend specific fund adjustments with exact ₹ amounts.`;
    } else if (queryType === "goal-tracking") {
      contextData += `
ANALYZE: Progress toward each goal and if savings rate is sufficient.
USE: Goal progress and Savings Rate (${metrics.savingsRate}%) from above.
ANSWER: Show completion % and months needed for each goal.`;
    } else if (queryType === "investment-advice") {
      contextData += `
ANALYZE: Current investment portfolio composition and asset allocation.
USE: Assets breakdown section above.
ANSWER: Show current ₹ amounts for each asset type and diversification status.`;
    } else if (queryType === "debt-management") {
      contextData += `
ANALYZE: Debt payoff strategy and timeline.
USE: Debts breakdown and monthly remaining (${formatCurrency(financialContext.monthlyRemaining)}) above.
ANSWER: Show which debts exist, total, and estimated payoff timeline.`;
    } else if (queryType === "net-worth") {
      contextData += `
ANALYZE: Breakdown of net worth calculation.
USE: Assets breakdown, Debts breakdown, and Net Worth above.
ANSWER: Show calculation: Total Assets (${formatCurrency(financialContext.totalPropertyValue + financialContext.totalInvested + financialContext.totalFD + financialContext.totalEPF + financialContext.totalMetalsValue + financialContext.cumulativeTrackingBalance + financialContext.monthlyRemaining + financialContext.floatingAmount)}) - Total Debts (${formatCurrency(financialContext.totalPersonalDebt + financialContext.totalOutstanding)}) = Net Worth (${formatCurrency(metrics.netWorth)}).`;
    } else {
      contextData += `
ANALYZE: The user's question about their finances.
USE: Relevant data sections above.
ANSWER: Be direct and use exact values from the data provided.`;
    }

    return contextData;
  };

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isGenerating) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userText.trim(),
        timestamp: Date.now(),
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setIsGenerating(true);

      try {
        // Initialize model if not already initialized
        if (!isModelReady) {
          await initializeModel();
        }

        // Detect query type and enrich context
        const queryType = detectQueryType(userText);
        const enrichedContext = getEnrichedContext(userText, queryType);
        const metrics = calculateMetrics();

        // Format history for context using ChatML
        const historyContext = messages.slice(-3).map(m => 
          `<|im_start|>${m.role}\n${m.content}<|im_end|>`
        ).join('\n');

        // Qwen 1.5 Chat format with strict system prompt and context
        const fullPrompt = `<|im_start|>system
${SYSTEM_PROMPT}
<|im_end|>
${enrichedContext}
${historyContext}
<|im_start|>user
${userText}
<|im_end|>
<|im_start|>assistant
`;

        // Use lower temperature for highly accurate, data-driven responses
        const response = await generate(fullPrompt, {
          max_new_tokens: 300,
          temperature: 0.2, // Lower: prioritizes accuracy over diversity
        });

        // Aggressive cleanup - remove everything except the core response
        let cleanResponse = response.trim();
        
        // Remove all model-generated tags and markers
        const cutoffPatterns = [
          "<|im_end|>", "<|im_start|>", "</s>", 
          "<|user|>", "<|system|>", "<|assistant|>",
          "User:", "Assistant:", "System:", 
          "ANALYZE:", "USE:", "ANSWER:", "TASK:",
          "If you", "Let me", "Please", "Note that",
          "For example", "Here is", "This would",
          "You can", "Simply", "Just ",
          "===", "---", "***"
        ];
        
        for (const pattern of cutoffPatterns) {
          const idx = cleanResponse.indexOf(pattern);
          if (idx !== -1 && idx < 50) { // Only cut if pattern is at start
            cleanResponse = cleanResponse.substring(0, idx);
            break;
          }
        }

        // Remove placeholder and formula patterns
        cleanResponse = cleanResponse
          .replace(/\$[A-Za-z]\s*[\(\$%x\*=]+[\s\S]*?(?=[\n\r]|$)/g, "") // Remove formula lines
          .replace(/[A-Z]\s*represents\s+[^\n]*/gi, "") // Remove "X represents..." patterns
          .replace(/Where\s+[A-Z][\s\S]*?(?=\n\n|$)/gi, "") // Remove "Where X = " explanations
          .replace(/Note\s+that[\s\S]*?(?=\n\n|$)/gi, "") // Remove "Note that" sections
          .trim();

        // If response is too short or empty, it likely failed
        if (!cleanResponse || cleanResponse.length < 20) {
          const metrics = calculateMetrics();
          cleanResponse = `Your net worth is ${formatCurrency(metrics.netWorth)}, comprising total assets of ${formatCurrency(financialContext.totalPropertyValue + financialContext.totalInvested + financialContext.totalFD + financialContext.totalEPF + financialContext.totalMetalsValue + financialContext.cumulativeTrackingBalance + financialContext.monthlyRemaining + financialContext.floatingAmount)} minus total debts of ${formatCurrency(financialContext.totalPersonalDebt + financialContext.totalOutstanding)}.`;
        }

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: cleanResponse.trim(),
          timestamp: Date.now(),
        };

        const finalMessages = [...updatedMessages, assistantMsg];
        setMessages(finalMessages);
        await saveHistory(finalMessages);
      } catch (error: any) {
        console.error("Chat generation error:", error);
        
        let errorMessage = `AI Error: ${error?.message || String(error)}. Try refreshing the page.`;
        if (error?.message?.includes("OrtRun") || String(error).includes("OrtRun")) {
          errorMessage = "Sorry, my brain ran out of memory! Try closing other apps or refreshing the page.";
        }

        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: errorMessage,
          timestamp: Date.now(),
        };
        const finalMessages = [...updatedMessages, errorMsg];
        setMessages(finalMessages);
        await saveHistory(finalMessages);
      } finally {
        setIsGenerating(false);
      }
    },
    [messages, isGenerating, financialContext, generate, saveHistory]
  );

  const clearHistory = useCallback(async () => {
    setMessages([]);
    await Preferences.remove({ key: CHAT_HISTORY_KEY });
  }, []);

  return {
    messages,
    sendMessage,
    clearHistory,
    isGenerating,
    modelLoading,
    isModelReady,
    initializeModel,
    loadHistory,
  };
}
