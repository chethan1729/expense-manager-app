import { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";

interface Allocation {
  goalName: string;
  amount: number;
}

interface SourceAllocationDetailsProps {
  allocations: Allocation[];
  totalAmount: number;
}

export function SourceAllocationDetails({ allocations, totalAmount }: SourceAllocationDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const freeAmount = Math.max(0, totalAmount - totalAllocated);

  if (allocations.length === 0) {
    return (
      <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Goal Allocation</span>
        <span className="font-medium text-emerald-600">₹{totalAmount.toLocaleString('en-IN')} Free</span>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t space-y-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1">
          <Target className="h-2.5 w-2.5" />
          Goal Allocation ({allocations.length})
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-emerald-600">₹{freeAmount.toLocaleString('en-IN')} Free</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-1.5 pl-3 border-l-2 border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
          {allocations.map((a, idx) => (
            <div key={idx} className="flex justify-between items-center text-[10px]">
              <span className="truncate pr-2">{a.goalName}</span>
              <span className="font-bold text-primary shrink-0">₹{a.amount.toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-dashed">
            <span className="font-medium">Total Allocated</span>
            <span className="font-bold">₹{totalAllocated.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
