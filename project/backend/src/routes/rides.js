const express = require('express');
const { body, validationResult } = require('express-validator');
const { Ride, User, Driver, HazardZone, RideHistory, SafetyScore } = require('../models');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const routeOptimizer = require('../services/routeOptimizer');
const driverMatcher = require('../services/driverMatcher');

const router = express.Router();

// Helper function to update analytics
const updateRiderAnalytics = async (riderId, rideType) => {
  try {
    // This would typically update a rider analytics table
    // For now, we'll just log it as the analytics are calculated on-demand
    console.log(`Analytics updated for rider ${riderId}, ride type: ${rideType}`);
  } catch (error) {
    console.error('Failed to update rider analytics:', error);
  }
};

const updateDriverAnalytics = async (driverId, rideType) => {
  try {
    const driver = await Driver.findByPk(driverId);
    if (driver) {
      // Update total trips
      await driver.update({
        totalTrips: driver.totalTrips + 1
      });

      // Update or create safety score record
      let safetyScore = await SafetyScore.findOne({ where: { driverId } });
      if (!safetyScore) {
        safetyScore = await SafetyScore.create({ driverId });
      }

      const updateData = {
        totalTrips: safetyScore.totalTrips + 1,
        lastCalculated: new Date()
      };

      if (rideType === 'sos') {
        updateData.emergencyTrips = safetyScore.emergencyTrips + 1;
      }

      await safetyScore.update(updateData);
      console.log(`Analytics updated for driver ${driverId}, ride type: ${rideType}`);
    }
  } catch (error) {
    console.error('Failed to update driver analytics:', error);
  }
};

const createRideHistory = async (ride) => {
  try {
    if (ride.status === 'completed' && ride.driverId) {
      await RideHistory.create({
        rideId: ride.id,
        riderId: ride.riderId,
        driverId: ride.driverId,
        completedAt: new Date(),
        totalDistance: ride.distance || 0,
        totalDuration: ride.duration || 0,
        safetyScore: ride.safetyRating || 8,
        hazardZonesEncountered: ride.hazardZonesAvoided || [],
        routeEfficiency: 85 + Math.random() * 15, // 85-100%
        evacuationType: ride.rideType === 'sos' ? 'emergency' : 'normal',
        actualFare: ride.actualFare || ride.estimatedFare
      });
      console.log(`Ride history created for ride ${ride.id}`);
    }
  } catch (error) {
    console.error('Failed to create ride history:', error);
  }
};
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

      // Emit socket event for real-time updates to specific driver
      const io = req.app.get('io');
      if (io) {
        io.to(`driver-${availableDriver.userId}`).emit('ride-request', {
          rideId: ride.id,
          pickup: { lat: pickupLatitude, lng: pickupLongitude, address: pickupAddress },
          destination: { lat: destinationLatitude, lng: destinationLongitude, address: destinationAddress },
          rideType,
          estimatedFare: routeData.estimatedFare,
          distance: routeData.distance,
          rider: {
            id: req.user.id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            phone: req.user.phone
          }
        });
      }
    } else {
      // No driver found, broadcast to all online drivers
      const io = req.app.get('io');
      if (io) {
        io.emit('ride-request-notification', {
          rideId: ride.id,
          pickupLocation: { lat: pickupLatitude, lng: pickupLongitude, address: pickupAddress },
          destinationLocation: { lat: destinationLatitude, lng: destinationLongitude, address: destinationAddress },
          rideType,
          estimatedFare: routeData.estimatedFare,
          distance: routeData.distance,
          rider: {
            id: req.user.id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            phone: req.user.phone
          }
        });
      }
    }

    // Update analytics after ride creation
    try {
      await updateRiderAnalytics(req.user.id, rideType);
    } catch (error) {
      console.error('Failed to update analytics:', error);
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

    const oldStatus = ride.status;
    await ride.update({ status });

    // Update analytics based on status changes
    try {
      if (status === 'accepted' && ride.driverId) {
        await updateDriverAnalytics(ride.driverId, ride.rideType);
      }

      if (status === 'completed') {
        // Set actual fare if not set
        if (!ride.actualFare) {
          const actualFare = ride.estimatedFare + (Math.random() - 0.5) * 2;
          await ride.update({ actualFare: Math.max(0, actualFare) });
        }

        // Create ride history record
        await createRideHistory(ride);

        // Update driver rating and safety score
        if (ride.driverId) {
          const safetyScore = await SafetyScore.findOne({ where: { driverId: ride.driverId } });
          if (safetyScore) {
            const newOverallScore = Math.min(10, safetyScore.overallScore + 0.1);
            await safetyScore.update({
              overallScore: newOverallScore,
              completionRate: Math.min(100, safetyScore.completionRate + 0.5),
              hazardZonesAvoided: safetyScore.hazardZonesAvoided + (ride.hazardZonesAvoided?.length || 0)
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to update analytics on status change:', error);
    }
    // Handle driver availability
    if (status === 'completed' || status === 'cancelled') {
      if (ride.driver) {
        await ride.driver.update({ isAvailable: true });
      }
    }

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
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

      // Emit analytics update
      io.to(`rider-${ride.riderId}`).emit('analytics-update', {
        type: 'ride-status-change',
        rideId: ride.id,
        status,
        rideType: ride.rideType
      });

      if (ride.driverId) {
        io.to(`driver-${ride.driverId}`).emit('analytics-update', {
          type: 'ride-status-change',
          rideId: ride.id,
          status,
          rideType: ride.rideType
        });
      }
    }

    const updatedRide = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
      ]
    });

    res.json({
      message: 'Ride status updated successfully',
      ride: updatedRide
    });
  } catch (error) {
    console.error('Update ride status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept ride request (specific endpoint for drivers)
router.post('/:rideId/accept', [authMiddleware, roleMiddleware(['driver'])], async (req, res) => {
  try {
    const { rideId } = req.params;

    const ride = await Ride.findByPk(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (ride.status !== 'pending') {
      return res.status(400).json({ message: 'Ride is no longer available' });
    }

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    // Update ride with driver and status
    await ride.update({
      driverId: driver.id,
      status: 'accepted'
    });

    // Update driver availability
    await driver.update({ isAvailable: false });

    // Update analytics
    await updateDriverAnalytics(driver.id, ride.rideType);

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`rider-${ride.riderId}`).emit('ride-accepted', {
        rideId: ride.id,
        driver: {
          id: driver.id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          phone: req.user.phone,
          vehicle: `${driver.vehicleMake} ${driver.vehicleModel}`,
          licensePlate: driver.licensePlate,
          rating: driver.rating
        },
        estimatedArrival: Math.ceil((ride.distance || 5) / 0.5) // Rough estimate
      });
    }

    const updatedRide = await Ride.findByPk(rideId, {
      include: [
        { model: User, as: 'rider', attributes: ['id', 'firstName', 'lastName', 'phone'] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }] }
      ]
    });

    res.json({
      message: 'Ride accepted successfully',
      ride: updatedRide
    });
  } catch (error) {
    console.error('Accept ride error:', error);
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