import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Smartphone,
  CreditCard,
  Zap,
  DollarSign,
  Calendar,
} from "lucide-react";
import { SMSTransaction } from "@/hooks/useAutomatedTransactions";

interface AutomatedTransactionsPageProps {
  pendingTransactions: SMSTransaction[];
  processedTransactions: SMSTransaction[];
  onApprove: (
    id: string,
    fundId: string,
    expenseId: string,
    paymentMode?: "upi" | "credit-card" | "net-banking" | "cash"
  ) => void;
  onReject: (id: string) => void;
  onRefresh: (filters?: {
    type: "recent" | "date" | "on-after" | "between";
    startDate?: string;
    endDate?: string;
  }) => void;
  loading: boolean;
  modelLoading?: boolean;
  sections: Array<{
    id: string;
    name: string;
    expenses: Array<{
      id: string;
      description: string;
    }>;
  }>;
}

const getTransactionTypeIcon = (type: string) => {
  switch (type) {
    case "upi":
      return <Smartphone className="h-5 w-5 text-blue-500" />;
    case "credit-card":
      return <CreditCard className="h-5 w-5 text-orange-500" />;
    case "net-banking":
      return <DollarSign className="h-5 w-5 text-green-500" />;
    default:
      return <Zap className="h-5 w-5 text-gray-500" />;
  }
};

const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case "upi":
      return "UPI Transfer";
    case "credit-card":
      return "Credit Card";
    case "net-banking":
      return "Net Banking";
    default:
      return "Unknown";
  }
};

const getPaymentModeLabel = (type: string) => {
  const typeMap: Record<string, "upi" | "credit-card" | "net-banking" | "cash"> = {
    "upi": "upi",
    "credit-card": "credit-card",
    "net-banking": "net-banking",
    "cash": "cash",
  };
  return typeMap[type] || "upi";
};

