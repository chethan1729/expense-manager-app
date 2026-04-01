import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import type { Expense } from "@/hooks/useExpenses";

interface UploadExcelDialogProps {
  onImport: (expenses: Omit<Expense, "id">[]) => void;
}

export function UploadExcelDialog({ onImport }: UploadExcelDialogProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Omit<Expense, "id">[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    setError("");
    setPreview([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        // Find April sheet
        const sheetName = wb.SheetNames.find(
          (n) => n.toLowerCase().includes("april")
        ) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Parse J10:N25 range — description in J, estimated in L, spent in M
        const expenses: Omit<Expense, "id">[] = [];
        for (let row = 12; row <= 24; row++) {
          const desc = ws[`J${row}`]?.v;
          if (!desc || typeof desc !== "string" || !desc.trim()) continue;
          const estimated = parseFloat(ws[`L${row}`]?.v) || 0;
          const spent = parseFloat(ws[`M${row}`]?.v) || 0;
          expenses.push({ description: desc.trim(), estimated, spent });
        }

        if (expenses.length === 0) {
          setError("No expenses found in the expected range (J12:N24). Make sure the file matches the expected format.");
          return;
        }
        setPreview(expenses);
      } catch {
        setError("Failed to parse the Excel file. Please upload a valid .xlsx file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    onImport(preview);
    setPreview([]);
    setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPreview([]); setError(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Import from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your <strong>Expenses-Chethan-2026</strong> Excel file. The app will read expenses from the <strong>April - 2026</strong> tab (J12:N24).
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20 cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
            }}
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Preview ({preview.length} expenses)
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium">Description</th>
                      <th className="text-right p-2 font-medium">Estimated</th>
                      <th className="text-right p-2 font-medium">Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((exp, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{exp.description}</td>
                        <td className="p-2 text-right">₹{exp.estimated.toLocaleString()}</td>
                        <td className="p-2 text-right">₹{exp.spent.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                This will replace all current expenses with the imported data.
              </p>
              <Button onClick={handleImport} className="w-full">
                Import {preview.length} Expenses
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
