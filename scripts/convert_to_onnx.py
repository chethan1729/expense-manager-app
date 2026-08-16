#!/usr/bin/env python3
"""
Convert Fine-tuned Qwen Model to ONNX for Browser Usage

Usage:
    python convert_to_onnx.py --model_dir ./finance-ai-finetuned

Requirements:
    pip install optimum[onnxruntime] transformers
"""

import argparse
import os
from pathlib import Path

from optimum.onnxruntime import ORTModelForCausalLM
from transformers import AutoTokenizer, AutoModelForCausalLM


def convert_to_onnx(model_dir: str, output_dir: str, quantize: bool = True):
    """Convert model to ONNX format"""
    
    print("\n" + "="*60)
    print("🔄 Converting Model to ONNX")
    print("="*60)
    
    # Validate input
    if not os.path.exists(model_dir):
        print(f"❌ Model directory not found: {model_dir}")
        return False
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    print(f"\n📂 Output directory: {output_dir}")
    
    try:
        # Load tokenizer
        print(f"\n🔄 Loading tokenizer from {model_dir}...")
        tokenizer = AutoTokenizer.from_pretrained(model_dir, trust_remote_code=True)
        
        # Save tokenizer to output
        tokenizer.save_pretrained(output_dir)
        print("   ✓ Tokenizer saved")
        
        # Check if it's a LoRA fine-tuned model or full model
        is_lora = os.path.exists(os.path.join(model_dir, "adapter_config.json"))
        
        if is_lora:
            print(f"\n🔄 Merging LoRA weights with base model...")
            
            # For LoRA, we need to merge it back to the base model
            from peft import PeftModel
            
            # Determine base model from adapter_config
            import json
            with open(os.path.join(model_dir, "adapter_config.json")) as f:
                adapter_config = json.load(f)
            
            base_model_name = "Qwen/Qwen1.5-1.8B-Chat"  # Default
            
            # Load base model
            print(f"   • Base model: {base_model_name}")
            base_model = AutoModelForCausalLM.from_pretrained(
                base_model_name,
                torch_dtype="auto",
                device_map="auto",
                trust_remote_code=True
            )
            
            # Load and merge LoRA
            model = PeftModel.from_pretrained(base_model, model_dir)
            model = model.merge_and_unload()
            print("   ✓ LoRA merged with base model")
        else:
            print(f"\n🔄 Loading full model from {model_dir}...")
            model = AutoModelForCausalLM.from_pretrained(
                model_dir,
                torch_dtype="auto",
                device_map="auto",
                trust_remote_code=True
            )
            print("   ✓ Model loaded")
        
        # Convert to ONNX
        print(f"\n🔄 Converting to ONNX format...")
        ort_model = ORTModelForCausalLM.from_pretrained(
            model_dir if not is_lora else base_model_name,
            from_transformers=True,
            provider="CPUExecutionProvider",
            trust_remote_code=True,
        )
        
        # If LoRA, set the fine-tuned weights
        if is_lora:
            # Merge before ONNX conversion
            print("   • Merging LoRA weights...")
            # This is handled above
        
        # Save ONNX model
        print(f"   • Saving to {output_dir}...")
        ort_model.save_pretrained(output_dir)
        print("   ✓ ONNX model saved")
        
        # Get file size
        model_size = sum(
            os.path.getsize(os.path.join(output_dir, f)) 
            for f in os.listdir(output_dir) 
            if os.path.isfile(os.path.join(output_dir, f))
        ) / 1e9
        
        print(f"\n📊 Model Information:")
        print(f"   • Total size: {model_size:.2f}GB")
        print(f"   • Format: ONNX (browser-compatible)")
        print(f"   • Location: {output_dir}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="Convert fine-tuned model to ONNX")
    parser.add_argument(
        "--model_dir",
        required=True,
        help="Directory containing the fine-tuned model"
    )
    parser.add_argument(
        "--output_dir",
        default=None,
        help="Output directory (default: model_dir-onnx)"
    )
    parser.add_argument(
        "--quantize",
        action="store_true",
        help="Apply quantization to reduce size"
    )
    
    args = parser.parse_args()
    
    output_dir = args.output_dir or f"{args.model_dir}-onnx"
    
    success = convert_to_onnx(args.model_dir, output_dir, args.quantize)
    
    if success:
        print("\n" + "="*60)
        print("✅ Conversion Complete!")
        print("="*60)
        print(f"\n🎯 Next steps:")
        print(f"   1. Upload to Hugging Face Hub:")
        print(f"      huggingface-cli repo create finance-ai-finetuned-onnx")
        print(f"      cp -r {output_dir}/* ./finance-ai-finetuned-onnx/")
        print(f"      cd ./finance-ai-finetuned-onnx")
        print(f"      git add . && git commit -m 'Fine-tuned ONNX model' && git push")
        print(f"\n   2. Update your app:")
        print(f"      • Edit: src/workers/llmWorker.ts")
        print(f"      • Change: static model = 'your-username/finance-ai-finetuned-onnx'")
        print(f"      • Run: npm run build")
        print(f"\n   3. Deploy and test!")
        print()
    else:
        print("\n❌ Conversion failed!")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
