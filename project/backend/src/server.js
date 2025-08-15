require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const db = require('./models');
const socketHandler = require('./sockets/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const driverRoutes = require('./routes/drivers');
const hazardRoutes = require('./routes/hazards');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/hazards', hazardRoutes);
app.use('/api/analytics', analyticsRoutes);

// Socket.IO handling
socketHandler(io);

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  console.error('Stack:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

// Database connection and server start
const startServer = async () => {
  try {
    console.log('Connecting to database...');
    await db.sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database models
    await db.sequelize.sync();
    console.log('Database models synchronized.');

    server.listen(PORT, () => {
      console.log(`🚀 UberRescue server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 Socket.IO ready for connections`);
    });
  } catch (err) {
    console.error('❌ Unable to start server:', err);
    process.exit(1);
  }
};

startServer()
  .then(() => {
    console.log('Database connection established successfully.');
    server.listen(PORT, () => {
      console.log(`UberRescue server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = app;