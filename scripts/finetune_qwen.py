#!/usr/bin/env python3
"""
Finance AI Fine-tuning Script
Trains Qwen1.5-1.8B-Chat on your personal financial data

Usage:
    python finetune_qwen.py --training_file finance-ai-training-2025-04-26.jsonl

Requirements:
    pip install torch transformers peft bitsandbytes
"""

import argparse
import json
import os
from pathlib import Path
from typing import List, Dict, Any

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
)
from peft import LoraConfig, get_peft_model
from datasets import Dataset, load_dataset


def load_training_data(file_path: str) -> List[Dict[str, Any]]:
    """Load JSONL training data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    print(f"✓ Loaded {len(data)} training examples from {file_path}")
    return data


def format_training_data(examples: List[Dict[str, Any]]) -> List[str]:
    """Format training examples for model"""
    formatted = []
    for example in examples:
        # Format: "User: <question>\nAssistant: <answer>\n"
        text = f"<|im_start|>user\n{example['instruction']}\n<|im_end|>\n<|im_start|>assistant\n{example['output']}\n<|im_end|>"
        formatted.append(text)
    return formatted


def create_dataset(training_data: List[Dict[str, Any]], tokenizer) -> Dataset:
    """Create HuggingFace dataset from training data"""
    texts = format_training_data(training_data)
    
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            max_length=512,
            padding="max_length",
        )
    
    dataset = Dataset.from_dict({"text": texts})
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=["text"]
    )
    
    return tokenized_dataset


def setup_lora(model, rank: int = 16, lora_alpha: int = 32) -> Any:
    """Configure and apply LoRA to model"""
    lora_config = LoraConfig(
        r=rank,
        lora_alpha=lora_alpha,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "v_proj"],  # Qwen specific
        inference_mode=False,
    )
    
    model = get_peft_model(model, lora_config)
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    all_params = sum(p.numel() for p in model.parameters())
    
    print(f"\n🔧 LoRA Configuration:")
    print(f"   • Trainable params: {trainable_params:,} ({100*trainable_params//all_params}%)")
    print(f"   • Total params: {all_params:,}")
    print(f"   • LoRA rank: {rank}")
    print(f"   • LoRA alpha: {lora_alpha}\n")
    
    return model


def main():
    parser = argparse.ArgumentParser(description="Fine-tune Qwen for Finance AI")
    parser.add_argument(
        "--training_file",
        required=True,
        help="Path to JSONL training file"
    )
    parser.add_argument(
        "--model",
        default="Qwen/Qwen1.5-1.8B-Chat",
        help="Model ID from HuggingFace Hub"
    )
    parser.add_argument(
        "--output_dir",
        default="./finance-ai-finetuned",
        help="Output directory for fine-tuned model"
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=3,
        help="Number of training epochs"
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=4,
        help="Training batch size"
    )
    parser.add_argument(
        "--learning_rate",
        type=float,
        default=1e-4,
        help="Learning rate"
    )
    parser.add_argument(
        "--lora_rank",
        type=int,
        default=16,
        help="LoRA rank"
    )
    parser.add_argument(
        "--use_8bit",
        action="store_true",
        help="Use 8-bit quantization (saves memory)"
    )
    
    args = parser.parse_args()
    
    # Validate training file
    if not os.path.exists(args.training_file):
        print(f"❌ Training file not found: {args.training_file}")
        return
    
    print("\n" + "="*60)
    print("🚀 Finance AI Model Fine-tuning")
    print("="*60)
    
    # Load training data
    print(f"\n📂 Loading training data from {args.training_file}...")
    training_data = load_training_data(args.training_file)
    
    if not training_data:
        print("❌ No training data found!")
        return
    
    # Load model and tokenizer
    print(f"\n🔄 Loading model: {args.model}...")
    tokenizer = AutoTokenizer.from_pretrained(args.model, trust_remote_code=True)
    
    # Set pad token
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    print(f"   ✓ Tokenizer loaded (vocab size: {tokenizer.vocab_size})")
    
    # Load model with 8-bit option
    model_kwargs = {
        "trust_remote_code": True,
        "torch_dtype": torch.float16,
        "device_map": "auto",
    }
    
    if args.use_8bit:
        model_kwargs["load_in_8bit"] = True
        print("   📊 Using 8-bit quantization")
    
    model = AutoModelForCausalLM.from_pretrained(args.model, **model_kwargs)
    print(f"   ✓ Model loaded ({model.get_memory_footprint() / 1e9:.1f}GB)")
    
    # Apply LoRA
    print(f"\n🎯 Setting up LoRA fine-tuning...")
    model = setup_lora(model, rank=args.lora_rank)
    
    # Create dataset
    print(f"📊 Preparing dataset...")
    dataset = create_dataset(training_data, tokenizer)
    
    # Split into train/eval
    split_dataset = dataset.train_test_split(test_size=0.1)
    
    print(f"   ✓ Training examples: {len(split_dataset['train'])}")
    print(f"   ✓ Eval examples: {len(split_dataset['test'])}")
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        overwrite_output_dir=True,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        save_steps=100,
        save_total_limit=2,
        logging_steps=10,
        learning_rate=args.learning_rate,
        bf16=torch.cuda.is_available(),  # Use bfloat16 if GPU available
        gradient_accumulation_steps=2,
        optim="paged_adamw_32bit" if args.use_8bit else "adamw_torch",
        warmup_ratio=0.03,
        lr_scheduler_type="cosine",
        weight_decay=0.001,
        eval_strategy="steps",
        eval_steps=50,
        load_best_model_at_end=True,
        save_strategy="steps",
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )
    
    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=split_dataset['train'],
        eval_dataset=split_dataset['test'],
        data_collator=data_collator,
    )
    
    # Train
    print(f"\n🎓 Starting training...")
    print(f"   • Epochs: {args.epochs}")
    print(f"   • Batch size: {args.batch_size}")
    print(f"   • Learning rate: {args.learning_rate}")
    print(f"   • Output directory: {args.output_dir}")
    print()
    
    trainer.train()
    
    # Save model
    print(f"\n💾 Saving fine-tuned model to {args.output_dir}...")
    
    # Save LoRA weights
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    
    print("   ✓ Model saved")
    
    # Save training config for reference
    config = {
        "base_model": args.model,
        "training_data_size": len(training_data),
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.learning_rate,
        "lora_rank": args.lora_rank,
        "use_8bit": args.use_8bit,
    }
    
    with open(f"{args.output_dir}/training_config.json", "w") as f:
        json.dump(config, f, indent=2)
    
    print("\n" + "="*60)
    print("✅ Fine-tuning Complete!")
    print("="*60)
    print(f"\n📦 Model saved to: {args.output_dir}")
    print("\n🎯 Next steps:")
    print(f"   1. Convert to ONNX: python convert_to_onnx.py --model_dir {args.output_dir}")
    print(f"   2. Upload to Hub: huggingface-cli repo create finance-ai-finetuned")
    print(f"   3. Update app: Change model name in src/workers/llmWorker.ts")
    print(f"   4. Rebuild: npm run build")
    print()


if __name__ == "__main__":
    main()
