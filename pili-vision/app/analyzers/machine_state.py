"""Machine state analyzer using MOG2 background subtraction + optical flow.

Determines if a machine is operating, idle, or off based on visual motion
analysis across consecutive frames.
"""

import logging
from dataclasses import dataclass
from enum import Enum

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class MachineState(str, Enum):
    OPERATING = "operating"
    IDLE = "idle"
    OFF = "off"
    UNKNOWN = "unknown"


@dataclass
class MachineStateResult:
    state: MachineState
    confidence: float           # 0.0 - 1.0
    motion_intensity: float     # 0.0 - 1.0 (fraction of pixels with motion)
    flow_magnitude: float       # Mean optical flow magnitude
    active_zones: dict[str, float]  # Q1-Q4 motion intensity


class MachineStateAnalyzer:
    """Analyzes machine state from frame sequences using computer vision.

    Uses two complementary techniques:
    1. MOG2 Background Subtraction — detects which pixels are "foreground" (moving)
    2. Dense Optical Flow (Farneback) — measures direction and speed of movement

    Combined, these distinguish:
    - OPERATING: sustained, patterned motion (machine running)
    - IDLE: minimal or sporadic motion (machine on but not running)
    - OFF: no significant motion at all
    """

    def __init__(self):
        # One MOG2 model per machine (managed externally via dict)
        self._bg_subtractors: dict[str, cv2.BackgroundSubtractorMOG2] = {}
        self._prev_grays: dict[str, np.ndarray] = {}

    def _get_subtractor(self, machine_id: str) -> cv2.BackgroundSubtractorMOG2:
        if machine_id not in self._bg_subtractors:
            sub = cv2.createBackgroundSubtractorMOG2(
                history=60,          # ~5 min of frames at 5s interval
                varThreshold=40,
                detectShadows=True,
            )
            sub.setShadowThreshold(0.5)
            self._bg_subtractors[machine_id] = sub
        return self._bg_subtractors[machine_id]

    def analyze(
        self,
        machine_id: str,
        current_frame: np.ndarray,
        previous_frames: list[np.ndarray],
    ) -> MachineStateResult:
        """Analyze machine state from current + historical frames."""
        h, w = current_frame.shape[:2]
        gray = cv2.cvtColor(current_frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        # --- 1. Background Subtraction (MOG2) ---
        subtractor = self._get_subtractor(machine_id)
        fg_mask = subtractor.apply(current_frame, learningRate=0.005)

        # Remove shadows (gray pixels = 127 in MOG2)
        fg_mask = cv2.threshold(fg_mask, 200, 255, cv2.THRESH_BINARY)[1]

        # Morphological cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel, iterations=2)
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel, iterations=2)

        motion_pixels = np.count_nonzero(fg_mask)
        total_pixels = h * w
        motion_intensity = motion_pixels / total_pixels

        # --- 2. Optical Flow (Farneback) ---
        flow_magnitude = 0.0
        if machine_id in self._prev_grays:
            prev_gray = self._prev_grays[machine_id]
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, gray,
                None,
                pyr_scale=0.5,
                levels=3,
                winsize=15,
                iterations=3,
                poly_n=5,
                poly_sigma=1.2,
                flags=0,
            )
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_magnitude = float(np.mean(mag))

        self._prev_grays[machine_id] = gray

        # --- 3. Zone Analysis (quadrants Q1-Q4) ---
        mid_h, mid_w = h // 2, w // 2
        zones = {
            "Q1": fg_mask[:mid_h, :mid_w],       # Top-left
            "Q2": fg_mask[:mid_h, mid_w:],        # Top-right
            "Q3": fg_mask[mid_h:, :mid_w],        # Bottom-left
            "Q4": fg_mask[mid_h:, mid_w:],        # Bottom-right
        }
        active_zones = {}
        for zone_name, zone_mask in zones.items():
            zone_motion = np.count_nonzero(zone_mask) / zone_mask.size
            active_zones[zone_name] = round(zone_motion, 4)

        # --- 4. State Classification ---
        state, confidence = self._classify_state(
            motion_intensity, flow_magnitude, active_zones, len(previous_frames)
        )

        return MachineStateResult(
            state=state,
            confidence=confidence,
            motion_intensity=round(motion_intensity, 4),
            flow_magnitude=round(flow_magnitude, 4),
            active_zones=active_zones,
        )

    def _classify_state(
        self,
        motion_intensity: float,
        flow_magnitude: float,
        active_zones: dict[str, float],
        frame_count: int,
    ) -> tuple[MachineState, float]:
        """Classify machine state from motion metrics."""
        # Need at least a few frames for reliable classification
        if frame_count < 3:
            return MachineState.UNKNOWN, 0.3

        th_op = settings.motion_threshold_operating
        th_idle = settings.motion_threshold_idle
        fl_op = settings.optical_flow_operating
        fl_idle = settings.optical_flow_idle

        # High motion + high flow = OPERATING
        if motion_intensity >= th_op and flow_magnitude >= fl_op:
            confidence = min(0.95, 0.7 + motion_intensity + (flow_magnitude / 10))
            return MachineState.OPERATING, round(confidence, 2)

        # Moderate motion OR moderate flow = likely OPERATING
        if motion_intensity >= th_op or flow_magnitude >= fl_op:
            confidence = min(0.85, 0.5 + motion_intensity + (flow_magnitude / 10))
            return MachineState.OPERATING, round(confidence, 2)

        # Some motion but below operating threshold = IDLE
        if motion_intensity >= th_idle or flow_magnitude >= fl_idle:
            confidence = min(0.85, 0.6 + (1.0 - motion_intensity))
            return MachineState.IDLE, round(confidence, 2)

        # Very little motion = OFF
        confidence = min(0.90, 0.7 + (1.0 - motion_intensity))
        return MachineState.OFF, round(confidence, 2)

    def reset(self, machine_id: str):
        """Reset state for a machine (e.g., after reconfiguration)."""
        self._bg_subtractors.pop(machine_id, None)
        self._prev_grays.pop(machine_id, None)


# Singleton
_analyzer: MachineStateAnalyzer | None = None


def get_machine_state_analyzer() -> MachineStateAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = MachineStateAnalyzer()
    return _analyzer
