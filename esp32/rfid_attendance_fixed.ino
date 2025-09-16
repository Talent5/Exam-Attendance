#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// WiFi credentials - UPDATE THESE WITH YOUR ACTUAL CREDENTIALS
const char* ssid = "TkV";         // Replace with your WiFi SSID
const char* password = "Mundwa@2084"; // Replace with your WiFi password

// Backend API configuration - UPDATED TO MATCH YOUR COMPUTER'S IP
// For development: Your computer's IP address
// For production: https://your-backend-app.onrender.com
const char* baseURL = "https://exam-attendance-59tw.onrender.com";
const char* attendanceEndpoint = "/api/attendance/scan";
const char* enrollmentEndpoint = "/api/students";

// RFID module pins
#define SS_PIN 5    // SDA -> GPIO5
#define RST_PIN 22  // RST -> GPIO22

// LED pins for status indication (optional)
#define LED_SUCCESS 2   // Green LED for successful scan
#define LED_ERROR 4     // Red LED for errors
#define LED_WIFI 16     // Blue LED for WiFi status

MFRC522 rfid(SS_PIN, RST_PIN);

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

// Buzzer pin for audio feedback (optional)
#define BUZZER_PIN 25  // GPIO25 for buzzer

// Mode button pin (optional - for hardware mode switching)
#define MODE_BUTTON_PIN 21  // GPIO21 for mode button

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

