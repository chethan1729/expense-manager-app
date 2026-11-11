import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Preferences } from "@capacitor/preferences";

export const EXPENSE_SYNC_TOKEN_KEY = "expense-manager-supabase-sync-token";
export const EXPENSE_VIEW_TOKEN_KEY = "expense-manager-supabase-view-token";
const SNAPSHOT_TABLE = "expense_manager_snapshots";
const SNAPSHOT_KEY = "full_snapshot";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isExpenseManagerSyncConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let syncTokenPromise: Promise<string> | null = null;
let viewTokenPromise: Promise<string> | null = null;
let clientIdentity: string | null = null;
let supabaseClient: SupabaseClient | null = null;
let snapshotSyncQueue: Promise<unknown> = Promise.resolve();

async function getOrCreateToken(key: string) {
  const { value } = await Preferences.get({ key });
  if (value) return value;
  const token = `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, "")}`;
  await Preferences.set({ key, value: token });
  return token;
}

export function getOrCreateExpenseSyncToken() {
  if (!syncTokenPromise) {
    syncTokenPromise = getOrCreateToken(EXPENSE_SYNC_TOKEN_KEY).catch((error) => {
      syncTokenPromise = null;
      throw error;
    });
  }
  return syncTokenPromise;
}

export function getOrCreateExpenseViewToken() {
  if (!viewTokenPromise) {
    viewTokenPromise = getOrCreateToken(EXPENSE_VIEW_TOKEN_KEY).catch((error) => {
      viewTokenPromise = null;
      throw error;
    });
  }
  return viewTokenPromise;
}

export function createExpenseViewerClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-expense-view-token": token } },
  });
}

function getAppSyncClient(syncToken: string, viewToken: string) {
  const identity = `${syncToken}:${viewToken}`;
  if (!supabaseClient || clientIdentity !== identity) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-expense-sync-token": syncToken, "x-expense-view-token": viewToken } },
    });
    clientIdentity = identity;
  }
  return supabaseClient;
}

function parseStoredValue(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

async function collectPersistedAppData() {
  const preferences: Record<string, unknown> = {};
  const { keys } = await Preferences.keys();
  await Promise.all(keys.filter((key) => key !== EXPENSE_SYNC_TOKEN_KEY && key !== EXPENSE_VIEW_TOKEN_KEY).map(async (key) => {
    const { value } = await Preferences.get({ key });
    if (value !== null) preferences[key] = parseStoredValue(value);
  }));

  const localStorageData: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key);
    if (value !== null) localStorageData[key] = parseStoredValue(value);
  }

  return { preferences, localStorage: localStorageData };
}

export function syncExpenseManagerSnapshot() {
  if (!isExpenseManagerSyncConfigured) return Promise.resolve({ synced: false, reason: "not-configured" as const });

  const performSync = async () => {
  const [syncToken, viewToken, storedData] = await Promise.all([
    getOrCreateExpenseSyncToken(),
    getOrCreateExpenseViewToken(),
    collectPersistedAppData(),
  ]);
  const { error } = await getAppSyncClient(syncToken, viewToken)
    .from(SNAPSHOT_TABLE)
    .upsert({
      sync_token: syncToken,
      viewer_token: viewToken,
      snapshot_key: SNAPSHOT_KEY,
      payload: { ...storedData, syncedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }, { onConflict: "viewer_token,snapshot_key" });

  if (error) throw error;
  return { synced: true, reason: "synced" as const };
  };

  const nextSync = snapshotSyncQueue.then(performSync, performSync);
  snapshotSyncQueue = nextSync.then(() => undefined, () => undefined);
  return nextSync;
}

export async function getExpenseManagerSyncToken() {
  return getOrCreateExpenseSyncToken();
}

export async function getExpenseManagerViewToken() {
  return getOrCreateExpenseViewToken();
}

export function useSupabaseSnapshotSync(revision: unknown, enabled = true) {
  const [status, setStatus] = useState<"disabled" | "waiting" | "syncing" | "synced" | "error">(
    isExpenseManagerSyncConfigured ? "waiting" : "disabled",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isExpenseManagerSyncConfigured) {
      setStatus("disabled");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setStatus("syncing");
      try {
        const result = await syncExpenseManagerSnapshot();
        if (cancelled) return;
        if (result.synced) {
          setStatus("synced");
          setLastSyncedAt(new Date().toISOString());
        } else {
          setStatus("disabled");
        }
      } catch (error) {
        console.error("Expense Manager Supabase sync failed:", error);
        if (!cancelled) setStatus("error");
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [revision, enabled]);

  return { status, lastSyncedAt, configured: isExpenseManagerSyncConfigured };
}
