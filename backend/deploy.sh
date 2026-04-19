#!/bin/bash
# SecureSight Backend Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 SecureSight Backend Deployment"
echo "=================================="

# Configuration
APP_DIR="/var/www/securesight-backend"
DOMAIN="api1.yashpatelis.online"  # Or your preferred subdomain
USER="www-data"
PYTHON_VERSION="3.10"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Step 2: Install dependencies
print_info "Installing dependencies..."
apt install -y python3 python3-pip python3-venv nginx supervisor git
apt install -y libgl1-mesa-glx libglib2.0-0  # OpenCV dependencies
print_success "Dependencies installed"

# Step 3: Create app directory
print_info "Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR
print_success "Directory created: $APP_DIR"

# Step 4: Create virtual environment
print_info "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
print_success "Virtual environment created"

# Step 5: Install Python packages
print_info "Installing Python packages..."
pip install --upgrade pip
pip install fastapi uvicorn[standard] ultralytics opencv-python-headless numpy torch torchvision websockets python-multipart
print_success "Python packages installed"

# Step 6: Create models directory
print_info "Creating models directory..."
mkdir -p $APP_DIR/models
print_success "Models directory created"

# Step 7: Download YOLO model
print_info "Downloading YOLO model (this may take a few minutes)..."
python3 << EOF
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
print("Model downloaded successfully")
EOF
print_success "YOLO model downloaded"

# Step 8: Set permissions
print_info "Setting permissions..."
chown -R $USER:$USER $APP_DIR
chmod -R 755 $APP_DIR
print_success "Permissions set"

print_success "Deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Copy your backend code to: $APP_DIR"
echo "2. Set up Supervisor: sudo cp securesight.conf /etc/supervisor/conf.d/"
echo "3. Set up Nginx: sudo cp securesight-nginx.conf /etc/nginx/sites-available/securesight"
echo "4. Enable site: sudo ln -s /etc/nginx/sites-available/securesight /etc/nginx/sites-enabled/"
echo "5. Reload services: sudo supervisorctl reread && sudo supervisorctl update"
echo "6. Restart nginx: sudo systemctl restart nginx"
