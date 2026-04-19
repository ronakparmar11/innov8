#!/usr/bin/env python3
"""Test loading yolo_best.h5 weights."""

import sys
from pathlib import Path
import h5py

MODEL_PATH = Path(__file__).parent / "models" / "yolo_best.h5"

print(f"Analyzing: {MODEL_PATH}\n")

# Inspect HDF5 structure
print("="*70)
print("HDF5 FILE STRUCTURE")
print("="*70)

with h5py.File(MODEL_PATH, 'r') as f:
    print(f"Root keys: {list(f.keys())}\n")
    
    def print_structure(name, obj, indent=0):
        prefix = "  " * indent
        if isinstance(obj, h5py.Dataset):
            print(f"{prefix}📄 Dataset: {name}")
            print(f"{prefix}   Shape: {obj.shape}, Dtype: {obj.dtype}")
        elif isinstance(obj, h5py.Group):
            print(f"{prefix}📁 Group: {name}")
            for key in obj.keys():
                print_structure(f"{name}/{key}", obj[key], indent+1)
    
    for key in f.keys():
        print_structure(key, f[key])

# Try loading with violence model architecture
print("\n" + "="*70)
print("TESTING COMPATIBILITY WITH VIOLENCE MODEL")
print("="*70)

try:
    from app.violence_detector import build_2d_cnn_rnn_model
    import tensorflow as tf
    
    model = build_2d_cnn_rnn_model()
    print(f"Violence model input shape: {model.input_shape}")  
    print(f"Violence model output shape: {model.output_shape}")
    print(f"Violence model total params: {model.count_params():,}")
    
    try:
        model.load_weights(str(MODEL_PATH))
        print("\n✅ Successfully loaded yolo_best.h5 as violence model weights!")
        print("\nThis appears to be a violence detection model, not a YOLO object detection model.")
    except Exception as e:
        print(f"\n❌ Failed to load as violence model: {e}")
        
except ImportError as e:
    print(f"❌ Could not import violence_detector: {e}")
