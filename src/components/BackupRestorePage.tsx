import { useState, useEffect, useRef } from "react";
import { useBackupRestore } from "@/hooks/useBackupRestore";
import { getExpenseManagerViewToken, isExpenseManagerSyncConfigured, syncExpenseManagerSnapshot } from "@/lib/expenseManagerSupabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, ShieldCheck, AlertTriangle, Share2, History, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Share } from "@capacitor/share";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackupData {
  version: string;
  timestamp: string;
  preferences: Record<string, unknown>;
  localStorage: Record<string, unknown>;
}

export function BackupRestorePage() {
  const { exportData, importData, getLastBackupTime } = useBackupRestore();
  const { toast } = useToast();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [syncToken, setSyncToken] = useState("");
  const [isSyncingWebsiteSnapshot, setIsSyncingWebsiteSnapshot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchLastBackup = async () => {
      const time = await getLastBackupTime();
      setLastBackup(time);
    };
    fetchLastBackup();
  }, [getLastBackupTime]);

  useEffect(() => {
    if (!isExpenseManagerSyncConfigured) return;
    getExpenseManagerViewToken().then(setSyncToken).catch((error) => {
      console.error("Could not load website sync token:", error);
    });
  }, []);

  const handleCopySyncToken = async () => {
    try {
      await navigator.clipboard.writeText(syncToken);
      toast({ title: "Website access code copied", description: "Enter this code in the read-only Vercel dashboard." });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the access code manually.", variant: "destructive" });
    }
  };

  const handleSyncWebsiteSnapshot = async () => {
    setIsSyncingWebsiteSnapshot(true);
    try {
      await syncExpenseManagerSnapshot();
      toast({ title: "Website snapshot synced", description: "Refresh the Vercel dashboard to see the latest data." });
    } catch (error) {
      console.error("Website snapshot sync failed:", error);
      toast({ title: "Sync failed", description: "Check Supabase setup and apply the latest snapshot migration.", variant: "destructive" });
    } finally {
      setIsSyncingWebsiteSnapshot(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const fileName = `finance_backup_${new Date().toISOString().split("T")[0]}.json`;

      // Use Capacitor Share for a truly native experience on mobile
      try {
        // Step 1: Write the file to the device storage so native sharing can see it
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Step 2: Share the real file URI
        await Share.share({
          title: "Finance Data Backup",
          text: "My Expense Manager data backup",
          files: [result.uri],
          dialogTitle: "Share Backup File",
        });
      } catch (shareErr) {
        console.error("Native share failed:", shareErr);
        // Fallback for systems where Share.share might fail
        if (navigator.share) {
          await navigator.share({
            title: "Finance Data Backup",
            text: "My Expense Manager data backup",
            url: url,
          });
        } else {
          // Fallback to traditional download
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      toast({
        title: "Backup Created Successfully",
        description: "Please save this file in a safe place (like Google Drive).",
      });
      
      const time = await getLastBackupTime();
      setLastBackup(time);
    } catch (error) {
      toast({
        title: "Backup Failed",
        description: "There was an error creating your backup.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const data = await exportData();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast({
        title: "Copied to Clipboard",
        description: "You can now paste the backup data into an email or note.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy data to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("File selected:", file.name, file.size, file.type);
    setIsImporting(true);
    
    try {
      const reader = new FileReader();
      
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          title: "File Read Error",
          description: "Could not read the file from your storage.",
          variant: "destructive",
        });
        setIsImporting(false);
      };

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) throw new Error("File is empty");
          
          console.log("File content read successfully, parsing...");
          const json = JSON.parse(content);
          
          if (!json.timestamp) {
            throw new Error("Invalid backup: Missing creation date");
          }

          setPendingBackup(json);
          setShowVerifyDialog(true);
          
          // Reset input so the same file can be picked again if needed
          if (event.target) event.target.value = '';
          setIsImporting(false);
        } catch (error: unknown) {
          const err = error as Error;
          console.error("Parse/Import error:", err);
          toast({
            title: "Import Failed",
            description: `Invalid file: ${err.message || "Unknown error"}`,
            variant: "destructive",
          });
          setIsImporting(false);
        }
      };
      
      reader.readAsText(file);
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Import processing error:", err);
      toast({
        title: "Import Failed",
        description: `Error: ${err.message || "Could not process file"}`,
        variant: "destructive",
      });
      setIsImporting(false);
    }
  };

  const triggerFilePicker = () => {
    console.log("Triggering file picker...");
    fileInputRef.current?.click();
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    
    setIsImporting(true);
    try {
      await importData(pendingBackup);
      toast({
        title: "Data Restored Successfully",
        description: "App will now reload to apply changes.",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: unknown) {
      const err = error as Error;
      toast({
        title: "Restoration Failed",
        description: err.message || "Could not apply backup data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setShowVerifyDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Data Security
        </h2>
        <p className="text-sm text-muted-foreground">
          Keep your financial records safe. Export your data as a backup file that you can restore anytime.
        </p>
      </div>

      <Card className="border-blue-100 dark:border-blue-900/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Read-only website access</CardTitle>
          <CardDescription className="text-xs">
            Use this private code to view your synced finances on the Vercel dashboard. Anyone with the code can view this financial snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isExpenseManagerSyncConfigured ? (
            <>
              <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs break-all select-all">
                {syncToken || "Preparing secure access code…"}
              </div>
              <Button onClick={handleCopySyncToken} disabled={!syncToken} variant="outline" className="w-full gap-2">
                <Copy className="h-4 w-4" /> Copy website access code
              </Button>
              <Button onClick={handleSyncWebsiteSnapshot} disabled={isSyncingWebsiteSnapshot} className="w-full gap-2">
                {isSyncingWebsiteSnapshot ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Share2 className="h-4 w-4" />}
                {isSyncingWebsiteSnapshot ? "Syncing…" : "Sync now"}
              </Button>
              <p className="text-[10px] text-muted-foreground">Data syncs automatically when app data changes. Use Sync now to publish the current snapshot immediately.</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Supabase sync is not configured in this build. Configure the Supabase URL and anon key, then rebuild the app.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden shadow-sm">
        <CardHeader className="bg-emerald-50/50 dark:bg-emerald-900/10 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Backup Progress</CardTitle>
              <CardDescription className="text-xs">
                {lastBackup 
                  ? `Last backup on ${new Date(lastBackup).toLocaleString()}` 
                  : "No backup recorded yet"}
              </CardDescription>
            </div>
            <History className="h-5 w-5 text-emerald-500/50" />
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleExport} 
              disabled={isExporting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isExporting ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {isExporting ? "Generating..." : "Backup to File / Share"}
            </Button>

            <Button 
              onClick={handleCopyToClipboard}
              variant="outline"
              className="w-full h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Copy className="h-4 w-4" /> Copy JSON to Clipboard
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Tip: Save your backup to <b>Google Drive</b> or <b>Email</b> to keep it safe from device loss.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2 px-1">
          <Upload className="h-4 w-4 text-primary" />
          Restore Options
        </h3>
        
        <Card className="border-indigo-100 dark:border-indigo-900/30 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Restore from File</p>
              <p className="text-[11px] text-muted-foreground">Upload a .json backup file</p>
            </div>
            
            <Button 
              onClick={triggerFilePicker} 
              size="sm" 
              variant="outline" 
              className="h-9 gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <Download className="h-4 w-4" /> Import
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">Important Note</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-500/80 leading-relaxed">
            Since this app stores data only on your device, you MUST manually backup before uninstalling or switching devices. All data is erased when the app is removed.
          </p>
        </div>
      </div>
      
      {/* Verification Dialog - Shows AFTER file is selected */}
      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Verify Backup Details
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Backup Creation Date</p>
                <p className="text-sm font-medium text-foreground">
                  {pendingBackup?.timestamp ? new Date(pendingBackup.timestamp).toLocaleString(undefined, {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  }) : 'Unknown Date'}
                </p>
              </div>
              <p className="text-xs text-destructive font-medium flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Warning: Confirming this will permanently overwrite all your current app data with the contents of this backup.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleConfirmRestore();
              }} 
              disabled={isImporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isImporting ? "Restoring..." : "Yes, Restore Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        className="hidden"
        id="restore-file-input-hidden"
      />
    </div>
  );
}
