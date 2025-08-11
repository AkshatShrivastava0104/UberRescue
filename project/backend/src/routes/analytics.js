const express = require('express');
const { RideHistory, SafetyScore, Ride, Driver, User, HazardZone } = require('../models');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get rider analytics
router.get('/rider', authMiddleware, async (req, res) => {
  try {
    const riderId = req.user.id;
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get ride history
    const rideHistory = await RideHistory.findAll({
      where: {
        riderId,
        completedAt: { [Op.gte]: startDate }
      },
      order: [['completedAt', 'DESC']]
    });

    // Calculate analytics
    const totalRides = rideHistory.length;
    const totalDistance = rideHistory.reduce((sum, ride) => sum + parseFloat(ride.totalDistance || 0), 0);
    const totalDuration = rideHistory.reduce((sum, ride) => sum + (ride.totalDuration || 0), 0);
    const averageSafetyScore = totalRides > 0 ? 
      rideHistory.reduce((sum, ride) => sum + ride.safetyScore, 0) / totalRides : 0;
    
    const emergencyRides = rideHistory.filter(ride => ride.evacuationType === 'emergency').length;
    const hazardZonesEncountered = rideHistory.reduce((total, ride) => 
      total + (ride.hazardZonesEncountered ? ride.hazardZonesEncountered.length : 0), 0);

    // Get recent rides
    const recentRides = await Ride.findAll({
      where: {
        riderId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      analytics: {
        totalRides,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalDurationHours: Math.round(totalDuration / 60 * 100) / 100,
        averageSafetyScore: Math.round(averageSafetyScore * 100) / 100,
        emergencyRides,
        hazardZonesEncountered,
        evacuationRate: totalRides > 0 ? Math.round((emergencyRides / totalRides) * 100) : 0
      },
      recentRides,
      rideHistory: rideHistory.slice(0, 20)
    });
  } catch (error) {
    console.error('Get rider analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get driver analytics
router.get('/driver', [authMiddleware, roleMiddleware(['driver'])], async (req, res) => {
  try {
    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get ride history
    const rideHistory = await RideHistory.findAll({
      where: {
        driverId: driver.id,
        completedAt: { [Op.gte]: startDate }
      },
      include: [
        { model: User, as: 'rider', attributes: ['firstName', 'lastName'] }
      ],
      order: [['completedAt', 'DESC']]
    });

    // Get safety score
    const safetyScore = await SafetyScore.findOne({
      where: { driverId: driver.id }
    });

    // Calculate analytics
    const totalTrips = rideHistory.length;
    const emergencyTrips = rideHistory.filter(ride => ride.evacuationType === 'emergency').length;
    const totalDistance = rideHistory.reduce((sum, ride) => sum + parseFloat(ride.totalDistance || 0), 0);
    const totalEarnings = rideHistory.reduce((sum, ride) => sum + parseFloat(ride.actualFare || 0), 0);
    const averageRating = totalTrips > 0 ?
      rideHistory.reduce((sum, ride) => sum + (ride.driverRating || 5), 0) / totalTrips : 5;

    // Get recent rides
    const recentRides = await Ride.findAll({
      where: {
        driverId: driver.id,
        createdAt: { [Op.gte]: startDate }
      },
      include: [
        { model: User, as: 'rider', attributes: ['firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    res.json({
      analytics: {
        totalTrips,
        emergencyTrips,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        averageRating: Math.round(averageRating * 100) / 100,
        safetyScore: safetyScore ? {
          overallScore: safetyScore.overallScore,
          hazardZonesAvoided: safetyScore.hazardZonesAvoided,
          completionRate: safetyScore.completionRate,
          responseTimeAverage: safetyScore.responseTimeAverage
        } : null,
        rescueRate: totalTrips > 0 ? Math.round((emergencyTrips / totalTrips) * 100) : 0
      },
      recentRides,
      rideHistory: rideHistory.slice(0, 20)
    });
  } catch (error) {
    console.error('Get driver analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system-wide analytics (admin view)
router.get('/system', authMiddleware, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get counts
    const totalUsers = await User.count();
    const activeDrivers = await Driver.count({ where: { isOnline: true } });
    const activeHazardZones = await HazardZone.count({ where: { isActive: true } });

    // Get recent ride data
    const recentRides = await RideHistory.findAll({
      where: { completedAt: { [Op.gte]: startDate } }
    });

    const totalRides = recentRides.length;
    const emergencyRides = recentRides.filter(ride => ride.evacuationType === 'emergency').length;
    const totalDistance = recentRides.reduce((sum, ride) => sum + parseFloat(ride.totalDistance || 0), 0);
    const averageSafetyScore = totalRides > 0 ?
      recentRides.reduce((sum, ride) => sum + ride.safetyScore, 0) / totalRides : 0;

    // Get hazard zone statistics
    const hazardZoneStats = await HazardZone.findAll({
      where: { isActive: true },
      attributes: ['type', 'severity', 'alertLevel']
    });

    const hazardZonesByType = hazardZoneStats.reduce((acc, hazard) => {
      acc[hazard.type] = (acc[hazard.type] || 0) + 1;
      return acc;
    }, {});

    const criticalHazards = hazardZoneStats.filter(h => h.alertLevel === 'critical').length;

    res.json({
      systemAnalytics: {
        totalUsers,
        activeDrivers,
        totalRides,
        emergencyRides,
        totalDistance: Math.round(totalDistance * 100) / 100,
        averageSafetyScore: Math.round(averageSafetyScore * 100) / 100,
        emergencyResponse: totalRides > 0 ? Math.round((emergencyRides / totalRides) * 100) : 0,
        activeHazardZones,
        criticalHazards,
        hazardZonesByType
      }
    });
  } catch (error) {
    console.error('Get system analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;