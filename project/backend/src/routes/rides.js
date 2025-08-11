const express = require('express');
const { body, validationResult } = require('express-validator');
const { Ride, User, Driver, HazardZone } = require('../models');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const routeOptimizer = require('../services/routeOptimizer');
const driverMatcher = require('../services/driverMatcher');

const router = express.Router();

// Create ride request
router.post('/', [
  authMiddleware,
  roleMiddleware(['rider']),
  body('pickupLatitude').isFloat({ min: -90, max: 90 }),
  body('pickupLongitude').isFloat({ min: -180, max: 180 }),
  body('pickupAddress').trim().isLength({ min: 1 }),
  body('destinationLatitude').isFloat({ min: -90, max: 90 }),
  body('destinationLongitude').isFloat({ min: -180, max: 180 }),
  body('destinationAddress').trim().isLength({ min: 1 }),
  body('rideType').isIn(['normal', 'sos']),
  body('emergencyNotes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      destinationLatitude,
      destinationLongitude,
      destinationAddress,
      rideType,
      emergencyNotes
    } = req.body;

    // Get active hazard zones
    const hazardZones = await HazardZone.findAll({
      where: { isActive: true }
    });

    // Calculate safe route
    const routeData = await routeOptimizer.calculateSafeRoute({
      start: { lat: pickupLatitude, lng: pickupLongitude },
      end: { lat: destinationLatitude, lng: destinationLongitude },
      hazardZones
    });

    // Create ride
    const ride = await Ride.create({
      riderId: req.user.id,
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      destinationLatitude,
      destinationLongitude,
      destinationAddress,
      rideType,
      emergencyNotes,
      estimatedFare: routeData.estimatedFare,
      distance: routeData.distance,
      duration: routeData.duration,
      route: routeData.route,
      hazardZonesAvoided: routeData.hazardZonesAvoided
    });

    // Find available driver
    const availableDriver = await driverMatcher.findNearestDriver({
      pickupLat: pickupLatitude,
      pickupLng: pickupLongitude,
      rideType,
      hazardZones
    });

    if (availableDriver) {
      await ride.update({
        driverId: availableDriver.id,
        status: 'accepted'
      });

      // Update driver availability
      await availableDriver.update({ isAvailable: false });

      // Emit socket event for real-time updates
      req.app.get('io').to(`driver-${availableDriver.id}`).emit('ride-request', {
        rideId: ride.id,
        pickup: { lat: pickupLatitude, lng: pickupLongitude, address: pickupAddress },
        destination: { lat: destinationLatitude, lng: destinationLongitude, address: destinationAddress },
        rideType,
        estimatedFare: routeData.estimatedFare
      });
    }

    const rideWithDetails = await Ride.findByPk(ride.id, {
      include: [
        { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
      ]
    });

    res.status(201).json({
      message: 'Ride request created successfully',
      ride: rideWithDetails
    });
  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get rider's rides
router.get('/my-rides', authMiddleware, async (req, res) => {
  try {
    const rides = await Ride.findAll({
      where: { riderId: req.user.id },
      include: [
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ rides });
  } catch (error) {
    console.error('Get rides error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get driver's rides
router.get('/driver-rides', [authMiddleware, roleMiddleware(['driver'])], async (req, res) => {
  try {
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const rides = await Ride.findAll({
      where: { driverId: driver.id },
      include: [
        { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ rides });
  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update ride status
router.patch('/:rideId/status', authMiddleware, [
  body('status').isIn(['accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rideId } = req.params;
    const { status } = req.body;

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'rider' },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] }
      ]
    });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check authorization
    if (req.user.role === 'rider' && ride.riderId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id } });
      if (!driver || ride.driverId !== driver.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    await ride.update({ status });

    // Handle driver availability
    if (status === 'completed' || status === 'cancelled') {
      if (ride.driver) {
        await ride.driver.update({ isAvailable: true });
      }
    }

    // Emit real-time updates
    const io = req.app.get('io');
    io.to(`rider-${ride.riderId}`).emit('ride-status-update', {
      rideId: ride.id,
      status,
      timestamp: new Date()
    });

    if (ride.driverId) {
      io.to(`driver-${ride.driverId}`).emit('ride-status-update', {
        rideId: ride.id,
        status,
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Ride status updated successfully',
      ride: await Ride.findByPk(rideId, {
        include: [
          { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] },
          { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
        ]
      })
    });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get ride by ID
router.get('/:rideId', authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
      ]
    });

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check authorization
    let hasAccess = false;
    if (req.user.role === 'rider' && ride.riderId === req.user.id) {
      hasAccess = true;
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ where: { userId: req.user.id } });
      if (driver && ride.driverId === driver.id) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ ride });
  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;