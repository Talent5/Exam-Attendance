#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <time.h>

// WiFi credentials - UPDATE THESE WITH YOUR ACTUAL CREDENTIALS
const char* ssid = "YOUR_WIFI_SSID";         // Replace with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password

// Backend configuration
const char* baseURL = "https://exam-attendance-59tw.onrender.com";
const char* attendanceEndpoint = "/api/attendance/scan";
const char* enrollmentEndpoint = "/api/students";

// WebSocket configuration for real-time communication
const char* websocketHost = "exam-attendance-59tw.onrender.com"; // Without https://
const int websocketPort = 443; // 443 for HTTPS, 80 for HTTP
const char* websocketPath = "/socket.io/?EIO=4&transport=websocket&t=1234567890";

// RFID module pins
#define SS_PIN 5    // SDA -> GPIO5
#define RST_PIN 22  // RST -> GPIO22

// LED pins for status indication
#define LED_SUCCESS 2   // Green LED for successful scan
#define LED_ERROR 4     // Red LED for errors
#define LED_WIFI 16     // Blue LED for WiFi status
#define LED_MODE 17     // Yellow LED for mode indication

// Buzzer pin for audio feedback
#define BUZZER_PIN 25  // GPIO25 for buzzer

// Mode button pin (for hardware mode switching)
#define MODE_BUTTON_PIN 21  // GPIO21 for mode button

MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;

// Variables for connection management
unsigned long lastReconnectAttempt = 0;
const unsigned long reconnectInterval = 30000; // 30 seconds
int consecutiveFailures = 0;
const int maxConsecutiveFailures = 5;

// Variables for card reading protection
String lastCardUID = "";
unsigned long lastCardTime = 0;
const unsigned long cardReadDelay = 3000; // 3 seconds between same card reads

// Variables for system monitoring
unsigned long lastStatusPrint = 0;
const unsigned long statusInterval = 60000; // Print status every minute
unsigned long lastHeartbeat = 0;
const unsigned long heartbeatInterval = 30000; // Send heartbeat every 30 seconds

// Scanning modes
enum ScanMode {
  ENTRY_MODE = 0,
  EXIT_MODE = 1,
  ENROLLMENT_MODE = 2
};

// Current scanning mode
ScanMode currentMode = ENTRY_MODE;
String modeNames[] = {"ENTRY", "EXIT", "ENROLLMENT"};

// Mode switching variables
unsigned long lastModeSwitch = 0;
const unsigned long modeDebounceDelay = 2000; // 2 seconds debounce
bool buttonPressed = false;

// Enrollment data collection
struct EnrollmentData {
  String rfidUid;
  String name;
  String regNo;
  String course;
  bool isCollecting;
  int step; // 0=name, 1=regNo, 2=course, 3=confirm
};

EnrollmentData enrollmentBuffer;

// Time configuration for CAT (Central Africa Time - UTC+2)
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 2 * 3600;  // CAT is UTC+2 (2 hours * 3600 seconds)
const int daylightOffset_sec = 0;     // CAT doesn't observe daylight saving time

// WebSocket connection status
bool wsConnected = false;
unsigned long lastWsReconnect = 0;
const unsigned long wsReconnectInterval = 10000; // 10 seconds

