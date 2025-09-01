# Render.com Backend Deployment Guide

## 🚀 Deploy Backend to Render.com

### Step 1: Prepare Your Repository

1. **Push all changes to GitHub:**
```bash
git add .
git commit -m "Configure backend for Render deployment"
git push origin main
```

2. **Ensure these files are in your repository:**
   - `src/app.js` (main server file)
   - `package.json` (with start script)
   - `render.yaml` (Render configuration)

### Step 2: MongoDB Atlas IP Whitelist Configuration ⚠️ CRITICAL

**Before deploying to Render, you MUST whitelist Render's IP addresses in MongoDB Atlas:**

1. **Go to [MongoDB Atlas](https://cloud.mongodb.com)**
2. **Select your cluster** → **Security** → **Network Access**
3. **Click "ADD IP ADDRESS"**
4. **Add these IP ranges:**

**Option 1: Allow All IPs (Easiest - for testing)**
```
IP Address: 0.0.0.0/0
Description: Render.com - All IPs
```

**Option 2: Specific Render.com IP Ranges**
```
13.52.0.0/16
13.56.0.0/16
13.64.0.0/16
13.68.0.0/16
13.72.0.0/16
13.76.0.0/16
13.80.0.0/16
13.84.0.0/16
13.88.0.0/16
13.92.0.0/16
13.96.0.0/16
13.100.0.0/16
13.104.0.0/16
13.108.0.0/16
13.112.0.0/16
13.116.0.0/16
13.120.0.0/16
13.124.0.0/16
13.128.0.0/16
13.132.0.0/16
13.136.0.0/16
13.140.0.0/16
13.144.0.0/16
13.148.0.0/16
13.152.0.0/16
13.156.0.0/16
13.160.0.0/16
13.164.0.0/16
13.168.0.0/16
13.172.0.0/16
13.176.0.0/16
13.180.0.0/16
13.184.0.0/16
13.188.0.0/16
13.192.0.0/16
13.196.0.0/16
13.200.0.0/16
13.204.0.0/16
13.208.0.0/16
13.212.0.0/16
13.216.0.0/16
13.220.0.0/16
13.224.0.0/16
13.228.0.0/16
13.232.0.0/16
13.236.0.0/16
13.240.0.0/16
13.244.0.0/16
13.248.0.0/16
13.252.0.0/16
```

5. **Click "Confirm"**

**⚠️ IMPORTANT**: Without this step, your backend will fail to connect to MongoDB!

### Step 3: Deploy to Render.com

1. **Visit [render.com](https://render.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect your GitHub repository**
5. **Select the repository** containing your backend code

### Step 4: Configure the Service

**Basic Settings:**
- **Name**: `predusk-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (for testing)

### Step 5: Set Environment Variables

**Required Environment Variables:**

1. **MONGODB_URI**
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://palanirudh8299_db_user:wNyepKnl6jAQs22k@predusk.r8yswvr.mongodb.net/predusk`
   - **Format**: `mongodb+srv://username:password@cluster.mongodb.net/database_name`

2. **JWT_SECRET**
   - **Key**: `JWT_SECRET`
   - **Value**: `xkZMH6urpJxLZ1BOeCStrXA9xc12tyG7dQWHemSO2a0=`

3. **NODE_ENV**
   - **Key**: `NODE_ENV`
   - **Value**: `production`

### Step 6: Deploy

1. **Click "Create Web Service"**
2. **Wait for build to complete** (usually 2-5 minutes)
3. **Your service will be available at**: `https://your-service-name.onrender.com`

## 🔧 Configuration Details

### Render.yaml Configuration
```yaml
services:
  - type: web
    name: predusk-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
    healthCheckPath: /health
    autoDeploy: true
```

### Health Check Endpoint
- **URL**: `/health`
- **Purpose**: Render monitors this endpoint for service health
- **Expected Response**: 200 OK

## 🧪 Testing Your Deployment

### Test 1: Health Check
```bash
curl https://your-service-name.onrender.com/health
```

### Test 2: API Root
```bash
curl https://your-service-name.onrender.com/
```

### Test 3: Database Health
```bash
curl https://your-service-name.onrender.com/db-health
```

### Test 4: Registration API
```bash
curl -X POST https://your-service-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## 🔍 Troubleshooting

### Issue 1: "Could not connect to any servers in your MongoDB Atlas cluster"
**Solution**: 
- ✅ **IP Whitelist**: Add `0.0.0.0/0` to MongoDB Atlas Network Access
- ✅ **Connection String**: Verify MONGODB_URI format
- ✅ **Username/Password**: Check credentials in MongoDB Atlas

### Issue 2: Build Failed
**Solution**: Check build logs in Render dashboard

### Issue 3: Service Won't Start
**Solution**: Check start command and environment variables

### Issue 4: MongoDB Connection Failed
**Solution**: 
- Verify MONGODB_URI format
- Check MongoDB Atlas IP whitelist
- Ensure cluster is running

### Issue 5: Environment Variables Not Loading
**Solution**: 
- Verify variables are set in Render dashboard
- Check variable names match exactly
- Redeploy after adding variables

## 📱 Update Frontend Configuration

After successful backend deployment, update your frontend:

1. **Frontend Environment Variable:**
```
VITE_API_URL=https://your-service-name.onrender.com
```

2. **Update CORS in Backend** (if needed):
```javascript
origin: [
  'https://predusk-frontend1-qwra.vercel.app',
  'http://localhost:3000'
]
```

## 🎯 Benefits of Render.com

✅ **Always On**: Free tier keeps your service running  
✅ **Auto-Deploy**: Automatic deployment on git push  
✅ **Custom Domain**: Add your own domain  
✅ **SSL Certificate**: Automatic HTTPS  
✅ **Health Monitoring**: Built-in health checks  
✅ **Logs**: Easy access to application logs  

## 🆘 Support

If issues persist:
1. Check Render dashboard logs
2. Verify environment variables
3. **Check MongoDB Atlas IP whitelist** ⚠️
4. Test endpoints locally first
5. Check MongoDB Atlas connectivity

## 🚨 Common Error: IP Whitelist

**Error**: `Could not connect to any servers in your MongoDB Atlas cluster`

**Root Cause**: Render.com's IP addresses are not whitelisted in MongoDB Atlas

**Solution**: Add `0.0.0.0/0` to MongoDB Atlas Network Access IP whitelist
