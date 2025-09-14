#!/bin/bash

# RFID Attendance System - Development Setup Script

echo "🚀 Setting up RFID Attendance System for development..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Backend setup
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual values:"
    echo "   - MongoDB connection string"
    echo "   - Frontend URL (after frontend deployment)"
fi

echo "📦 Installing backend dependencies..."
npm install

echo "✅ Backend setup complete!"

# Frontend setup
echo "📦 Setting up frontend..."
cd ../frontend

if [ ! -f ".env.local" ]; then
    echo "📝 Creating frontend .env.local file..."
    cp .env.local.example .env.local
    echo "⚠️  Please update the .env.local file with your backend URL"
fi

echo "📦 Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"

cd ..

echo "🎉 Setup complete! Next steps:"
echo ""
echo "1. Update environment variables:"
echo "   - backend/.env (MongoDB URI, etc.)"
echo "   - frontend/.env.local (API URLs)"
echo ""
echo "2. Start development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm start"
echo ""
echo "3. Configure ESP32:"
echo "   - Update WiFi credentials in rfid_attendance.ino"
echo "   - Update API URL to point to your backend"
echo ""
echo "4. For production deployment:"
echo "   - Deploy backend to Render"
echo "   - Deploy frontend to Vercel"
echo "   - Update ESP32 with production API URL"