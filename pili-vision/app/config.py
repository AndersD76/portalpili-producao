from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth
    api_key: str = ""

    # YOLOv11 settings
    yolo_model: str = "yolo11n.pt"
    yolo_confidence: float = 0.35
    person_confidence: float = 0.40

    # Machine state thresholds
    motion_threshold_operating: float = 0.025  # 2.5% of pixels changed = operating
    motion_threshold_idle: float = 0.005       # 0.5% = idle (small movements)
    optical_flow_operating: float = 2.0        # Mean flow magnitude for "operating"
    optical_flow_idle: float = 0.5             # Below this = truly still

    # Frame buffer
    max_frames_per_machine: int = 30  # Keep last 30 frames (~2.5 min at 5s interval)

    # Analysis
    analysis_cooldown_seconds: int = 10  # Min interval between analyses per machine

    # Callback
    callback_url: str = ""  # Next.js API URL to POST results back

    model_config = {"env_prefix": "PILI_VISION_"}


settings = Settings()
