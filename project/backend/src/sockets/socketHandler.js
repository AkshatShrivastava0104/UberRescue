const jwt = require('jsonwebtoken');
const { User, Driver } = require('../models');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return next(new Error('Authentication error'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

const handleConnection = (socket) => {
  console.log(`User connected: ${socket.user.id} (${socket.user.role})`);

  // Join room based on user role and ID
  if (socket.user.role === 'rider') {
    socket.join(`rider-${socket.user.id}`);
  } else if (socket.user.role === 'driver') {
    socket.join(`driver-${socket.user.id}`);
  }

  // Handle driver location updates
  socket.on('update-location', async (data) => {
    if (socket.user.role !== 'driver') return;

    try {
      const driver = await Driver.findOne({ where: { userId: socket.user.id } });
      if (driver) {
        await driver.update({
          currentLatitude: data.latitude,
          currentLongitude: data.longitude
        });

        // Broadcast location update to relevant riders
        socket.broadcast.emit('driver-location-update', {
          driverId: driver.id,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Update location error:', error);
    }
  });

  // Handle ride status updates
  socket.on('ride-status-update', (data) => {
    // Broadcast to both rider and driver
    socket.broadcast.to(`rider-${data.riderId}`).emit('ride-status-update', data);
    socket.broadcast.to(`driver-${data.driverId}`).emit('ride-status-update', data);
  });

  // Handle emergency alerts
  socket.on('emergency-alert', (data) => {
    // Broadcast emergency alert to all connected users in the area
    socket.broadcast.emit('emergency-alert', {
      ...data,
      timestamp: new Date()
    });
  });

  // Handle driver availability updates
  socket.on('driver-availability', async (data) => {
    if (socket.user.role !== 'driver') return;

    try {
      const driver = await Driver.findOne({ where: { userId: socket.user.id } });
      if (driver) {
        await driver.update({
          isAvailable: data.isAvailable,
          isOnline: data.isOnline
        });

        socket.broadcast.emit('driver-availability-update', {
          driverId: driver.id,
          isAvailable: data.isAvailable,
          isOnline: data.isOnline,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Update availability error:', error);
    }
  });

  // Handle ride matching notifications
  socket.on('ride-request-response', (data) => {
    // Notify rider of driver response
    socket.broadcast.to(`rider-${data.riderId}`).emit('ride-request-response', {
      rideId: data.rideId,
      accepted: data.accepted,
      driverId: data.driverId,
      estimatedArrival: data.estimatedArrival,
      timestamp: new Date()
    });
  });

  // Handle new ride requests - notify nearby drivers
  socket.on('new-ride-request', (data) => {
    // Broadcast to all online drivers in the area
    socket.broadcast.emit('ride-request-notification', {
      rideId: data.rideId,
      pickupLocation: data.pickupLocation,
      destinationLocation: data.destinationLocation,
      rideType: data.rideType,
      estimatedFare: data.estimatedFare,
      distance: data.distance,
      timestamp: new Date()
    });
  });

  // Handle real-time hazard updates
  socket.on('hazard-update', (data) => {
    // Broadcast hazard updates to all users
    socket.broadcast.emit('hazard-update', {
      ...data,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.id}`);

    // Update driver offline status
    if (socket.user.role === 'driver') {
      try {
        const driver = await Driver.findOne({ where: { userId: socket.user.id } });
        if (driver) {
          await driver.update({ isOnline: false });
        }
      } catch (error) {
        console.error('Update driver offline status error:', error);
      }
    }
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to UberRescue',
    userId: socket.user.id,
    role: socket.user.role,
    timestamp: new Date()
  });
};

const socketHandler = (io) => {
  // Apply authentication middleware
  io.use((socket, next) => {
    // Skip auth for development/testing
    if (process.env.NODE_ENV === 'development') {
      socket.user = { id: 'test-user', role: 'rider' };
      return next();
    }
    return socketAuth(socket, next);
  });

  // Handle connections
  io.on('connection', handleConnection);

  console.log('Socket.IO server initialized');
};

module.exports = socketHandler;