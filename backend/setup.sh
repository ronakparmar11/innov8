#!/bin/bash
# Complete setup script for SecureSight backend + frontend integration

set -e

echo "🔧 SecureSight Detection System Setup"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$SCRIPT_DIR"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Backend dir: $BACKEND_DIR"
echo ""

# Step 1: Check Python
echo "1️⃣  Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo "✅ Found: $PYTHON_VERSION"
echo ""

# Step 2: Create virtual environment (optional but recommended)
echo "2️⃣  Setting up Python virtual environment..."
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo "✅ Created virtual environment"
else
    echo "✅ Virtual environment exists"
fi
echo ""

# Step 3: Activate and install dependencies
echo "3️⃣  Installing Python dependencies..."
source .venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt
echo "✅ Dependencies installed"
echo ""

# Step 4: Create models directory
echo "4️⃣  Setting up models directory..."
mkdir -p "$BACKEND_DIR/models"
echo "✅ Models directory ready at: $BACKEND_DIR/models"
echo ""
echo "${YELLOW}ℹ️  Place your YOLO .pt model files in:${NC}"
echo "   $BACKEND_DIR/models/"
echo ""
echo "   Suggested models:"
echo "   • best.pt (your custom trained model - highest priority)"
echo "   • yolov8n.pt (will auto-download if missing)"
echo "   • yolov8s.pt (better accuracy, slower)"
echo ""
echo "   Download example:"
echo "   wget -P models/ https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
echo ""

# Step 5: Check frontend dependencies
echo "5️⃣  Checking frontend..."
cd "$PROJECT_ROOT"
if [ ! -d "node_modules" ]; then
    echo "${YELLOW}⚠️  Frontend dependencies not installed${NC}"
    echo "   Run: pnpm install"
    echo ""
else
    echo "✅ Frontend dependencies found"
    echo ""
fi

# Step 6: Create .env.local if missing
if [ ! -f ".env.local" ]; then
    echo "6️⃣  Creating .env.local..."
    cat > .env.local << 'EOF'
# SecureSight Configuration
ALLOW_ALL_CAMERAS="true"
NEXT_PUBLIC_CAMERA_BACKEND_URL="http://localhost:8000"
CAMERA_BACKEND_URL="http://localhost:8000"
EOF
    echo "✅ Created .env.local"
else
    echo "6️⃣  .env.local exists"
fi
echo ""

# Summary
echo "✅ ${GREEN}Setup Complete!${NC}"
echo ""
echo "🚀 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 1. Add YOLO models (optional - will auto-download yolov8n.pt)"
echo "      cd backend/models"
echo "      wget https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt"
echo ""
echo "🐍 2. Start the backend (Terminal 1):"
echo "      cd backend"
echo "      source .venv/bin/activate"
echo "      python -m app.main"
echo ""
echo "⚛️  3. Start the frontend (Terminal 2):"
echo "      pnpm dev"
echo ""
echo "🎥 4. Connect IP camera:"
echo "      • Open http://localhost:3000/live"
echo "      • Click '+ Add IP Camera'"
echo "      • Enter URL: http://192.168.x.x:8080/videofeed"
echo "      • Watch real-time detections!"
echo ""
echo "📚 Read full docs:"
echo "   • backend/DETECTION_SETUP.md - Detailed guide"
echo "   • backend/models/README.md - Model info"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
