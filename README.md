# RFID Attendance System

A complete real-time RFID attendance tracking system built with ESP32, Node.js backend, and React frontend.

## 🚀 Features

- **ESP32 RFID Scanner**: Wireless RFID card scanning with HTTP POST to backend
- **Real-time Updates**: WebSocket integration for live dashboard updates
- **Student Management**: Enroll students and manage RFID cards
- **Attendance Tracking**: Automatic attendance logging with timestamps
- **Analytics Dashboard**: Charts and statistics showing attendance trends
- **Data Export**: CSV export functionality for attendance records
- **Responsive UI**: Modern, mobile-friendly interface built with React and TailwindCSS

## 🏗️ System Architecture

```
ESP32 RFID Scanner
        ↓ HTTP POST
Backend API (Node.js + Express + MongoDB)
        ↓ WebSocket (Socket.IO)
Frontend Dashboard (React + TailwindCSS)
```

## 📋 Prerequisites

### For Backend:
- Node.js 16+ and npm
- MongoDB database (local or MongoDB Atlas)
- Render account (for deployment)

### For Frontend:
- Node.js 16+ and npm
- Vercel account (for deployment)

### For ESP32:
- Arduino IDE or PlatformIO
- ESP32 development board
- RC522 RFID module
- RFID cards/tags
- Jumper wires and breadboard

## 🔧 Hardware Setup

### ESP32 to RC522 RFID Module Connections:

| RC522 Pin | ESP32 Pin | Description |
|-----------|-----------|-------------|
| VCC       | 3.3V      | Power supply |
| GND       | GND       | Ground |
| SDA       | GPIO 5    | Slave select |
| SCK       | GPIO 18   | Serial clock |
| MOSI      | GPIO 23   | Master out slave in |
| MISO      | GPIO 19   | Master in slave out |
| RST       | GPIO 22   | Reset |

### Optional LED Status Indicators:

| LED Color | ESP32 Pin | Purpose |
|-----------|-----------|---------|
| Green     | GPIO 2    | Successful scan |
| Red       | GPIO 4    | Error/failure |
| Blue      | GPIO 16   | WiFi status |

## 🚀 Quick Start

### 1. Backend Setup (Deploy to Render)

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd rfid-attendance-system/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment variables**:
   - Copy `.env.example` to `.env`
   - Update the following variables:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rfid_attendance
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ```

4. **Test locally** (optional):
   ```bash
   npm run dev
   ```

5. **Deploy to Render**:
   - Create a new Web Service on [Render](https://render.com)
   - Connect your GitHub repository
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables from your `.env` file
   - Deploy

### 2. Frontend Setup (Deploy to Vercel)

1. **Navigate to frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment variables**:
   - Create `.env.local` file:
   ```env
   REACT_APP_API_URL=https://your-backend-app.onrender.com
   REACT_APP_WS_URL=https://your-backend-app.onrender.com
   ```

4. **Test locally** (optional):
   ```bash
   npm start
   ```

5. **Deploy to Vercel**:
   - Install Vercel CLI: `npm i -g vercel`
   - Run: `vercel`
   - Follow the prompts to deploy
   - Add environment variables in Vercel dashboard

### 3. ESP32 Setup

1. **Install Arduino IDE** and ESP32 board package

2. **Install required libraries**:
   - MFRC522 (by GithubCommunity)
   - ArduinoJson (by Benoit Blanchon)
   - WiFi (built-in with ESP32)
   - HTTPClient (built-in with ESP32)

3. **Configure the ESP32 code**:
   - Open `rfid_attendance.ino`
   - Update WiFi credentials:
     ```cpp
     const char* ssid = "YOUR_WIFI_SSID";
     const char* password = "YOUR_WIFI_PASSWORD";
     ```
   - Update API URL:
     ```cpp
     const char* apiURL = "https://your-backend-app.onrender.com/api/attendance/scan";
     ```

4. **Upload the code** to your ESP32

5. **Wire the hardware** according to the connection table above

## 📱 Usage

### 1. Student Enrollment
1. Open the frontend dashboard
2. Navigate to "Students" page
3. Click "Enroll Student"
4. Fill in student details (name, registration number, course)
5. Scan the RFID card to capture the UID
6. Submit the form

### 2. Attendance Tracking
1. Students scan their RFID cards on the ESP32 scanner
2. Attendance is automatically recorded in the database
3. Real-time updates appear on the dashboard
4. Unknown cards trigger notifications

### 3. Analytics and Reports
1. View analytics on the "Analytics" page
2. Export attendance data as CSV from "Attendance" page
3. Filter by date range, course, or student

## 🔗 API Endpoints

### Students
- `GET /api/students` - Get all students with pagination
- `POST /api/students` - Create new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/students/stats/summary` - Get student statistics

### Attendance
- `POST /api/attendance/scan` - Record RFID scan (ESP32 endpoint)
- `GET /api/attendance` - Get attendance records with filtering
- `GET /api/attendance/export` - Export attendance as CSV
- `GET /api/attendance/stats` - Get attendance statistics

## 🔧 Troubleshooting

### ESP32 Issues:
- **WiFi connection fails**: Check SSID/password, signal strength
- **RFID not working**: Verify wiring, check power supply
- **HTTP errors**: Verify backend URL, check internet connection
- **Time sync issues**: Check NTP server, timezone settings

### Backend Issues:
- **Database connection**: Verify MongoDB URI and credentials
- **CORS errors**: Check FRONTEND_URL environment variable
- **Memory issues**: Monitor heap usage, optimize queries

### Frontend Issues:
- **API calls fail**: Verify REACT_APP_API_URL in environment
- **Real-time updates not working**: Check WebSocket connection
- **Build failures**: Verify all dependencies are installed

## 🔒 Security Considerations

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Use HTTPS for production deployments
3. **Input Validation**: Backend validates all input data
4. **Rate Limiting**: Consider adding rate limiting for API endpoints
5. **Authentication**: Add user authentication for production use

## 📊 Database Schema

### Students Collection:
```javascript
{
  _id: ObjectId,
  name: String,
  regNo: String (unique),
  course: String,
  rfidUid: String (unique),
  enrolledAt: Date,
  isActive: Boolean
}
```

### Attendance Collection:
```javascript
{
  _id: ObjectId,
  studentId: ObjectId (ref: Student),
  rfidUid: String,
  timestamp: Date,
  date: String (YYYY-MM-DD),
  time: String (HH:MM:SS),
  dayOfWeek: String,
  status: String (present/late/absent)
}
```

## 🚀 Deployment URLs

After deployment, update these URLs in your configuration:

- **Backend**: `https://your-backend-app.onrender.com`
- **Frontend**: `https://your-frontend-app.vercel.app`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the console/serial output for error messages
3. Verify all environment variables are set correctly
4. Ensure all services are running and accessible

## 🎯 Future Enhancements

- [ ] User authentication and authorization
- [ ] Email/SMS notifications
- [ ] Mobile app for attendance checking
- [ ] Advanced analytics and reporting
- [ ] Multiple RFID scanner support
- [ ] Geofencing for location-based attendance
- [ ] Integration with existing school management systems

---

**Made with ❤️ for educational institutions worldwide**