// Function prototypes
void connectToWiFi();
bool sendAttendanceData(String uid, String entryType = "entry");
void blinkLED(int pin, int times);
String getTimestamp();
void printSystemStatus();
void playTone(int frequency, int duration);
void playSuccessSound();
void playErrorSound();
void playStartupSound();
void resetSystem();
bool checkRFIDHealth();
void testSystem();
void switchMode();
void setMode(ScanMode newMode);
void displayCurrentMode();
void playModeSound();
void clearEnrollmentBuffer();
bool handleEnrollmentScan(String uid);
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void sendWebSocketMessage(String message);
void sendStatusUpdate();
void handleWebSocketCommand(String command, JsonObject data);
void connectWebSocket();

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Print startup banner
  Serial.println("=================================");
  Serial.println("ESP32 RFID Attendance System v2.0");
  Serial.println("With WebSocket Support");
  Serial.println("=================================");
  
  // Initialize pins
  pinMode(LED_SUCCESS, OUTPUT);
  pinMode(LED_ERROR, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_MODE, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  
  // Turn off all LEDs initially
  digitalWrite(LED_SUCCESS, LOW);
  digitalWrite(LED_ERROR, LOW);
  digitalWrite(LED_WIFI, LOW);
  digitalWrite(LED_MODE, LOW);
  
  // Initialize SPI bus
  SPI.begin();
  rfid.PCD_Init();
  
  // Test RFID reader
  if (!checkRFIDHealth()) {
    Serial.println("⚠️ RFID reader may not be working properly!");
    blinkLED(LED_ERROR, 5);
  } else {
    Serial.println("✅ RFID reader initialized successfully");
    Serial.print("RFID Firmware Version: 0x");
    Serial.println(rfid.PCD_ReadRegister(rfid.VersionReg), HEX);
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize time synchronization
  Serial.println("Time synchronization started...");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
  // Wait for time to be set
  struct tm timeinfo;
  int attempts = 0;
  while (!getLocalTime(&timeinfo) && attempts < 10) {
    Serial.print(".");
    delay(1000);
    attempts++;
  }
  
  if (getLocalTime(&timeinfo)) {
    Serial.println("\n✅ Time synchronized successfully");
    Serial.println(getTimestamp());
  } else {
    Serial.println("\n⚠️ Time synchronization failed, using system time");
  }
  
  // Initialize WebSocket connection
  setupWebSocket();
  
  // Initialize enrollment buffer
  clearEnrollmentBuffer();
  
  // Set initial mode
  setMode(ENTRY_MODE);
  
  // Play startup sound
  playStartupSound();
  
  // Run system test
  testSystem();
  
  Serial.println("✅ System ready for RFID scanning!");
  Serial.println("Listening for cards and WebSocket commands...");
  printSystemStatus();
}

void loop() {
  // Handle WebSocket events
  webSocket.loop();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_WIFI, LOW);
    if (millis() - lastReconnectAttempt > reconnectInterval) {
      Serial.println("WiFi disconnected, attempting to reconnect...");
      connectToWiFi();
      lastReconnectAttempt = millis();
    }
    return;
  } else {
    digitalWrite(LED_WIFI, HIGH);
  }
  
  // Check WebSocket connection
  if (!wsConnected && millis() - lastWsReconnect > wsReconnectInterval) {
    Serial.println("WebSocket disconnected, attempting to reconnect...");
    connectWebSocket();
    lastWsReconnect = millis();
  }
  
  // Handle hardware mode button
  bool currentButtonState = digitalRead(MODE_BUTTON_PIN) == LOW;
  if (currentButtonState && !buttonPressed && millis() - lastModeSwitch > modeDebounceDelay) {
    buttonPressed = true;
    switchMode();
    lastModeSwitch = millis();
  } else if (!currentButtonState) {
    buttonPressed = false;
  }
  
  // Send periodic status updates via WebSocket
  if (millis() - lastHeartbeat > heartbeatInterval) {
    sendStatusUpdate();
    lastHeartbeat = millis();
  }
  
  // Print system status periodically
  if (millis() - lastStatusPrint > statusInterval) {
    printSystemStatus();
    lastStatusPrint = millis();
  }
  
  // Check for new RFID cards
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }
  
  // Read card UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "") + String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  // Prevent rapid duplicate reads
  if (uid == lastCardUID && millis() - lastCardTime < cardReadDelay) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastCardUID = uid;
  lastCardTime = millis();
  
  Serial.println("=== RFID Card Detected ===");
  Serial.println("UID: " + uid);
  Serial.println("Mode: " + modeNames[currentMode]);
  Serial.println("Timestamp: " + getTimestamp());
  
  bool success = false;
  
  // Handle based on current mode
  switch (currentMode) {
    case ENTRY_MODE:
      success = sendAttendanceData(uid, "entry");
      break;
      
    case EXIT_MODE:
      success = sendAttendanceData(uid, "exit");
      break;
      
    case ENROLLMENT_MODE:
      success = handleEnrollmentScan(uid);
      break;
  }
  
  // Provide feedback
  if (success) {
    consecutiveFailures = 0;
    blinkLED(LED_SUCCESS, 2);
    playSuccessSound();
    Serial.println("✅ Operation successful");
    
    // Send scan event via WebSocket
    StaticJsonDocument<200> doc;
    doc["event"] = "scan";
    doc["uid"] = uid;
    doc["mode"] = modeNames[currentMode];
    doc["timestamp"] = getTimestamp();
    doc["success"] = true;
    
    String message;
    serializeJson(doc, message);
    sendWebSocketMessage(message);
    
  } else {
    consecutiveFailures++;
    blinkLED(LED_ERROR, 3);
    playErrorSound();
    Serial.println("❌ Operation failed");
    
    // Send failure event via WebSocket
    StaticJsonDocument<200> doc;
    doc["event"] = "scan";
    doc["uid"] = uid;
    doc["mode"] = modeNames[currentMode];
    doc["timestamp"] = getTimestamp();
    doc["success"] = false;
    
    String message;
    serializeJson(doc, message);
    sendWebSocketMessage(message);
    
    if (consecutiveFailures >= maxConsecutiveFailures) {
      Serial.println("🔄 Too many failures, resetting system...");
      resetSystem();
    }
  }
  
  Serial.println("========================");
  
  // Halt PICC
  rfid.PICC_HaltA();
}

