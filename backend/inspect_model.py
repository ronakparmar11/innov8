#!/usr/bin/env python3
"""Inspect the yolo_best.h5 Keras model structure."""

import tensorflow as tf
import numpy as np
from pathlib import Path

MODEL_PATH = Path(__file__).parent / "models" / "yolo_best.h5"

print(f"Loading model from: {MODEL_PATH}")
model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)

print("\n" + "="*70)
print("MODEL SUMMARY")
print("="*70)
model.summary()

print("\n" + "="*70)
print("INPUT/OUTPUT SPECIFICATIONS")
print("="*70)
print(f"Input shape:  {model.input_shape}")
print(f"Output shape: {model.output_shape}")

print("\n" + "="*70)
print("FIRST 3 LAYERS")
print("="*70)
for i, layer in enumerate(model.layers[:3]):
    cfg = layer.get_config()
    print(f"\n[{i}] {layer.name} ({type(layer).__name__})")
    print(f"    Input shape:  {layer.input_shape}")
    print(f"    Output shape: {layer.output_shape}")

print("\n" + "="*70)
print("LAST 3 LAYERS")
print("="*70)
for i, layer in enumerate(model.layers[-3:], start=len(model.layers)-3):
    cfg = layer.get_config()
    print(f"\n[{i}] {layer.name} ({type(layer).__name__})")
    print(f"    Input shape:  {layer.input_shape}")
    print(f"    Output shape: {layer.output_shape}")

print("\n" + "="*70)
print("TEST INFERENCE")
print("="*70)

# Try a test prediction with random data
input_shape = model.input_shape[1:]  # Remove batch dimension
test_input = np.random.random((1,) + input_shape).astype(np.float32)
print(f"Test input shape: {test_input.shape}")

output = model.predict(test_input, verbose=0)
print(f"Test output shape: {output.shape}")
print(f"Output min/max: {output.min():.4f} / {output.max():.4f}")
print(f"Output sample (first 10 values): {output.flatten()[:10]}")

print("\n✅ Model inspection complete!")
