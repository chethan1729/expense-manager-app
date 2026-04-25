import { useCallback } from "react";
import { Preferences } from "@capacitor/preferences";

const PREFERENCES_KEYS = [
  "expense-manager-monthly-v1",
  "expense-manager-monthly-budget-v1",
  "automated-transactions-last-sms-timestamp",
  "automated-transactions-pending",
  "automated-transactions-processed",
  "automated-transactions-approved-hashes",
  "automated-transactions-learned-mappings",
  "expense-manager-transactions-v1",
  "expense-manager-properties",
  "expense-manager-deposits-v1",
  "expense-manager-debts",
  "expense-manager-loans",
  "expense-manager-goals",
  "expense-manager-investment-plans",
];

const LOCAL_STORAGE_KEYS = [
  "precious-metals",
  "metal-rates",
  "net-worth-history",
];

const BACKUP_METADATA_KEY = "last-backup-timestamp";

export const useBackupRestore = () => {
  const exportData = useCallback(async () => {
    try {
      const backupData: {
        version: string;
        timestamp: string;
        preferences: Record<string, unknown>;
        localStorage: Record<string, unknown>;
      } = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        preferences: {},
        localStorage: {},
      };

      // Get all Preferences data
      for (const key of PREFERENCES_KEYS) {
        const { value } = await Preferences.get({ key });
        if (value) {
          backupData.preferences[key] = JSON.parse(value);
        }
      }

      // Get all LocalStorage data
      for (const key of LOCAL_STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (value) {
          backupData.localStorage[key] = JSON.parse(value);
        }
      }

      return backupData;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }, []);

  const importData = useCallback(async (jsonData: {
    preferences?: Record<string, unknown>;
    localStorage?: Record<string, unknown>;
  }) => {
    try {
      // Basic validation
      if (!jsonData.preferences && !jsonData.localStorage) {
        throw new Error("Invalid backup file: Missing data sections.");
      }

      // Restore Preferences
      if (jsonData.preferences) {
        for (const [key, value] of Object.entries(jsonData.preferences)) {
          await Preferences.set({
            key,
            value: JSON.stringify(value),
          });
        }
      }

      // Restore LocalStorage
      if (jsonData.localStorage) {
        for (const [key, value] of Object.entries(jsonData.localStorage)) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }

      // Save backup metadata
      await Preferences.set({
        key: BACKUP_METADATA_KEY,
        value: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error("Import failed:", error);
      throw error;
    }
  }, []);

  const getLastBackupTime = useCallback(async () => {
    const { value } = await Preferences.get({ key: BACKUP_METADATA_KEY });
    return value;
  }, []);

  return {
    exportData,
    importData,
    getLastBackupTime,
  };
};
