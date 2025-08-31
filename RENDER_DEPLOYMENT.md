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

### Step 2: Deploy to Render.com

1. **Visit [render.com](https://render.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect your GitHub repository**
5. **Select the repository** containing your backend code

### Step 3: Configure the Service

**Basic Settings:**
- **Name**: `predusk-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (for testing)

### Step 4: Set Environment Variables

**Required Environment Variables:**

1. **MONGODB_URI**
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database`
   - **Example**: `mongodb+srv://john:password123@cluster0.abc123.mongodb.net/predusk`

2. **JWT_SECRET**
   - **Key**: `JWT_SECRET`
   - **Value**: `xkZMH6urpJxLZ1BOeCStrXA9xc12tyG7dQWHemSO2a0=`

3. **NODE_ENV**
   - **Key**: `NODE_ENV`
   - **Value**: `production`

### Step 5: Deploy

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

### Issue 1: Build Failed
**Solution**: Check build logs in Render dashboard

### Issue 2: Service Won't Start
**Solution**: Check start command and environment variables

### Issue 3: MongoDB Connection Failed
**Solution**: 
- Verify MONGODB_URI format
- Check MongoDB Atlas IP whitelist
- Ensure cluster is running

### Issue 4: Environment Variables Not Loading
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
3. Test endpoints locally first
4. Check MongoDB Atlas connectivity
