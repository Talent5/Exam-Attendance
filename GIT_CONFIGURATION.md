# Git Configuration Guide

## .gitignore Files Structure

The Exam Attendance System uses multiple `.gitignore` files for different parts of the project:

### 📁 Root `.gitignore`
- **Location**: `/.gitignore`
- **Purpose**: Project-wide ignore rules
- **Covers**: General Node.js, environment files, OS files, security files

### 📁 Backend `.gitignore`
- **Location**: `/backend/.gitignore`
- **Purpose**: Backend-specific ignore rules
- **Covers**: Server logs, uploads, database files, SSL certificates

### 📁 Frontend `.gitignore`
- **Location**: `/frontend/.gitignore`
- **Purpose**: Frontend-specific ignore rules
- **Covers**: React builds, cache files, deployment artifacts

### 📁 ESP32 `.gitignore`
- **Location**: `/esp32/.gitignore`
- **Purpose**: Arduino/ESP32 development files
- **Covers**: Build artifacts, PlatformIO files, libraries

## 🔒 Security Considerations

### Environment Files (CRITICAL)
These files are **NEVER** committed to git:
```
.env
.env.local
.env.production
backend/.env
frontend/.env
```

### Security Files (CRITICAL)
These files contain sensitive data and are ignored:
```
*.pem                # SSL certificates
*.key               # Private keys
jwt-secret.txt      # JWT secrets
api-keys.json       # API credentials
credentials.json    # Service account keys
```

### Database Files
Database files and backups are ignored to prevent:
- Large file commits
- Sensitive data exposure
- Merge conflicts

## 📂 Directory Structure Preservation

### .gitkeep Files
Used to preserve important empty directories:
- `/backend/uploads/.gitkeep` - File upload directory
- `/backend/logs/.gitkeep` - Log files directory

## 🚀 Production Considerations

### What IS Committed
✅ Source code  
✅ Configuration templates (`.env.example`)  
✅ Package lock files (`package-lock.json`)  
✅ Build configurations  
✅ Documentation  

### What is NOT Committed
❌ Environment variables (`.env` files)  
❌ Build artifacts (`build/`, `dist/`)  
❌ Dependencies (`node_modules/`)  
❌ Logs and temporary files  
❌ User uploads  
❌ SSL certificates and keys  

## 🔧 Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd exam-attendance
   ```

2. **Set up environment files**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

## 📋 Best Practices

### Adding New Ignore Rules
1. **Project-wide rules** → Root `.gitignore`
2. **Backend-only rules** → `backend/.gitignore`
3. **Frontend-only rules** → `frontend/.gitignore`
4. **ESP32-only rules** → `esp32/.gitignore`

### Testing Ignore Rules
```bash
# Check if a file would be ignored
git check-ignore path/to/file

# List all ignored files
git status --ignored

# See what would be added
git add . --dry-run
```

### Emergency: File Accidentally Committed
```bash
# Remove from git but keep locally
git rm --cached filename

# Remove directory from git but keep locally
git rm -r --cached directory/

# Update .gitignore and commit
git add .gitignore
git commit -m "Add filename to .gitignore"
```

## 🔍 Troubleshooting

### File Still Being Tracked
If a file is still being tracked after adding to `.gitignore`:
```bash
git rm --cached filename
git commit -m "Remove filename from tracking"
```

### .env Files Visible
If environment files are showing up:
1. Check `.gitignore` syntax
2. Ensure no trailing spaces
3. Use `git check-ignore .env` to verify

### Large Files
For large files that shouldn't be in git:
```bash
# Use Git LFS for large files
git lfs track "*.large-extension"
git add .gitattributes
```

## 📱 Mobile Development
For future mobile app development, additional ignore rules may be needed:
- React Native: Metro cache, iOS/Android builds
- Flutter: Build artifacts, generated files
- Ionic: Platform-specific builds

## 🤝 Team Collaboration

### Before Pushing
1. Review what files are being committed
2. Ensure no sensitive data is included
3. Check build artifacts are ignored
4. Verify environment files are not committed

### Code Reviews
Always check that pull requests don't include:
- Environment files
- Build artifacts  
- Personal IDE settings
- Temporary files
- Large binary files

This configuration ensures a clean, secure, and maintainable repository for the Exam Attendance System.