@echo off
REM RFID Attendance System - Development Setup Script (Windows)

echo 🚀 Setting up RFID Attendance System for development...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Backend setup
echo 📦 Setting up backend...
cd backend

if not exist ".env" (
    echo 📝 Creating backend .env file...
    copy .env.example .env
    echo ⚠️  Please update the .env file with your actual values:
    echo    - MongoDB connection string
    echo    - Frontend URL (after frontend deployment)
)

echo 📦 Installing backend dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Backend dependency installation failed
    pause
    exit /b 1
)

echo ✅ Backend setup complete!

REM Frontend setup
echo 📦 Setting up frontend...
cd ..\frontend

if not exist ".env.local" (
    echo 📝 Creating frontend .env.local file...
    copy .env.local.example .env.local
    echo ⚠️  Please update the .env.local file with your backend URL
)

echo 📦 Installing frontend dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Frontend dependency installation failed
    pause
    exit /b 1
)

echo ✅ Frontend setup complete!

cd ..

echo.
echo 🎉 Setup complete! Next steps:
echo.
echo 1. Update environment variables:
echo    - backend\.env (MongoDB URI, etc.)
echo    - frontend\.env.local (API URLs)
echo.
echo 2. Start development servers:
echo    Backend:  cd backend ^&^& npm run dev
echo    Frontend: cd frontend ^&^& npm start
echo.
echo 3. Configure ESP32:
echo    - Update WiFi credentials in rfid_attendance.ino
echo    - Update API URL to point to your backend
echo.
echo 4. For production deployment:
echo    - Deploy backend to Render
echo    - Deploy frontend to Vercel
echo    - Update ESP32 with production API URL

pause