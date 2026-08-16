import { useState } from "react";
import { Download, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDataExport } from "@/hooks/useDataExport";
import { FinancialContext } from "@/hooks/useChat";

interface DataExportDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  financialContext?: FinancialContext;
}

export function DataExportDialog({ open = false, onOpenChange, financialContext }: DataExportDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  const { 
    downloadTrainingJSONL, 
    downloadTrainingDataset,
    downloadTransactionsCSV,
    getDatasetPreview 
  } = useDataExport();

  const handleDownload = async (
    downloadFn: () => Promise<void>,
    format: string
  ) => {
    setIsLoading(true);
    setExportStatus("idle");
    try {
      await downloadFn();
      setExportStatus("success");
      setStatusMessage(`✅ ${format} exported successfully! Check your downloads folder.`);
      setTimeout(() => setExportStatus("idle"), 3000);
    } catch (error) {
      setExportStatus("error");
      setStatusMessage(`❌ Failed to export ${format}: ${(error as Error).message}`);
      setTimeout(() => setExportStatus("idle"), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      const dataset = await getDatasetPreview();
      console.log("Dataset Preview:", dataset);
      
      const message = `
📊 Your Finance AI Training Data:
• Total Transactions: ${dataset.metadata.totalTransactions}
• Date Range: ${dataset.metadata.dateRange.start} to ${dataset.metadata.dateRange.end}
• Funds Tracked: ${dataset.metadata.fundNames.join(", ")}
• Financial Snapshots: ${dataset.snapshots.length} months
• Generated Q&A Pairs: ${dataset.snapshots.length * 2 + dataset.metadata.fundNames.length}

This data can be used to fine-tune the Finance AI model for better accuracy.
See FINANCE_AI_FINETUNING_GUIDE.md for instructions.
      `;
      
      setStatusMessage(message);
      setExportStatus("success");
    } catch (error) {
      setExportStatus("error");
      setStatusMessage(`❌ Failed to preview data: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Modal Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          {/* Modal Content */}
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-background">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background">
              <h2 className="font-heading font-bold text-foreground">Export Training Data</h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => onOpenChange?.(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">📊 Finance AI Model Training</h3>
        <p className="text-sm text-blue-800 mb-3">
          Export your financial data to fine-tune the Finance AI model for better accuracy.
          Your data is exported locally only - nothing is sent to any server.
        </p>
      </Card>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">Export Options</h4>
          <div className="space-y-2">
            {/* Training JSONL */}
            <Button
              onClick={() => handleDownload(downloadTrainingJSONL, "Training JSONL")}
              disabled={isLoading}
              className="w-full justify-start"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="flex-1 text-left">
                <span className="font-medium">Training JSONL</span>
                <span className="text-xs text-muted-foreground ml-1">(Recommended for fine-tuning)</span>
              </span>
            </Button>

            {/* Full Dataset JSON */}
            <Button
              onClick={() => handleDownload(downloadTrainingDataset, "Full Dataset JSON")}
              disabled={isLoading}
              className="w-full justify-start"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="flex-1 text-left">
                <span className="font-medium">Full Dataset JSON</span>
                <span className="text-xs text-muted-foreground ml-1">(Complete financial snapshot)</span>
              </span>
            </Button>

            {/* Transactions CSV */}
            <Button
              onClick={() => handleDownload(downloadTransactionsCSV, "Transactions CSV")}
              disabled={isLoading}
              className="w-full justify-start"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              <span className="flex-1 text-left">
                <span className="font-medium">Transactions CSV</span>
                <span className="text-xs text-muted-foreground ml-1">(For analysis in Excel)</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Preview Button */}
        <div>
          <Button
            onClick={handlePreview}
            disabled={isLoading}
            className="w-full"
            variant="secondary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Preview Your Data
          </Button>
        </div>
      </div>

      {/* Status Message */}
      {exportStatus !== "idle" && (
        <Card className={`p-3 border-l-4 ${
          exportStatus === "success" 
            ? "bg-green-50 border-green-500" 
            : "bg-red-50 border-red-500"
        }`}>
          <div className="flex gap-2">
            {exportStatus === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="text-sm whitespace-pre-wrap">
              {statusMessage}
            </div>
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-3 bg-gray-50 border-gray-200">
        <h4 className="font-semibold text-sm mb-2">Next Steps</h4>
        <ol className="text-xs space-y-1 text-gray-700">
          <li>1. Download the Training JSONL file</li>
          <li>2. Follow the guide in <code className="bg-white px-1 rounded">FINANCE_AI_FINETUNING_GUIDE.md</code></li>
          <li>3. Run the fine-tuning script (Python required)</li>
          <li>4. Convert model to ONNX format</li>
          <li>5. Update your app with the fine-tuned model</li>
        </ol>
      </Card>

      {/* Model Information */}
      <Card className="p-3 bg-indigo-50 border-indigo-200">
        <h4 className="font-semibold text-sm text-indigo-900 mb-1">Current Model</h4>
        <p className="text-xs text-indigo-800">
          <strong>Xenova/Qwen1.5-0.5B-Chat</strong>
          <br />
          ~240MB (quantized, mobile-friendly). Fine-tune to reach 95%+ accuracy.
        </p>
      </Card>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
