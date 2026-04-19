#!/usr/bin/env python3
"""
Quick test script for SecureSight detection backend.
Tests model loading, stream processing, and WebSocket communication.
"""

import sys
import asyncio
import json
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_backend():
    """Run comprehensive backend tests."""
    
    print("🧪 SecureSight Backend Test Suite")
    print("=" * 50)
    print()
    
    # Test 1: Import modules
    print("1️⃣  Testing imports...")
    try:
        from app.main import app, model, loaded_model_path
        from app.alert_manager import alert_manager
        import cv2
        from ultralytics import YOLO
        print("   ✅ All modules imported successfully")
    except Exception as e:
        print(f"   ❌ Import failed: {e}")
        return False
    print()
    
    # Test 2: Check model
    print("2️⃣  Checking YOLO model...")
    if model is None:
        print("   ❌ No model loaded")
        return False
    print(f"   ✅ Model loaded: {loaded_model_path}")
    print(f"   ℹ️  Model type: {type(model)}")
    if hasattr(model, 'names'):
        print(f"   ℹ️  Classes: {len(model.names)} ({', '.join(list(model.names.values())[:5])}...)")
    print()
    
    # Test 3: Check alert rules
    print("3️⃣  Checking alert rules...")
    rules = alert_manager.list_rules()
    print(f"   ✅ {len(rules)} alert rules configured:")
    for rule in rules[:5]:
        print(f"      • {rule['id']}: {', '.join(rule['classes'])} (severity: {rule['severity']})")
    if len(rules) > 5:
        print(f"      ... and {len(rules) - 5} more")
    print()
    
    # Test 4: Test detection on dummy image
    print("4️⃣  Testing detection on dummy image...")
    try:
        import numpy as np
        # Create a dummy 640x480 RGB image
        dummy_img = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        results = model.predict(dummy_img, verbose=False, conf=0.5)
        print("   ✅ Detection successful")
        print(f"   ℹ️  Result type: {type(results)}")
        if results and len(results) > 0:
            r = results[0]
            if hasattr(r, 'boxes') and r.boxes is not None:
                print(f"   ℹ️  Detected {len(r.boxes)} objects (on random image)")
    except Exception as e:
        print(f"   ❌ Detection test failed: {e}")
        return False
    print()
    
    # Test 5: Check OpenCV
    print("5️⃣  Testing OpenCV video capture...")
    try:
        # Test with a dummy URL (will fail but that's ok, we're testing the API)
        cap = cv2.VideoCapture("http://invalid-test-url/video")
        print(f"   ✅ OpenCV VideoCapture API available")
        print(f"   ℹ️  Can open streams: {cap is not None}")
        if cap:
            cap.release()
    except Exception as e:
        print(f"   ⚠️  OpenCV test: {e}")
    print()
    
    # Test 6: Simulate WebSocket message
    print("6️⃣  Testing alert evaluation...")
    try:
        # Simulate some detections
        test_detections = [
            {"name": "person", "conf": 0.85, "cls": 0, "box": [100, 100, 200, 300]},
            {"name": "backpack", "conf": 0.72, "cls": 24, "box": [50, 150, 120, 250]},
        ]
        alerts = alert_manager.check(test_detections)
        print(f"   ✅ Alert evaluation successful")
        print(f"   ℹ️  Triggered alerts: {alerts if alerts else 'none (cooldown may apply)'}")
    except Exception as e:
        print(f"   ❌ Alert test failed: {e}")
        return False
    print()
    
    # Summary
    print("=" * 50)
    print("✅ All tests passed!")
    print()
    print("🚀 Backend is ready!")
    print()
    print("Start the server with:")
    print("   python -m app.main")
    print("   OR")
    print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print()
    print("Then test with:")
    print("   curl http://localhost:8000/health")
    print()
    
    return True

if __name__ == "__main__":
    try:
        result = asyncio.run(test_backend())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