void setupWebSocket() {
  Serial.println("Setting up WebSocket connection...");
  
  // WebSocket event handler
  webSocket.onEvent(webSocketEvent);
  
  // Connect to WebSocket server
  connectWebSocket();
}

void connectWebSocket() {
  Serial.println("Connecting to WebSocket...");
  webSocket.beginSSL(websocketHost, websocketPort, "/socket.io/?EIO=4&transport=websocket");
  
  // Set authorization if needed
  // webSocket.setAuthorization("user", "password");
  
  // Enable heartbeat
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WebSocket] Disconnected");
      wsConnected = false;
      break;
      
    case WStype_CONNECTED:
      Serial.printf("[WebSocket] Connected to: %s\n", payload);
      wsConnected = true;
      
      // Join scanner namespace
      sendWebSocketMessage("40/scanner,");
      
      // Send initial status
      sendStatusUpdate();
      break;
      
    case WStype_TEXT:
      {
        String message = String((char*)payload);
        Serial.printf("[WebSocket] Received: %s\n", message.c_str());
        
        // Parse Socket.IO message
        if (message.startsWith("42/scanner,")) {
          String jsonStr = message.substring(11); // Remove "42/scanner,"
          
          StaticJsonDocument<500> doc;
          DeserializationError error = deserializeJson(doc, jsonStr);
          
          if (!error) {
            String event = doc[0];
            JsonObject data = doc[1];
            
            if (event == "command") {
              String command = data["command"];
              handleWebSocketCommand(command, data);
            }
          }
        }
      }
      break;
      
    case WStype_BIN:
      Serial.printf("[WebSocket] Binary message received (%u bytes)\n", length);
      break;
      
    case WStype_PING:
      Serial.println("[WebSocket] Ping received");
      break;
      
    case WStype_PONG:
      Serial.println("[WebSocket] Pong received");
      break;
      
    default:
      break;
  }
}

void sendWebSocketMessage(String message) {
  if (wsConnected) {
    String fullMessage = "42/scanner," + message;
    webSocket.sendTXT(fullMessage);
  }
}