// Function prototypes (declare all functions)
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
void promptForEnrollmentData();
void handleEnrollmentInput(String input);
void displayEnrollmentSummary();
void submitEnrollment();
void cancelEnrollment();
bool sendEnrollmentData();

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 RFID Attendance System ===");
  
  // Initialize LED pins and mode button
  pinMode(LED_SUCCESS, OUTPUT);
  pinMode(LED_ERROR, OUTPUT); 
  pinMode(LED_WIFI, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  
  // Turn off all LEDs and buzzer initially
  digitalWrite(LED_SUCCESS, LOW);
  digitalWrite(LED_ERROR, LOW);
  digitalWrite(LED_WIFI, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize enrollment buffer
  clearEnrollmentBuffer();
  
  // Initialize SPI and RFID
  SPI.begin(18, 19, 23, 5); // SCK=18, MISO=19, MOSI=23, SS=5
  rfid.PCD_Init();
  
  // Test RFID module
  rfid.PCD_Init(); // Re-initialize after self-test
  if (!checkRFIDHealth()) {
    Serial.println("ERROR: RFID module self-test failed!");
    blinkLED(LED_ERROR, 5);
    playErrorSound();
  } else {
    Serial.println("RFID module initialized successfully");
    Serial.print("RFID Firmware Version: 0x");
    Serial.println(rfid.PCD_ReadRegister(rfid.VersionReg), HEX);
    blinkLED(LED_SUCCESS, 2);
  }
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize time
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.println("Time synchronization started...");
  
  // Play startup sound
  playStartupSound();
  
  // Display initial mode
  displayCurrentMode();
  
  Serial.println("System ready. Scan your RFID card...");
  Serial.println("Commands: 'status', 'reset', 'mode', 'entry', 'exit', 'enrollment'");
}

void loop() {
  // Handle serial commands
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    command.toLowerCase();
    
    if (command == "status") {
      printSystemStatus();
    } else if (command == "reset") {
      resetSystem();
    } else if (command == "test") {
      testSystem();
    } else if (command == "mode") {
      switchMode();
    } else if (command == "entry") {
      setMode(ENTRY_MODE);
    } else if (command == "exit") {
      setMode(EXIT_MODE);
    } else if (command == "enrollment") {
      setMode(ENROLLMENT_MODE);
    } else if (command == "cancel" && enrollmentBuffer.isCollecting) {
      cancelEnrollment();
    } else if (enrollmentBuffer.isCollecting) {
      handleEnrollmentInput(command);
    } else {
      Serial.println("Available commands: status, reset, test, mode, entry, exit, enrollment");
    }
  }
  
  // Check mode button (hardware switching)
  if (digitalRead(MODE_BUTTON_PIN) == LOW && (millis() - lastModeSwitch) > modeDebounceDelay) {
    switchMode();
    lastModeSwitch = millis();
    delay(200); // Additional debounce
  }
  
  // Print system status periodically
  if (millis() - lastStatusPrint > statusInterval) {
    printSystemStatus();
    lastStatusPrint = millis();
  }
  
  // Check WiFi connection and reconnect if needed
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_WIFI, LOW);
    if (millis() - lastReconnectAttempt > reconnectInterval) {
      Serial.println("WiFi disconnected. Attempting to reconnect...");
      connectToWiFi();
      lastReconnectAttempt = millis();
    }
    return;
  } else {
    digitalWrite(LED_WIFI, HIGH);
  }
  
  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0"; // Add leading zero for single digit hex values
    }
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  // Check if this is the same card read too quickly
  if (uid == lastCardUID && (millis() - lastCardTime) < cardReadDelay) {
    Serial.println("Same card read too quickly. Ignoring...");
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  
  Serial.println("\n--- RFID Card Detected ---");
  Serial.print("Card UID: ");
  Serial.println(uid);
  Serial.print("Card Type: ");
  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.println(rfid.PICC_GetTypeName(piccType));
  
  // Update last card info
  lastCardUID = uid;
  lastCardTime = millis();
  
  // Play scan sound
  playTone(1000, 100);
  
  // Handle based on current mode
  bool success = false;
  if (currentMode == ENTRY_MODE) {
    success = sendAttendanceData(uid, "entry");
    if (success) {
      Serial.println("✓ Entry scan recorded successfully");
      blinkLED(LED_SUCCESS, 3);
      playSuccessSound();
      consecutiveFailures = 0;
    } else {
      Serial.println("✗ Failed to record entry");
      blinkLED(LED_ERROR, 3);
      playErrorSound();
      consecutiveFailures++;
    }
  } else if (currentMode == EXIT_MODE) {
    success = sendAttendanceData(uid, "exit");
    if (success) {
      Serial.println("✓ Exit scan recorded successfully");
      blinkLED(LED_SUCCESS, 3);
      playSuccessSound();
      consecutiveFailures = 0;
    } else {
      Serial.println("✗ Failed to record exit");
      blinkLED(LED_ERROR, 3);
      playErrorSound();
      consecutiveFailures++;
    }
  } else if (currentMode == ENROLLMENT_MODE) {
    success = handleEnrollmentScan(uid);
    if (success) {
      Serial.println("✓ Card scanned for enrollment");
      blinkLED(LED_SUCCESS, 2);
      playTone(1500, 200);
    } else {
      Serial.println("✗ Enrollment scan failed");
      blinkLED(LED_ERROR, 2);
      playErrorSound();
    }
  }
  
  // If too many consecutive failures, try to reconnect WiFi
  if (!success) {
    consecutiveFailures++;
    if (consecutiveFailures >= maxConsecutiveFailures) {
      Serial.println("Too many failures. Reconnecting WiFi...");
      connectToWiFi();
      consecutiveFailures = 0;
    }
  }
  
  // Halt the card to prevent multiple reads
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Wait before next scan
  delay(2000);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Blink WiFi LED while connecting
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    digitalWrite(LED_WIFI, HIGH); // Keep WiFi LED on when connected
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    digitalWrite(LED_WIFI, LOW);
    blinkLED(LED_ERROR, 5);
  }
}

bool sendAttendanceData(String uid, String entryType) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot send data.");
    return false;
  }
  
  String fullURL = String(baseURL) + String(attendanceEndpoint);
  
  HTTPClient http;
  http.begin(fullURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-RFID-Scanner/1.0");
  http.setTimeout(15000); // 15 second timeout
  
  // Add retry mechanism
  int maxRetries = 3;
  int retryDelay = 1000;
  
  // Create JSON payload
  DynamicJsonDocument doc(300);
  doc["rfidUid"] = uid;
  doc["entryType"] = entryType;
  
  // Add timestamp if time is available
  time_t now;
  time(&now);
  if (now > 1000000) { // Check if time is properly set
    doc["timestamp"] = now * 1000; // Convert to milliseconds
    
    struct tm* timeinfo = localtime(&now);
    Serial.printf("Timestamp: %04d-%02d-%02d %02d:%02d:%02d\n",
                  timeinfo->tm_year + 1900, timeinfo->tm_mon + 1, timeinfo->tm_mday,
                  timeinfo->tm_hour, timeinfo->tm_min, timeinfo->tm_sec);
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending ");
  Serial.print(entryType);
  Serial.print(" data: ");
  Serial.println(jsonString);
  
  // Retry mechanism
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial.printf("Attempt %d/%d...\n", attempt, maxRetries);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);
      
      if (httpResponseCode == 200 || httpResponseCode == 201) {
        Serial.print("Response: ");
        Serial.println(response);
        
        // Parse response to check if it was successful
        DynamicJsonDocument responseDoc(1024);
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (!error) {
          bool success = responseDoc["success"];
          String message = responseDoc["message"];
          
          if (success) {
            Serial.printf("✓ Backend confirmed %s recorded\n", entryType.c_str());
            http.end();
            return true;
          } else {
            Serial.print("✗ Backend error: ");
            Serial.println(message);
          }
        } else {
          Serial.println("✗ JSON parsing error");
          Serial.println(response); // Print raw response
        }
      } else {
        Serial.printf("✗ HTTP Error %d: %s\n", httpResponseCode, response.c_str());
      }
    } else {
      Serial.print("✗ Connection Error: ");
      Serial.println(http.errorToString(httpResponseCode));
    }
    
    if (attempt < maxRetries) {
      Serial.printf("Retrying in %d ms...\n", retryDelay);
      delay(retryDelay);
      retryDelay *= 2; // Exponential backoff
    }
  }
  
  http.end();
  Serial.println("✗ All retry attempts failed");
  return false;
}

