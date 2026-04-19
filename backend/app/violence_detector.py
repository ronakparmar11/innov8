"""Violence detection using CNN-RNN TensorFlow model.

This module provides real-time violence detection based on frame sequences.
It uses a CNN-RNN architecture (TimeDistributed CNN + GRU) trained on video sequences.
"""

import logging
import numpy as np
import cv2
from collections import deque
from typing import Dict, Optional, Tuple
from pathlib import Path

# TensorFlow is optional — server runs without it (violence detection disabled)
try:
    import tensorflow as tf
    import h5py
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logging.warning("TensorFlow/h5py not installed — violence detection disabled.")

# Model architecture constants (must match training) - OPTIMIZED FOR YOLO_BEST.H5
SEQUENCE_LENGTH = 30  # Number of frames in sequence
HEIGHT = 128
WIDTH = 128
INPUT_SHAPE = (SEQUENCE_LENGTH, HEIGHT, WIDTH, 3)

# Model name for logging
MODEL_VERSION = "yolo_best.h5"

# Detection thresholds and smoothing - OPTIMIZED FOR YOLO_BEST.H5
PROB_EMA_ALPHA = 0.35  # Exponential moving average smoothing (increased for stability)
VIOLENCE_TRIGGER_PNON = 0.25  # Trigger violence if p(non-violence) <= this (more sensitive)
VIOLENCE_CLEAR_PNON = 0.50  # Clear violence if p(non-violence) >= this
VIOLENCE_STREAK_REQUIRED = 2  # Consecutive triggers before declaring violence
CLEAR_STREAK_REQUIRED = 3  # Consecutive clears before declaring non-violence (increased)
MIN_PROB = 1e-3  # Min probability (prevents log(0))
MAX_PROB = 1 - 1e-3  # Max probability


