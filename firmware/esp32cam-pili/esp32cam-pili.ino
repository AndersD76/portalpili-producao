/*
 * PILI_CAM — ESP32-CAM Firmware
 * Portal Pili Machine Monitoring System
 *
 * Hardware: ESP32-CAM (AI-Thinker)
 * Features:
 *   - Motion detection via frame differencing
 *   - Zone-based analysis (Q1-Q4 quadrants)
 *   - HTTP snapshot server (/capture)
 *   - Event posting to Portal Pili backend
 *   - Heartbeat + idle detection
 *   - WiFi auto-reconnect
 *   - OTA update support
 *
 * Configuration:
 *   Edit config.h or use Serial commands
 */

#include "esp_camera.h"
#include "esp_timer.h"
#include "esp_http_server.h"
#include "WiFi.h"
#include "HTTPClient.h"
#include "WiFiClientSecure.h"
#include "ArduinoJson.h"
#include <EEPROM.h>

// ============================================
// CONFIGURATION — Edit these for your setup
// ============================================

// WiFi
#define WIFI_SSID          "ANDERS 2.4"
#define WIFI_PASSWORD      "Maier87@"
#define WIFI_TIMEOUT_MS    15000

// Server (Portal Pili backend)
#define SERVER_URL         "https://portalpili-producao-production.up.railway.app"
// For local dev: "http://192.168.1.100:3000"

// Machine identity — CHANGE PER DEVICE
#define MACHINE_ID         "34dacb1a-943c-4018-bcc8-838c397092c2"
#define API_KEY            "7e339f7282d4cfbabc0561739aceca0de2fc4571b1262892a7f8ed3362b481c5"

// Detection thresholds
#define MOTION_THRESHOLD   15       // Pixel diff threshold (0-255)
#define MOTION_MIN_PIXELS  500      // Min changed pixels to trigger motion
#define IDLE_TIMEOUT_SEC   30       // Seconds without motion = idle event
#define HEARTBEAT_SEC      60       // Heartbeat interval
#define SNAPSHOT_UPLOAD_SEC 5       // Upload snapshot to server interval (VGA quality)

// Camera resolution — VGA only (no resolution switching to avoid FB-OVF)
#define FRAME_SIZE         FRAMESIZE_VGA   // 640x480
#define SNAPSHOT_SIZE      FRAMESIZE_VGA   // 640x480

// ============================================
// AI-Thinker ESP32-CAM pin definitions
// ============================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define FLASH_GPIO_NUM     4

// ============================================
// Global state
// ============================================

static httpd_handle_t camera_httpd = NULL;
static uint8_t* prev_frame = NULL;
static size_t prev_frame_len = 0;
static unsigned long last_motion_time = 0;
static unsigned long last_heartbeat_time = 0;
static unsigned long last_snapshot_upload = 0;
static unsigned long last_idle_sent = 0;
static unsigned long boot_time = 0;
static bool idle_sent = false;
static bool wifi_connected = false;

// Zone motion counters
struct ZoneMotion {
  int q1; // top-left
  int q2; // top-right
  int q3; // bottom-left
  int q4; // bottom-right
  int total;
};

// ============================================
// Camera initialization
// ============================================

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_LATEST;

  // Use PSRAM if available
  if (psramFound()) {
    config.frame_size = FRAME_SIZE;
    config.jpeg_quality = 12;
    config.fb_count = 2;
    config.fb_location = CAMERA_FB_IN_PSRAM;
    Serial.println("[CAM] PSRAM found, using dual framebuffer");
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
    config.fb_location = CAMERA_FB_IN_DRAM;
    Serial.println("[CAM] No PSRAM, using single framebuffer");
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed: 0x%x\n", err);
    return false;
  }

  // Adjust sensor settings for industrial environment
  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 1);       // Slightly higher contrast
    s->set_saturation(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);        // Auto
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 1);           // Auto exposure level
    s->set_gain_ctrl(s, 1);
    s->set_agc_gain(s, 0);
    s->set_gainceiling(s, (gainceiling_t)6);
    s->set_bpc(s, 1);            // Black pixel correction
    s->set_wpc(s, 1);            // White pixel correction
    s->set_raw_gma(s, 1);
    s->set_lenc(s, 1);           // Lens correction
    s->set_dcw(s, 1);
  }

  Serial.println("[CAM] Camera initialized");
  return true;
}

// ============================================
// WiFi connection
// ============================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifi_connected = true;
    return;
  }

  Serial.printf("[WIFI] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifi_connected = true;
    Serial.printf("\n[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WIFI] MAC: %s\n", WiFi.macAddress().c_str());
  } else {
    wifi_connected = false;
    Serial.println("\n[WIFI] Connection failed, will retry...");
  }
}

