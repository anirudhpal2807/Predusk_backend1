# Vercel Environment Variables Setup Guide

## 🚨 CRITICAL: Set These Environment Variables

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com](https://vercel.com)
2. Login to your account
3. Select your **backend** project: `predusk-backend1`

### Step 2: Navigate to Environment Variables
1. Click on your project
2. Go to **Settings** tab
3. Click **Environment Variables** in left sidebar

### Step 3: Add Required Variables

#### Variable 1: MONGODB_URI
- **Name**: `MONGODB_URI`
- **Value**: `mongodb+srv://your_username:your_password@your_cluster.mongodb.net/your_database`
- **Environment**: Production
- **Example**: `mongodb+srv://john:password123@cluster0.abc123.mongodb.net/predusk`

#### Variable 2: JWT_SECRET
- **Name**: `JWT_SECRET`
- **Value**: `xkZMH6urpJxLZ1BOeCStrXA9xc12tyG7dQWHemSO2a0=`
- **Environment**: Production

#### Variable 3: NODE_ENV
- **Name**: `NODE_ENV`
- **Value**: `production`
- **Environment**: Production

### Step 4: Save and Redeploy
1. Click **Save** for each variable
2. Go to **Deployments** tab
3. Click **Redeploy** on latest deployment

## 🔍 How to Test

### Test 1: Check Environment Variables
```bash
curl https://predusk-backend1.vercel.app/
```
Expected: Should show environment as "production"

### Test 2: Check Database Health
```bash
curl https://predusk-backend1.vercel.app/db-health
```
Expected: Should show database status

### Test 3: Test Registration
```bash
curl -X POST https://predusk-backend1.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## ❌ Common Issues

### Issue 1: Environment Variables Not Loading
**Solution**: 
- Ensure variables are set for "Production" environment
- Redeploy after adding variables
- Check Vercel function logs

### Issue 2: MongoDB Connection Failed
**Solution**:
- Verify MONGODB_URI format
- Check MongoDB Atlas IP whitelist
- Ensure cluster is running

### Issue 3: JWT_SECRET Not Working
**Solution**:
- Use the provided JWT_SECRET value
- Ensure no extra spaces in value
- Redeploy after changes

## 📱 Frontend Environment Variables

In your **frontend** project, also set:
```
VITE_API_URL=https://predusk-backend1.vercel.app
```

## 🆘 If Still Not Working

1. **Check Vercel Logs**: Functions → Logs
2. **Verify Variables**: Settings → Environment Variables
3. **Test Endpoints**: Use curl commands above
4. **Redeploy**: Force a new deployment

## 🔐 Security Note

- Never commit environment variables to git
- Use Vercel's built-in environment variable system
- Rotate JWT_SECRET periodically
- Monitor Vercel function logs for errors
