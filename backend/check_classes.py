from ultralytics import YOLO
model = YOLO("models/yolov8n.onnx")
print(model.names)
