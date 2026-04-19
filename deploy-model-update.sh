#!/bin/bash
# Quick deployment script for yolo_best.h5 model update

SERVER="root@100.98.124.120"
REMOTE_DIR="/var/www/securesight-backend"
LOCAL_DIR="/Users/yashpatel/Desktop/PROJECTS  /ss_site/SecureSight-Technologies/backend"

echo "🚀 Deploying yolo_best.h5 model update to server..."
echo "=================================================="

# Upload updated Python files
echo "📤 Uploading main.py..."
scp "${LOCAL_DIR}/app/main.py" "${SERVER}:${REMOTE_DIR}/app/" || { echo "❌ Failed to upload main.py"; exit 1; }

echo "📤 Uploading violence_detector.py..."
scp "${LOCAL_DIR}/app/violence_detector.py" "${SERVER}:${REMOTE_DIR}/app/" || { echo "❌ Failed to upload violence_detector.py"; exit 1; }

# Upload model file
echo "📤 Uploading yolo_best.h5 model..."
scp "${LOCAL_DIR}/models/yolo_best.h5" "${SERVER}:${REMOTE_DIR}/models/" || { echo "❌ Failed to upload model"; exit 1; }

# Restart backend service
echo "🔄 Restarting backend service..."
ssh "${SERVER}" "cd ${REMOTE_DIR} && sudo supervisorctl restart securesight-backend && sleep 2 && sudo supervisorctl status securesight-backend" || { echo "❌ Failed to restart service"; exit 1; }

# Test backend
echo "🧪 Testing backend health..."
ssh "${SERVER}" "curl -s http://localhost:8000/health | python3 -m json.tool" || { echo "❌ Health check failed"; exit 1; }

echo ""
echo "✅ Deployment complete!"
echo "Model updated to: yolo_best.h5"
echo ""
echo "Test the new model:"
echo "  curl https://api1.yashpatelis.online/health"
