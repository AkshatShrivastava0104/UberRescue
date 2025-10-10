const jwt = require('jsonwebtoken');
const { User, Driver } = require('../models');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('⚠️ Socket connection without token - creating anonymous session');
      socket.user = { id: 'anonymous', role: 'rider', isAnonymous: true };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      console.log('⚠️ Invalid user token - creating anonymous session');
      socket.user = { id: 'anonymous', role: 'rider', isAnonymous: true };
      return next();
    }

    socket.user = user;
    console.log(`✅ Socket authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    console.log('⚠️ Socket auth error - creating anonymous session:', error.message);
    socket.user = { id: 'anonymous', role: 'rider', isAnonymous: true };
    next();
  }
};

const handleConnection = (socket) => {
  const userId = socket.user.id;
  const userRole = socket.user.role;

  console.log(`🔌 User connected: ${userId} (${userRole})`);

  // Join room based on user role and ID
  if (!socket.user.isAnonymous) {
    if (userRole === 'rider') {
      socket.join(`rider-${userId}`);
      console.log(`👤 Rider ${userId} joined room`);
    } else if (userRole === 'driver') {
      socket.join(`driver-${userId}`);
      console.log(`🚗 Driver ${userId} joined room`);
    }
  }

  // Handle driver location updates
  socket.on('update-location', async (data) => {
    if (socket.user.isAnonymous || userRole !== 'driver') {
      console.log('⚠️ Location update ignored - not authenticated driver');
      return;
    }

    try {
      const driver = await Driver.findOne({ where: { userId } });
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
        console.log(`📍 Driver ${driver.id} location updated: ${data.latitude}, ${data.longitude}`);
      }
    } catch (error) {
      console.error('❌ Update location error:', error);
    }
  });

  // Handle ride status updates
  socket.on('ride-status-update', (data) => {
    // Broadcast to both rider and driver
    if (data.riderId) {
      socket.broadcast.to(`rider-${data.riderId}`).emit('ride-status-update', data);
    }
    if (data.driverId) {
      socket.broadcast.to(`driver-${data.driverId}`).emit('ride-status-update', data);
    }
    console.log(`🚗 Ride status update broadcasted: ${data.status}`);
  });

  // Handle emergency alerts
  socket.on('emergency-alert', (data) => {
    // Broadcast emergency alert to all connected users in the area
    socket.broadcast.emit('emergency-alert', {
      ...data,
      timestamp: new Date()
    });
    console.log(`🚨 Emergency alert broadcasted: ${data.message}`);
  });

  // Handle driver availability updates
  socket.on('driver-availability', async (data) => {
    if (socket.user.isAnonymous || userRole !== 'driver') {
      console.log('⚠️ Availability update ignored - not authenticated driver');
      return;
    }

    try {
      const driver = await Driver.findOne({ where: { userId } });
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
        console.log(`🚗 Driver ${driver.id} availability updated: ${data.isAvailable ? 'Available' : 'Busy'}, ${data.isOnline ? 'Online' : 'Offline'}`);
      }
    } catch (error) {
      console.error('❌ Update availability error:', error);
    }
  });

  // Handle ride matching notifications
  socket.on('ride-request-response', (data) => {
    // Notify rider of driver response
    if (data.riderId) {
      socket.broadcast.to(`rider-${data.riderId}`).emit('ride-request-response', {
        rideId: data.rideId,
        accepted: data.accepted,
        driverId: data.driverId,
        estimatedArrival: data.estimatedArrival,
        timestamp: new Date()
      });
    }
    console.log(`🤝 Ride request response: ${data.accepted ? 'Accepted' : 'Declined'}`);
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
      rider: data.rider,
      timestamp: new Date()
    });
    console.log(`📢 New ride request broadcasted: ${data.rideType} ride`);
  });

  // Handle real-time hazard updates
  socket.on('hazard-update', (data) => {
    // Broadcast hazard updates to all users
    socket.broadcast.emit('hazard-update', {
      ...data,
      timestamp: new Date()
    });
    console.log(`⚠️ Hazard update broadcasted: ${data.name}`);
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    console.log(`🔌 User disconnected: ${userId} - Reason: ${reason}`);

    // Update driver offline status
    if (!socket.user.isAnonymous && userRole === 'driver') {
      try {
        const driver = await Driver.findOne({ where: { userId } });
        if (driver) {
          await driver.update({ isOnline: false });
          console.log(`🚗 Driver ${driver.id} set to offline`);
        }
      } catch (error) {
        console.error('❌ Update driver offline status error:', error);
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
  io.use(socketAuth);

  // Handle connections
  io.on('connection', handleConnection);

  console.log('🔌 Socket.IO server initialized and ready');
  console.log('📡 Listening for connections on all transports');
};

module.exports = socketHandler;