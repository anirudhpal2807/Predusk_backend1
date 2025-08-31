const path = require('path');
const fs = require('fs');

// --- Environment Configuration ---
const envPath = path.join(__dirname, '..', '.env');

// Load .env file if it exists (for local development)
if (fs.existsSync(envPath) && process.env.NODE_ENV !== 'production') {
  console.log('[ENV] Loading .env file from:', envPath);
  require('dotenv').config({ path: envPath });
} else {
  console.log('[ENV] Using environment variables from Vercel/System');
}

// Log important environment variables
console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
console.log('[ENV] PORT:', process.env.PORT);
console.log('[ENV] MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not Set');
console.log('[ENV] JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');

// Check critical environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ CRITICAL: MONGODB_URI environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot start production server without MONGODB_URI');
  }
}

if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Cannot start production server without JWT_SECRET');
  }
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const projectRoutes = require('./routes/projects');
const skillRoutes = require('./routes/skills');
const searchRoutes = require('./routes/search');
const healthRoutes = require('./routes/health');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting - DISABLED for development
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://predusk-frontend1-qwra.vercel.app', // Your actual frontend domain
        'https://predusk-frontend1.vercel.app',      // Alternative domain
        'http://localhost:3000',                     // For local development
        'http://localhost:5173'                      // For Vite dev server
      ]
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route (before API routes)
app.use('/health', healthRoutes);

// MongoDB connection health check
app.get('/db-health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    success: true,
    database: {
      status: states[dbState] || 'unknown',
      readyState: dbState,
      name: mongoose.connection.name,
      host: mongoose.connection.host
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/search', searchRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Predusk API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      profile: '/api/profile',
      projects: '/api/projects',
      skills: '/api/skills',
      search: '/api/search',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// MongoDB connection with Vercel-optimized settings
mongoose.connect(process.env.MONGODB_URI, {
  retryWrites: true,
  w: 'majority',
  maxPoolSize: 1, // Reduced for serverless
  minPoolSize: 0, // Allow connection pool to shrink
  serverSelectionTimeoutMS: 5000, // Faster timeout for serverless
  socketTimeoutMS: 10000, // Reduced timeout
  connectTimeoutMS: 10000, // Reduced timeout
  bufferCommands: false, // Disable buffering for serverless
  bufferMaxEntries: 0, // Disable buffering
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully!');
  console.log('✅ Database:', mongoose.connection.name);
  console.log('✅ Host:', mongoose.connection.host);
  console.log('✅ Port:', mongoose.connection.port);
  
  // Set connection state
  mongoose.connection.readyState = 1; // Connected
  
  // Start server after successful database connection
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📱 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API docs: http://localhost:${PORT}/`);
    });
  }
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  console.error('❌ Error details:', error.message);
  
  if (error.name === 'MongoServerSelectionError') {
    console.error('🔍 This is a server selection error. Common causes:');
    console.error('   1. IP address not whitelisted in MongoDB Atlas');
    console.error('   2. Network connectivity issues');
    console.error('   3. Cluster is paused or down');
  } else if (error.name === 'MongoParseError') {
    console.error('🔍 This is a connection string parsing error.');
    console.error('   Check your MONGODB_URI format in .env file');
  } else if (error.name === 'MongoNetworkError') {
    console.error('🔍 This is a network connectivity error.');
    console.error('   Check your internet connection and firewall settings');
  }
  
  console.error('❌ Please check:');
  console.error('   1. Is your .env file created with correct MONGODB_URI?');
  console.error('   2. Is your MongoDB Atlas connection string correct?');
  console.error('   3. Is your IP whitelisted in MongoDB Atlas Network Access?');
  console.error('   4. Are your username/password correct?');
  console.error('   5. Is your cluster running and accessible?');
  console.error('🔍 Connection string format should be:');
  console.error('   mongodb+srv://username:password@cluster.mongodb.net/database_name');
  console.error('🔍 Current connection string:', process.env.MONGODB_URI);
  
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
