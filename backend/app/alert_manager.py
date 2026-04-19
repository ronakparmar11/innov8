"""Enhanced alert rule evaluation for comprehensive threat detection.

Supports multiple alert types:
- Person detection (unauthorized access)
- Weapon/knife detection (security threats)
- Vehicle detection (parking/traffic monitoring)
- Fire/smoke detection
- Suspicious objects (backpack, suitcase in restricted areas)
- PPE violations (no helmet, no vest in construction zones)
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import time
from enum import Enum

class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AlertRule:
    id: str
    cls_names: List[str]
    min_conf: float = 0.5
    cooldown_s: float = 10.0
    severity: AlertSeverity = AlertSeverity.MEDIUM
    description: str = ""
    last_fired: float = 0.0
    last_fired_by_source: Dict[str, float] = field(default_factory=dict)
    count_threshold: int = 1  # Trigger only if N+ objects detected
    zone_filter: Optional[Dict[str, Any]] = None  # Future: spatial zones

    def evaluate(self, detections: List[Dict[str, Any]], source_key: str = "global") -> bool:
        """Check if this rule is triggered by current detections."""
        now = time.time()
        last_fired_for_source = self.last_fired_by_source.get(source_key, 0.0)
        if now - last_fired_for_source < self.cooldown_s:
            return False
        
        # Count matching detections
        matched = [
            d for d in detections
            if d.get("name") in self.cls_names and d.get("conf", 0) >= self.min_conf
        ]
        
        if len(matched) >= self.count_threshold:
            self.last_fired_by_source[source_key] = now
            return True
        return False

class AlertManager:
    """Manages security alert rules and detection evaluation."""
    
    def __init__(self):
        self.rules: Dict[str, AlertRule] = {}
        self._init_default_rules()

    def _init_default_rules(self):
        """Initialize comprehensive security alert rules."""
        
        # CRITICAL THREATS - Weapons & Violence
        self.add_rule(AlertRule(
            id="weapon-detected",
            cls_names=["knife", "weapon", "gun", "rifle", "pistol"],
            min_conf=0.4,
            cooldown_s=5,
            severity=AlertSeverity.CRITICAL,
            description="🔪 Weapon Detected"
        ))
        
        # VIOLENCE DETECTION (CNN-RNN based Scene Understanding)
        self.add_rule(AlertRule(
            id="violence-detected",
            cls_names=["Violence"],
            min_conf=0.0,
            cooldown_s=5,
            severity=AlertSeverity.CRITICAL,
            description="🔥 Violence Detected (Scene)"
        ))
        
        # HIGH PRIORITY - Unauthorized Access & Intrusion
        self.add_rule(AlertRule(
            id="person-unauthorized",
            cls_names=["person"],
            min_conf=0.5,
            cooldown_s=300,
            severity=AlertSeverity.HIGH,
            description="Person detected in monitored area"
        ))
        
        self.add_rule(AlertRule(
            id="multiple-persons",
            cls_names=["person"],
            min_conf=0.75,
            cooldown_s=300,
            count_threshold=3,
            severity=AlertSeverity.HIGH,
            description="Multiple people detected - potential gathering"
        ))
        
        # FIRE & HAZARD DETECTION
        self.add_rule(AlertRule(
            id="fire-detected",
            cls_names=["fire", "flame", "smoke"],
            min_conf=0.5,
            cooldown_s=60,
            severity=AlertSeverity.CRITICAL,
            description="Fire or smoke detected - emergency response needed"
        ))
        
        # SUSPICIOUS OBJECTS
        self.add_rule(AlertRule(
            id="suspicious-object",
            cls_names=["backpack", "suitcase", "handbag", "luggage", "baseball bat"],
            min_conf=0.5,
            cooldown_s=600,
            severity=AlertSeverity.MEDIUM,
            description="📦 Suspicious Object Detected"
        ))
        
        # VEHICLE MONITORING
        self.add_rule(AlertRule(
            id="vehicle-detected",
            cls_names=["car", "truck", "bus", "motorcycle"],
            min_conf=0.80,
            cooldown_s=600,
            severity=AlertSeverity.LOW,
            description="Vehicle detected in monitored zone"
        ))
        
        # BEHAVIORAL - HAND REGION AGGRESSION (NO YOLO)
        self.add_rule(AlertRule(
            id="behavior-violent", 
            cls_names=["Action-Violent"],
            min_conf=0.7,
            cooldown_s=5,
            severity=AlertSeverity.CRITICAL,
            description="🚨 Violent Action (Rapid Hand Movement)"
        ))
        
        self.add_rule(AlertRule(
            id="behavior-aggressive",
            cls_names=["Action-Aggressive"],
            min_conf=0.7,
            cooldown_s=5,
            severity=AlertSeverity.HIGH,
            description="⚠️ Aggressive Movement"
        ))
        
        self.add_rule(AlertRule(
            id="behavior-suspicious",
            cls_names=["Action-Suspicious"],
            min_conf=0.5,
            cooldown_s=60,
            severity=AlertSeverity.MEDIUM,
            description="⚠️ Suspicious Movement"
        ))
        
        self.add_rule(AlertRule(
            id="person-unauthorized", # Masking is suspicious
            cls_names=["Action-Masked"],
            min_conf=0.7,
            cooldown_s=10,
            severity=AlertSeverity.HIGH,
            description="Potential face covering / mask detected"
        ))
        
        # ANIMAL/PET DETECTION (for restricted areas)
        self.add_rule(AlertRule(
            id="animal-detected",
            cls_names=["dog", "cat", "bird", "horse"],
            min_conf=0.5,
            cooldown_s=600,
            severity=AlertSeverity.LOW,
            description="Animal detected in restricted area"
        ))

    def add_rule(self, rule: AlertRule):
        """Add or update an alert rule."""
        self.rules[rule.id] = rule

    def remove_rule(self, rule_id: str) -> bool:
        """Remove an alert rule by ID."""
        if rule_id in self.rules:
            del self.rules[rule_id]
            return True
        return False

    def check(self, detections: List[Dict[str, Any]], source_key: str = "global") -> List[str]:
        """
        Evaluate all rules against current detections.
        Returns list of triggered alert IDs.
        """
        triggered = []
        for rule in self.rules.values():
            if rule.evaluate(detections, source_key=source_key):
                triggered.append(rule.id)
        return triggered
    
    def get_rule(self, rule_id: str) -> Optional[AlertRule]:
        """Get a specific rule by ID."""
        return self.rules.get(rule_id)
    
    def list_rules(self) -> List[Dict[str, Any]]:
        """List all configured rules with their details."""
        return [
            {
                "id": rule.id,
                "classes": rule.cls_names,
                "confidence": rule.min_conf,
                "cooldown": rule.cooldown_s,
                "severity": rule.severity.value,
                "description": rule.description,
            }
            for rule in self.rules.values()
        ]

# Global alert manager instance
alert_manager = AlertManager()
