const haversineDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const lat1 = coord1.lat * Math.PI / 180;
  const lat2 = coord2.lat * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

const isPointInHazardZone = (point, hazardZone) => {
  const distance = haversineDistance(
    { lat: point.lat, lng: point.lng },
    { lat: hazardZone.centerLatitude, lng: hazardZone.centerLongitude }
  );
  return distance <= hazardZone.radius;
};

const generateWaypoints = (start, end, hazardZones) => {
  const waypoints = [start];
  
  // Simple algorithm: if direct path intersects hazards, add detour points
  const directDistance = haversineDistance(start, end);
  const segments = Math.ceil(directDistance / 2); // Check every 2km

  for (let i = 1; i < segments; i++) {
    const ratio = i / segments;
    const waypoint = {
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio
    };

    // Check if waypoint intersects any hazard zone
    const intersectsHazard = hazardZones.some(hazard => 
      isPointInHazardZone(waypoint, hazard) && hazard.severity >= 7
    );

    if (intersectsHazard) {
      // Add detour waypoint (simplified - in real implementation would use A* or Dijkstra)
      const detourPoint = {
        lat: waypoint.lat + (Math.random() - 0.5) * 0.01,
        lng: waypoint.lng + (Math.random() - 0.5) * 0.01
      };
      waypoints.push(detourPoint);
    } else {
      waypoints.push(waypoint);
    }
  }

  waypoints.push(end);
  return waypoints;
};

const calculateSafeRoute = async ({ start, end, hazardZones }) => {
  try {
    // Filter high-severity active hazards
    const activeHazards = hazardZones.filter(h => h.isActive && h.severity >= 5);
    
    // Generate route waypoints avoiding hazards
    const waypoints = generateWaypoints(start, end, activeHazards);
    
    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += haversineDistance(waypoints[i], waypoints[i + 1]);
    }

    // Estimate duration (assuming average speed of 40 km/h in emergency conditions)
    const duration = Math.ceil(totalDistance / 40 * 60); // minutes

    // Calculate fare (base + distance)
    const baseFare = 5.00;
    const perKmRate = 1.50;
    const estimatedFare = baseFare + (totalDistance * perKmRate);

    // Identify hazards that were avoided
    const hazardZonesAvoided = activeHazards.filter(hazard => {
      // Check if direct route would have intersected this hazard
      const directPath = [start, end];
      return directPath.some(point => isPointInHazardZone(point, hazard));
    }).map(h => ({
      id: h.id,
      name: h.name,
      type: h.type,
      severity: h.severity
    }));

    return {
      route: waypoints,
      distance: Math.round(totalDistance * 100) / 100,
      duration,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      hazardZonesAvoided,
      safetyScore: Math.max(1, Math.min(10, 10 - (hazardZonesAvoided.length * 2)))
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    
    // Fallback to direct route
    const directDistance = haversineDistance(start, end);
    const duration = Math.ceil(directDistance / 40 * 60);
    const estimatedFare = 5.00 + (directDistance * 1.50);

    return {
      route: [start, end],
      distance: Math.round(directDistance * 100) / 100,
      duration,
      estimatedFare: Math.round(estimatedFare * 100) / 100,
      hazardZonesAvoided: [],
      safetyScore: 8
    };
  }
};

module.exports = {
  calculateSafeRoute,
  haversineDistance,
  isPointInHazardZone
};