#!/bin/bash
# Quick deploy script - Run this from your LOCAL machine

set -e

SERVER="100.98.124.120"
USER="root"  # Change to your username if not root
REMOTE_DIR="/var/www/securesight-backend"

echo "🚀 SecureSight Quick Deploy to $SERVER"
echo "======================================"

# Step 1: Upload backend code
echo "📤 Uploading backend code..."
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
  ./backend/ ${USER}@${SERVER}:${REMOTE_DIR}/

echo "✓ Code uploaded"

# Step 2: Upload deployment configs
echo "📋 Uploading deployment configs..."
scp backend/securesight.conf ${USER}@${SERVER}:/tmp/
scp backend/securesight-nginx.conf ${USER}@${SERVER}:/tmp/

echo "✓ Configs uploaded"

# Step 3: SSH and run deployment commands
echo "🔧 Running deployment on server..."
ssh ${USER}@${SERVER} << 'ENDSSH'
    # Move configs
    sudo cp /tmp/securesight.conf /etc/supervisor/conf.d/
    sudo cp /tmp/securesight-nginx.conf /etc/nginx/sites-available/securesight
    
    # Set permissions
    sudo chown -R www-data:www-data /var/www/securesight-backend
    sudo chmod -R 755 /var/www/securesight-backend
    
    # Reload services
    sudo supervisorctl reread
    sudo supervisorctl update
    sudo supervisorctl restart securesight-backend
    sudo nginx -t && sudo systemctl reload nginx
    
    echo "✓ Services restarted"
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test your deployment:"
echo "  curl https://api1.yashpatelis.online/health"
echo ""
echo "View logs:"
echo "  ssh ${USER}@${SERVER} 'sudo tail -f /var/log/securesight-backend.log'"
