/**
 * Global error handling middleware
 */

// Error response formatter
const formatError = (error) => {
  const errorResponse = {
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  // Add validation errors if they exist
  if (error.errors) {
    errorResponse.errors = Object.keys(error.errors).map(key => ({
      field: key,
      message: error.errors[key].message
    }));
  }

  return errorResponse;
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';

  // Handle different types of errors
  switch (error.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation failed';
      break;
    
    case 'CastError':
      statusCode = 400;
      message = 'Invalid ID format';
      break;
    
    case 'MongoError':
      if (error.code === 11000) {
        statusCode = 409;
        message = 'Duplicate field value';
      } else {
        statusCode = 500;
        message = 'Database error';
      }
      break;
    
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid token';
      break;
    
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token expired';
      break;
    
    case 'MulterError':
      statusCode = 400;
      message = 'File upload error';
      break;
    
    default:
      // Check if error has a status code
      if (error.statusCode) {
        statusCode = error.statusCode;
        message = error.message;
      }
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? req.user._id : 'unauthenticated'
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      error: error.message,
      stack: error.stack
    })
  });
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
const createError = {
  badRequest: (message = 'Bad request') => new AppError(message, 400),
  unauthorized: (message = 'Unauthorized') => new AppError(message, 401),
  forbidden: (message = 'Forbidden') => new AppError(message, 403),
  notFound: (message = 'Resource not found') => new AppError(message, 404),
  conflict: (message = 'Conflict') => new AppError(message, 409),
  unprocessable: (message = 'Unprocessable entity') => new AppError(message, 422),
  tooManyRequests: (message = 'Too many requests') => new AppError(message, 429),
  internal: (message = 'Internal server error') => new AppError(message, 500)
};

// Validation error handler
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return createError.badRequest(message);
};

// Cast error handler (invalid MongoDB ObjectId)
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return createError.badRequest(message);
};

// Duplicate field error handler
const handleDuplicateFieldError = (error) => {
  const value = error.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return createError.conflict(message);
};

// JWT error handlers
const handleJWTError = () => createError.unauthorized('Invalid token. Please log in again!');
const handleJWTExpiredError = () => createError.unauthorized('Your token has expired! Please log in again!');

module.exports = {
  errorHandler,
  asyncHandler,
  AppError,
  createError,
  handleValidationError,
  handleCastError,
  handleDuplicateFieldError,
  handleJWTError,
  handleJWTExpiredError
};
