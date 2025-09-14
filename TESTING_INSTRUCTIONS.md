# RFID Attendance System - Testing Instructions

## Overview
Your RFID attendance system is now configured and ready for testing with your ESP32 and the scanner interface at http://localhost:3000/scanner.

## Network Configuration ✅
- **Your Computer IP**: `192.168.0.49`
- **Backend Port**: `5000`
- **Frontend Port**: `3000`
- **ESP32 Backend URL**: `http://192.168.0.49:5000`

## Before Testing

### 1. Update ESP32 WiFi Credentials
In `rfid_attendance.ino`, replace these lines with your actual WiFi credentials:
```cpp
const char* ssid = "YOUR_WIFI_SSID";         // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password
```

### 2. Start Backend Server
```bash
cd "C:\Users\Takunda Mundwa\Desktop\Exam Attendance\backend"
npm start
```
The server should start on port 5000.

### 3. Start Frontend Server
```bash
cd "C:\Users\Takunda Mundwa\Desktop\Exam Attendance\frontend"
npm start
```
The frontend should start on port 3000.

## Testing Steps

### Phase 1: Test the Web Interface
1. **Open Scanner Page**: Navigate to http://localhost:3000/scanner
2. **Check Interface**: You should see:
   - Scanner status panel
   - Mode control buttons (Attendance/Enrollment)
   - System command buttons
   - Configuration information

### Phase 2: Test API Endpoints
1. **Test Backend Health**: Open http://localhost:5000/health
2. **Test Students API**: Use Postman or browser to test:
   - GET http://localhost:5000/api/students
   - POST http://localhost:5000/api/students (to add a test student)

### Phase 3: Test ESP32 Integration
1. **Upload Code**: Upload `rfid_attendance.ino` to your ESP32
2. **Check Serial Monitor**: 
   - WiFi connection status
   - API endpoint confirmation
   - System ready message
3. **Test RFID Scan**: Scan a card and check:
   - Serial output shows scan data
   - HTTP request to your backend
   - Response from server

## ESP32 Serial Commands
Once your ESP32 is running, you can use these commands in the Serial Monitor:
- `status` - Show system status
- `mode` - Switch between attendance/enrollment modes
- `attendance` - Set attendance mode
- `enrollment` - Set enrollment mode
- `reset` - Restart the system
- `test` - Run system tests

## Expected Workflow

### For Student Enrollment:
1. Set ESP32 to enrollment mode: `enrollment`
2. Scan new RFID card
3. Enter student details when prompted:
   - Full name
   - Registration number
   - Course/program
4. Confirm enrollment
5. Student is added to database

### For Attendance Marking:
1. Set ESP32 to attendance mode: `attendance`
2. Scan enrolled student's card
3. Attendance is automatically recorded
4. Real-time updates appear on dashboard

## Troubleshooting

### ESP32 Issues:
- **WiFi Connection Failed**: Check WiFi credentials and network
- **API Connection Failed**: Verify your computer's IP (192.168.0.49) and backend running
- **RFID Not Working**: Check wiring connections (pins 5, 22 for MFRC522)

### Web Interface Issues:
- **Scanner Page Not Loading**: Ensure frontend server is running on port 3000
- **API Errors**: Check backend server is running on port 5000
- **No Real-time Updates**: WebSocket simulation mode is active (normal for testing)

### Network Issues:
- **ESP32 Can't Reach Backend**: 
  - Ensure both ESP32 and computer are on same WiFi network
  - Check Windows Firewall isn't blocking port 5000
  - Verify IP address with `ipconfig` command

## Hardware Setup (ESP32 + MFRC522)
```
ESP32     MFRC522
-----     -------
GPIO5  -> SDA
GPIO22 -> RST
GPIO18 -> SCK
GPIO23 -> MOSI
GPIO19 -> MISO
3V3    -> 3.3V
GND    -> GND

Optional Components:
GPIO2  -> Green LED (Success)
GPIO4  -> Red LED (Error)
GPIO16 -> Blue LED (WiFi Status)
GPIO25 -> Buzzer
GPIO21 -> Mode Button
```

## Success Indicators
- ✅ ESP32 connects to WiFi
- ✅ ESP32 can reach backend API
- ✅ Web interface loads and shows scanner status
- ✅ RFID scans trigger HTTP requests
- ✅ Student enrollment works end-to-end
- ✅ Attendance marking updates database
- ✅ Real-time updates appear on dashboard

## Next Steps After Testing
1. Add more students through enrollment process
2. Test attendance marking for multiple students
3. Check analytics and reports
4. Configure for production deployment
5. Set up automatic startup scripts

Need help? Check the console outputs and error messages for debugging information.