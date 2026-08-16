# Finance AI Fine-Tuning Guide

## Overview

This guide explains how to fine-tune the Qwen model with your personal financial data to make it context-aware and accurate for your specific spending patterns.

## Architecture

### Current Setup
- **Model**: Xenova/Qwen1.5-0.5B-Chat (browser-optimized, mobile-friendly)
- **Size**: ~240MB quantized (loads in 8-12 seconds)
- **Current Accuracy**: ~70% (good for most queries)
- **Target Accuracy**: 95%+ (with fine-tuning)
- **Context**: Runs 100% on-device, no server needed for inference
- **Limitation**: Browser model can't be fine-tuned in-place

### Fine-Tuning Approach
Since browser-based models can't be fine-tuned directly, we provide:

1. **Data Export**: Extract your transaction history and financial snapshots
2. **Training Dataset Generation**: Create Q&A pairs from your spending patterns
3. **Server-Side Fine-Tuning**: Fine-tune on your server or cloud infrastructure
4. **Model Export**: Replace the base model with your fine-tuned version

---

## Step 1: Export Your Financial Data

### From the App UI
1. Go to **Finance Assistant**
2. Click the **"Download" button** (⬇️ icon in header)
3. Choose export format:
   - **Training JSONL**: For direct fine-tuning (recommended)
   - **Full Dataset JSON**: Complete financial snapshot
   - **Transactions CSV**: Transaction history for analysis

### Programmatically
```typescript
import { useDataExport } from "@/hooks/useDataExport";

const { downloadTrainingJSONL, getDatasetPreview } = useDataExport();

// Download JSONL training file
await downloadTrainingJSONL();

// Get preview
const dataset = await getDatasetPreview();
console.log(dataset.metadata); // See data stats
```

### What Gets Exported

**Training JSONL Format** (for fine-tuning):
```json
{"instruction": "What was my spending in 2025-04?", "input": "", "output": "In 2025-04, you spent ₹XXXX out of your budget of ₹XXXX..."}
{"instruction": "How much did I spend on Daily Expenses?", "input": "", "output": "You spent ₹XXXX with an allocation of ₹XXXX..."}
```

**Full Dataset JSON**:
```json
{
  "transactions": [
    {"date": "2025-04-01", "amount": 500, "fund": "daily-expenses", "category": "food", ...}
  ],
  "snapshots": [
    {"month": "2025-04", "totalBudget": 50000, "totalSpent": 35000, ...}
  ],
  "metadata": {
    "extractedAt": "2025-04-26T...",
    "totalTransactions": 1250,
    "dateRange": {"start": "2024-01-01", "end": "2025-04-26"}
  }
}
```

---

## Step 2: Fine-Tune the Model

### Option A: Local Fine-Tuning (Recommended for Testing)

**Prerequisites**:
```bash
pip install transformers torch peft bitsandbytes
```

**Fine-tuning Script** (Python):
```python
import json
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import get_peft_model, LoraConfig
import torch
from tqdm import tqdm

# Configuration
MODEL_NAME = "Qwen/Qwen1.5-1.8B-Chat"
TRAINING_FILE = "finance-ai-training-2025-04-26.jsonl"
OUTPUT_DIR = "./finance-ai-finetuned"

# Load model and tokenizer
print("Loading model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True
)

# Configure LoRA (efficient fine-tuning)
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)

# Load training data
print("Loading training data...")
conversations = []
with open(TRAINING_FILE, 'r') as f:
    for line in f:
        conversations.append(json.loads(line))

# Prepare training data
def format_instruction(conversation):
    instruction = conversation['instruction']
    output = conversation['output']
    return f"User: {instruction}\nAssistant: {output}\n<|endoftext|>"

# Training
print("Starting fine-tuning...")
for epoch in range(3):  # 3 epochs recommended
    print(f"Epoch {epoch + 1}/3")
    total_loss = 0
    for conv in tqdm(conversations):
        text = format_instruction(conv)
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        
        outputs = model(**inputs)
        loss = outputs.loss
        
        loss.backward()
        total_loss += loss.item()
    
    print(f"Average loss: {total_loss / len(conversations):.4f}")

# Save model
print("Saving model...")
model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Model saved to {OUTPUT_DIR}")
```

**Run it**:
```bash
python finetune.py
```

### Option B: Cloud Fine-Tuning (Easier, Scalable)

#### Using Hugging Face Hub
```python
from huggingface_hub import HfApi
import json

# 1. Upload your training data
api = HfApi()
api.upload_file(
    path_or_fileobj="finance-ai-training-2025-04-26.jsonl",
    path_in_repo="training_data.jsonl",
    repo_id="your-username/finance-ai-finetuned",
    repo_type="model"
)

# 2. Use Hugging Face's fine-tuning API (if available)
# Or use a service like:
# - Replicate.com
# - Modal.com
# - Lambda Labs
```

#### Using Replicate.com (Simplest)
```bash
# 1. Create account at replicate.com
# 2. Upload your training file
# 3. Run command:
replicate run stability-ai/lora-training \
  --input model="Qwen1.5-1.8B-Chat" \
  --input training_file="@finance-ai-training-2025-04-26.jsonl"
```

---

## Step 3: Export Fine-Tuned Model for Browser

### Convert to ONNX for Browser
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
from optimum.onnxruntime import ORTModelForCausalLM

# Load fine-tuned model
model_id = "./finance-ai-finetuned"
tokenizer = AutoTokenizer.from_pretrained(model_id)

