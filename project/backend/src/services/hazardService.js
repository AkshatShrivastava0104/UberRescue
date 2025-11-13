/**
 * Hazard Service – UberRescue (India Focused)
 * --------------------------------------------------
 * Collects and stores real-time hazard data for India.
 * Uses only free live sources:
 *   • USGS          – Earthquakes (filtered to India bounds)
 *   • NASA FIRMS    – Active fires (India MODIS CSV feed)
 *   • Open-Meteo    – Storm, Flood, and Heatwave alerts
 * --------------------------------------------------
 */

const { HazardZone } = require("../models");
const axios = require("axios");
const Papa = require("papaparse");
const { Op } = require("sequelize");
const { fetchWeatherApi } = require("openmeteo");

// 🌍 Real data sources
const HAZARD_DATA_SOURCES = {
  USGS_EARTHQUAKE: "https://earthquake.usgs.gov/fdsnws/event/1/query",
  NASA_FIRMS_INDIA:
    "https://firms.modaps.eosdis.nasa.gov/data/active_fire/c6/csv/MODIS_C6_India_24h.csv",
  OPEN_METEO: "https://api.open-meteo.com/v1/forecast",
};

// ------------------------------------------------------
// 1️⃣  Fetch Real Hazard Data (India Only)
// ------------------------------------------------------
const fetchRealHazardData = async () => {
  const hazards = [];

  /* ---------- 🌋 EARTHQUAKES (USGS, filtered to India) ---------- */
  try {
    const usgs = await axios.get(HAZARD_DATA_SOURCES.USGS_EARTHQUAKE, {
      params: {
        format: "geojson",
        starttime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        minlatitude: 5,
        maxlatitude: 37,
        minlongitude: 68,
        maxlongitude: 97,
      },
    });

    (usgs.data.features || []).forEach((e) => {
      hazards.push({
        name: e.properties.place || "Unknown location",
        type: "earthquake",
        severity: e.properties.mag || 0,
        centerLatitude: e.geometry.coordinates[1],
        centerLongitude: e.geometry.coordinates[0],
        radius: 100,
        alertLevel: e.properties.mag >= 6 ? "severe" : "moderate",
        description: `Magnitude ${e.properties.mag} earthquake at ${e.properties.place}`,
        isActive: true,
      });
    });
  } catch (err) {
    console.error("⚠️ USGS API failed:", err.message);
  }

  /* ---------- 🔥 NASA FIRMS (India MODIS CSV feed) ---------- */
  try {
    const csvData = await axios.get(HAZARD_DATA_SOURCES.NASA_FIRMS_INDIA);
    const parsed = Papa.parse(csvData.data, { header: true });

    parsed.data.forEach((f) => {
      if (f.latitude && f.longitude) {
        hazards.push({
          name: `Wildfire near ${f.latitude},${f.longitude}`,
          type: "fire",
          severity: parseFloat(f.brightness || 350) / 100,
          centerLatitude: parseFloat(f.latitude),
          centerLongitude: parseFloat(f.longitude),
          radius: 20,
          alertLevel: "high",
          description: "Active wildfire detected by NASA FIRMS (India MODIS)",
          isActive: true,
        });
      }
    });
  } catch (err) {
    console.error("⚠️ NASA FIRMS (India) failed:", err.message);
  }

  /* ---------- 🌦️ OPEN-METEO (Storms, Floods, Heatwaves) ---------- */
  try {
    const params = {
      latitude: 20.5937, // India centroid
      longitude: 78.9629,
      hourly:
        "temperature_2m,precipitation,wind_speed_10m,soil_moisture_0_to_1cm",
      timezone: "auto",
    };

    const responses = await fetchWeatherApi(HAZARD_DATA_SOURCES.OPEN_METEO, params);
    const r = responses[0];
    const hourly = r.hourly();

    const temps = hourly.variables(0).valuesArray();
    const rain = hourly.variables(1).valuesArray();
    const wind = hourly.variables(2).valuesArray();
    const soil = hourly.variables(3).valuesArray();

    const maxTemp = Math.max(...temps);
    const maxRain = Math.max(...rain);
    const maxWind = Math.max(...wind);
    const maxSoil = Math.max(...soil);

    // 🌪️ Storm alert (wind > 40 m/s)
    if (maxWind > 40) {
      hazards.push({
        name: "Severe Storm Alert",
        type: "storm",
        severity: Math.min(Math.round(maxWind / 10), 10),
        centerLatitude: 20.5937,
        centerLongitude: 78.9629,
        radius: 300,
        alertLevel: maxWind > 60 ? "severe" : "moderate",
        description: `Strong winds detected (${maxWind.toFixed(1)} m/s)`,
        isActive: true,
      });
    }

    // 🌊 Flood alert (rain > 50 mm or high soil moisture)
    if (maxRain > 50 || maxSoil > 0.45) {
      hazards.push({
        name: "Flood Risk Alert",
        type: "flood",
        severity: 7,
        centerLatitude: 20.5937,
        centerLongitude: 78.9629,
        radius: 250,
        alertLevel: "high",
        description: `Heavy rainfall (${maxRain.toFixed(
          1
        )} mm) and soil saturation (${(maxSoil * 100).toFixed(1)} %)`,
        isActive: true,
      });
    }

    // ☀️ Heatwave alert (temp > 40°C)
    if (maxTemp > 40) {
      hazards.push({
        name: "Heatwave Alert",
        type: "heatwave",
        severity: Math.min(Math.round(maxTemp / 5), 10),
        centerLatitude: 20.5937,
        centerLongitude: 78.9629,
        radius: 200,
        alertLevel: "moderate",
        description: `High surface temperature detected (${maxTemp.toFixed(
          1
        )} °C)`,
        isActive: true,
      });
    }
  } catch (err) {
    console.error("⚠️ Open-Meteo API failed:", err.message);
  }

  return hazards;
};

