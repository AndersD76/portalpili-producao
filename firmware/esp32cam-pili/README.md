# PILI_CAM — Firmware ESP32-CAM

## Hardware
- ESP32-CAM AI-Thinker
- Camera OV2640

## Configuração

Editar no arquivo `esp32cam-pili.ino`:

```cpp
#define WIFI_SSID      "SUA_REDE_WIFI"
#define WIFI_PASSWORD  "SUA_SENHA_WIFI"
#define SERVER_URL     "https://portal-pili.up.railway.app"
#define MACHINE_ID     "uuid-da-maquina"  // Do Portal Pili
#define API_KEY        "api-key-da-maquina" // Do /maquinas/{id}/configurar
```

## Upload (Arduino IDE)

1. Instalar ESP32 Board Support:
   - Preferences → Additional Boards Manager URLs:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board Manager → Instalar "esp32"

2. Instalar bibliotecas:
   - ArduinoJson (Benoit Blanchon)

3. Board: "AI Thinker ESP32-CAM"
4. Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
5. Upload Speed: 921600

## Endpoints HTTP

| Endpoint | Descrição |
|----------|-----------|
| `GET /capture` | Snapshot JPEG da câmera |
| `GET /status` | Info do dispositivo (MAC, uptime, memória) |

## Eventos enviados ao Portal

| Tipo | Quando |
|------|--------|
| `motion` | Movimento detectado (>500 pixels changed) |
| `idle` | 30s sem movimento |
| `heartbeat` | A cada 60s |

## Ajustes de sensibilidade

```cpp
#define MOTION_THRESHOLD   15   // Diff de pixel (0-255), menor = mais sensível
#define MOTION_MIN_PIXELS  500  // Min pixels alterados para trigger
#define IDLE_TIMEOUT_SEC   30   // Segundos sem motion = idle
```
