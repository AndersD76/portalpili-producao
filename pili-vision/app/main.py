"""Pili Vision Engine — Industrial Machine Monitoring via Computer Vision.

FastAPI microservice that receives camera snapshots and returns:
- Machine state (operating / idle / off)
- Operator presence (person detection via YOLOv11)
- Motion analysis (MOG2 background subtraction + optical flow)
- Anomaly detection (lighting, obstruction, displacement)
- OEE metrics (availability, performance, quality)
"""

import logging
import time
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from app.config import settings
from app.analyzers.machine_state import get_machine_state_analyzer, MachineState
from app.analyzers.operator import analyze_operator
from app.models.anomaly import get_anomaly_detector
from app.models.detector import get_detector
from app.services.frame_buffer import get_frame_buffer
from app.services.oee import calculate_oee

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("pili-vision")

# Cooldown tracking
_last_analysis: dict[str, float] = {}
# State history for OEE (per machine)
_state_history: dict[str, list[dict]] = {}
MAX_STATE_HISTORY = 17_280  # 24h at 5s intervals


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up models on startup."""
    logger.info("=== Pili Vision Engine starting ===")
    logger.info("Loading YOLOv11 model...")
    get_detector()
    logger.info("Initializing analyzers...")
    get_machine_state_analyzer()
    get_anomaly_detector()
    logger.info("=== Pili Vision Engine ready ===")
    yield
    logger.info("=== Pili Vision Engine shutting down ===")


app = FastAPI(
    title="Pili Vision Engine",
    description="Industrial machine monitoring via computer vision",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "engine": "pili-vision",
        "version": "1.0.0",
        "model": settings.yolo_model,
    }


@app.post("/analyze/{machine_id}")
async def analyze_snapshot(
    machine_id: str,
    file: UploadFile = File(...),
    x_pili_key: str | None = Header(None),
):
    """Analyze a camera snapshot for a machine.

    Receives a JPEG image and returns comprehensive analysis:
    - machine_status: operating | idle | off | unknown
    - operator_present: boolean
    - motion metrics: intensity, flow, zones
    - anomalies: if any visual anomaly detected
    - oee: current shift OEE metrics
    """
    # Auth check
    if settings.api_key and x_pili_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Cooldown check
    now = time.time()
    last = _last_analysis.get(machine_id, 0)
    if now - last < settings.analysis_cooldown_seconds:
        remaining = settings.analysis_cooldown_seconds - (now - last)
        return JSONResponse(
            status_code=429,
            content={
                "error": "cooldown",
                "retry_after_seconds": round(remaining, 1),
            },
        )

    # Read and decode image
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image")

    np_arr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image format")

    _last_analysis[machine_id] = now

    # --- Store frame in buffer ---
    frame_buffer = get_frame_buffer()
    frame_id = frame_buffer.add_frame(machine_id, frame)
    previous_frames = frame_buffer.get_frames(machine_id)

    # --- 1. Person Detection (YOLOv11) ---
    detector = get_detector()
    detections = detector.detect(frame)
    operator = analyze_operator(detections, frame.shape)

    # --- 2. Machine State (MOG2 + Optical Flow) ---
    state_analyzer = get_machine_state_analyzer()
    machine_state = state_analyzer.analyze(machine_id, frame, previous_frames)

    # --- 3. Anomaly Detection ---
    anomaly_detector = get_anomaly_detector()
    anomaly = anomaly_detector.analyze(frame, previous_frames)

    # --- 4. OEE Tracking ---
    if machine_id not in _state_history:
        _state_history[machine_id] = []

    _state_history[machine_id].append({
        "state": machine_state.state.value,
        "timestamp": now,
    })

    # Trim history
    if len(_state_history[machine_id]) > MAX_STATE_HISTORY:
        _state_history[machine_id] = _state_history[machine_id][-MAX_STATE_HISTORY:]

    oee = calculate_oee(_state_history[machine_id])

    # --- 5. Build observations ---
    observations = _build_observations(machine_state, operator, anomaly)

    # --- Response ---
    result = {
        "machine_id": machine_id,
        "frame_id": frame_id,
        "timestamp": now,
        "machine_status": machine_state.state.value,
        "confidence": machine_state.confidence,
        "operator_present": operator.present,
        "operator_count": operator.count,
        "operator_confidence": round(operator.confidence, 2),
        "operator_zone": operator.zone,
        "operator_near_machine": operator.near_machine,
        "motion": {
            "intensity": machine_state.motion_intensity,
            "flow_magnitude": machine_state.flow_magnitude,
            "zones": machine_state.active_zones,
        },
        "anomaly": {
            "detected": anomaly.is_anomalous,
            "score": round(anomaly.anomaly_score, 3),
            "type": anomaly.anomaly_type,
            "description": anomaly.description,
        } if anomaly.is_anomalous else None,
        "oee": {
            "availability": oee.availability,
            "performance": oee.performance,
            "quality": oee.quality,
            "oee": oee.oee,
            "operating_minutes": oee.operating_minutes,
            "idle_minutes": oee.idle_minutes,
            "off_minutes": oee.off_minutes,
        },
        "observations": observations,
        "objects_detected": [
            {
                "class": obj.class_name,
                "confidence": round(obj.confidence, 2),
            }
            for obj in detections.objects[:5]  # Top 5 objects
        ],
    }

    logger.info(
        "[%s] status=%s operator=%s motion=%.3f flow=%.3f oee=%.1f%%",
        machine_id[:8],
        machine_state.state.value,
        operator.present,
        machine_state.motion_intensity,
        machine_state.flow_magnitude,
        oee.oee,
    )

    return result


@app.get("/oee/{machine_id}")
async def get_oee(
    machine_id: str,
    x_pili_key: str | None = Header(None),
):
    """Get current OEE metrics for a machine."""
    if settings.api_key and x_pili_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    history = _state_history.get(machine_id, [])
    oee = calculate_oee(history)

    return {
        "machine_id": machine_id,
        "oee": {
            "availability": oee.availability,
            "performance": oee.performance,
            "quality": oee.quality,
            "oee": oee.oee,
            "operating_minutes": oee.operating_minutes,
            "idle_minutes": oee.idle_minutes,
            "off_minutes": oee.off_minutes,
            "total_minutes": oee.total_minutes,
        },
        "total_observations": len(history),
    }


@app.post("/reset/{machine_id}")
async def reset_machine(
    machine_id: str,
    x_pili_key: str | None = Header(None),
):
    """Reset all state for a machine (e.g., after reconfiguration)."""
    if settings.api_key and x_pili_key != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    get_frame_buffer().clear(machine_id)
    get_machine_state_analyzer().reset(machine_id)
    _state_history.pop(machine_id, None)
    _last_analysis.pop(machine_id, None)

    return {"status": "ok", "machine_id": machine_id}


def _build_observations(machine_state, operator, anomaly) -> str:
    """Build a human-readable observation string in Portuguese."""
    parts = []

    # Machine state
    state_labels = {
        MachineState.OPERATING: "Maquina em operacao",
        MachineState.IDLE: "Maquina parada (ligada)",
        MachineState.OFF: "Maquina desligada",
        MachineState.UNKNOWN: "Estado da maquina indeterminado",
    }
    parts.append(
        f"{state_labels[machine_state.state]} "
        f"(confianca: {machine_state.confidence * 100:.0f}%)"
    )

    # Motion detail
    if machine_state.motion_intensity > 0.001:
        parts.append(
            f"Movimento detectado: {machine_state.motion_intensity * 100:.1f}% da imagem"
        )

    # Operator
    parts.append(operator.observations)

    # Anomaly
    if anomaly.is_anomalous and anomaly.description:
        parts.append(f"ALERTA: {anomaly.description}")

    return ". ".join(parts)
