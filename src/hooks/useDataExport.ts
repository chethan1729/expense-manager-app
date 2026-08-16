import { useCallback } from "react";
import {
  generateFineTuningDataset,
  exportDatasetAsJson,
  exportTransactionsAsCSV,
  generateTrainingJSONL,
} from "@/utils/dataExtraction";

export const useDataExport = () => {
  /**
   * Download fine-tuning dataset as JSON
   */
  const downloadTrainingDataset = useCallback(async () => {
    try {
      const json = await exportDatasetAsJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-ai-training-dataset-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading dataset:", error);
      throw error;
    }
  }, []);

  /**
   * Download transactions as CSV
   */
  const downloadTransactionsCSV = useCallback(async () => {
    try {
      const csv = await exportTransactionsAsCSV();
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      throw error;
    }
  }, []);

  /**
   * Download training conversations in JSONL format for fine-tuning
   */
  const downloadTrainingJSONL = useCallback(async () => {
    try {
      const jsonl = await generateTrainingJSONL();
      const blob = new Blob([jsonl], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-ai-training-${new Date().toISOString().split("T")[0]}.jsonl`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading JSONL:", error);
      throw error;
    }
  }, []);

  /**
   * Get dataset for preview without download
   */
  const getDatasetPreview = useCallback(async () => {
    try {
      const dataset = await generateFineTuningDataset();
      return dataset;
    } catch (error) {
      console.error("Error getting dataset preview:", error);
      throw error;
    }
  }, []);

  return {
    downloadTrainingDataset,
    downloadTransactionsCSV,
    downloadTrainingJSONL,
    getDatasetPreview,
  };
};
