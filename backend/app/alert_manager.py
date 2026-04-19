"""Enhanced alert rule evaluation for comprehensive threat detection."""
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
    min_conf: float = 0.3
    cooldown_s: float = 5.0
    severity: AlertSeverity = AlertSeverity.MEDIUM
    description: str = ""
    last_fired: float = 0.0
    last_fired_by_source: Dict[str, float] = field(default_factory=dict)
    count_threshold: int = 1
    zone_filter: Optional[Dict[str, Any]] = None

    def evaluate(self, detections: List[Dict[str, Any]], source_key: str = "global") -> bool:
        now = time.time()
        last_fired_for_source = self.last_fired_by_source.get(source_key, 0.0)
        if now - last_fired_for_source < self.cooldown_s:
            return False
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
        # ── CRITICAL: Weapons ─────────────────────────────────────────────────
        self.add_rule(AlertRule(
            id="weapon-detected",
            cls_names=["knife", "weapon", "gun", "rifle", "pistol", "scissors"],
            min_conf=0.25,       # Low — CPU models score knives around 0.3
            cooldown_s=3,
            severity=AlertSeverity.CRITICAL,
            description="Weapon Detected"
        ))

        # ── CRITICAL: Violent behaviour (motion analysis) ─────────────────────
        self.add_rule(AlertRule(
            id="behavior-violent",
            cls_names=["Action-Violent"],
            min_conf=0.5,
            cooldown_s=3,
            severity=AlertSeverity.CRITICAL,
            description="Violent Action Detected"
        ))

        self.add_rule(AlertRule(
            id="violence-detected",
            cls_names=["Violence"],
            min_conf=0.0,
            cooldown_s=3,
            severity=AlertSeverity.CRITICAL,
            description="Violence Detected"
        ))

        # ── HIGH: Aggressive / suspicious movement ────────────────────────────
        self.add_rule(AlertRule(
            id="behavior-aggressive",
            cls_names=["Action-Aggressive"],
            min_conf=0.5,
            cooldown_s=3,
            severity=AlertSeverity.HIGH,
            description="Aggressive Movement Detected"
        ))

        self.add_rule(AlertRule(
            id="behavior-suspicious",
            cls_names=["Action-Suspicious"],
            min_conf=0.4,
            cooldown_s=5,
            severity=AlertSeverity.MEDIUM,
            description="Suspicious Movement Detected"
        ))

        # ── HIGH: Face covering ───────────────────────────────────────────────
        self.add_rule(AlertRule(
            id="face-covered",          # NOTE: unique ID (was duplicate before)
            cls_names=["Action-Masked"],
            min_conf=0.4,
            cooldown_s=5,
            severity=AlertSeverity.HIGH,
            description="Face Covering Detected"
        ))

        # ── MEDIUM: Person detected ───────────────────────────────────────────
        self.add_rule(AlertRule(
            id="person-detected",
            cls_names=["person"],
            min_conf=0.4,
            cooldown_s=10,
            severity=AlertSeverity.MEDIUM,
            description="Person Detected"
        ))

        # ── CRITICAL: Fire / Smoke ────────────────────────────────────────────
        self.add_rule(AlertRule(
            id="fire-detected",
            cls_names=["fire", "flame", "smoke"],
            min_conf=0.4,
            cooldown_s=10,
            severity=AlertSeverity.CRITICAL,
            description="Fire or Smoke Detected"
        ))

        # ── MEDIUM: Suspicious objects ────────────────────────────────────────
        self.add_rule(AlertRule(
            id="suspicious-object",
            cls_names=["backpack", "suitcase", "handbag", "baseball bat"],
            min_conf=0.4,
            cooldown_s=30,
            severity=AlertSeverity.MEDIUM,
            description="Suspicious Object Detected"
        ))

    def add_rule(self, rule: AlertRule):
        self.rules[rule.id] = rule

    def remove_rule(self, rule_id: str) -> bool:
        if rule_id in self.rules:
            del self.rules[rule_id]
            return True
        return False

    def check(self, detections: List[Dict[str, Any]], source_key: str = "global") -> List[str]:
        """Evaluate all rules against current detections. Returns triggered alert IDs."""
        triggered = []
        for rule in self.rules.values():
            if rule.evaluate(detections, source_key=source_key):
                triggered.append(rule.id)
        return triggered

    def get_rule(self, rule_id: str) -> Optional[AlertRule]:
        return self.rules.get(rule_id)

    def list_rules(self) -> List[Dict[str, Any]]:
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

# Global singleton
alert_manager = AlertManager()
