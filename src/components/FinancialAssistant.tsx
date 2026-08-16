import { useState, useEffect, useRef } from "react";
import { useChat, FinancialContext } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import {
  Send, Trash2, Bot, User, Loader2, Sparkles, BrainCircuit,
  TrendingUp, Wallet, Target, HelpCircle, Download
} from "lucide-react";
import { DataExportDialog } from "@/components/DataExportDialog";

interface FinancialAssistantProps {
  financialContext: FinancialContext;
}

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: "How's my spending this month?", color: "text-emerald-500" },
  { icon: Wallet, text: "Where can I cut expenses?", color: "text-blue-500" },
  { icon: Target, text: "How are my goals progressing?", color: "text-rose-500" },
  { icon: HelpCircle, text: "What's my net worth breakdown?", color: "text-amber-500" },
];

export function FinancialAssistant({ financialContext }: FinancialAssistantProps) {
  const {
    messages, sendMessage, clearHistory, isGenerating,
    modelLoading, isModelReady, initializeModel, loadHistory,
  } = useChat(financialContext);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Load history and pre-warm model on mount
  useEffect(() => {
    loadHistory();
    // Pre-warm the model in the background
    initializeModel();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = () => {
    if (!input.trim() || isGenerating) return;
    sendMessage(input.trim());
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleClear = () => {
    clearHistory();
    setShowClearConfirm(false);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <BrainCircuit className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-foreground">Finance AI</h3>
            <div className="flex items-center gap-1.5">
              {modelLoading ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] text-amber-500 font-medium">Loading model...</span>
                </>
              ) : isModelReady ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-500 font-medium">Qwen 0.5B Ready</span>
                </>
              ) : (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  <span className="text-[10px] text-muted-foreground font-medium">On-Device AI</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500" 
            onClick={() => setShowExportDialog(true)}
            title="Export financial data for fine-tuning"
          >
            <Download className="h-4 w-4" />
          </Button>
          {messages.length > 0 && (
            showClearConfirm ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Clear all?</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive px-2" onClick={handleClear}>
                  Yes
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowClearConfirm(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => setShowClearConfirm(true)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 px-2">
            {/* Welcome */}
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-violet-500" />
              </div>
              <h3 className="font-heading font-bold text-foreground">Your Financial Assistant</h3>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Ask me anything about your finances. I have access to your budget, spending, investments, goals, and more.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="w-full space-y-2">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider text-center">Try asking</p>
              <div className="grid grid-cols-1 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-primary/40 transition-all active:scale-[0.98]"
                  >
                    <div className={`h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 ${prompt.color}`}>
                      <prompt.icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium text-foreground">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/60 text-foreground rounded-bl-md"
              }`}
            >
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex gap-2.5 justify-start">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t pt-3">
        {modelLoading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
            <span className="text-[10px] text-muted-foreground">Loading AI model for first-time use...</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? "Thinking..." : "Ask about your finances..."}
              disabled={isGenerating}
              rows={1}
              className="w-full resize-none rounded-xl border bg-muted/30 px-3.5 py-2.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 max-h-[120px]"
            />
          </div>
          <Button
            size="sm"
            disabled={!input.trim() || isGenerating}
            onClick={handleSend}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 p-0 shadow-lg shadow-violet-500/20"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-2">
          Powered by Qwen 0.5B · Runs 100% on-device · Your data never leaves your phone
        </p>
      </div>

      {/* Export Data Dialog */}
      <DataExportDialog 
        open={showExportDialog} 
        onOpenChange={setShowExportDialog}
        financialContext={financialContext}
      />
    </div>
  );
}
