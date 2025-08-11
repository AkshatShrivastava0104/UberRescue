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
      id: 'dummy-flood-001',
      name: 'Financial District Flooding',
      type: 'flood',
      severity: 6,
      coordinates: [
        [37.7949, -122.4094],
        [37.7949, -122.3994],
        [37.7849, -122.3994],
        [37.7849, -122.4094]
      ],
      centerLatitude: 37.7899,
      centerLongitude: -122.4044,
      radius: 1.5,
      description: 'Street flooding due to storm drain backup',
      alertLevel: 'medium',
      isActive: true
    },
    {
      id: 'dummy-fire-002',
      name: 'Castro District Fire',
      type: 'fire',
      severity: 8,
      coordinates: [
        [37.7619, -122.4394],
        [37.7619, -122.4294],
        [37.7519, -122.4294],
        [37.7519, -122.4394]
      ],
      centerLatitude: 37.7569,
      centerLongitude: -122.4344,
      radius: 2.0,
      description: 'Building fire with potential spread risk',
      alertLevel: 'high',
      isActive: true
    },
    {
      id: 'dummy-storm-003',
      name: 'Richmond Severe Weather',
      type: 'storm',
      severity: 4,
      coordinates: [
        [37.7794, -122.4894],
        [37.7794, -122.4694],
        [37.7694, -122.4694],
        [37.7694, -122.4894]
      ],
      centerLatitude: 37.7744,
      centerLongitude: -122.4794,
      radius: 3.5,
      description: 'Severe thunderstorm with high winds and hail',
      alertLevel: 'medium',
      isActive: Math.random() > 0.3 // Randomly active for demo
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