def build_2d_cnn_rnn_model():
    """Build the exact CNN-RNN model architecture used in training."""
    if not TF_AVAILABLE:
        raise RuntimeError("TensorFlow is not installed")
    cnn_base = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=(HEIGHT, WIDTH, 3)),
        tf.keras.layers.Conv2D(16, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D((2, 2)),
        tf.keras.layers.GlobalAveragePooling2D()
    ], name="cnn_feature_extractor")
    
    model = tf.keras.models.Sequential([
        tf.keras.layers.Input(shape=INPUT_SHAPE),
        tf.keras.layers.TimeDistributed(cnn_base),
        tf.keras.layers.GRU(64),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    return model


def _load_weights_keras3(model, model_path: str):
    """Load weights from Keras 3 HDF5 format manually.
    
    Keras 3 saves weights in a different HDF5 structure (layers/vars)
    than the legacy format. This function reads weights directly via h5py
    and maps them to the correct model layers.
    
    Args:
        model: Built Keras model to load weights into
        model_path: Path to .h5 weights file (Keras 3 format)
    """
    # Build model by running a dummy forward pass
    dummy = np.zeros((1,) + INPUT_SHAPE, dtype=np.float32)
    _ = model(dummy, training=False)
    
    with h5py.File(model_path, 'r') as f:
        layers = f['layers']
        
        # TimeDistributed → CNN Sequential layers
        td_layer = model.layers[0]  # TimeDistributed
        cnn = td_layer.layer  # The inner CNN Sequential
        
        # Conv2D #1 (kernel + bias)
        conv1_kernel = np.array(layers['time_distributed']['layer']['layers']['conv2d']['vars']['0'])
        conv1_bias = np.array(layers['time_distributed']['layer']['layers']['conv2d']['vars']['1'])
        cnn.layers[0].set_weights([conv1_kernel, conv1_bias])
        
        # Conv2D #2 (kernel + bias)
        conv2_kernel = np.array(layers['time_distributed']['layer']['layers']['conv2d_1']['vars']['0'])
        conv2_bias = np.array(layers['time_distributed']['layer']['layers']['conv2d_1']['vars']['1'])
        cnn.layers[2].set_weights([conv2_kernel, conv2_bias])
        
        # GRU (kernel, recurrent_kernel, bias)
        gru_kernel = np.array(layers['gru']['cell']['vars']['0'])
        gru_recurrent = np.array(layers['gru']['cell']['vars']['1'])
        gru_bias = np.array(layers['gru']['cell']['vars']['2'])
        model.layers[1].set_weights([gru_kernel, gru_recurrent, gru_bias])
        
        # Dense (kernel + bias)
        dense_kernel = np.array(layers['dense']['vars']['0'])
        dense_bias = np.array(layers['dense']['vars']['1'])
        model.layers[3].set_weights([dense_kernel, dense_bias])


class ViolenceDetector:
    """Real-time violence detector with frame buffering and hysteresis.
    
    Features:
    - Maintains rolling buffer of frames
    - Smooths predictions with exponential moving average
    - Uses hysteresis to prevent flickering
    - Requires consecutive detections before triggering alerts
    """
    
    def __init__(self, model_path: str):
        """Initialize violence detector with trained model weights."""
        if not TF_AVAILABLE:
            logging.warning("ViolenceDetector: TensorFlow not available, running as stub")
            self.model = None
            self.frames_queue = deque(maxlen=SEQUENCE_LENGTH)
            self.smoothed_p_non = None
            self.current_state = "NonViolence"
            self.violence_streak = 0
            self.clear_streak = 0
            self.orientation_decided = False
            self.orientation_samples = []
            return
        print(f"Loading violence detection model from: {model_path}")
        self.model = build_2d_cnn_rnn_model()
        
        # Try standard load_weights first, fall back to manual Keras 3 loading
        try:
            self.model.load_weights(model_path)
        except Exception:
            print("  Standard weight loading failed, using Keras 3 format loader...")
            _load_weights_keras3(self.model, model_path)
        
        model_name = Path(model_path).name
        print(f"✅ Violence detection model loaded successfully: {model_name}")
        print(f"   Model params: {self.model.count_params():,}")
        
        # Frame buffer
        self.frames_queue = deque(maxlen=SEQUENCE_LENGTH)
        
        # Smoothing & state tracking
        self.smoothed_p_non = None  # Smoothed probability of non-violence
        self.current_state = "NonViolence"  # Current classification
        self.violence_streak = 0  # Consecutive violence predictions
        self.clear_streak = 0  # Consecutive non-violence predictions
        
        # Model output orientation (auto-detected)
        self.orientation_decided = False
        self.assume_raw_is_p_non = True  # True = raw output is p(NonViolence)
        self.orientation_samples = []
        
    def add_frame(self, frame: np.ndarray) -> Dict:
        """Process a frame and return violence detection result."""
        if self.model is None:
            return {"status": "ready", "is_violence": False, "violence_confidence": 0.0,
                    "nonviolence_probability": 1.0, "state": "NonViolence",
                    "violence_streak": 0, "clear_streak": 0}
        # Convert BGR to RGB
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Resize and normalize
        resized = cv2.resize(rgb, (WIDTH, HEIGHT))
        normalized = resized / 255.0
        self.frames_queue.append(normalized)
        
        # Need full sequence before prediction
        if len(self.frames_queue) < SEQUENCE_LENGTH:
            return {
                "status": "collecting",
                "frames_collected": len(self.frames_queue),
                "required": SEQUENCE_LENGTH
            }
        
        # Run prediction on sequence
        sequence_input = np.expand_dims(list(self.frames_queue), axis=0)
        raw_pred = float(self.model.predict(sequence_input, verbose=0)[0][0])
        
        # Auto-detect model output orientation (first few sequences)
        if not self.orientation_decided:
            self.orientation_samples.append(raw_pred)
            if len(self.orientation_samples) >= 4:
                # Heuristic: if median > 0.5, likely represents p(NonViolence)
                median_raw = float(np.median(self.orientation_samples))
                self.assume_raw_is_p_non = median_raw > 0.5
                self.orientation_decided = True
                print(f"Violence model orientation: {'p(NonViolence)' if self.assume_raw_is_p_non else 'p(Violence)'}")
        
        # Interpret raw prediction
        if self.assume_raw_is_p_non:
            p_nonviolence = max(MIN_PROB, min(MAX_PROB, raw_pred))
        else:
            p_nonviolence = max(MIN_PROB, min(MAX_PROB, 1.0 - raw_pred))
        
        # Apply exponential moving average smoothing
        if self.smoothed_p_non is None:
            self.smoothed_p_non = p_nonviolence
        else:
            self.smoothed_p_non = PROB_EMA_ALPHA * p_nonviolence + (1 - PROB_EMA_ALPHA) * self.smoothed_p_non
        
        # Hysteresis logic (prevents flickering)
        if self.smoothed_p_non <= VIOLENCE_TRIGGER_PNON:
            self.violence_streak += 1
            self.clear_streak = 0
        elif self.smoothed_p_non >= VIOLENCE_CLEAR_PNON:
            self.clear_streak += 1
            self.violence_streak = 0
        else:
            # In ambiguous zone: slowly decay streaks
            self.violence_streak = max(0, self.violence_streak - 1)
            self.clear_streak = max(0, self.clear_streak - 1)
        
        # State transitions (require consecutive detections)
        if self.current_state != "Violence" and self.violence_streak >= VIOLENCE_STREAK_REQUIRED:
            self.current_state = "Violence"
        if self.current_state == "Violence" and self.clear_streak >= CLEAR_STREAK_REQUIRED:
            self.current_state = "NonViolence"
        
        violence_confidence = 1.0 - self.smoothed_p_non
        is_violence = (self.current_state == "Violence")
        
        return {
            "status": "ready",
            "is_violence": is_violence,
            "violence_confidence": float(violence_confidence),
            "nonviolence_probability": float(self.smoothed_p_non),
            "state": self.current_state,
            "violence_streak": self.violence_streak,
            "clear_streak": self.clear_streak
        }
    
    def reset(self):
        """Reset detector state (call when switching camera feeds)."""
        self.frames_queue.clear()
        self.smoothed_p_non = None
        self.current_state = "NonViolence"
        self.violence_streak = 0
        self.clear_streak = 0
        self.orientation_decided = False
        self.orientation_samples = []
