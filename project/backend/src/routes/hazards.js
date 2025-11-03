const express = require('express');
const { HazardZone } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const hazardService = require('../services/hazardService');

const router = express.Router();

// ✅ Get all active hazard zones
router.get('/', authMiddleware, async (req, res) => {
  try {
    const hazardZones = await HazardZone.findAll({
      where: { isActive: true },
      order: [['severity', 'DESC'], ['alertLevel', 'DESC']]
    });

    res.json({ hazardZones });
  } catch (error) {
    console.error('Get hazard zones error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get hazards near rider’s location
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const hazardZones = await hazardService.getHazardZonesNearLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseFloat(radius)
    });

    res.json({ hazardZones });
  } catch (error) {
    console.error('Get nearby hazard zones error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Manually trigger external API sync
router.post('/sync', authMiddleware, async (req, res) => {
  try {
    const result = await hazardService.syncHazardData();

    res.json({
      message: 'Hazard zones synchronized successfully',
      updated: result.updated,
      created: result.created,
      deactivated: result.deactivated
    });
  } catch (error) {
    console.error('Sync hazard zones error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Get single hazard zone by ID
router.get('/:hazardId', authMiddleware, async (req, res) => {
  try {
    const { hazardId } = req.params;

    const hazardZone = await HazardZone.findByPk(hazardId);
    if (!hazardZone) {
      return res.status(404).json({ message: 'Hazard zone not found' });
    }

    res.json({ hazardZone });
  } catch (error) {
    console.error('Get hazard zone error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
