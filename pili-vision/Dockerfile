FROM python:3.11-slim

# System dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch CPU-only first (avoids 2GB CUDA download)
COPY requirements.txt .
RUN pip install --no-cache-dir \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    torch==2.5.1+cpu torchvision==0.20.1+cpu \
    && pip install --no-cache-dir -r requirements.txt

# Download YOLOv11 nano weights at build time
RUN python -c "from ultralytics import YOLO; YOLO('yolo11n.pt')"

# Copy application
COPY app/ ./app/
COPY weights/ ./weights/

ENV PORT=8000
EXPOSE 8000

# No Docker HEALTHCHECK — Railway uses its own via railway.json

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1
