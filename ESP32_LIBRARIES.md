# Required ESP32 Libraries for Arduino IDE

## Installation Instructions:

1. **Open Arduino IDE**
2. **Install ESP32 Board Package:**
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs":
     `https://dl.espressif.com/dl/package_esp32_index.json`
   - Go to Tools → Board → Boards Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems"

3. **Install Required Libraries:**
   - Go to Tools → Manage Libraries (or Ctrl+Shift+I)
   - Search and install each library below:

## Required Libraries:

### 1. MFRC522
- **Author**: GithubCommunity
- **Version**: Latest
- **Description**: Library for MFRC522 RFID readers

### 2. ArduinoJson
- **Author**: Benoit Blanchon
- **Version**: 6.x.x (latest)
- **Description**: JSON library for Arduino

### 3. Built-in Libraries (Already included with ESP32):
- **WiFi**: WiFi connectivity
- **HTTPClient**: HTTP client for API calls
- **SPI**: SPI communication protocol
- **time.h**: Time and date functions

## Library Installation Commands (PlatformIO):
If using PlatformIO instead of Arduino IDE, add these to your `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
lib_deps = 
    miguelbalboa/MFRC522@^1.4.10
    bblanchon/ArduinoJson@^6.21.3
```

## Verification:
After installation, you can verify the libraries are installed by:
1. Go to Sketch → Include Library
2. Check if all required libraries appear in the list

## Troubleshooting:
- If libraries fail to install, try updating Arduino IDE
- Clear library cache: Delete Arduino/libraries folder and reinstall
- For ESP32 board issues, try different board package versions