void sendStatusUpdate() {
  if (!wsConnected) return;
  
  StaticJsonDocument<300> doc;
  doc["event"] = "status-update";
  doc["mode"] = modeNames[currentMode];
  doc["connected"] = true;
  doc["uptime"] = millis();
  doc["consecutiveFailures"] = consecutiveFailures;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["timestamp"] = getTimestamp();
  
  String message;
  serializeJson(doc, message);
  sendWebSocketMessage(message);
}

void handleWebSocketCommand(String command, JsonObject data) {
  Serial.println("Handling WebSocket command: " + command);
  
  if (command == "SET_MODE") {
    String mode = data["mode"];
    
    if (mode == "ENTRY") {
      setMode(ENTRY_MODE);
    } else if (mode == "EXIT") {
      setMode(EXIT_MODE);
    } else if (mode == "ENROLLMENT") {
      setMode(ENROLLMENT_MODE);
    }
    
    // Send confirmation
    StaticJsonDocument<200> response;
    response["event"] = "mode-changed";
    response["mode"] = modeNames[currentMode];
    response["timestamp"] = getTimestamp();
    
    String message;
    serializeJson(response, message);
    sendWebSocketMessage(message);
    
  } else if (command == "RESET") {
    resetSystem();
    
  } else if (command == "STATUS") {
    sendStatusUpdate();
    
  } else if (command == "TEST") {
    testSystem();
  }
}

void connectToWiFi() {
  digitalWrite(LED_WIFI, LOW);
  
  Serial.print("Connecting to WiFi network: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
    
    // Blink WiFi LED while connecting
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_WIFI, HIGH);
    Serial.println();
    Serial.println("✅ WiFi connected successfully!");
    Serial.print("📶 IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📡 Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    blinkLED(LED_ERROR, 10);
  }
}

bool sendAttendanceData(String uid, String entryType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected, cannot send data");
    return false;
  }
  
  HTTPClient http;
  String url = String(baseURL) + attendanceEndpoint;
  
  Serial.println("Sending attendance data to: " + url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-RFID-Scanner/2.0");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["uid"] = uid;
  doc["entryType"] = entryType;
  doc["timestamp"] = getTimestamp();
  doc["device"] = "ESP32-Scanner";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.println("📤 Payload: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("📥 Response code: ");
    Serial.println(httpResponseCode);
    Serial.println("📥 Response: " + response);
    
    http.end();
    return (httpResponseCode >= 200 && httpResponseCode < 300);
  } else {
    Serial.print("❌ HTTP Error: ");
    Serial.println(httpResponseCode);
    http.end();
    return false;
  }
}

// ... (continuing with the rest of the helper functions from the original code)

void setMode(ScanMode newMode) {
  if (newMode != currentMode) {
    currentMode = newMode;
    displayCurrentMode();
    playModeSound();
    
    // Update mode LED pattern
    blinkLED(LED_MODE, currentMode + 1);
    
    Serial.println("🔄 Mode changed to: " + modeNames[currentMode]);
  }
}

void switchMode() {
  ScanMode nextMode = (ScanMode)((currentMode + 1) % 3);
  setMode(nextMode);
}

void displayCurrentMode() {
  Serial.println("📊 Current Mode: " + modeNames[currentMode]);
  
  switch (currentMode) {
    case ENTRY_MODE:
      Serial.println("🟢 Ready for ENTRY scans");
      break;
    case EXIT_MODE:
      Serial.println("🔴 Ready for EXIT scans");
      break;
    case ENROLLMENT_MODE:
      Serial.println("👤 Ready for ENROLLMENT");
      break;
  }
}

void playModeSound() {
  switch (currentMode) {
    case ENTRY_MODE:
      playTone(1000, 100); // Single beep
      break;
    case EXIT_MODE:
      playTone(800, 100);
      delay(100);
      playTone(800, 100); // Double beep
      break;
    case ENROLLMENT_MODE:
      playTone(1200, 100);
      delay(100);
      playTone(1000, 100);
      delay(100);
      playTone(800, 100); // Triple beep
      break;
  }
}

