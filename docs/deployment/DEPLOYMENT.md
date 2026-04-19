# 🚀 SecureSight Backend Deployment Guide

Complete guide to deploy the SecureSight backend on `ssh.yashpatelis.online`

---

## 📋 Prerequisites

- Access to `ssh.yashpatelis.online` with sudo privileges
- Domain/subdomain pointed to server (e.g., `api1.yashpatelis.online`)
- Ubuntu/Debian server (20.04+ recommended)
- At least 2GB RAM, 2 CPU cores
- 10GB free disk space

---

## 🎯 Quick Deployment (Copy-Paste Method)

### Step 1: SSH into Server

```bash
ssh root@ssh.yashpatelis.online
# Or: ssh your-username@ssh.yashpatelis.online
```

### Step 2: Run Automated Deployment

```bash
# Download and run deployment script
wget https://raw.githubusercontent.com/your-repo/SecureSight-Technologies/main/backend/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

---

## 🔧 Manual Deployment (Step-by-Step)

### 1. Update System & Install Dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nginx supervisor git
sudo apt install -y libgl1-mesa-glx libglib2.0-0  # OpenCV dependencies
```

### 2. Create Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/securesight-backend
cd /var/www/securesight-backend

# Create Python virtual environment
sudo python3 -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies

```bash
# Upgrade pip
pip install --upgrade pip

# Install packages
pip install fastapi uvicorn[standard] ultralytics opencv-python-headless numpy torch torchvision websockets python-multipart
```

### 4. Upload Backend Code

**Option A: Using rsync (from your local machine)**

```bash
# From your local project directory
rsync -avz --exclude 'venv' --exclude '__pycache__' \
  ./backend/ root@ssh.yashpatelis.online:/var/www/securesight-backend/
```

**Option B: Using Git**

```bash
# On server
cd /var/www/securesight-backend
git clone https://github.com/your-repo/SecureSight-Technologies.git temp
cp -r temp/backend/* .
rm -rf temp
```

**Option C: Manual SCP**

```bash
# From local machine
scp -r backend/app root@ssh.yashpatelis.online:/var/www/securesight-backend/
scp backend/requirements.txt root@ssh.yashpatelis.online:/var/www/securesight-backend/
```

### 5. Create Models Directory & Download YOLO

```bash
# On server
cd /var/www/securesight-backend
mkdir -p models

# Download YOLO model
python3 << 'EOF'
from ultralytics import YOLO
model = YOLO('yolov8n.pt')
# Model auto-downloads to ~/.ultralytics/
# Copy to our models directory
import shutil
import os
home = os.path.expanduser('~')
shutil.copy(f'{home}/.cache/ultralytics/yolov8n.pt', 'models/yolov8n.pt')
print("✓ Model downloaded to models/yolov8n.pt")
EOF
```

### 6. Test Backend Manually

```bash
# Activate venv
source /var/www/securesight-backend/venv/bin/activate

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# In another terminal, test:
curl http://localhost:8000/health
# Should return: {"status":"ok","model_loaded":true,...}
```

**Press Ctrl+C to stop** once verified working.

### 7. Set Up Supervisor (Process Manager)

```bash
# Copy supervisor config
sudo cp /var/www/securesight-backend/securesight.conf /etc/supervisor/conf.d/

# Or create manually
sudo nano /etc/supervisor/conf.d/securesight.conf
```

Paste this config:

```ini
[program:securesight-backend]
command=/var/www/securesight-backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
directory=/var/www/securesight-backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/securesight-backend.log
stderr_logfile=/var/log/securesight-backend-error.log
environment=PATH="/var/www/securesight-backend/venv/bin"
```

```bash
# Set permissions
sudo chown -R www-data:www-data /var/www/securesight-backend
sudo chmod -R 755 /var/www/securesight-backend

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start securesight-backend

# Check status
sudo supervisorctl status
```

### 8. Configure Nginx Reverse Proxy

**First, set up DNS:**

```bash
# Add A record for api1.yashpatelis.online pointing to your server IP
# In your DNS provider (e.g., Cloudflare, Namecheap):
# Type: A
# Name: api (or api.yashpatelis)
# Value: YOUR_SERVER_IP
# TTL: Auto/300
```

**Then configure Nginx:**

```bash
# Copy nginx config
sudo cp /var/www/securesight-backend/securesight-nginx.conf /etc/nginx/sites-available/securesight

# Or create manually
sudo nano /etc/nginx/sites-available/securesight
```

Paste the nginx config (see [`securesight-nginx.conf`](backend/securesight-nginx.conf))

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/securesight /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 9. Set Up HTTPS with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api1.yashpatelis.online

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)

# Certbot auto-configures nginx for HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

### 10. Open Firewall Ports

```bash
# If using UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # Optional: for direct backend access
sudo ufw enable
sudo ufw status
```

---

## 🧪 Testing Deployment

### Test Health Endpoint

```bash
# HTTP (before SSL)
curl http://api1.yashpatelis.online/health

# HTTPS (after SSL)
curl https://api1.yashpatelis.online/health

# Expected response:
{
  "status": "ok",
  "model_loaded": true,
  "current_model": "backend/models/yolov8n.pt",
  "yolo_version": "8.2.103"
}
```

### Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Test WebSocket
wscat -c wss://api1.yashpatelis.online/ws/stream

