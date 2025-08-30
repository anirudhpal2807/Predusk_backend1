const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for profile relationship
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastLogin
userSchema.pre('save', function(next) {
  if (this.isModified('lastLogin')) {
    this.lastLogin = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to check if email exists
userSchema.statics.emailExists = function(email) {
  return this.exists({ email: email.toLowerCase() });
};

// Method to get public user info (without sensitive data)
userSchema.methods.getPublicInfo = function() {
  return {
    _id: this._id,
    email: this.email,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('User', userSchema);