void blinkLED(int pin, int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(pin, HIGH);
    delay(200);
    digitalWrite(pin, LOW);
    delay(200);
  }
}

// Function to get formatted timestamp string
String getTimestamp() {
  time_t now;
  time(&now);
  struct tm* timeinfo = localtime(&now);
  
  char timestamp[30];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", timeinfo);
  return String(timestamp);
}

// Function to print system status
void printSystemStatus() {
  Serial.println("\n=== System Status ===");
  Serial.print("WiFi Status: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  
  Serial.print("Free Heap: ");
  Serial.println(ESP.getFreeHeap());
  
  Serial.print("Uptime: ");
  unsigned long uptime = millis() / 1000;
  Serial.printf("%02d:%02d:%02d\n", uptime / 3600, (uptime % 3600) / 60, uptime % 60);
  
  Serial.print("Current Time: ");
  Serial.println(getTimestamp());
  
  Serial.print("Consecutive Failures: ");
  Serial.println(consecutiveFailures);
  
  Serial.print("Current Mode: ");
  Serial.println(modeNames[currentMode]);
  
  Serial.print("Last Card: ");
  Serial.println(lastCardUID.length() > 0 ? lastCardUID : "None");
  
  if (enrollmentBuffer.isCollecting) {
    Serial.print("Enrollment in Progress: ");
    Serial.printf("Step %d/4 (%s)\n", enrollmentBuffer.step + 1, 
                  enrollmentBuffer.step == 0 ? "Name" :
                  enrollmentBuffer.step == 1 ? "Reg No" :
                  enrollmentBuffer.step == 2 ? "Course" : "Confirm");
  }
  
  Serial.println("===================\n");
}

// Function to play a tone
void playTone(int frequency, int duration) {
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);
}

// Function to play success sound
void playSuccessSound() {
  playTone(1000, 100);
  delay(50);
  playTone(1500, 100);
  delay(50);
  playTone(2000, 100);
}

// Function to play error sound
void playErrorSound() {
  playTone(300, 200);
  delay(100);
  playTone(300, 200);
  delay(100);
  playTone(300, 200);
}

// Function to play startup sound
void playStartupSound() {
  playTone(523, 150);  // C
  playTone(659, 150);  // E
  playTone(784, 150);  // G
  playTone(1047, 300); // C
}

// Function to reset the system (software reset)
void resetSystem() {
  Serial.println("Performing system reset...");
  delay(1000);
  ESP.restart();
}

// Function to check RFID module health
bool checkRFIDHealth() {
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("RFID module communication error!");
    return false;
  }
  return true;
}