# Send test message:
{"url": "https://demo.example.com/stream.m3u8", "desired_fps": 1.5, "detection_conf": 0.5}
```

### Test from Frontend

1. Update frontend environment variable:

   ```bash
   # On Vercel: Settings → Environment Variables
   NEXT_PUBLIC_CAMERA_BACKEND_URL=https://api1.yashpatelis.online
   ```

2. Redeploy frontend

3. Visit `https://ss.yashpatelis.online/live`

4. Check badge: Should show "AI Filter Online" ✅

---

## 📊 Monitoring & Logs

### View Backend Logs

```bash
# Real-time logs
sudo tail -f /var/log/securesight-backend.log

# Error logs
sudo tail -f /var/log/securesight-backend-error.log

# Nginx access logs
sudo tail -f /var/nginx/access.log

# Nginx error logs
sudo tail -f /var/nginx/error.log
```

### Supervisor Commands

```bash
# Check status
sudo supervisorctl status

# Restart backend
sudo supervisorctl restart securesight-backend

# Stop backend
sudo supervisorctl stop securesight-backend

# Start backend
sudo supervisorctl start securesight-backend

# Reload config
sudo supervisorctl reread
sudo supervisorctl update
```

### Check System Resources

```bash
# CPU/Memory usage
htop

# Disk usage
df -h

# Check if backend is running
ps aux | grep uvicorn

# Check listening ports
sudo netstat -tulpn | grep 8000
```

---

## 🔄 Updating Backend Code

### Quick Update Method

```bash
# On your local machine, sync changes
rsync -avz --exclude 'venv' --exclude '__pycache__' \
  ./backend/ root@ssh.yashpatelis.online:/var/www/securesight-backend/

# On server, restart
sudo supervisorctl restart securesight-backend
```

### Using Git

```bash
# On server
cd /var/www/securesight-backend
git pull origin main
sudo supervisorctl restart securesight-backend
```

---

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check logs
sudo tail -100 /var/log/securesight-backend.log

# Common issues:
# 1. Port already in use
sudo lsof -i :8000
sudo kill -9 <PID>

# 2. Permission issues
sudo chown -R www-data:www-data /var/www/securesight-backend

# 3. Missing dependencies
source /var/www/securesight-backend/venv/bin/activate
pip install -r requirements.txt
```

### WebSocket Connection Fails

```bash
# Check nginx config
sudo nginx -t

# Check if backend is running
curl http://localhost:8000/health

# Check nginx websocket support
sudo nginx -V | grep http_upgrade

# Restart nginx
sudo systemctl restart nginx
```

### Model Not Loading

```bash
# Check if model file exists
ls -lh /var/www/securesight-backend/models/

# Download model manually
cd /var/www/securesight-backend
source venv/bin/activate
python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Copy to models directory
cp ~/.cache/ultralytics/yolov8n.pt models/
```

### High CPU Usage

```bash
# Reduce workers in supervisor config
sudo nano /etc/supervisor/conf.d/securesight.conf
# Change: --workers 2 → --workers 1

# Reduce FPS in frontend
# Change desired_fps: 1.5 → 1.0 or 0.5

# Use smaller YOLO model
# yolov8n.pt (fastest) instead of yolov8s.pt or larger
```

---

## 🔒 Security Best Practices

### 1. Set Up Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw deny 8000  # Block direct backend access
sudo ufw enable
```

### 2. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd
```

### 3. Add API Key Authentication (Optional)

```bash
# Add to backend/app/main.py
API_KEY = os.getenv("API_KEY", "your-secret-key")

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket, api_key: str = None):
    if api_key != API_KEY:
        await websocket.close(code=1008)
        return
    # ... rest of code
```

---

## 📦 Production Optimization

### 1. Enable Gzip Compression

```nginx
# Add to nginx config
gzip on;
gzip_types text/plain application/json;
gzip_min_length 1000;
```

### 2. Add Rate Limiting

```nginx
# Add to nginx http block
limit_req_zone $binary_remote_addr zone=backend:10m rate=10r/s;

# Add to location block
limit_req zone=backend burst=20;
```

### 3. Set Up Monitoring

```bash
# Install monitoring tools
sudo apt install -y prometheus-node-exporter
sudo apt install -y netdata  # Web dashboard on :19999
```

---

## 📞 Quick Reference

### Essential Commands

```bash
# Restart backend
sudo supervisorctl restart securesight-backend

# View logs
sudo tail -f /var/log/securesight-backend.log

# Test backend
curl https://api1.yashpatelis.online/health

# Restart nginx
sudo systemctl restart nginx

# Check status
sudo supervisorctl status
```

### Key Files

- Backend code: `/var/www/securesight-backend/`
- Supervisor config: `/etc/supervisor/conf.d/securesight.conf`
- Nginx config: `/etc/nginx/sites-available/securesight`
- Logs: `/var/log/securesight-backend.log`
- SSL certs: `/etc/letsencrypt/live/api1.yashpatelis.online/`

---

## ✅ Post-Deployment Checklist

- [ ] Backend responds to health check
- [ ] WebSocket connection works
- [ ] HTTPS enabled with valid certificate
- [ ] Frontend connects successfully
- [ ] "AI Filter Online" badge shows on website
- [ ] Detections appear in frontend console
- [ ] Supervisor auto-restarts on failure
- [ ] SSL auto-renewal configured
- [ ] Logs are being written
- [ ] Firewall configured

---

## 🎉 Success!

Your backend is now deployed at: **https://api1.yashpatelis.online**

Update frontend environment variable:

```
NEXT_PUBLIC_CAMERA_BACKEND_URL=https://api1.yashpatelis.online
```

Visit **https://ss.yashpatelis.online/live** to see detection in action!
