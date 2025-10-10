const express = require('express');
const { body, validationResult } = require('express-validator');
const { Driver, User, SafetyScore } = require('../models');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/driver/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // make sure user exists AND is a driver
    const user = await User.findOne({ where: { email, role: 'driver' } });
    if (!user) return res.status(400).json({ message: 'Driver not found' });

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // sign token with role: driver
    const token = jwt.sign(
      { id: user.id, role: 'driver' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Driver logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (err) {
    console.error('Driver login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete driver registration
router.post('/complete-profile', [
  authMiddleware,
  body('licenseNumber').trim().isLength({ min: 1 }),
  body('vehicleType').isIn(['sedan', 'suv', 'truck', 'van']),
  body('vehicleMake').trim().isLength({ min: 1 }),
  body('vehicleModel').trim().isLength({ min: 1 }),
  body('vehicleYear').isInt({ min: 2000, max: new Date().getFullYear() + 1 }),
  body('licensePlate').trim().isLength({ min: 1 }),
  body('emergencyEquipment').isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      licenseNumber,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      licensePlate,
      emergencyEquipment
    } = req.body;

    // Ensure user has driver role
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can complete driver profile' });
    }

    // Check if driver profile already exists
    const existingDriver = await Driver.findOne({ where: { userId: req.user.id } });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver profile already exists' });
    }

    // Check for unique license number and plate
    const existingLicense = await Driver.findOne({ where: { licenseNumber } });
    if (existingLicense) {
      return res.status(400).json({ message: 'License number already registered' });
    }

    const existingPlate = await Driver.findOne({ where: { licensePlate } });
    if (existingPlate) {
      return res.status(400).json({ message: 'License plate already registered' });
    }

    // Create driver profile
    const driver = await Driver.create({
      userId: req.user.id,
      licenseNumber,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      licensePlate,
      emergencyEquipment
    });

    // Create initial safety score record
    await SafetyScore.create({
      driverId: driver.id
    });

    res.status(201).json({
      message: 'Driver profile created successfully',
      driver
    });
  } catch (error) {
    console.error('Complete driver profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update driver location
router.patch('/location', [
  authMiddleware,
  roleMiddleware(['driver']),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { latitude, longitude } = req.body;

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    await driver.update({
      currentLatitude: latitude,
      currentLongitude: longitude
    });

    // Emit location update via socket
    const io = req.app.get('io');
    io.emit('driver-location-update', {
      driverId: driver.id,
      latitude,
      longitude,
      timestamp: new Date()
    });

    res.json({
      message: 'Location updated successfully',
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle driver availability
router.patch('/availability', [
  authMiddleware,
  roleMiddleware(['driver']),
  body('isAvailable').isBoolean(),
  body('isOnline').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { isAvailable, isOnline } = req.body;

    const driver = await Driver.findOne({ where: { userId: req.user.id } });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const updateData = { isAvailable };
    if (isOnline !== undefined) {
      updateData.isOnline = isOnline;
    }

    await driver.update(updateData);

    res.json({
      message: 'Availability updated successfully',
      availability: {
        isAvailable: driver.isAvailable,
        isOnline: driver.isOnline
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get driver profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findOne({
      where: { userId: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone'] },
        { model: SafetyScore, as: 'safetyScores' }
      ]
    });

    // Return null if no driver profile exists instead of 404
    res.json({ driver: driver || null });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get nearby drivers (for admin/testing purposes)
router.get('/nearby', [
  authMiddleware,
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
  body('radius').optional().isFloat({ min: 0.1, max: 50 })
], async (req, res) => {
  try {
    const { latitude = 37.7749, longitude = -122.4194, radius = 10 } = req.query;

    const drivers = await Driver.findAll({
      where: {
        isAvailable: true,
        isOnline: true,
        currentLatitude: { [require('sequelize').Op.ne]: null },
        currentLongitude: { [require('sequelize').Op.ne]: null }
      },
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'phone'] }
      ]
    });

    // Filter by distance (simple calculation for demo)
    const nearbyDrivers = drivers.filter(driver => {
      const distance = Math.sqrt(
        Math.pow(driver.currentLatitude - latitude, 2) +
        Math.pow(driver.currentLongitude - longitude, 2)
      ) * 111; // Rough conversion to km

      return distance <= radius;
    });

    res.json({ drivers: nearbyDrivers });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;