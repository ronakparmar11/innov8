# SecureSight backend container
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies for OpenCV/Ultralytics
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsm6 \
        libxext6 \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Install Python deps first to leverage Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy backend code and default model weight
COPY backend /app/backend
COPY yolov8n.pt /app/yolov8n.pt

ENV YOLO_MODEL_PATH=/app/yolov8n.pt \
    YOLO_MODELS_DIR=/app/backend/models \
    PYTORCH_ENABLE_MPS_FALLBACK=1 \
    UVICORN_WORKERS=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
