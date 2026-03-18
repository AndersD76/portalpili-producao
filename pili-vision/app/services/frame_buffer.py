"""Per-machine frame buffer for temporal analysis."""

import time
import logging
from collections import deque
from dataclasses import dataclass, field

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class FrameEntry:
    frame: np.ndarray
    timestamp: float
    frame_id: int


class FrameBuffer:
    """Thread-safe circular buffer of recent frames per machine."""

    def __init__(self):
        self._buffers: dict[str, deque[FrameEntry]] = {}
        self._frame_counters: dict[str, int] = {}

    def add_frame(self, machine_id: str, frame: np.ndarray) -> int:
        """Add a frame to the buffer. Returns frame ID."""
        if machine_id not in self._buffers:
            self._buffers[machine_id] = deque(
                maxlen=settings.max_frames_per_machine
            )
            self._frame_counters[machine_id] = 0

        self._frame_counters[machine_id] += 1
        frame_id = self._frame_counters[machine_id]

        entry = FrameEntry(
            frame=frame,
            timestamp=time.time(),
            frame_id=frame_id,
        )
        self._buffers[machine_id].append(entry)

        return frame_id

    def get_frames(
        self, machine_id: str, count: int | None = None
    ) -> list[np.ndarray]:
        """Get recent frames for a machine."""
        buf = self._buffers.get(machine_id)
        if not buf:
            return []
        entries = list(buf)
        if count is not None:
            entries = entries[-count:]
        return [e.frame for e in entries]

    def get_frame_count(self, machine_id: str) -> int:
        return len(self._buffers.get(machine_id, []))

    def clear(self, machine_id: str):
        self._buffers.pop(machine_id, None)
        self._frame_counters.pop(machine_id, None)


# Singleton
_buffer: FrameBuffer | None = None


def get_frame_buffer() -> FrameBuffer:
    global _buffer
    if _buffer is None:
        _buffer = FrameBuffer()
    return _buffer
