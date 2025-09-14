# Frontend Deployment Instructions

## Environment Variables

The frontend requires these environment variables to connect to the backend:

- `REACT_APP_API_URL`: Backend API URL
- `REACT_APP_WS_URL`: WebSocket URL (usually same as API URL)

### For Production
Copy `.env.local.example` to `.env.local` and update with production URLs:
```bash
REACT_APP_API_URL=https://exam-attendance-59tw.onrender.com
REACT_APP_WS_URL=https://exam-attendance-59tw.onrender.com
```

### For Development
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=http://localhost:5000
```

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Build
```bash
npm install
npm run build
# Upload build/ folder to your hosting service
```

## Features
- Real-time RFID scanner integration via WebSocket
- Student and exam management
- Attendance tracking and analytics
- User authentication with role-based access
- Responsive design with Tailwind CSS