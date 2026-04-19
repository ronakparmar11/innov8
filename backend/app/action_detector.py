import cv2
import numpy as np
import time

class ActionBehaviorDetector:
    """
    Lightweight Temporal Action Detector for CPU.
    Analyzes frame-to-frame pixel displacement to detect aggressive behavior (stabbing/fighting)
    """
    def __init__(self, history_len=20, spike_threshold=2.5, min_motion=1000):
        self.prev_gray = None
        self.motion_history = []
        self.history_len = history_len
        self.spike_threshold = spike_threshold
        self.min_motion = min_motion
        self.last_action_time = 0

    def analyze(self, frame) -> tuple[bool, int, float]:
        """
        Returns (is_aggressive, motion_score, spike_factor)
        """
        # Downscale for extreme CPU speed
        small = cv2.resize(frame, (128, 128), interpolation=cv2.INTER_NEAREST)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        is_aggressive = False
        motion_score = 0
        spike_factor = 0.0
        
        if self.prev_gray is not None:
            # Calculate dense-ish pixel delta
            diff = cv2.absdiff(self.prev_gray, gray)
            _, mask = cv2.threshold(diff, 20, 255, cv2.THRESH_BINARY)
            
            # motion_score is the 'area' of movement
            motion_score = np.count_nonzero(mask)
            
            self.motion_history.append(motion_score)
            if len(self.motion_history) > self.history_len:
                self.motion_history.pop(0)

            # Analyze temporal pattern
            if len(self.motion_history) > 5:
                # Use mean of previous history
                avg_motion = sum(self.motion_history[:-1]) / (len(self.motion_history) - 1)
                if avg_motion > 0:
                    spike_factor = motion_score / avg_motion
                else:
                    spike_factor = 0.0
                
                # Check for "Spike" (Sudden rapid movement)
                if motion_score > self.min_motion and spike_factor > self.spike_threshold:
                    is_aggressive = True
                    self.last_action_time = time.time()
                    # print(f"[DEBUG] Spike Detected: Score={motion_score}, Factor={spike_factor:.2f}")

        self.prev_gray = gray
        
        # Maintain alert for a short window
        active = is_aggressive or (time.time() - self.last_action_time < 1.5)
            
        return active, motion_score, spike_factor