void playTone(int frequency, int duration) {
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);
}

void playSuccessSound() {
  playTone(1000, 100);
  delay(50);
  playTone(1500, 100);
}

void playErrorSound() {
  playTone(500, 200);
  delay(100);
  playTone(500, 200);
}

void playStartupSound() {
  playTone(800, 100);
  delay(100);
  playTone(1000, 100);
  delay(100);
  playTone(1200, 100);
}

void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(100);
    digitalWrite(pin, LOW);
    delay(100);
  }
}

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return String(millis()); // Fallback to system millis if time not available
  }
  
  char timestamp[30];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(timestamp);
}

void printSystemStatus() {
  Serial.println("\n📊 === SYSTEM STATUS ===");
  Serial.println("🕒 Uptime: " + String(millis() / 1000) + " seconds");
  Serial.println("📶 WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("📡 IP: " + WiFi.localIP().toString());
    Serial.println("📶 Signal: " + String(WiFi.RSSI()) + " dBm");
  }
  Serial.println("🔌 WebSocket: " + String(wsConnected ? "Connected" : "Disconnected"));
  Serial.println("📊 Mode: " + modeNames[currentMode]);
  Serial.println("💾 Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("❌ Consecutive Failures: " + String(consecutiveFailures));
  Serial.println("🕒 Current Time: " + getTimestamp());
  Serial.println("========================\n");
}

bool checkRFIDHealth() {
  byte readReg = rfid.PCD_ReadRegister(rfid.VersionReg);
  return (readReg == 0x91 || readReg == 0x92);
}

void testSystem() {
  Serial.println("🧪 Running system test...");
  
  // Test LEDs
  Serial.println("Testing LEDs...");
  blinkLED(LED_SUCCESS, 2);
  blinkLED(LED_ERROR, 2);
  blinkLED(LED_WIFI, 2);
  blinkLED(LED_MODE, 2);
  
  // Test buzzer
  Serial.println("Testing buzzer...");
  playStartupSound();
  
  // Test RFID
  Serial.println("Testing RFID reader...");
  if (checkRFIDHealth()) {
    Serial.println("✅ RFID reader OK");
  } else {
    Serial.println("⚠️ RFID reader issue detected");
  }
  
  Serial.println("🧪 System test completed");
}

void resetSystem() {
  Serial.println("🔄 Resetting system...");
  
  consecutiveFailures = 0;
  clearEnrollmentBuffer();
  
  // Reset RFID reader
  rfid.PCD_Reset();
  delay(100);
  rfid.PCD_Init();
  
  // Reconnect WebSocket
  if (wsConnected) {
    webSocket.disconnect();
    wsConnected = false;
  }
  
  playStartupSound();
  Serial.println("✅ System reset complete");
}

void clearEnrollmentBuffer() {
  enrollmentBuffer.rfidUid = "";
  enrollmentBuffer.name = "";
  enrollmentBuffer.regNo = "";
  enrollmentBuffer.course = "";
  enrollmentBuffer.isCollecting = false;
  enrollmentBuffer.step = 0;
}

bool handleEnrollmentScan(String uid) {
  Serial.println("👤 Starting enrollment process for UID: " + uid);
  
  // For now, just send the UID to the backend for manual enrollment
  // In a full implementation, you might collect additional data via web interface
  
  HTTPClient http;
  String url = String(baseURL) + enrollmentEndpoint;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> doc;
  doc["rfidUid"] = uid;
  doc["name"] = "New Student " + uid.substring(0, 4); // Placeholder
  doc["regNo"] = "REG" + uid.substring(0, 6);         // Placeholder
  doc["course"] = "Unknown";                          // Placeholder
  doc["timestamp"] = getTimestamp();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("📥 Enrollment response: " + response);
    http.end();
    return (httpResponseCode >= 200 && httpResponseCode < 300);
  } else {
    Serial.println("❌ Enrollment failed");
    http.end();
    return false;
  }
}