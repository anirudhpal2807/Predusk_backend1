const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Profile = require('../models/Profile');
const mongoose = require('mongoose');


const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 100 characters',
    'any.required': 'Name is required'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Generate JWT token
const generateToken = (userId) => {
  // Check for JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('❌ CRITICAL: JWT_SECRET environment variable is not set!');
    console.error('🔍 Current environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET'
    });
    
    // For development, use a fallback secret
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Using fallback JWT_SECRET for development');
      const fallbackSecret = 'dev-secret-key-for-development-only';
      return jwt.sign(
        { userId },
        fallbackSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
    }
    
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', asyncHandler(async (req, res) => {
  console.log('🚀 Registration request received!');
  console.log('📝 Request body:', req.body);
  console.log('🔍 Headers:', req.headers);
  console.log('🔍 Environment check - JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
  console.log('🔍 Environment check - MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
  
  // Check MongoDB connection
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    console.error('❌ MongoDB not connected. ReadyState:', mongoose.connection.readyState);
    throw createError.internal('Database connection not available');
  }
  
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      console.error('❌ Validation error:', error.details[0].message);
      throw createError.badRequest(error.details[0].message);
    }

    const { email, password, name } = value;
    console.log('✅ Extracted values:', { email, password, name: name ? 'present' : 'missing' });

  // Check if user already exists
  console.log('🔍 Checking if user already exists...');
  const existingUser = await User.findByEmail(email);
  if (existingUser) {
    console.log('❌ User already exists with email:', email);
    throw createError.conflict('User with this email already exists');
  }
  console.log('✅ No existing user found, proceeding with creation...');

  // Create new user
  console.log('👤 Creating new user...');
  const user = new User({
    email,
    password
  });

  console.log('💾 Saving user to database...');
  try {
    await user.save();
    console.log('✅ User saved successfully! User ID:', user._id);
  } catch (saveError) {
    console.error('❌ User save error:', saveError);
    console.error('❌ User save error details:', saveError.message);
    throw saveError;
  }

  // Create profile for the user
  console.log('📋 Creating profile for user...');
  const profile = new Profile({
    userId: user._id,
    name,
    email
  });

  console.log('📝 Profile object before save:', profile);
  console.log('💾 Saving profile to database...');
  try {
    await profile.save();
    console.log('✅ Profile saved successfully! Profile ID:', profile._id);
  } catch (profileSaveError) {
    console.error('❌ Profile save error:', profileSaveError);
    console.error('❌ Profile save error details:', profileSaveError.message);
    throw profileSaveError;
  }
  
  // Log database collections
  console.log('🔍 Checking database collections...');
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('📚 Available collections:', collections.map(c => c.name));
  
  // Log user count
  const userCount = await User.countDocuments();
  console.log('👥 Total users in database:', userCount);
  
  // Log profile count
  const profileCount = await Profile.countDocuments();
  console.log('📋 Total profiles in database:', profileCount);

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  const responseData = {
    success: true,
    message: 'User registered successfully',
    data: {
      user: user.getPublicInfo(),
      profile: {
        id: profile._id,
        name: profile.name,
        email: profile.email
      },
      token
    }
  };
  
  console.log('📤 Sending response to client...');
  console.log('📊 Response data:', JSON.stringify(responseData, null, 2));
  console.log('🎉 Registration completed successfully!');
  
  res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('❌ Error stack:', error.stack);
    throw error; // Re-throw to be handled by errorHandler
  }
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', asyncHandler(async (req, res) => {
  // Validate request body
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createError.badRequest(error.details[0].message);
  }

  const { email, password } = value;

  // Find user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw createError.unauthorized('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw createError.unauthorized('Account is deactivated');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createError.unauthorized('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  await user.updateLastLogin();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: user.getPublicInfo(),
      token
    }
  });
}));

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const profile = await Profile.findOne({ userId: req.user._id });
  
  if (!profile) {
    throw createError.notFound('Profile not found');
  }

  res.json({
    success: true,
    data: {
      user: req.user.getPublicInfo(),
      profile: profile.getPublicProfile()
    }
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  // Generate new token
  const token = generateToken(req.user._id);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      token
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success (client removes token)
  
  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user.getPublicInfo()
    }
  });
}));

module.exports = router;
