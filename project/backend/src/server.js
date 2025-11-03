require('dotenv').config();
const fs = require('fs');
const http = require("http");
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const socketHandler = require('./sockets/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const hazardRoutes = require('./routes/hazards');
const analyticsRoutes = require('./routes/analytics');
const riderRoutes = require('./routes/rides'); // ✅ Added (for location updates)

// Import hazard monitoring service
const { startHazardMonitoring } = require('./services/hazardService'); // ✅ Added

const app = express();

// Load SSL certificates (optional)
// const sslOptions = {
//   key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/key.pem'),
//   cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/cert.pem'),
//   ca: process.env.SSL_CA_PATH ? fs.readFileSync(process.env.SSL_CA_PATH) : undefined
// };

// Create HTTP server (can switch to HTTPS later)
const server = http.createServer(app);

// Configure Socket.IO
const allowedOrigins = [
  "https://98.84.159.27",
  "http://98.84.159.27",
  "http://localhost:5173"
];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
  transports: ["websocket"],
  pingTimeout: 30000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  connectTimeout: 20000,
});

// Trust proxy for production
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        process.env.FRONTEND_URL || "http://98.84.159.27",
        "wss://*.devtunnels.ms",
        "https://*.devtunnels.ms"
      ],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  }
}));

// CORS middleware
app.use(cors());

// Body parsing
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Make io accessible in routes
app.set('io', io);

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// ✅ API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/riders', riderRoutes); // ✅ Added new route

// Socket.IO handler
socketHandler(io);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation error', errors: err.errors || err.message });
  }
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({ message: 'Database connection error' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/socket.io/')) return next();
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

const PORT = process.env.PORT || 3001;

// Server startup
const startServer = async () => {
  try {
    console.log('🔄 Starting UberRescue server...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const syncOptions = process.env.NODE_ENV === 'production' ? { alter: false } : { alter: true };
    await sequelize.sync(syncOptions);
    console.log('✅ Database models synchronized');

    // ✅ Start real-time hazard monitoring (updates every 5 min)
    startHazardMonitoring();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on https://localhost:${PORT}`);
    });

    io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      socket.on('disconnect', (reason) => {
        console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🔄 Received ${signal}, shutting down...`);
  server.close(async () => {
    io.close();
    await sequelize.close();
    console.log('✅ Shutdown complete');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => { console.error(err); gracefulShutdown('unhandledRejection'); });
process.on('uncaughtException', (err) => { console.error(err); gracefulShutdown('uncaughtException'); });

startServer();

module.exports = app;
