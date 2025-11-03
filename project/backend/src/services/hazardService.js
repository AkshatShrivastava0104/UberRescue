/**
 * Hazard Service – UberRescue
 * --------------------------------------------------
 * Collects and stores real-time hazard data for India.
 * Uses only live sources:
 *   • USGS  – Earthquakes
 *   • OpenWeatherMap – Severe weather
 *   • NASA FIRMS – Active fires
 * --------------------------------------------------
 */

const { HazardZone } = require('../models');
const axios = require('axios');
const { Op } = require('sequelize');

// 🌍 Real data sources
const HAZARD_DATA_SOURCES = {
  USGS_EARTHQUAKE: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  OPENWEATHER_API: 'https://api.openweathermap.org/data/3.0/onecall',
  NASA_FIRMS: 'https://firms.modaps.eosdis.nasa.gov/api/area/csv'
};

/* ------------------------------------------------------
 * 1️⃣  Fetch real hazard data (India only)
 * ---------------------------------------------------- */
const fetchRealHazardData = async () => {
  const hazards = [];

  try {
    // 🌋 USGS Earthquakes (global feed filtered to India)
    const usgs = await axios.get(HAZARD_DATA_SOURCES.USGS_EARTHQUAKE, {
      params: {
        format: 'geojson',
        starttime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        minlatitude: 5,
        maxlatitude: 37,
        minlongitude: 68,
        maxlongitude: 97
      }
    });

    (usgs.data.features || []).forEach(e => {
      hazards.push({
        name: e.properties.place || 'Unknown location',
        type: 'earthquake',
        severity: e.properties.mag || 0,
        centerLatitude: e.geometry.coordinates[1],
        centerLongitude: e.geometry.coordinates[0],
        radius: 100,
        alertLevel: e.properties.alert || 'medium',
        description: `Magnitude ${e.properties.mag} earthquake at ${e.properties.place}`,
        isActive: true
      });
    });
  } catch (err) {
    console.error('⚠️ USGS API failed:', err.message);
  }

  try {
    // 🔥 NASA FIRMS (fires in India)
    const fires = await axios.get(HAZARD_DATA_SOURCES.NASA_FIRMS, {
      params: { country: 'INDIA', format: 'json' }
    });

    (fires.data || []).forEach(f => {
      hazards.push({
        name: `Wildfire near ${f.latitude},${f.longitude}`,
        type: 'fire',
        severity: 8,
        centerLatitude: parseFloat(f.latitude),
        centerLongitude: parseFloat(f.longitude),
        radius: 20,
        alertLevel: 'high',
        description: 'Active wildfire detected by NASA FIRMS',
        isActive: true
      });
    });
  } catch (err) {
    console.error('⚠️ NASA FIRMS API failed:', err.message);
  }

  try {
    // 🌦️ OpenWeatherMap (India-wide severe weather)
    const weather = await axios.get(HAZARD_DATA_SOURCES.OPENWEATHER_API, {
      params: {
        lat: 20.5937,
        lon: 78.9629,
        appid: process.env.HAZARD_API_KEY
      }
    });

    hazards.push({
      name: 'Severe Weather Alert',
      type: 'storm',
      severity: 6,
      centerLatitude: 20.5937,
      centerLongitude: 78.9629,
      radius: 200,
      alertLevel: 'medium',
      description: `Weather: ${weather.data.weather?.[0]?.description || 'N/A'}`,
      isActive: true
    });
  } catch (err) {
    console.error('⚠️ OpenWeather API failed:', err.message);
  }

  return hazards;
};

/* ------------------------------------------------------
 * 2️⃣  Sync hazard data to DB (no mock data)
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

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [deactivated] = await HazardZone.update(
    { isActive: false },
    { where: { lastUpdated: { [Op.lt]: oneDayAgo }, isActive: true } }
  );

  console.log(`✅ Sync complete → ${created} created, ${updated} updated, ${deactivated} deactivated.`);
  return { created, updated, deactivated };
};

/* ------------------------------------------------------
 * 3️⃣  Utility – get hazards near coordinates
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
 * 4️⃣  Auto-sync every 5 minutes
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