const TransactionApprovalCard = ({
  transaction,
  sections,
  onApprove,
  onReject,
}: {
  transaction: SMSTransaction;
  sections: AutomatedTransactionsPageProps["sections"];
  onApprove: (
    id: string,
    fundId: string,
    expenseId: string,
    paymentMode?: "upi" | "credit-card" | "net-banking" | "cash"
  ) => void;
  onReject: (id: string) => void;
}) => {
  const [selectedFund, setSelectedFund] = useState(
    transaction.categorization?.fundId || "daily-expenses"
  );
  const [selectedExpense, setSelectedExpense] = useState(
    transaction.categorization?.expenseId || ""
  );
  const [paymentMode, setPaymentMode] = useState(
    getPaymentModeLabel(transaction.type)
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedFundData = sections.find((f) => f.id === selectedFund);
  if (!selectedExpense && selectedFundData?.expenses.length) {
    setSelectedExpense(selectedFundData.expenses[0].id);
  }

  const handleApprove = () => {
    if (selectedFund && selectedExpense) {
      onApprove(
        transaction.id,
        selectedFund,
        selectedExpense,
        paymentMode as "upi" | "credit-card" | "net-banking" | "cash"
      );
    }
  };

  return (
    <Card className="p-4 space-y-4 border-l-4 border-l-amber-500">
      {/* Transaction Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          {getTransactionTypeIcon(transaction.type)}
          <div className="flex-1 min-w-0 pr-2 overflow-hidden">
            <div className="flex flex-col gap-1 mb-1">
              <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="cursor-pointer group relative"
              >
                <p className={`text-sm font-medium text-foreground break-words leading-tight ${!isExpanded ? 'line-clamp-2' : ''}`}>
                  {transaction.messageText}
                </p>
                {transaction.messageText.length > 60 && (
                  <span className="text-[10px] text-primary font-bold mt-0.5 inline-block">
                    {isExpanded ? "Show Less" : "Show Full Message..."}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {transaction.categorization?.aiCategorized && (
                  <Badge className="text-[10px] h-4 bg-purple-600 hover:bg-purple-700 whitespace-nowrap px-1">
                    🤖 AI
                  </Badge>
                )}
                {transaction.alreadyApproved && (
                  <Badge variant="outline" className="text-[10px] h-4 border-green-600 text-green-600 whitespace-nowrap px-1">
                    ✓ Already Approved
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {new Date(transaction.date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-amber-600">₹{transaction.amount.toLocaleString("en-IN")}</p>
          <Badge variant="outline" className="text-xs mt-1">
            {getTransactionTypeLabel(transaction.type)}
          </Badge>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold">₹{transaction.amount.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-semibold">{getTransactionTypeLabel(transaction.type)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-semibold">{transaction.date}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="font-semibold">
              {Math.round((transaction.categorization?.confidence || 0.5) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* Categorization */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Categorize Transaction</h3>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Fund</label>
          <Select value={selectedFund} onValueChange={setSelectedFund}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sections.map((fund) => (
                <SelectItem key={fund.id} value={fund.id}>
                  {fund.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Expense Category</label>
          <Select
            value={selectedExpense}
            onValueChange={setSelectedExpense}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectedFundData?.expenses.map((expense) => (
                <SelectItem key={expense.id} value={expense.id}>
                  {expense.description}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Payment Mode</label>
          <Select value={paymentMode} onValueChange={setPaymentMode}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="credit-card">Credit Card</SelectItem>
              <SelectItem value="net-banking">Net Banking</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleApprove}
          disabled={transaction.alreadyApproved}
          className={`flex-1 ${transaction.alreadyApproved ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"} text-white`}
          size="sm"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {transaction.alreadyApproved ? "Approved" : "Approve"}
        </Button>
        <Button
          onClick={() => onReject(transaction.id)}
          variant="outline"
          className="flex-1"
          size="sm"
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    </Card>
  );
};

const ProcessedTransactionCard = ({ 
  transaction, 
  sections 
}: { 
  transaction: SMSTransaction; 
  sections: AutomatedTransactionsPageProps["sections"] 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="p-4 border-l-4 border-l-green-500">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="mt-1 shrink-0">
            {getTransactionTypeIcon(transaction.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div 
              onClick={() => setIsExpanded(!isExpanded)}
              className="cursor-pointer"
            >
              <p className={`text-sm font-medium text-foreground break-words leading-tight ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {transaction.messageText}
              </p>
              {transaction.messageText.length > 60 && (
                <span className="text-[10px] text-primary font-bold mt-0.5 inline-block">
                  {isExpanded ? "Show Less" : "Show Full Message..."}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {sections
                .find((f) => f.id === transaction.categorization?.fundId)
                ?.expenses.find(
                  (e) => e.id === transaction.categorization?.expenseId
                )?.description || "Uncategorized"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(transaction.date).toLocaleDateString("en-IN")}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-green-600">
            ₹{transaction.amount.toLocaleString("en-IN")}
          </p>
          <Badge variant="default" className="text-[10px] h-5 px-1.5 mt-1 bg-green-600 whitespace-nowrap">
            Approved
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export const AutomatedTransactionsPage = ({
  pendingTransactions,
  processedTransactions,
  onApprove,
  onReject,
  onRefresh,
  loading,
  modelLoading,
  sections,
}: AutomatedTransactionsPageProps) => {
  const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");
  const [scanMode, setScanMode] = useState<"recent" | "date" | "on-after" | "between">("recent");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const handleRefresh = () => {
    onRefresh({
      type: scanMode,
      startDate: scanMode !== "recent" ? startDate : undefined,
      endDate: scanMode === "between" ? endDate : undefined
    });
  };

  return (
    <div className="space-y-4">
      {/* Scan Filters section */}
      <Card className="p-4 bg-muted/30 border-dashed border-2">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Scan SMS Options</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Scan Mode</label>
              <Select value={scanMode} onValueChange={(v: "recent" | "date" | "on-after" | "between") => setScanMode(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent (Since last scan)</SelectItem>
                  <SelectItem value="date">Specific Date</SelectItem>
                  <SelectItem value="on-after">On or After Date</SelectItem>
                  <SelectItem value="between">Date Range (Between)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(scanMode === "date" || scanMode === "on-after" || scanMode === "between") && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  {scanMode === "between" ? "Start Date" : "Select Date"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}

            {scanMode === "between" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}

            <Button
              onClick={handleRefresh}
              disabled={loading || modelLoading}
              className="w-full bg-primary"
            >
              {modelLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Loading AI Model...
                </>
              ) : loading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Scanning SMS...
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {scanMode === "recent" ? "Scan for New Transactions" : "Run Custom Scan"}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Pending ({pendingTransactions.length})
        </button>
        <button
          onClick={() => setActiveTab("processed")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "processed"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Processed ({processedTransactions.length})
        </button>
      </div>

      {/* Pending Transactions */}
      {activeTab === "pending" && (
        <div className="space-y-3 pb-32">
          {pendingTransactions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">No pending transactions</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap "Scan for New Transactions" to check for new SMS messages
              </p>
            </div>
          ) : (
            pendingTransactions.map((transaction) => (
              <TransactionApprovalCard
                key={transaction.id}
                transaction={transaction}
                sections={sections}
                onApprove={onApprove}
                onReject={onReject}
              />
            ))
          )}
        </div>
      )}

      {/* Processed Transactions */}
      {activeTab === "processed" && (
        <div className="space-y-3 pb-32">
          {processedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">No processed transactions yet</p>
            </div>
          ) : (
            processedTransactions.map((transaction) => (
              <ProcessedTransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                sections={sections} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutomatedTransactionsPage;
