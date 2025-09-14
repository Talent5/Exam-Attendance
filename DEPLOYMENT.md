# Deployment Guide

## Backend Deployment to Render

### Step 1: Prepare Your Code
1. Ensure your backend code is in a Git repository
2. Make sure `package.json` has the correct start script:
   ```json
   {
     "scripts": {
       "start": "node server.js"
     }
   }
   ```

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `rfid-attendance-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free tier is fine for testing

### Step 3: Set Environment Variables
Add these environment variables in Render dashboard:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rfid_attendance
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-app.vercel.app
```

### Step 4: Deploy
- Click "Create Web Service"
- Wait for deployment to complete
- Note your backend URL: `https://your-app-name.onrender.com`

---

## Frontend Deployment to Vercel

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Configure Environment Variables
Create `.env.local` in frontend directory:
```
REACT_APP_API_URL=https://your-backend-app.onrender.com
REACT_APP_WS_URL=https://your-backend-app.onrender.com
```

### Step 3: Build and Deploy
```bash
cd frontend
npm run build
vercel
```

Follow the prompts:
- Set up and deploy? `Y`
- Which scope? Select your account
- Link to existing project? `N`
- Project name? `rfid-attendance-frontend`
- In which directory is your code located? `./`

### Step 4: Set Environment Variables in Vercel
1. Go to vercel.com dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add your environment variables
5. Redeploy if needed

---

## MongoDB Setup

### Option 1: MongoDB Atlas (Recommended)
1. Go to [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create free account and cluster
3. Create database user
4. Whitelist IP addresses (or use 0.0.0.0/0 for all)
5. Get connection string
6. Replace `<username>`, `<password>`, and `<dbname>` in connection string

### Option 2: Local MongoDB
```bash
# Install MongoDB locally
# Start MongoDB service
mongod

# Connection string for local:
mongodb://localhost:27017/rfid_attendance
```

---

## ESP32 Configuration

### Step 1: Update Code Variables
In `rfid_attendance.ino`, update:
```cpp
const char* ssid = "YOUR_ACTUAL_WIFI_SSID";
const char* password = "YOUR_ACTUAL_WIFI_PASSWORD";
const char* apiURL = "https://your-backend-app.onrender.com/api/attendance/scan";
```

### Step 2: Upload Code
1. Connect ESP32 to computer
2. Select correct board and port in Arduino IDE
3. Upload the code

---

## Testing the Complete System

### 1. Test Backend
```bash
curl https://your-backend-app.onrender.com/health
```

### 2. Test Frontend
- Open your Vercel URL
- Check if dashboard loads
- Try enrolling a student

### 3. Test ESP32
- Check serial monitor for WiFi connection
- Scan an RFID card
- Verify attendance appears in dashboard

### 4. Test Real-time Updates
- Keep dashboard open
- Scan RFID card on ESP32
- Should see real-time notification

---

## Domain Configuration (Optional)

### Custom Domain for Frontend
1. In Vercel dashboard → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Custom Domain for Backend
1. In Render dashboard → Settings
2. Add custom domain
3. Configure DNS records

---

## SSL/HTTPS

Both Render and Vercel provide automatic HTTPS certificates. Your ESP32 will work with HTTPS endpoints without additional configuration.

---

## Monitoring and Logs

### Backend Logs (Render)
- Go to your service in Render dashboard
- Click "Logs" tab to view real-time logs

### Frontend Logs (Vercel)
- Go to your project in Vercel dashboard
- Click "Functions" tab for serverless function logs

### ESP32 Logs
- Use Arduino IDE Serial Monitor
- Set baud rate to 115200

---

## Troubleshooting Deployment

### Common Backend Issues
- **503 Service Unavailable**: Check if MongoDB is accessible
- **Environment variables not loaded**: Verify all env vars are set
- **Build failed**: Check Node.js version compatibility

### Common Frontend Issues
- **API calls fail**: Check CORS configuration and API URL
- **Build failed**: Verify all dependencies in package.json
- **Environment variables not working**: Use REACT_APP_ prefix

### Common ESP32 Issues
- **WiFi connection failed**: Check credentials and signal strength
- **HTTP requests fail**: Verify backend URL and SSL certificate
- **RFID not working**: Check wiring and power supply

---

## Performance Optimization

### Backend
- Enable MongoDB indexes
- Use connection pooling
- Implement request rate limiting
- Add request/response compression

### Frontend
- Enable build optimization
- Use React.memo for components
- Implement lazy loading
- Optimize images and assets

### ESP32
- Implement deep sleep between scans
- Optimize WiFi connection handling
- Use watchdog timer for reliability

---

## Security Considerations

1. **Never commit sensitive data** to version control
2. **Use HTTPS** for all communications
3. **Validate all input** on backend
4. **Implement rate limiting** to prevent abuse
5. **Use environment variables** for configuration
6. **Regularly update dependencies** for security patches