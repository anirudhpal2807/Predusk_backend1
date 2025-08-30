const express = require('express');
const mongoose = require('mongoose');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @route   GET /health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with database status
 * @access  Public
 */
router.get('/detailed', asyncHandler(async (req, res) => {
  // Check database connection
  let dbStatus = 'disconnected';
  let dbLatency = 0;

  try {
    const startTime = Date.now();
    await mongoose.connection.db.admin().ping();
    dbLatency = Date.now() - startTime;
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'error';
  }

  // Get system information
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    uptime: process.uptime()
  };

  // Get database statistics
  let dbStats = {};
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      dbStats = {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize
      };
    }
  } catch (error) {
    dbStats = { error: 'Unable to fetch database stats' };
  }

  res.json({
    success: true,
    message: 'Detailed health check completed',
    timestamp: new Date().toISOString(),
    status: {
      api: 'healthy',
      database: dbStatus,
      overall: dbStatus === 'connected' ? 'healthy' : 'degraded'
    },
    database: {
      status: dbStatus,
      latency: dbLatency,
      stats: dbStats
    },
    system: systemInfo,
    environment: process.env.NODE_ENV || 'development'
  });
}));

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/ready', asyncHandler(async (req, res) => {
  // Check if the application is ready to serve requests
  const checks = {
    database: false,
    api: true
  };

  try {
    // Check database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      checks.database = true;
    }
  } catch (error) {
    checks.database = false;
  }

  // Determine overall readiness
  const isReady = Object.values(checks).every(check => check === true);

  if (isReady) {
    res.status(200).json({
      success: true,
      message: 'Application is ready',
      timestamp: new Date().toISOString(),
      checks
    });
  } else {
    res.status(503).json({
      success: false,
      message: 'Application is not ready',
      timestamp: new Date().toISOString(),
      checks
    });
  }
}));

/**
 * @route   GET /health/live
 * @desc    Liveness probe for Kubernetes/container orchestration
 * @access  Public
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if this endpoint responds, the process is alive
  res.status(200).json({
    success: true,
    message: 'Application is alive',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

/**
 * @route   GET /health/metrics
 * @desc    Basic metrics endpoint (can be extended with Prometheus metrics)
 * @access  Public
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: process.memoryUsage().rss,
      heapTotal: process.memoryUsage().heapTotal,
      heapUsed: process.memoryUsage().heapUsed,
      external: process.memoryUsage().external
    },
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      collections: 0
    }
  };

  // Get database collection count if connected
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      metrics.database.collections = stats.collections;
    }
  } catch (error) {
    // Ignore errors in metrics collection
  }

  res.json({
    success: true,
    data: metrics
  });
}));

module.exports = router;
