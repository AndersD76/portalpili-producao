from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Auth
    api_key: str = ""

    # YOLOv11 settings
    yolo_model: str = "yolo11n.pt"
    yolo_confidence: float = 0.30
    person_confidence: float = 0.35

    # Machine state thresholds (ESP32-CAM has ~3-8% noise between frames)
    motion_threshold_operating: float = 0.10  # 10% of pixels changed = operating
    motion_threshold_idle: float = 0.03       # 3% = idle (filters out JPEG noise)
    optical_flow_operating: float = 3.0       # Mean flow magnitude for "operating"
    optical_flow_idle: float = 1.0            # Below this = truly still

    # Frame buffer
    max_frames_per_machine: int = 30

    # Analysis
    analysis_cooldown_seconds: int = 10

    # Callback
    callback_url: str = ""

    model_config = {"env_prefix": "PILI_VISION_"}


settings = Settings()
