require('dotenv').config();
const fs = require('fs');
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { sequelize } = require('./models');
const socketHandler = require('./sockets/socketHandler');
const { startHazardMonitoring } = require('./services/hazardService');

// ✅ Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const hazardRoutes = require('./routes/hazards');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Optional HTTPS setup (if needed later)
// const sslOptions = {
//   key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/key.pem'),
//   cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/cert.pem'),
// };
// const server = https.createServer(sslOptions, app);
const server = http.createServer(app);

// ✅ CORS allowed origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://98.84.159.27',
  'https://98.84.159.27',
];

// ✅ Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 30000,
  pingInterval: 25000,
  connectTimeout: 20000,
});

// Trust proxy (needed when behind Nginx)
app.set('trust proxy', 1);

// ✅ Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts. Please try again later.',
  skipSuccessfulRequests: true,
});

// ✅ Security headers
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          'http://localhost:5173',
          'https://localhost:5173',
          'http://98.84.159.27',
          'https://98.84.159.27',
          'ws://98.84.159.27',
          'wss://98.84.159.27',
        ],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// ✅ CORS
app.use(cors());

// ✅ Body parsing
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => (req.rawBody = buf) }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

app.set('io', io);

// ✅ Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'Disconnected',
      error: error.message,
    });
  }
});

// ✅ Mount routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/analytics', analyticsRoutes);

// ✅ Socket handler
socketHandler(io);

// ✅ Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation error', errors: err.errors || err.message });
  }
  if (err.name === 'SequelizeConnectionError') {
    return res.status(503).json({ message: 'Database connection error' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ✅ 404 handler
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/socket.io/')) return next();
  res.status(404).json({ message: 'Route not found', path: req.originalUrl });
});

const PORT = process.env.PORT || 3001;

// ✅ Start server
const startServer = async () => {
  try {
    console.log('🔄 Starting UberRescue server...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const syncOptions = process.env.NODE_ENV === 'production' ? { alter: false } : { alter: true };
    await sequelize.sync(syncOptions);
    console.log('✅ Models synchronized');

    startHazardMonitoring();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

    io.on('connection', (socket) => {
      console.log(`✅ Socket connected: ${socket.id}`);
      socket.on('disconnect', (reason) => {
        console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ✅ Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`🔄 Received ${signal}, shutting down...`);
  server.close(async () => {
    io.close();
    await sequelize.close();
    console.log('✅ Shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error(err);
  gracefulShutdown('unhandledRejection');
});
process.on('uncaughtException', (err) => {
  console.error(err);
  gracefulShutdown('uncaughtException');
});

startServer();

module.exports = app;
