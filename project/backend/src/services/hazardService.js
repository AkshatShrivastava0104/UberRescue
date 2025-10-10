const { HazardZone } = require('../models');
const axios = require('axios');

// Real-time hazard data sources for India
const HAZARD_DATA_SOURCES = {
  // Indian Meteorological Department (Free)
  IMD_API: 'https://mausam.imd.gov.in/backend/api/warnings',

  // National Disaster Management Authority (Free)
  NDMA_API: 'https://ndma.gov.in/api/alerts',

  // OpenWeatherMap (Free tier: 1000 calls/day)
  OPENWEATHER_API: 'https://api.openweathermap.org/data/2.5/weather',

  // AccuWeather (Paid - Unlimited)
  ACCUWEATHER_API: 'https://dataservice.accuweather.com/alerts/v1/current',

  // NASA FIRMS (Free - Fire data)
  NASA_FIRMS: 'https://firms.modaps.eosdis.nasa.gov/api/country/csv',

  // USGS Earthquake (Free)
  USGS_EARTHQUAKE: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
};

// Mock real-time hazard data for India (replace with actual API calls)
const generateIndianHazardData = () => {
  const indianHazards = [
    {
      name: 'Mumbai Monsoon Flooding',
      type: 'flood',
      severity: 8,
      centerLatitude: 19.0760,
      centerLongitude: 72.8777,
      radius: 15.0,
      alertLevel: 'high',
      description: 'Heavy monsoon rains causing severe flooding in low-lying areas',
      isActive: true
    },
    {
      name: 'Delhi Air Pollution Emergency',
      type: 'other',
      severity: 7,
      centerLatitude: 28.6139,
      centerLongitude: 77.2090,
      radius: 25.0,
      alertLevel: 'high',
      description: 'Severe air quality index above 400, health emergency declared',
      isActive: true
    },
    {
      name: 'Chennai Cyclone Warning',
      type: 'storm',
      severity: 9,
      centerLatitude: 13.0827,
      centerLongitude: 80.2707,
      radius: 50.0,
      alertLevel: 'critical',
      description: 'Cyclone approaching coast, evacuation recommended',
      isActive: true
    },
    {
      name: 'Himalayan Seismic Activity',
      type: 'earthquake',
      severity: 6,
      centerLatitude: 30.0668,
      centerLongitude: 79.0193,
      radius: 100.0,
      alertLevel: 'medium',
      description: 'Increased seismic activity detected in Himalayan region',
      isActive: true
    },
    {
      name: 'Rajasthan Heat Wave',
      type: 'other',
      severity: 7,
      centerLatitude: 26.9124,
      centerLongitude: 75.7873,
      radius: 200.0,
      alertLevel: 'high',
      description: 'Extreme heat wave with temperatures above 45°C',
      isActive: true
    },
    {
      name: 'Kerala Landslide Risk',
      type: 'other',
      severity: 8,
      centerLatitude: 10.8505,
      centerLongitude: 76.2711,
      radius: 30.0,
      alertLevel: 'high',
      description: 'Heavy rains increasing landslide risk in hilly areas',
      isActive: true
    }
  ];

  // Add some random variation to make it feel real-time
  return indianHazards.map(hazard => ({
    ...hazard,
    severity: Math.max(1, Math.min(10, hazard.severity + (Math.random() - 0.5) * 2)),
    lastUpdated: new Date(),
    externalId: `INDIA-${hazard.type.toUpperCase()}-${Date.now()}`
  }));
};

const syncHazardData = async () => {
  try {
    console.log('🔄 Syncing hazard data for India...');

    // In production, replace this with actual API calls
    const hazardData = generateIndianHazardData();

    let updated = 0;
    let created = 0;
    let deactivated = 0;

    for (const hazardInfo of hazardData) {
      const existingHazard = await HazardZone.findOne({
        where: { name: hazardInfo.name }
      });

      if (existingHazard) {
        await existingHazard.update({
          severity: hazardInfo.severity,
          alertLevel: hazardInfo.alertLevel,
          description: hazardInfo.description,
          lastUpdated: new Date()
        });
        updated++;
      } else {
        await HazardZone.create({
          ...hazardInfo,
          coordinates: [
            [hazardInfo.centerLatitude + 0.1, hazardInfo.centerLongitude + 0.1],
            [hazardInfo.centerLatitude + 0.1, hazardInfo.centerLongitude - 0.1],
            [hazardInfo.centerLatitude - 0.1, hazardInfo.centerLongitude - 0.1],
            [hazardInfo.centerLatitude - 0.1, hazardInfo.centerLongitude + 0.1]
          ]
        });
        created++;
      }
    }

    // Deactivate old hazards (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deactivatedCount = await HazardZone.update(
      { isActive: false },
      {
        where: {
          lastUpdated: { [require('sequelize').Op.lt]: oneDayAgo },
          isActive: true
        }
      }
    );
    deactivated = deactivatedCount[0];

    console.log(`✅ Hazard sync complete: ${created} created, ${updated} updated, ${deactivated} deactivated`);

    return { updated, created, deactivated };
  } catch (error) {
    console.error('❌ Hazard sync error:', error);
    throw error;
  }
};

const getHazardZonesNearLocation = async ({ latitude, longitude, radius }) => {
  try {
    const hazardZones = await HazardZone.findAll({
      where: { isActive: true }
    });

    // Filter by distance
    const nearbyHazards = hazardZones.filter(hazard => {
      const distance = Math.sqrt(
        Math.pow(hazard.centerLatitude - latitude, 2) +
        Math.pow(hazard.centerLongitude - longitude, 2)
      ) * 111; // Rough conversion to km

      return distance <= radius;
    });

    return nearbyHazards;
  } catch (error) {
    console.error('Get nearby hazards error:', error);
    throw error;
  }
};

// Real-time hazard monitoring (call this periodically)
const startHazardMonitoring = () => {
  console.log('🔄 Starting real-time hazard monitoring...');

  // Sync hazard data every 5 minutes
  setInterval(async () => {
    try {
      await syncHazardData();
    } catch (error) {
      console.error('❌ Periodic hazard sync failed:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Initial sync
  syncHazardData();
};

/* 
🌍 REAL-TIME HAZARD DATA SOURCES FOR UNLIMITED CALLS:

1. **Government APIs (Free/Unlimited)**:
   - India Meteorological Department: https://mausam.imd.gov.in/
   - National Disaster Management Authority: https://ndma.gov.in/
   - Central Water Commission: https://cwc.gov.in/

2. **Paid APIs (Unlimited)**:
   - AccuWeather API: $25/month for unlimited calls
   - Weather Underground: $10/month for 10,000 calls/day
   - IBM Weather API: Enterprise pricing

3. **Free APIs (Limited)**:
   - OpenWeatherMap: 1,000 calls/day free
   - NASA FIRMS: Fire data, free but rate limited
   - USGS Earthquake: Free, real-time earthquake data

4. **WebSocket Feeds (Real-time)**:
   - Emergency alert systems
   - Government disaster feeds
   - Weather service WebSocket streams

For production, recommend using AccuWeather API for unlimited real-time updates.
*/

module.exports = {
  syncHazardData,
  getHazardZonesNearLocation,
  startHazardMonitoring,
  HAZARD_DATA_SOURCES
};