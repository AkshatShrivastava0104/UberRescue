const axios = require('axios');
const { HazardZone } = require('../models');
const { haversineDistance } = require('./routeOptimizer');

const getHazardZonesNearLocation = async ({ latitude, longitude, radius }) => {
  try {
    const hazardZones = await HazardZone.findAll({
      where: { isActive: true }
    });

    // Filter hazards within radius
    const nearbyHazards = hazardZones.filter(hazard => {
      const distance = haversineDistance(
        { lat: latitude, lng: longitude },
        { lat: hazard.centerLatitude, lng: hazard.centerLongitude }
      );
      return distance <= radius;
    });

    return nearbyHazards;
  } catch (error) {
    console.error('Get nearby hazard zones error:', error);
    return [];
  }
};

const syncHazardData = async () => {
  try {
    let externalData = [];

    // Try to fetch from external API if configured
    if (process.env.HAZARD_API_KEY && process.env.HAZARD_API_URL) {
      try {
        const response = await axios.get(process.env.HAZARD_API_URL, {
          headers: {
            'Authorization': `Bearer ${process.env.HAZARD_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        externalData = response.data.hazards || [];
      } catch (apiError) {
        console.warn('External hazard API unavailable, using dummy data:', apiError.message);
      }
    }

    // Use dummy data if no external data available
    if (externalData.length === 0) {
      externalData = generateDummyHazardData();
    }

    let updated = 0;
    let created = 0;
    let deactivated = 0;

    // Process external data
    for (const hazardData of externalData) {
      const existingHazard = await HazardZone.findOne({
        where: { externalId: hazardData.id }
      });

      if (existingHazard) {
        // Update existing hazard
        await existingHazard.update({
          name: hazardData.name,
          type: hazardData.type,
          severity: hazardData.severity,
          coordinates: hazardData.coordinates,
          centerLatitude: hazardData.centerLatitude,
          centerLongitude: hazardData.centerLongitude,
          radius: hazardData.radius,
          description: hazardData.description,
          alertLevel: hazardData.alertLevel,
          lastUpdated: new Date(),
          isActive: hazardData.isActive !== false
        });
        updated++;
      } else {
        // Create new hazard
        await HazardZone.create({
          name: hazardData.name,
          type: hazardData.type,
          severity: hazardData.severity,
          coordinates: hazardData.coordinates,
          centerLatitude: hazardData.centerLatitude,
          centerLongitude: hazardData.centerLongitude,
          radius: hazardData.radius,
          description: hazardData.description,
          alertLevel: hazardData.alertLevel,
          externalId: hazardData.id,
          lastUpdated: new Date(),
          isActive: hazardData.isActive !== false
        });
        created++;
      }
    }

    // Deactivate hazards not in current external data
    const externalIds = externalData.map(h => h.id);
    const hazardsToDeactivate = await HazardZone.findAll({
      where: {
        externalId: { [require('sequelize').Op.notIn]: externalIds },
        isActive: true
      }
    });

    for (const hazard of hazardsToDeactivate) {
      await hazard.update({ isActive: false });
      deactivated++;
    }

    return { updated, created, deactivated };
  } catch (error) {
    console.error('Sync hazard data error:', error);
    throw error;
  }
};

const generateDummyHazardData = () => {
  return [
    {
      id: 'india-flood-001',
      name: 'Mumbai Monsoon Flooding',
      type: 'flood',
      severity: 6,
      coordinates: [
        [19.0760, 72.8777],
        [19.0860, 72.8877],
        [19.0660, 72.8877],
        [19.0660, 72.8677]
      ],
      centerLatitude: 19.0760,
      centerLongitude: 72.8777,
      radius: 1.5,
      description: 'Heavy monsoon flooding in low-lying areas',
      alertLevel: 'medium',
      isActive: true
    },
    {
      id: 'india-fire-002',
      name: 'Delhi Air Pollution Emergency',
      type: 'fire',
      severity: 8,
      coordinates: [
        [28.6139, 77.2090],
        [28.6239, 77.2190],
        [28.6039, 77.2190],
        [28.6039, 77.2090]
      ],
      centerLatitude: 28.6139,
      centerLongitude: 77.2090,
      radius: 2.0,
      description: 'Severe air pollution and smog conditions',
      alertLevel: 'high',
      isActive: true
    },
    {
      id: 'india-cyclone-003',
      name: 'Chennai Cyclone Warning',
      type: 'storm',
      severity: 7,
      coordinates: [
        [13.0827, 80.2707],
        [13.0927, 80.2807],
        [13.0727, 80.2807],
        [13.0727, 80.2607]
      ],
      centerLatitude: 13.0827,
      centerLongitude: 80.2707,
      radius: 3.5,
      description: 'Cyclone approaching with high winds and heavy rain',
      alertLevel: 'high',
      isActive: Math.random() > 0.3 // Randomly active for demo
    },
    {
      id: 'india-earthquake-004',
      name: 'Himalayan Seismic Activity',
      type: 'earthquake',
      severity: 5,
      coordinates: [
        [30.0668, 79.0193],
        [30.0768, 79.0293],
        [30.0568, 79.0293],
        [30.0568, 79.0093]
      ],
      centerLatitude: 30.0668,
      centerLongitude: 79.0193,
      radius: 5.0,
      description: 'Minor seismic activity detected in Himalayan region',
      alertLevel: 'low',
      isActive: true
    }
  ];
};

const checkHazardIntersection = (route, hazardZones) => {
  const intersections = [];

  for (const hazard of hazardZones) {
    if (!hazard.isActive) continue;

    for (const waypoint of route) {
      const distance = haversineDistance(
        { lat: waypoint.lat, lng: waypoint.lng },
        { lat: hazard.centerLatitude, lng: hazard.centerLongitude }
      );

      if (distance <= hazard.radius) {
        intersections.push({
          hazardId: hazard.id,
          hazardName: hazard.name,
          type: hazard.type,
          severity: hazard.severity,
          waypointIndex: route.indexOf(waypoint)
        });
        break; // Only record one intersection per hazard
      }
    }
  }

  return intersections;
};

module.exports = {
  getHazardZonesNearLocation,
  syncHazardData,
  generateDummyHazardData,
  checkHazardIntersection
};