from ultralytics import YOLO
import sys

# We'll use yolov8n.pt since no custom object detection model was found in models/
model_path = "yolov8n.pt"
print(f"Loading {model_path} for ONNX export...")
try:
    model = YOLO(model_path)
    # We will export to ONNX with INT8. If int8 calibration fails, we fallback to standard ONNX.
    # imgsz=320 is critical for CPU performance targets.
    print("Exporting to ONNX (INT8)...")
    exported_path = model.export(format='onnx', int8=True, imgsz=320, simplify=True)
    print(f"✅ Successfully exported to {exported_path}")
except Exception as e:
    print(f"⚠️ INT8 Export failed: {e}")
    print("Attempting standard ONNX export...")
    try:
         exported_path = model.export(format='onnx', imgsz=320, simplify=True)
         print(f"✅ Successfully exported to {exported_path}")
    except Exception as e2:
         print(f"❌ Failed to export: {e2}")
         sys.exit(1)