// ============================================
// HTTP Snapshot Server (for /capture endpoint)
// ============================================

static esp_err_t capture_handler(httpd_req_t *req) {
  // Temporarily switch to higher resolution for snapshot
  sensor_t* s = esp_camera_sensor_get();
  if (s) s->set_framesize(s, SNAPSHOT_SIZE);
  delay(100); // Let sensor adjust

  camera_fb_t* fb = esp_camera_fb_get();

  // Switch back to motion detection resolution
  if (s) s->set_framesize(s, FRAME_SIZE);

  if (!fb) {
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=snapshot.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  httpd_resp_set_hdr(req, "Cache-Control", "no-cache, no-store, must-revalidate");

  esp_err_t res = httpd_resp_send(req, (const char*)fb->buf, fb->len);
  esp_camera_fb_return(fb);

  return res;
}

static esp_err_t status_handler(httpd_req_t *req) {
  char json[256];
  snprintf(json, sizeof(json),
    "{\"device_id\":\"%s\",\"machine_id\":\"%s\",\"uptime\":%lu,\"wifi_rssi\":%d,\"free_heap\":%u,\"psram_free\":%u}",
    WiFi.macAddress().c_str(),
    MACHINE_ID,
    (millis() - boot_time) / 1000,
    WiFi.RSSI(),
    ESP.getFreeHeap(),
    ESP.getFreePsram()
  );

  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_sendstr(req, json);
}

void startHTTPServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port = 32768;

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    // /capture — JPEG snapshot
    httpd_uri_t capture_uri = {
      .uri = "/capture",
      .method = HTTP_GET,
      .handler = capture_handler,
      .user_ctx = NULL
    };
    httpd_register_uri_handler(camera_httpd, &capture_uri);

    // /status — device info
    httpd_uri_t status_uri = {
      .uri = "/status",
      .method = HTTP_GET,
      .handler = status_handler,
      .user_ctx = NULL
    };
    httpd_register_uri_handler(camera_httpd, &status_uri);

    Serial.println("[HTTP] Server started on port 80");
  } else {
    Serial.println("[HTTP] Failed to start server");
  }
}

// ============================================
// Motion Detection (frame differencing)
// ============================================

ZoneMotion detectMotion(camera_fb_t* fb) {
  ZoneMotion motion = {0, 0, 0, 0, 0};

  if (!prev_frame || prev_frame_len != fb->len) {
    // First frame or size changed — store and skip
    if (prev_frame) free(prev_frame);
    prev_frame = (uint8_t*)malloc(fb->len);
    if (prev_frame) {
      memcpy(prev_frame, fb->buf, fb->len);
      prev_frame_len = fb->len;
    }
    return motion;
  }

  // Simple frame differencing on raw JPEG data
  // For better accuracy, use grayscale frames, but JPEG works for gross motion
  int width = 320;  // QVGA
  int height = 240;
  int half_w = width / 2;
  int half_h = height / 2;

  // Compare pixels (approximate — JPEG is compressed, so we sample)
  int sample_step = 4; // Check every 4th byte
  int changed = 0;

  for (size_t i = 0; i < fb->len && i < prev_frame_len; i += sample_step) {
    int diff = abs((int)fb->buf[i] - (int)prev_frame[i]);
    if (diff > MOTION_THRESHOLD) {
      changed++;

      // Approximate zone based on position in buffer
      float pos = (float)i / (float)fb->len;
      if (pos < 0.25) motion.q1++;
      else if (pos < 0.5) motion.q2++;
      else if (pos < 0.75) motion.q3++;
      else motion.q4++;
    }
  }

  motion.total = changed;

  // Update previous frame
  memcpy(prev_frame, fb->buf, fb->len);

  return motion;
}

float getZoneIntensity(ZoneMotion& motion) {
  if (motion.total == 0) return 0.0;
  // Normalize to 0-1 range
  float intensity = (float)motion.total / (float)(prev_frame_len / 4); // sample_step=4
  return min(intensity * 5.0f, 1.0f); // Scale up and cap at 1.0
}

String getMaxZone(ZoneMotion& motion) {
  int maxVal = max(max(motion.q1, motion.q2), max(motion.q3, motion.q4));
  if (maxVal == 0) return "ALL";
  if (maxVal == motion.q1) return "Q1";
  if (maxVal == motion.q2) return "Q2";
  if (maxVal == motion.q3) return "Q3";
  return "Q4";
}

