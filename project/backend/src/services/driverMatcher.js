const { Driver, User } = require('../models');
const { haversineDistance } = require('./routeOptimizer');

const findNearestDriver = async ({ pickupLat, pickupLng, rideType, hazardZones }) => {
  try {
    // Get available drivers
    const availableDrivers = await Driver.findAll({
      where: {
        isAvailable: true,
        isOnline: true
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['firstName', 'lastName', 'phone']
      }]
    });

    if (availableDrivers.length === 0) {
      return null;
    }

    // Filter drivers with current location
    const driversWithLocation = availableDrivers.filter(driver => 
      driver.currentLatitude && driver.currentLongitude
    );

    if (driversWithLocation.length === 0) {
      return null;
    }

    // Calculate distances and filter by safety
    const driverDistances = driversWithLocation.map(driver => {
      const distance = haversineDistance(
        { lat: pickupLat, lng: pickupLng },
        { lat: driver.currentLatitude, lng: driver.currentLongitude }
      );

      // Check if driver is in a hazard zone
      const inHazardZone = hazardZones.some(hazard => {
        if (!hazard.isActive) return false;
        const hazardDistance = haversineDistance(
          { lat: driver.currentLatitude, lng: driver.currentLongitude },
          { lat: hazard.centerLatitude, lng: hazard.centerLongitude }
        );
        return hazardDistance <= hazard.radius;
      });

      return {
        driver,
        distance,
        inHazardZone,
        safetyScore: inHazardZone ? Math.max(1, 10 - hazardZones.length * 2) : 9
      };
    });

    // Sort by priority: SOS rides prioritize safety, normal rides prioritize distance
    let sortedDrivers;
    if (rideType === 'sos') {
      // For SOS rides: prioritize safety score, then distance
      sortedDrivers = driverDistances
        .filter(d => !d.inHazardZone || d.safetyScore >= 6) // Only safe drivers for SOS
        .sort((a, b) => {
          if (b.safetyScore !== a.safetyScore) {
            return b.safetyScore - a.safetyScore;
          }
          return a.distance - b.distance;
        });
    } else {
      // For normal rides: prioritize distance, then safety
      sortedDrivers = driverDistances
        .sort((a, b) => {
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
          return b.safetyScore - a.safetyScore;
        });
    }

    // Return the best match within reasonable distance (20km for SOS, 10km for normal)
    const maxDistance = rideType === 'sos' ? 20 : 10;
    const bestMatch = sortedDrivers.find(d => d.distance <= maxDistance);

    return bestMatch ? bestMatch.driver : null;
  } catch (error) {
    console.error('Driver matching error:', error);
    return null;
  }
};

const calculateDriverScore = (driver, pickupLocation, hazardZones, rideType) => {
  let score = 100;

  // Distance factor (closer is better)
  const distance = haversineDistance(
    pickupLocation,
    { lat: driver.currentLatitude, lng: driver.currentLongitude }
  );
  score -= Math.min(distance * 2, 30); // Max 30 point penalty for distance

  // Rating factor
  score += (driver.rating - 3) * 5; // Scale rating impact

  // Total trips factor (experience)
  score += Math.min(driver.totalTrips / 10, 10);

  // Emergency equipment bonus for SOS rides
  if (rideType === 'sos' && driver.emergencyEquipment && driver.emergencyEquipment.length > 0) {
    score += driver.emergencyEquipment.length * 2;
  }

  // Hazard zone penalty
  const inHazardZone = hazardZones.some(hazard => {
    if (!hazard.isActive) return false;
    const hazardDistance = haversineDistance(
      { lat: driver.currentLatitude, lng: driver.currentLongitude },
      { lat: hazard.centerLatitude, lng: hazard.centerLongitude }
    );
    return hazardDistance <= hazard.radius;
  });

  if (inHazardZone) {
    score -= 25; // Significant penalty for being in hazard zone
  }

  return Math.max(0, score);
};

const updateDriverAvailability = async (driverId, isAvailable) => {
  try {
    await Driver.update(
      { isAvailable },
      { where: { id: driverId } }
    );
  } catch (error) {
    console.error('Update driver availability error:', error);
  }
};

module.exports = {
  findNearestDriver,
  calculateDriverScore,
  updateDriverAvailability
};