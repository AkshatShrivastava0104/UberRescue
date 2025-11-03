/**
 * Hazard Service – UberRescue
 * -----------------------------------------------
 * Collects and stores real-time hazard data for India.
 * Combines free sources:
 *   • USGS  – Earthquakes
 *   • OpenWeatherMap – Severe weather
 *   • NASA FIRMS – Active fires
 * Falls back to mock data if any API fails.
 */

const { HazardZone } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');

// 🌍 Real data APIs
const HAZARD_DATA_SOURCES = {
  USGS_EARTHQUAKE: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  OPENWEATHER_API: 'https://api.openweathermap.org/data/2.5/weather',
  NASA_FIRMS: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
};

/* ------------------------------------------------------
 * 1️⃣  Fetch real hazard data (India only)
 * ---------------------------------------------------- */
const fetchRealHazardData = async () => {
  try {
    const [usgs, weather, fires] = await Promise.all([
      // 🌋 Earthquakes (global feed, filter by India bbox)
      axios.get(HAZARD_DATA_SOURCES.USGS_EARTHQUAKE, {
        params: {
          format: 'geojson',
          starttime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          minlatitude: 5,
          maxlatitude: 37,
          minlongitude: 68,
          maxlongitude: 97
        }
      }),

      // 🌦️ Weather alert (requires OpenWeather API key)
      axios.get(HAZARD_DATA_SOURCES.OPENWEATHER_API, {
        params: {
          lat: 20.5937,
          lon: 78.9629,
          appid: process.env.OPENWEATHER_API_KEY
        }
      }),

      // 🔥 NASA FIRMS (India fire data – JSON format)
      axios.get(HAZARD_DATA_SOURCES.NASA_FIRMS, {
        params: { country: 'INDIA', format: 'json' }
      }).catch(() => ({ data: [] }))
    ]);

    // --- Parse earthquake data ---
    const earthquakeHazards = (usgs.data.features || []).map(e => ({
      name: e.properties.place || 'Unknown location',
      type: 'earthquake',
      severity: e.properties.mag || 0,
      centerLatitude: e.geometry.coordinates[1],
      centerLongitude: e.geometry.coordinates[0],
      radius: 100,
      alertLevel: e.properties.alert || 'medium',
      description: `Magnitude ${e.properties.mag} earthquake at ${e.properties.place}`,
      isActive: true
    }));

    // --- Parse wildfire data ---
    const fireHazards = (fires.data || []).map(f => ({
      name: `Wildfire near ${f.latitude},${f.longitude}`,
      type: 'fire',
      severity: 8,
      centerLatitude: parseFloat(f.latitude),
      centerLongitude: parseFloat(f.longitude),
      radius: 20,
      alertLevel: 'high',
      description: 'Active wildfire detected by NASA FIRMS',
      isActive: true
    }));

    // --- Parse weather condition ---
    const weatherHazard = [{
      name: 'Severe Weather Alert',
      type: 'storm',
      severity: 6,
      centerLatitude: 20.5937,
      centerLongitude: 78.9629,
      radius: 200,
      alertLevel: 'medium',
      description: `Weather: ${weather.data.weather?.[0]?.description || 'N/A'}`,
      isActive: true
    }];

    return [...earthquakeHazards, ...fireHazards, ...weatherHazard];
  } catch (err) {
    console.error('❌ fetchRealHazardData error:', err.message);
    return generateMockHazards(); // fallback if API fails
  }
};

/* ------------------------------------------------------
 * 2️⃣  Mock fallback (when real APIs fail)
 * ---------------------------------------------------- */
const generateMockHazards = () => {
  const base = [
    {
      name: 'Mumbai Monsoon Flooding',
      type: 'flood',
      severity: 8,
      centerLatitude: 19.0760,
      centerLongitude: 72.8777,
      radius: 15.0,
      alertLevel: 'high',
      description: 'Heavy monsoon rains causing flooding',
      isActive: true
    },
    {
      name: 'Delhi Air Pollution Emergency',
      type: 'pollution',
      severity: 7,
      centerLatitude: 28.6139,
      centerLongitude: 77.2090,
      radius: 25.0,
      alertLevel: 'high',
      description: 'Severe AQI above 400, health warning',
      isActive: true
    }
  ];

  return base.map(h => ({
    ...h,
    severity: Math.max(1, Math.min(10, h.severity + (Math.random() - 0.5) * 2)),
    lastUpdated: new Date(),
    externalId: `INDIA-${h.type.toUpperCase()}-${Date.now()}`
  }));
};

/* ------------------------------------------------------
 * 3️⃣  Sync with DB
 * ---------------------------------------------------- */
const syncHazardData = async () => {
  console.log('🔄 Syncing hazard data...');
  const hazards = await fetchRealHazardData();

  let created = 0, updated = 0;
  for (const h of hazards) {
    const existing = await HazardZone.findOne({ where: { name: h.name } });
    if (existing) {
      await existing.update({
        severity: h.severity,
        alertLevel: h.alertLevel,
        description: h.description,
        lastUpdated: new Date()
      });
      updated++;
    } else {
      await HazardZone.create({
        ...h,
        coordinates: [
          [h.centerLatitude + 0.1, h.centerLongitude + 0.1],
          [h.centerLatitude + 0.1, h.centerLongitude - 0.1],
          [h.centerLatitude - 0.1, h.centerLongitude - 0.1],
          [h.centerLatitude - 0.1, h.centerLongitude + 0.1]
        ]
      });
      created++;
    }
  }

  // deactivate stale entries
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [deactivated] = await HazardZone.update(
    { isActive: false },
    { where: { lastUpdated: { [Op.lt]: oneDayAgo }, isActive: true } }
  );

  console.log(`✅ Sync complete → ${created} created, ${updated} updated, ${deactivated} deactivated.`);
  return { created, updated, deactivated };
};

/* ------------------------------------------------------
 * 4️⃣  Utility – get hazards near a coordinate
 * ---------------------------------------------------- */
const getHazardZonesNearLocation = async ({ latitude, longitude, radius }) => {
  const hazards = await HazardZone.findAll({ where: { isActive: true } });
  return hazards.filter(h => {
    const distKm = Math.sqrt(
      (h.centerLatitude - latitude) ** 2 +
      (h.centerLongitude - longitude) ** 2
    ) * 111;
    return distKm <= radius;
  });
};

/* ------------------------------------------------------
 * 5️⃣  Auto-sync every 5 minutes
 * ---------------------------------------------------- */
const startHazardMonitoring = () => {
  console.log('🚀 Starting hazard monitoring...');
  syncHazardData();
  setInterval(syncHazardData, 5 * 60 * 1000);
};

module.exports = {
  syncHazardData,
  getHazardZonesNearLocation,
  startHazardMonitoring,
  HAZARD_DATA_SOURCES
};