// Function to test all system components
void testSystem() {
  Serial.println("\n=== System Test ===");
  
  // Test LEDs
  Serial.println("Testing LEDs...");
  digitalWrite(LED_SUCCESS, HIGH);
  digitalWrite(LED_ERROR, HIGH);
  digitalWrite(LED_WIFI, HIGH);
  delay(1000);
  digitalWrite(LED_SUCCESS, LOW);
  digitalWrite(LED_ERROR, LOW);
  digitalWrite(LED_WIFI, LOW);
  
  // Test Buzzer
  Serial.println("Testing buzzer...");
  playTone(1000, 500);
  
  // Test RFID
  Serial.println("Testing RFID module...");
  if (checkRFIDHealth()) {
    Serial.println("✓ RFID module OK");
  } else {
    Serial.println("✗ RFID module FAILED");
  }
  
  // Test WiFi
  Serial.println("Testing WiFi...");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✓ WiFi connected");
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("✗ WiFi disconnected");
  }
  
  // Test API endpoint
  Serial.println("Testing API endpoint...");
  if (sendAttendanceData("TEST123456", "entry")) {
    Serial.println("✓ API endpoint OK");
  } else {
    Serial.println("✗ API endpoint FAILED");
  }
  
  Serial.println("=== Test Complete ===\n");
}

// Mode management functions
void switchMode() {
  if (currentMode == ENTRY_MODE) {
    setMode(EXIT_MODE);
  } else if (currentMode == EXIT_MODE) {
    setMode(ENROLLMENT_MODE);
  } else {
    setMode(ENTRY_MODE);
  }
}

void setMode(ScanMode newMode) {
  if (enrollmentBuffer.isCollecting) {
    Serial.println("Cannot switch modes during enrollment. Type 'cancel' first.");
    return;
  }
  
  currentMode = newMode;
  displayCurrentMode();
  playModeSound();
  
  // Clear any previous enrollment data
  if (currentMode == ENROLLMENT_MODE) {
    clearEnrollmentBuffer();
  }
}

void displayCurrentMode() {
  Serial.println("\n╔════════════════════════════════╗");
  Serial.printf("║        MODE: %-18s║\n", modeNames[currentMode].c_str());
  Serial.println("╚════════════════════════════════╝");
  
  if (currentMode == ENTRY_MODE) {
    Serial.println("🟢 Ready to scan cards for student entry");
    Serial.println("   Scan any enrolled student card to record entry");
  } else if (currentMode == EXIT_MODE) {
    Serial.println("🔴 Ready to scan cards for student exit");
    Serial.println("   Scan any enrolled student card to record exit");
  } else {
    Serial.println("👤 Ready to enroll new students");
    Serial.println("   Scan a new card to start enrollment process");
  }
  Serial.println();
}

void playModeSound() {
  if (currentMode == ENTRY_MODE) {
    // Single beep for entry mode
    playTone(800, 100);
  } else if (currentMode == EXIT_MODE) {
    // Double beep for exit mode
    playTone(1200, 100);
    delay(100);
    playTone(1200, 100);
  } else {
    // Triple beep for enrollment mode
    playTone(1500, 100);
    delay(50);
    playTone(1500, 100);
    delay(50);
    playTone(1500, 100);
  }
}

// Enrollment functions
void clearEnrollmentBuffer() {
  enrollmentBuffer.rfidUid = "";
  enrollmentBuffer.name = "";
  enrollmentBuffer.regNo = "";
  enrollmentBuffer.course = "";
  enrollmentBuffer.isCollecting = false;
  enrollmentBuffer.step = 0;
}

bool handleEnrollmentScan(String uid) {
  if (enrollmentBuffer.isCollecting) {
    Serial.println("Already collecting enrollment data. Complete current enrollment first.");
    return false;
  }
  
  enrollmentBuffer.rfidUid = uid;
  enrollmentBuffer.isCollecting = true;
  enrollmentBuffer.step = 0;
  
  Serial.println("\n🎓 STUDENT ENROLLMENT STARTED");
  Serial.println("════════════════════════════════");
  Serial.printf("RFID Card: %s\n", uid.c_str());
  Serial.println("════════════════════════════════");
  
  promptForEnrollmentData();
  return true;
}

void promptForEnrollmentData() {
  switch (enrollmentBuffer.step) {
    case 0:
      Serial.println("📝 Enter student's FULL NAME:");
      Serial.print("👤 Name: ");
      break;
    case 1:
      Serial.println("📝 Enter student's REGISTRATION NUMBER:");
      Serial.print("🆔 Reg No: ");
      break;
    case 2:
      Serial.println("📝 Enter student's COURSE/PROGRAM:");
      Serial.print("📚 Course: ");
      break;
    case 3:
      displayEnrollmentSummary();
      break;
  }
}

