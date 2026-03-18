"""Anomaly detection via histogram and structural comparison."""

import logging
from dataclasses import dataclass

import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AnomalyResult:
    is_anomalous: bool
    anomaly_score: float       # 0.0 = normal, 1.0 = highly anomalous
    anomaly_type: str | None   # "lighting", "obstruction", "displacement", None
    description: str | None


class AnomalyDetector:
    """Detects visual anomalies by comparing current frame to baseline."""

    # Thresholds
    HISTOGRAM_ANOMALY = 0.45    # Correlation below this = lighting anomaly
    STRUCTURAL_ANOMALY = 0.55   # SSIM below this = obstruction/displacement
    BLUR_ANOMALY = 30.0         # Laplacian variance below this = blur/obstruction

    def analyze(
        self,
        current: np.ndarray,
        baseline_frames: list[np.ndarray],
    ) -> AnomalyResult:
        """Compare current frame against baseline (average of recent frames)."""
        if len(baseline_frames) < 5:
            return AnomalyResult(
                is_anomalous=False,
                anomaly_score=0.0,
                anomaly_type=None,
                description=None,
            )

        gray_current = cv2.cvtColor(current, cv2.COLOR_BGR2GRAY)

        # Build baseline from median of recent frames
        gray_baselines = [
            cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in baseline_frames[-10:]
        ]
        baseline = np.median(np.stack(gray_baselines), axis=0).astype(np.uint8)

        scores: list[tuple[float, str, str]] = []

        # 1. Histogram correlation (lighting changes)
        hist_current = cv2.calcHist([gray_current], [0], None, [256], [0, 256])
        hist_baseline = cv2.calcHist([baseline], [0], None, [256], [0, 256])
        cv2.normalize(hist_current, hist_current)
        cv2.normalize(hist_baseline, hist_baseline)
        correlation = cv2.compareHist(hist_current, hist_baseline, cv2.HISTCMP_CORREL)

        if correlation < self.HISTOGRAM_ANOMALY:
            anomaly_score = 1.0 - correlation
            scores.append((
                anomaly_score,
                "lighting",
                f"Mudanca significativa de iluminacao (correlacao: {correlation:.2f})",
            ))

        # 2. Blur detection (camera obstruction)
        blur_score = cv2.Laplacian(gray_current, cv2.CV_64F).var()
        if blur_score < self.BLUR_ANOMALY:
            anomaly_score = 1.0 - (blur_score / self.BLUR_ANOMALY)
            scores.append((
                anomaly_score,
                "obstruction",
                f"Imagem borrada ou obstruida (nitidez: {blur_score:.1f})",
            ))

        # 3. Structural difference (large displacement)
        diff = cv2.absdiff(gray_current, baseline)
        _, thresh = cv2.threshold(diff, 50, 255, cv2.THRESH_BINARY)
        changed_ratio = np.count_nonzero(thresh) / thresh.size

        if changed_ratio > 0.60:
            scores.append((
                changed_ratio,
                "displacement",
                f"Grande alteracao na cena ({changed_ratio * 100:.0f}% da imagem diferente)",
            ))

        if not scores:
            return AnomalyResult(
                is_anomalous=False,
                anomaly_score=0.0,
                anomaly_type=None,
                description=None,
            )

        # Return worst anomaly
        worst = max(scores, key=lambda s: s[0])
        return AnomalyResult(
            is_anomalous=True,
            anomaly_score=min(worst[0], 1.0),
            anomaly_type=worst[1],
            description=worst[2],
        )


# Singleton
_anomaly_detector: AnomalyDetector | None = None


def get_anomaly_detector() -> AnomalyDetector:
    global _anomaly_detector
    if _anomaly_detector is None:
        _anomaly_detector = AnomalyDetector()
    return _anomaly_detector