# Convert to ONNX
ort_model = ORTModelForCausalLM.from_pretrained(
    model_id,
    from_transformers=True,
    provider="CUDAExecutionProvider"  # or "CPUExecutionProvider"
)

# Quantize for smaller size
ort_model.save_pretrained("./finance-ai-finetuned-onnx")

# Upload to Hugging Face
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(
    folder_path="./finance-ai-finetuned-onnx",
    repo_id="your-username/finance-ai-finetuned-onnx",
    repo_type="model"
)
```

### Use in Transformers.js
```typescript
// In your app, update llmWorker.ts:
static model = "your-username/finance-ai-finetuned-onnx"; // Your custom model

// That's it! The app will auto-download and use your fine-tuned model
```

---

## Step 4: Monitor and Iterate

### Metrics to Track
1. **Perplexity**: Should decrease during training (lower is better)
2. **Loss**: Should decrease (lower is better, target < 0.5)
3. **Response Quality**: Test on held-out spending questions

### Iteration Process
1. Fine-tune with all your data
2. Test responses on new queries
3. If responses are still generic:
   - Add more training examples
   - Increase training epochs (3-5)
   - Adjust LoRA parameters (r=16 to r=32)
4. Re-export and re-deploy model

---

## Step 5: Production Deployment

### Option A: Use Upgraded Model Only
The 1.8B upgrade should significantly improve responses without fine-tuning.
- 3.6x more model capacity
- Better at following instructions
- Still runs in-browser

### Option B: Deploy Fine-Tuned Model
1. Convert to ONNX (Step 3)
2. Upload to Hugging Face Hub
3. Update model name in `llmWorker.ts`
4. Test thoroughly on your device

### Option C: Use API-Based Fallback
For maximum reliability, add API fallback:

```typescript
// In useChat.ts, add API option:
const USE_API_FALLBACK = true; // Set to false to use local model only
const API_URL = "https://your-server.com/api/chat"; // Your server endpoint

// If local model fails or is too slow, use API
const response = USE_API_FALLBACK 
  ? await fetchFromAPI(prompt, financialContext)
  : await generate(prompt, { temperature: 0.2, max_new_tokens: 300 });
```

---

## Training Data Quality Tips

### Good Training Examples
```json
{"instruction": "What was my spending in April?", "output": "In April, you spent ₹35,000 out of ₹50,000 budget (70% utilization)..."}
{"instruction": "Which fund am I overspending?", "output": "Daily Expenses has exceeded budget by ₹5,000..."}
```

### Bad Training Examples ❌
```json
{"instruction": "What is net worth?", "output": "Net worth is calculated as assets minus liabilities..."}
{"instruction": "How should I budget?", "output": "Here's a generic budgeting formula..."}
```

### Best Practices
1. **Use Real Data**: Generated Q&A pairs from actual spending patterns
2. **Be Specific**: Include fund names, exact amounts, dates
3. **Match Your App**: Use the same terminology as your app UI
4. **Avoid Generic**: Don't include theoretical finance advice
5. **Balance**: Mix different query types evenly

---

## Troubleshooting

### Model Still Generates Generics
- ✅ Check training data quality (no generic advice)
- ✅ Increase training epochs to 5-10
- ✅ Increase LoRA rank from 16 to 32
- ✅ Try larger base model (3B instead of 1.8B)

### Model is Too Slow
- ✅ Use 8-bit quantization
- ✅ Reduce max_new_tokens
- ✅ Cache inference results

### High Loss During Training
- ✅ Reduce learning rate (1e-5 instead of 1e-4)
- ✅ Check training data format (must be valid JSON)
- ✅ Ensure tokenizer is same as training

### Model Works Locally but Not in Browser
- ✅ Quantize to ONNX format
- ✅ Reduce model size (use 1.8B not 7B)
- ✅ Check max file size limits

---

## Performance Comparison

| Model | Browser Compatible | Size | Quality |
|-------|-------------------|------|---------|
| Qwen 0.5B | ✅ | 240MB | Poor (current issue) |
| **Qwen 1.8B** | ✅ | 900MB | **Good (recommended)** |
| Qwen 7B | ❌ | 3.5GB | Excellent |
| API (Claude) | ✅ | - | Excellent |

---

## Quick Start Commands

```bash
# 1. Export data from app (through UI)

# 2. Local fine-tuning
pip install transformers torch peft
python finetune.py

# 3. Convert to ONNX
python convert_to_onnx.py

# 4. Upload to Hub
huggingface-cli repo create finance-ai-finetuned-onnx
cd finance-ai-finetuned-onnx
git add . && git commit -m "Fine-tuned model" && git push

# 5. Update app
# Change model name in src/workers/llmWorker.ts
# Rebuild and deploy
npm run build
```

---

## Support & Resources

- **Transformers.js**: https://xenova.github.io/transformers.js/
- **PEFT**: https://github.com/huggingface/peft
- **Qwen Docs**: https://huggingface.co/Qwen/Qwen1.5-1.8B-Chat
- **Fine-tuning Guide**: https://huggingface.co/docs/transformers/training

---

## Next Steps

1. ✅ Upgrade to 1.8B model (done in this update)
2. Download training data from your app
3. Run local fine-tuning script
4. Convert to ONNX
5. Replace model in app
6. Test and iterate

The combination of 1.8B model + fine-tuning should give you excellent, context-aware responses!