// ============================================
// Send event to Portal Pili
// ============================================

bool sendEvent(const char* eventType, float intensity, const char* zone,
               int piecesCount = 0, int cycleTime = 0) {
  if (!wifi_connected || WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();  // Skip certificate verification (Railway uses LE certs)

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/machines/" + MACHINE_ID + "/motion-events";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Pili-Key", API_KEY);
  http.setTimeout(5000);

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["machine_id"] = MACHINE_ID;
  doc["device_id"] = WiFi.macAddress();
  doc["event_type"] = eventType;
  doc["intensity"] = intensity;
  doc["zone"] = zone;
  doc["timestamp"] = getISO8601Time();
  doc["uptime_seconds"] = (millis() - boot_time) / 1000;

  if (piecesCount > 0) doc["pieces_count"] = piecesCount;
  if (cycleTime > 0) doc["cycle_time_seconds"] = cycleTime;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  bool success = (httpCode == 200);

  if (!success) {
    Serial.printf("[HTTP] POST failed: %d\n", httpCode);
  } else {
    Serial.printf("[EVENT] %s sent (intensity: %.2f, zone: %s)\n", eventType, intensity, zone);
  }

  http.end();
  return success;
}

// ============================================
// Upload snapshot to server (so cloud portal can display it)
// ============================================

bool uploadSnapshot() {
  if (!wifi_connected || WiFi.status() != WL_CONNECTED) return false;

  camera_fb_t* fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("[SNAP] Capture failed");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/machines/" + MACHINE_ID + "/snapshot";

  http.begin(client, url);
  http.addHeader("Content-Type", "image/jpeg");
  http.addHeader("X-Pili-Key", API_KEY);
  http.setTimeout(10000);

  int httpCode = http.POST(fb->buf, fb->len);
  bool success = (httpCode == 200);

  if (!success) {
    Serial.printf("[SNAP] Upload failed: %d\n", httpCode);
  }

  http.end();
  esp_camera_fb_return(fb);

  return success;
}

// ============================================
// Time utilities
// ============================================

String getISO8601Time() {
  // ESP32 doesn't have RTC, use millis-based approximation
  // For production: use NTP sync
  unsigned long uptime = millis() / 1000;
  char buf[32];
  snprintf(buf, sizeof(buf), "2026-01-01T%02lu:%02lu:%02luZ",
    (uptime / 3600) % 24, (uptime / 60) % 60, uptime % 60);
  return String(buf);
}

// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  Serial.println("\n=============================");
  Serial.println("  PILI_CAM ESP32 Firmware");
  Serial.println("  Portal Pili v1.0");
  Serial.println("=============================");

  boot_time = millis();

  // Initialize flash LED as output (off by default)
  pinMode(FLASH_GPIO_NUM, OUTPUT);
  digitalWrite(FLASH_GPIO_NUM, LOW);

  // Initialize camera
  if (!initCamera()) {
    Serial.println("[FATAL] Camera init failed, restarting in 5s...");
    delay(5000);
    ESP.restart();
  }

  // Connect WiFi
  connectWiFi();

  // Start HTTP server for /capture
  if (wifi_connected) {
    startHTTPServer();
  }

  Serial.println("[SETUP] Ready!");
  Serial.printf("[SETUP] Machine ID: %s\n", MACHINE_ID);
  Serial.printf("[SETUP] Server: %s\n", SERVER_URL);

  last_motion_time = millis();
  last_heartbeat_time = millis();
}

// ============================================
// MAIN LOOP
// ============================================

void loop() {
  unsigned long now = millis();

  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    if (wifi_connected) {
      Serial.println("[WIFI] Disconnected, reconnecting...");
      wifi_connected = false;
    }
    connectWiFi();
    if (wifi_connected) startHTTPServer();
    delay(1000);
    return;
  }

  // ---- Upload snapshot to server (AI vision analysis happens server-side) ----
  if (now - last_snapshot_upload > SNAPSHOT_UPLOAD_SEC * 1000) {
    uploadSnapshot();
    last_snapshot_upload = now;
  }

  // ---- Upload snapshot to server ----
  if (now - last_snapshot_upload > SNAPSHOT_UPLOAD_SEC * 1000) {
    uploadSnapshot();
    last_snapshot_upload = now;
  }

  // ---- Heartbeat ----
  if (now - last_heartbeat_time > HEARTBEAT_SEC * 1000) {
    sendEvent("heartbeat", 0.0, "ALL");
    last_heartbeat_time = now;
  }

  // ---- Frame rate control ----
  // Process ~2 frames/sec for motion, saves power
  delay(500);
}
