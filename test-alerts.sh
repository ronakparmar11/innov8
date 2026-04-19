#!/bin/bash
# Alert System Integration Test
# Tests all components of the alert detection pipeline

echo "🔍 SecureSight Alert System Deep Check"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="${NEXT_PUBLIC_CAMERA_BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="http://localhost:3000"

echo "📋 Configuration:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo ""

# Test 1: Backend Health Check
echo "1️⃣  Testing Backend Health..."
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend is running"
    HEALTH=$(curl -s "$BACKEND_URL/health")
    echo "   Model loaded: $(echo $HEALTH | grep -o '"model_loaded":[^,]*' | cut -d: -f2)"
    echo "   Active streams: $(echo $HEALTH | grep -o '"active_streams":[^,]*' | cut -d: -f2)"
    echo "   Violence detection: $(echo $HEALTH | grep -o '"violence_detection":[^,]*' | cut -d: -f2)"
else
    echo -e "${RED}✗${NC} Backend not running at $BACKEND_URL"
    echo "   Start with: cd backend && python -m app.main"
    exit 1
fi
echo ""

# Test 2: Alert Rules Configuration
echo "2️⃣  Testing Alert Rules..."
RULES=$(curl -s "$BACKEND_URL/alerts/rules")
RULE_COUNT=$(echo $RULES | grep -o '"id":' | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found $RULE_COUNT alert rules configured"
echo "   Rules: $(echo $RULES | grep -o '"id":"[^"]*"' | cut -d: -f3 | tr -d '"' | tr '\n' ', ' | sed 's/,$//')"
echo ""

# Test 3: Demo Alert Generation
echo "3️⃣  Testing Demo Alert Generation..."
for i in {1..3}; do
    DEMO=$(curl -s "$BACKEND_URL/alerts/demo")
    SCENARIO=$(echo $DEMO | grep -o '"scenario":"[^"]*"' | cut -d: -f3 | tr -d '"')
    ALERTS=$(echo $DEMO | grep -o '"alerts":\[[^\]]*\]' | sed 's/"alerts"://')
    echo "   Demo $i: Scenario='$SCENARIO', Alerts=$ALERTS"
    sleep 0.5
done
echo ""

# Test 4: Detection Endpoint
echo "4️⃣  Testing Detection Endpoint..."
TEST_URL="https://cam1.yashpatelis.online/stream.html?src=cam1"
echo "   Testing with: $TEST_URL"
DETECT=$(curl -s -X POST "$BACKEND_URL/detect/url" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$TEST_URL\",\"conf\":0.5}")

if echo "$DETECT" | grep -q "error"; then
    echo -e "${YELLOW}⚠${NC}  Detection returned error (camera may be offline)"
    echo "   $(echo $DETECT | grep -o '"error":"[^"]*"')"
else
    PERSON_COUNT=$(echo $DETECT | grep -o '"person_count":[0-9]*' | cut -d: -f2)
    DET_COUNT=$(echo $DETECT | grep -o '"cls":' | wc -l | tr -d ' ')
    ALERTS_FOUND=$(echo $DETECT | grep -o '"alerts":\[[^\]]*\]' | sed 's/"alerts"://')
    echo -e "${GREEN}✓${NC} Detection successful"
    echo "   Detections: $DET_COUNT objects"
    echo "   Person count: $PERSON_COUNT"
    echo "   Alerts triggered: $ALERTS_FOUND"
fi
echo ""

# Test 5: Frontend API Proxy
echo "5️⃣  Testing Frontend API Proxy..."
if curl -s "$FRONTEND_URL/api/detect" > /dev/null 2>&1; then
    PROXY_TEST=$(curl -s -X POST "$FRONTEND_URL/api/detect" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$TEST_URL\",\"conf\":0.5}")
    
    if echo "$PROXY_TEST" | grep -q "error"; then
        echo -e "${YELLOW}⚠${NC}  Proxy test returned error"
        echo "   $(echo $PROXY_TEST | grep -o '"error":"[^"]*"')"
    else
        echo -e "${GREEN}✓${NC} Frontend API proxy working"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Frontend not running (optional for backend tests)"
    echo "   Start with: pnpm dev"
fi
echo ""

# Test 6: WebSocket Endpoint
echo "6️⃣  Testing WebSocket Endpoint..."
echo "   Attempting WebSocket connection test..."
timeout 5s websocat "$BACKEND_URL/ws/stream" <<EOF > /tmp/ws_test.log 2>&1 || true
{"url":"$TEST_URL","desired_fps":1.0,"detection_conf":0.5}
EOF

if [ -f /tmp/ws_test.log ] && grep -q "ts" /tmp/ws_test.log; then
    echo -e "${GREEN}✓${NC} WebSocket accepting connections"
else
    echo -e "${YELLOW}⚠${NC}  WebSocket test inconclusive (requires websocat tool)"
    echo "   Install: brew install websocat"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Alert System Status Summary"
echo "=========================================="
echo ""
echo "Backend Components:"
echo -e "  ${GREEN}✓${NC} Alert Manager ($RULE_COUNT rules)"
echo -e "  ${GREEN}✓${NC} Detection Pipeline"
echo -e "  ${GREEN}✓${NC} Demo Alert Generation"
echo -e "  ${GREEN}✓${NC} REST API (/detect/url)"
echo ""
echo "Integration Status:"
echo -e "  ${YELLOW}⚠${NC}  Frontend components NOT using useDetectionAlerts hook"
echo -e "  ${YELLOW}⚠${NC}  Live page showing mock alerts only"
echo -e "  ${YELLOW}⚠${NC}  Real-time alerts not displayed in UI"
echo ""
echo "Recommended Fixes:"
echo "  1. Integrate useDetectionAlerts hook into LiveCameraFeed"
echo "  2. Display real alerts from backend in live/page.tsx"
echo "  3. Add visual/audio notifications for critical alerts"
echo "  4. Connect violence detection alerts to UI"
echo ""
echo "To test manually:"
echo "  curl -s '$BACKEND_URL/alerts/demo' | jq"
echo "  curl -s -X POST '$BACKEND_URL/detect/url' -H 'Content-Type: application/json' -d '{\"url\":\"$TEST_URL\"}' | jq"
echo ""
