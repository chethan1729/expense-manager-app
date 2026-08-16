import { useState, useCallback, useRef, useEffect } from "react";

// Singleton worker instance shared across the app
let globalWorker: Worker | null = null;
let globalModelInitialized = false;
let globalModelLoading = false;
let globalResolvers: Record<string, { resolve: Function; reject: Function }> = {};

export function useLLM() {
  const [modelLoading, setModelLoading] = useState(globalModelLoading);
  const loadingStateRef = useRef(setModelLoading);
  loadingStateRef.current = setModelLoading;

  useEffect(() => {
    if (!globalWorker) {
      globalWorker = new Worker(new URL("../workers/llmWorker.ts", import.meta.url), {
        type: "module",
      });

      globalWorker.addEventListener("message", (event) => {
        const { type, id, payload } = event.data;

        if (type === "init_complete") {
          globalModelInitialized = true;
          globalModelLoading = false;
          if (loadingStateRef.current) loadingStateRef.current(false);
          
          if (globalResolvers[id]) {
            globalResolvers[id].resolve(true);
            delete globalResolvers[id];
          }
        } else if (type === "generate_complete") {
          if (globalResolvers[id]) {
            globalResolvers[id].resolve(payload);
            delete globalResolvers[id];
          }
        } else if (type === "error") {
          globalModelLoading = false;
          if (loadingStateRef.current) loadingStateRef.current(false);
          
          if (globalResolvers[id]) {
            globalResolvers[id].reject(new Error(payload));
            delete globalResolvers[id];
          }
        }
      });
    }
  }, []);

  const initializeModel = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (globalModelInitialized) {
        resolve();
        return;
      }

      if (globalModelLoading) {
        // Already loading, don't start another initialization
        // Wait for the existing one to complete
        const checkInterval = setInterval(() => {
          if (globalModelInitialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!globalModelInitialized) {
            reject(new Error("Model initialization timeout. Please try refreshing."));
          }
        }, 120000);
        return;
      }

      const id = crypto.randomUUID();
      let timeoutId: NodeJS.Timeout;
      
      globalResolvers[id] = {
        resolve: () => {
          clearTimeout(timeoutId);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      };
      
      globalModelLoading = true;
      loadingStateRef.current(true);
      
      // 90 second timeout for model loading
      timeoutId = setTimeout(() => {
        globalModelLoading = false;
        loadingStateRef.current(false);
        delete globalResolvers[id];
        reject(new Error("Model loading timed out. Check your internet connection and try again."));
      }, 90000);
      
      globalWorker?.postMessage({
        type: "init",
        id,
      });
    });
  }, []);

  const generate = useCallback(
    (prompt: string, options?: { max_new_tokens?: number; temperature?: number }): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (!globalWorker) {
          reject(new Error("Worker not initialized"));
          return;
        }

        const id = crypto.randomUUID();
        let timeoutId: NodeJS.Timeout;
        
        globalResolvers[id] = {
          resolve: (payload: string) => {
            clearTimeout(timeoutId);
            resolve(payload);
          },
          reject: (error: Error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
        };

        // 30 second timeout for generation
        timeoutId = setTimeout(() => {
          delete globalResolvers[id];
          reject(new Error("Response generation timed out. Please try again."));
        }, 30000);

        globalWorker.postMessage({
          type: "generate",
          id,
          payload: {
            prompt,
            ...options,
          },
        });
      });
    },
    []
  );

  return {
    initializeModel,
    generate,
    modelLoading,
    isModelReady: globalModelInitialized,
  };
}