void handleEnrollmentInput(String input) {
  input.trim();
  
  if (input.length() == 0) {
    Serial.println("❌ Input cannot be empty. Please try again:");
    promptForEnrollmentData();
    return;
  }
  
  switch (enrollmentBuffer.step) {
    case 0: // Name
      enrollmentBuffer.name = input;
      enrollmentBuffer.step++;
      promptForEnrollmentData();
      break;
      
    case 1: // Registration Number
      enrollmentBuffer.regNo = input;
      enrollmentBuffer.regNo.toUpperCase();
      enrollmentBuffer.step++;
      promptForEnrollmentData();
      break;
      
    case 2: // Course
      enrollmentBuffer.course = input;
      enrollmentBuffer.step++;
      promptForEnrollmentData();
      break;
      
    case 3: // Confirmation
      input.toLowerCase(); // Convert to lowercase first
      if (input == "yes" || input == "y") {
        submitEnrollment();
      } else {
        cancelEnrollment();
      }
      break;
  }
}

void displayEnrollmentSummary() {
  Serial.println("\n📋 ENROLLMENT SUMMARY");
  Serial.println("════════════════════════════════");
  Serial.printf("Name:     %s\n", enrollmentBuffer.name.c_str());
  Serial.printf("Reg No:   %s\n", enrollmentBuffer.regNo.c_str());  
  Serial.printf("Course:   %s\n", enrollmentBuffer.course.c_str());
  Serial.printf("RFID:     %s\n", enrollmentBuffer.rfidUid.c_str());
  Serial.println("════════════════════════════════");
  Serial.println("✅ Confirm enrollment? (yes/no):");
  Serial.print("🤔 Confirm: ");
}

void submitEnrollment() {
  Serial.println("\n📤 Submitting enrollment data...");
  
  if (sendEnrollmentData()) {
    Serial.println("🎉 STUDENT ENROLLED SUCCESSFULLY!");
    Serial.printf("Welcome %s to the system!\n", enrollmentBuffer.name.c_str());
    playSuccessSound();
    blinkLED(LED_SUCCESS, 5);
  } else {
    Serial.println("❌ ENROLLMENT FAILED!");
    Serial.println("Please check your data and try again.");
    playErrorSound();
    blinkLED(LED_ERROR, 3);
  }
  
  clearEnrollmentBuffer();
  Serial.println("\n🔄 Ready for next enrollment...");
}

void cancelEnrollment() {
  Serial.println("❌ Enrollment cancelled.");
  clearEnrollmentBuffer();
  playTone(400, 300);
}

bool sendEnrollmentData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot send data.");
    return false;
  }
  
  String fullURL = String(baseURL) + String(enrollmentEndpoint);
  
  HTTPClient http;
  http.begin(fullURL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-RFID-Scanner/1.0");
  http.setTimeout(15000);
  
  // Create JSON payload for enrollment
  DynamicJsonDocument doc(512);
  doc["name"] = enrollmentBuffer.name;
  doc["regNo"] = enrollmentBuffer.regNo;
  doc["course"] = enrollmentBuffer.course;
  doc["rfidUid"] = enrollmentBuffer.rfidUid;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("Sending enrollment data: ");
  Serial.println(jsonString);
  
  // Retry mechanism for enrollment
  int maxRetries = 3;
  int retryDelay = 1000;
  
  for (int attempt = 1; attempt <= maxRetries; attempt++) {
    Serial.printf("Enrollment attempt %d/%d...\n", attempt, maxRetries);
    
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);
      
      if (httpResponseCode == 200 || httpResponseCode == 201) {
        Serial.print("Response: ");
        Serial.println(response);
        
        DynamicJsonDocument responseDoc(1024);
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (!error) {
          bool success = responseDoc["success"];
          String message = responseDoc["message"];
          
          if (success) {
            Serial.println("✓ Backend confirmed student enrollment");
            http.end();
            return true;
          } else {
            Serial.print("✗ Backend error: ");
            Serial.println(message);
          }
        } else {
          Serial.println("✗ JSON parsing error");
          Serial.println(response);
        }
      } else {
        Serial.printf("✗ HTTP Error %d: %s\n", httpResponseCode, response.c_str());
      }
    } else {
      Serial.print("✗ Connection Error: ");
      Serial.println(http.errorToString(httpResponseCode));
    }
    
    if (attempt < maxRetries) {
      Serial.printf("Retrying in %d ms...\n", retryDelay);
      delay(retryDelay);
      retryDelay *= 2;
    }
  }
  
  http.end();
  Serial.println("✗ All enrollment attempts failed");
  return false;
}