// ------------------------------------------------------
// 2️⃣  Sync hazard data to DB
// ------------------------------------------------------
const syncHazardData = async () => {
  console.log("🔄 Syncing hazard data...");
  const hazards = await fetchRealHazardData();

  let created = 0,
    updated = 0;
  for (const h of hazards) {
    const existing = await HazardZone.findOne({ where: { name: h.name } });
    if (existing) {
      await existing.update({
        severity: h.severity,
        alertLevel: h.alertLevel,
        description: h.description,
        lastUpdated: new Date(),
      });
      updated++;
    } else {
      await HazardZone.create({
        ...h,
        coordinates: [
          [h.centerLatitude + 0.1, h.centerLongitude + 0.1],
          [h.centerLatitude + 0.1, h.centerLongitude - 0.1],
          [h.centerLatitude - 0.1, h.centerLongitude - 0.1],
          [h.centerLatitude - 0.1, h.centerLongitude + 0.1],
        ],
      });
      created++;
    }
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [deactivated] = await HazardZone.update(
    { isActive: false },
    { where: { lastUpdated: { [Op.lt]: oneDayAgo }, isActive: true } }
  );

  console.log(
    `✅ Sync complete → ${created} created, ${updated} updated, ${deactivated} deactivated.`
  );
  return { created, updated, deactivated };
};

// ------------------------------------------------------
// 3️⃣  Utility – get hazards near coordinates
// ------------------------------------------------------
const getHazardZonesNearLocation = async ({ latitude, longitude, radius }) => {
  const hazards = await HazardZone.findAll({ where: { isActive: true } });
  return hazards.filter((h) => {
    const distKm =
      Math.sqrt(
        (h.centerLatitude - latitude) ** 2 +
        (h.centerLongitude - longitude) ** 2
      ) * 111;
    return distKm <= radius;
  });
};

// ------------------------------------------------------
// 4️⃣  Auto-sync every 5 minutes
// ------------------------------------------------------
const startHazardMonitoring = () => {
  console.log("🚀 Starting hazard monitoring...");
  syncHazardData();
  setInterval(syncHazardData, 5 * 60 * 1000);
};

module.exports = {
  syncHazardData,
  getHazardZonesNearLocation,
  startHazardMonitoring,
  HAZARD_DATA_SOURCES,
};
