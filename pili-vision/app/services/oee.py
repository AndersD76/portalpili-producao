"""OEE (Overall Equipment Effectiveness) calculator from vision data.

OEE = Availability x Performance x Quality

For vision-based monitoring:
- Availability: % of shift time the machine was detected as "operating" or "idle"
  (vs "off" = unplanned downtime)
- Performance: ratio of actual operating time vs available time
  (operating / (operating + idle))
- Quality: defaults to 100% unless anomalies are detected
  (vision can detect scrap/defects with custom model)
"""

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class OEEMetrics:
    availability: float    # 0-100%
    performance: float     # 0-100%
    quality: float         # 0-100%
    oee: float             # 0-100%
    operating_minutes: float
    idle_minutes: float
    off_minutes: float
    total_minutes: float


def calculate_oee(
    state_history: list[dict],
    interval_seconds: float = 5.0,
) -> OEEMetrics:
    """Calculate OEE from a list of state observations.

    Args:
        state_history: List of {"state": "operating"|"idle"|"off", "timestamp": float}
        interval_seconds: Time between observations (default 5s = ESP32 upload interval)
    """
    if len(state_history) < 2:
        return OEEMetrics(
            availability=0, performance=0, quality=100,
            oee=0, operating_minutes=0, idle_minutes=0,
            off_minutes=0, total_minutes=0,
        )

    interval_min = interval_seconds / 60.0

    operating_count = sum(1 for s in state_history if s["state"] == "operating")
    idle_count = sum(1 for s in state_history if s["state"] == "idle")
    off_count = sum(1 for s in state_history if s["state"] == "off")
    total = len(state_history)

    operating_min = operating_count * interval_min
    idle_min = idle_count * interval_min
    off_min = off_count * interval_min
    total_min = total * interval_min

    # Availability: machine was ON (operating or idle) vs total time
    available_count = operating_count + idle_count
    availability = (available_count / total * 100) if total > 0 else 0

    # Performance: of the available time, how much was actually producing
    performance = (operating_count / available_count * 100) if available_count > 0 else 0

    # Quality: 100% default (needs custom model for defect detection)
    quality = 100.0

    oee = (availability * performance * quality) / 10000

    return OEEMetrics(
        availability=round(availability, 1),
        performance=round(performance, 1),
        quality=round(quality, 1),
        oee=round(oee, 1),
        operating_minutes=round(operating_min, 1),
        idle_minutes=round(idle_min, 1),
        off_minutes=round(off_min, 1),
        total_minutes=round(total_min, 1),
    )
