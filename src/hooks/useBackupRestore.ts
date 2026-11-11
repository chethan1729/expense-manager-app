import { useCallback } from "react";
import { Preferences } from "@capacitor/preferences";

const BACKUP_METADATA_KEY = "last-backup-timestamp";

export const useBackupRestore = () => {
  const exportData = useCallback(async () => {
    try {
      const backupData: {
        version: string;
        timestamp: string;
        preferences: Record<string, string>;
        localStorage: Record<string, string>;
      } = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        preferences: {},
        localStorage: {},
      };

      // Snapshot every stored Preferences key so new features are included automatically.
      const { keys } = await Preferences.keys();
      for (const key of keys) {
        const { value } = await Preferences.get({ key });
        if (value) {
          backupData.preferences[key] = value;
        }
      }

      // Snapshot all app-origin local storage, including future feature stores.
      for (const key of Object.keys(localStorage)) {
        const value = localStorage.getItem(key);
        if (value) {
          backupData.localStorage[key] = value;
        }
      }

      return backupData;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }, []);

  const importData = useCallback(async (jsonData: {
    version?: string;
    preferences?: Record<string, unknown>;
    localStorage?: Record<string, unknown>;
  }) => {
    try {
      // Basic validation
      if (!jsonData.preferences && !jsonData.localStorage) {
        throw new Error("Invalid backup file: Missing data sections.");
      }

      const isRawSnapshot = jsonData.version?.startsWith("2.") ?? false;

      // A v2 backup is a complete snapshot; remove newer keys absent from it.
      if (isRawSnapshot) {
        const { keys } = await Preferences.keys();
        const backupKeys = new Set(Object.keys(jsonData.preferences || {}));
        await Promise.all(keys.filter((key) => !backupKeys.has(key)).map((key) => Preferences.remove({ key })));
        const localKeys = Object.keys(localStorage);
        const backupLocalKeys = new Set(Object.keys(jsonData.localStorage || {}));
        localKeys.filter((key) => !backupLocalKeys.has(key)).forEach((key) => localStorage.removeItem(key));
      }

      // Restore Preferences
      if (jsonData.preferences) {
        for (const [key, value] of Object.entries(jsonData.preferences)) {
          await Preferences.set({
            key,
            value: isRawSnapshot && typeof value === "string" ? value : JSON.stringify(value),
          });
        }
      }

      // Restore LocalStorage
      if (jsonData.localStorage) {
        for (const [key, value] of Object.entries(jsonData.localStorage)) {
          localStorage.setItem(key, isRawSnapshot && typeof value === "string" ? value : JSON.stringify(value));
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
