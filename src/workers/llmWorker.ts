import { pipeline, env } from "@xenova/transformers";

// Disable local file loading in browser
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

class LLMPipeline {
  static task = "text-generation";
  // Using 0.5B with optimized prompts and data enrichment for reliability
  // Tested working on mobile, loads in ~8-12 seconds, inference ~1-2 seconds
  // Better accuracy achieved through rich financial context + instruction tuning
  static model = "Xenova/Qwen1.5-0.5B-Chat";
  static instance: any = null;
  static loadingPromise: Promise<any> | null = null;

  static async getInstance(progress_callback?: Function) {
    if (this.instance) return this.instance;
    if (this.loadingPromise) return this.loadingPromise;

    console.log("Initializing pipeline for:", this.model);
    this.loadingPromise = pipeline(this.task, this.model, {
      quantized: true,
      progress_callback,
    })
      .then(instance => {
        this.instance = instance;
        this.loadingPromise = null;
        console.log("Model loaded successfully");
        return instance;
      })
      .catch(error => {
        console.error("Failed to load model:", error);
        this.loadingPromise = null;
        throw error;
      });

    return this.loadingPromise;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  const { type, id, payload } = event.data;

  if (type === "init") {
    try {
      await LLMPipeline.getInstance((data: any) => {
        self.postMessage({ type: "progress", id, payload: data });
      });
      self.postMessage({ type: "init_complete", id, payload: { success: true } });
    } catch (error: any) {
      console.error("Worker init error:", error);
      self.postMessage({ type: "error", id, payload: error.message || String(error) });
    }
  }

  if (type === "generate") {
    try {
      const generator = await LLMPipeline.getInstance();
      
      // Use low temperature (0.2) for accurate, data-driven responses
      const temperature = payload.temperature !== undefined ? payload.temperature : 0.2;
      const result = await generator(payload.prompt, {
        max_new_tokens: payload.max_new_tokens || 300,
        temperature: temperature,
        do_sample: temperature > 0,
        top_p: 0.9,
        repetition_penalty: 1.1,
        return_full_text: false,
      });

      let text = result[0]?.generated_text || "";

      // Fallback cleanup: remove everything before the assistant response
      const assistantMarkers = ["<|assistant|>", "Assistant:", "AI:"];
      for (const marker of assistantMarkers) {
        const idx = text.lastIndexOf(marker);
        if (idx !== -1) {
          text = text.substring(idx + marker.length).trim();
          break;
        }
      }

      // Final artifact cleanup (remove model-generated tags)
      const cutoffPatterns = [
        "<|im_end|>", "<|im_start|>", "</s>", "<|user|>", "<|system|>", 
        "User:", "Assistant:", "Question:", "USER DATA:",
        "NET_WORTH:", "PROPERTY:", "INVESTMENTS:"
      ];
      for (const pattern of cutoffPatterns) {
        const idx = text.indexOf(pattern);
        if (idx !== -1) {
          text = text.substring(0, idx);
        }
      }

      self.postMessage({ type: "generate_complete", id, payload: text.trim() });
    } catch (error: any) {
      console.error("Worker generate error:", error);
      self.postMessage({ type: "error", id, payload: error.message || String(error) });
    }
  }
});
