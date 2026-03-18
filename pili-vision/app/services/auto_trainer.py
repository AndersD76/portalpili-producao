"""Auto-training service — collects high-confidence frames automatically.

Instead of manual labeling, the system uses its own high-confidence
detections to build a training dataset over time. When enough samples
are collected (50+ per class), it can trigger fine-tuning.

How it works:
1. Every analysis produces a state classification with confidence
2. When confidence >= 0.80, the frame is saved as a training sample
3. Frames are stored in /data/training/{machine_id}/{state}/
4. After 50+ samples per class, the model can be fine-tuned
5. Fine-tuned model replaces the generic classifier

This is semi-supervised learning: the initial heuristic-based classifier
(MOG2 + optical flow) generates pseudo-labels, and the neural network
learns to be more accurate from these examples over time.
"""

import logging
import os
import time
from dataclasses import dataclass

import cv2
import numpy as np

logger = logging.getLogger(__name__)

TRAINING_DIR = os.environ.get("TRAINING_DIR", "/data/training")
# Minimum confidence to auto-label a frame
MIN_CONFIDENCE = 0.80
# Max samples per class per machine (to avoid disk bloat)
MAX_SAMPLES_PER_CLASS = 500
# Only save every N-th qualifying frame (avoid saving too many similar frames)
SAVE_INTERVAL_SECONDS = 60


@dataclass
class TrainingSample:
    machine_id: str
    state: str
    confidence: float
    operator_present: bool
    filepath: str
    timestamp: float


class AutoTrainer:
    """Automatically collects labeled training samples from high-confidence detections."""

    def __init__(self):
        self._last_save: dict[str, float] = {}  # machine_id -> last save time
        self._counts: dict[str, dict[str, int]] = {}  # machine_id -> {state: count}
        os.makedirs(TRAINING_DIR, exist_ok=True)
        # Load existing counts
        self._scan_existing()

    def _scan_existing(self):
        """Scan existing training data to get counts."""
        if not os.path.exists(TRAINING_DIR):
            return
        for machine_dir in os.listdir(TRAINING_DIR):
            machine_path = os.path.join(TRAINING_DIR, machine_dir)
            if not os.path.isdir(machine_path):
                continue
            self._counts[machine_dir] = {}
            for state_dir in os.listdir(machine_path):
                state_path = os.path.join(machine_path, state_dir)
                if not os.path.isdir(state_path):
                    continue
                count = len([f for f in os.listdir(state_path) if f.endswith(".jpg")])
                self._counts[machine_dir][state_dir] = count
                if count > 0:
                    logger.info(
                        "Found %d existing training samples: %s/%s",
                        count, machine_dir[:8], state_dir
                    )

    def maybe_save(self, machine_id: str, frame: np.ndarray,
                   machine_state, operator) -> bool:
        """Save frame as training sample if confidence is high enough."""
        confidence = machine_state.confidence
        state = machine_state.state.value

        # Skip low-confidence or unknown states
        if confidence < MIN_CONFIDENCE or state == "unknown":
            return False

        # Throttle saves per machine
        now = time.time()
        last = self._last_save.get(machine_id, 0)
        if now - last < SAVE_INTERVAL_SECONDS:
            return False

        # Check max samples
        if machine_id not in self._counts:
            self._counts[machine_id] = {}
        current_count = self._counts[machine_id].get(state, 0)
        if current_count >= MAX_SAMPLES_PER_CLASS:
            return False

        # Save frame
        save_dir = os.path.join(TRAINING_DIR, machine_id[:12], state)
        os.makedirs(save_dir, exist_ok=True)

        timestamp = int(now)
        op_flag = "op1" if operator.present else "op0"
        filename = f"{timestamp}_{state}_{op_flag}_c{int(confidence*100)}.jpg"
        filepath = os.path.join(save_dir, filename)

        # Resize to training size (224x224) before saving
        resized = cv2.resize(frame, (224, 224), interpolation=cv2.INTER_AREA)
        cv2.imwrite(filepath, resized, [cv2.IMWRITE_JPEG_QUALITY, 90])

        self._last_save[machine_id] = now
        self._counts[machine_id][state] = current_count + 1

        logger.info(
            "[AUTO-TRAIN] Saved %s/%s #%d (conf=%.0f%% op=%s)",
            machine_id[:8], state, current_count + 1,
            confidence * 100, operator.present
        )

        return True

    def get_stats(self) -> dict:
        """Get training stats for all machines."""
        return {
            machine_id: {
                **counts,
                "total": sum(counts.values()),
                "ready": all(
                    counts.get(s, 0) >= 50
                    for s in ["operating", "idle", "off"]
                ),
            }
            for machine_id, counts in self._counts.items()
        }

    def get_machine_stats(self, machine_id: str) -> dict:
        """Get training stats for a specific machine."""
        short_id = machine_id[:12]
        counts = self._counts.get(short_id, {})
        return {
            "operating": counts.get("operating", 0),
            "idle": counts.get("idle", 0),
            "off": counts.get("off", 0),
            "total": sum(counts.values()) if counts else 0,
            "ready": all(
                counts.get(s, 0) >= 50
                for s in ["operating", "idle", "off"]
            ),
            "min_per_class": 50,
            "max_per_class": MAX_SAMPLES_PER_CLASS,
        }


# Singleton
_trainer: AutoTrainer | None = None


def get_auto_trainer() -> AutoTrainer:
    global _trainer
    if _trainer is None:
        _trainer = AutoTrainer()
    return _trainer
