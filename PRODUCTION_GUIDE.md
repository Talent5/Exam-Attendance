# Production Deployment Guide

## Security Checklist

### 1. Authentication & Authorization
- ✅ Demo accounts and debug features removed
- ✅ Default admin password randomized
- ✅ JWT tokens properly configured
- ✅ Role-based access controls in place
- ✅ Account lockout after failed login attempts

### 2. Environment Configuration

#### Backend (.env)
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secure-jwt-secret
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=your-secure-password
```

#### Frontend (.env.production)
```bash
REACT_APP_API_URL=https://your-backend-domain.com
REACT_APP_WS_URL=https://your-backend-domain.com
GENERATE_SOURCEMAP=false
```

### 3. Security Headers & CORS
- ✅ Helmet.js security headers enabled
- ✅ CORS properly configured for production domains
- ✅ Credentials handling secured

### 4. Database Security
- ✅ MongoDB connection string with authentication
- ✅ Database indexes for performance
- ✅ Input validation and sanitization

### 5. Error Handling
- ✅ Production error messages (no stack traces)
- ✅ Proper logging without sensitive data exposure
- ✅ Debug console.log statements removed

## Deployment Steps

### 1. Backend Deployment
1. Set up production MongoDB database
2. Configure environment variables
3. Install dependencies: `npm install --production`
4. Build and deploy to your hosting service
5. Verify health endpoint: `GET /health`

### 2. Frontend Deployment
1. Set production environment variables
2. Build production bundle: `npm run build`
3. Deploy to CDN/hosting service
4. Verify HTTPS and domain configuration

### 3. Post-Deployment
1. Test login functionality
2. Verify admin account creation
3. Test RFID scanner connectivity
4. Monitor application logs
5. Set up SSL certificates
6. Configure backup procedures

## First-Time Setup

1. **Access Admin Account**
   - Username: `admin`
   - Password: Check deployment logs for generated password (development only)
   - **IMPORTANT**: Change default password immediately

2. **Create Production Users**
   - Log in as admin
   - Navigate to Users management
   - Create production user accounts
   - Assign appropriate roles

3. **Configure System**
   - Set up student database
   - Configure exam schedules
   - Test RFID scanner integration

## Security Best Practices

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Update SSL certificates

2. **Monitoring**
   - Set up application monitoring
   - Monitor failed login attempts
   - Track system performance

3. **Backup Strategy**
   - Regular database backups
   - Configuration backups
   - Test restore procedures

## Troubleshooting

### Common Issues
1. **CORS Errors**: Verify FRONTEND_URL environment variable
2. **Database Connection**: Check MongoDB URI and network access
3. **Authentication Issues**: Verify JWT secrets are set
4. **Scanner Connection**: Check WebSocket configuration

### Health Checks
- Backend: `GET /health`
- Frontend: Check console for errors
- Database: Connection status in logs
- WebSocket: Scanner namespace connectivity