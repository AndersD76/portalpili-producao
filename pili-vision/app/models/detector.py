"""YOLOv11 object detector — person detection + general objects."""

import logging
from dataclasses import dataclass, field

import numpy as np
from ultralytics import YOLO

from app.config import settings

logger = logging.getLogger(__name__)

# COCO class IDs we care about
PERSON_CLASS = 0

# Industrial-relevant COCO classes for context
RELEVANT_CLASSES = {
    0: "person",
    56: "chair",
    57: "couch",
    58: "potted_plant",
    59: "bed",
    60: "dining_table",
    62: "tv",
    63: "laptop",
    64: "mouse",
    66: "keyboard",
    73: "book",
    39: "bottle",
    41: "cup",
}


@dataclass
class Detection:
    class_id: int
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2] normalized 0-1
    area_ratio: float  # fraction of image area


@dataclass
class DetectionResult:
    persons: list[Detection] = field(default_factory=list)
    objects: list[Detection] = field(default_factory=list)
    person_count: int = 0
    operator_present: bool = False
    operator_confidence: float = 0.0
    operator_zone: str = "unknown"  # left, center, right


class ObjectDetector:
    """YOLOv11-based detector optimized for industrial monitoring."""

    def __init__(self):
        logger.info("Loading YOLOv11 model: %s", settings.yolo_model)
        self.model = YOLO(settings.yolo_model)
        self.model.fuse()  # Fuse layers for faster inference
        logger.info("YOLOv11 model loaded successfully")

    def detect(self, frame: np.ndarray) -> DetectionResult:
        """Run detection on a single frame."""
        h, w = frame.shape[:2]
        img_area = h * w

        results = self.model.predict(
            frame,
            conf=settings.yolo_confidence,
            verbose=False,
            classes=list(RELEVANT_CLASSES.keys()),
        )

        result = DetectionResult()

        if not results or len(results[0].boxes) == 0:
            return result

        boxes = results[0].boxes
        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            xyxy = box.xyxy[0].cpu().numpy()

            # Normalize bbox to 0-1
            bbox_norm = [
                float(xyxy[0] / w),
                float(xyxy[1] / h),
                float(xyxy[2] / w),
                float(xyxy[3] / h),
            ]

            bbox_area = (xyxy[2] - xyxy[0]) * (xyxy[3] - xyxy[1])
            area_ratio = float(bbox_area / img_area)

            det = Detection(
                class_id=cls_id,
                class_name=RELEVANT_CLASSES.get(cls_id, f"class_{cls_id}"),
                confidence=conf,
                bbox=bbox_norm,
                area_ratio=area_ratio,
            )

            if cls_id == PERSON_CLASS and conf >= settings.person_confidence:
                result.persons.append(det)
            else:
                result.objects.append(det)

        result.person_count = len(result.persons)
        result.operator_present = result.person_count > 0

        if result.operator_present:
            best = max(result.persons, key=lambda d: d.confidence)
            result.operator_confidence = best.confidence

            # Determine zone (left/center/right third of image)
            center_x = (best.bbox[0] + best.bbox[2]) / 2
            if center_x < 0.33:
                result.operator_zone = "left"
            elif center_x < 0.66:
                result.operator_zone = "center"
            else:
                result.operator_zone = "right"

        return result


# Singleton
_detector: ObjectDetector | None = None


def get_detector() -> ObjectDetector:
    global _detector
    if _detector is None:
        _detector = ObjectDetector()
    return _detector
