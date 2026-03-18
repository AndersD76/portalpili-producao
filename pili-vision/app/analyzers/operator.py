"""Operator presence analyzer — wraps YOLOv11 person detection with
industrial-specific logic (zone tracking, dwell time, multi-person)."""

import logging
from dataclasses import dataclass

import numpy as np

from app.models.detector import DetectionResult

logger = logging.getLogger(__name__)


@dataclass
class OperatorAnalysis:
    present: bool
    count: int
    confidence: float
    zone: str                  # "left", "center", "right", "unknown"
    near_machine: bool         # Person occupies > 5% of frame (close to camera/machine)
    observations: str


def analyze_operator(detection: DetectionResult, frame_shape: tuple) -> OperatorAnalysis:
    """Analyze operator presence from YOLO detection results."""
    if not detection.operator_present:
        return OperatorAnalysis(
            present=False,
            count=0,
            confidence=0.0,
            zone="unknown",
            near_machine=False,
            observations="Nenhum operador detectado na area",
        )

    # Find the most prominent person (largest bounding box)
    primary = max(detection.persons, key=lambda d: d.area_ratio)
    near_machine = primary.area_ratio > 0.05  # Person covers > 5% of frame

    observations_parts = []
    observations_parts.append(
        f"{detection.person_count} operador(es) detectado(s)"
    )

    if near_machine:
        observations_parts.append("Operador proximo a maquina")
    else:
        observations_parts.append("Operador distante da maquina")

    observations_parts.append(f"Zona: {detection.operator_zone}")

    return OperatorAnalysis(
        present=True,
        count=detection.person_count,
        confidence=detection.operator_confidence,
        zone=detection.operator_zone,
        near_machine=near_machine,
        observations=". ".join(observations_parts),
    )
