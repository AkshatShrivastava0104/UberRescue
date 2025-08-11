import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet'
import { Icon } from 'leaflet'
import { MapPin, AlertTriangle, Shield, Car } from 'lucide-react'

interface Location {
  lat: number
  lng: number
  address?: string
}

interface HazardZone {
  id: string
  name: string
  type: string
  severity: number
  centerLatitude: number
  centerLongitude: number
  radius: number
  alertLevel: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

interface Driver {
  id: string
  currentLatitude: number
  currentLongitude: number
  isAvailable: boolean
  user: {
    firstName: string
    lastName: string
  }
}

interface MapComponentProps {
  center?: Location
  pickup?: Location
  destination?: Location
  hazardZones?: HazardZone[]
  drivers?: Driver[]
  route?: Location[]
  className?: string
  height?: string
  showControls?: boolean
}

// Custom icons
const createIcon = (color: string, icon: string) => {
  const svg = `
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="${color}"/>
      <text x="16" y="20" text-anchor="middle" fill="white" font-size="14">${icon}</text>
    </svg>
  `

  const utf8Svg = unescape(encodeURIComponent(svg)) // handle emojis & UTF-8
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(utf8Svg)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}



const pickupIcon = createIcon('#10B981', '📍')
const destinationIcon = createIcon('#EF4444', '🏁')
const driverIcon = createIcon('#3B82F6', '🚗')
const hazardIcon = createIcon('#F59E0B', '⚠️')

const MapComponent: React.FC<MapComponentProps> = ({
  center = { lat: 37.7749, lng: -122.4194 },
  pickup,
  destination,
  hazardZones = [],
  drivers = [],
  route = [],
  className = '',
  height = '400px',
  showControls = true
}) => {
  const [mapCenter, setMapCenter] = useState(center)

  useEffect(() => {
    if (pickup) {
      setMapCenter(pickup)
    }
  }, [pickup])

  const getHazardColor = (alertLevel: string) => {
    switch (alertLevel) {
      case 'critical': return '#DC2626'
      case 'high': return '#EA580C'
      case 'medium': return '#D97706'
      case 'low': return '#65A30D'
      default: return '#6B7280'
    }
  }

  const getHazardOpacity = (severity: number) => {
    return Math.max(0.2, Math.min(0.7, severity / 10))
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <MapContainer
        center={[mapCenter.lat, mapCenter.lng]}
        zoom={13}
        className="w-full h-full rounded-lg border border-gray-300"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Pickup marker */}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-green-800">Pickup Location</h3>
                {pickup.address && <p className="text-sm">{pickup.address}</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-red-800">Destination</h3>
                {destination.address && <p className="text-sm">{destination.address}</p>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver markers */}
        {drivers.map(driver => (
          <Marker
            key={driver.id}
            position={[driver.currentLatitude, driver.currentLongitude]}
            icon={driverIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-blue-800">
                  {driver.user.firstName} {driver.user.lastName}
                </h3>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    driver.isAvailable ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs">
                    {driver.isAvailable ? 'Available' : 'Busy'}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Hazard zones */}
        {hazardZones.map(hazard => (
          <React.Fragment key={hazard.id}>
            <Circle
              center={[hazard.centerLatitude, hazard.centerLongitude]}
              radius={hazard.radius * 1000} // Convert km to meters
              pathOptions={{
                color: getHazardColor(hazard.alertLevel),
                fillColor: getHazardColor(hazard.alertLevel),
                fillOpacity: getHazardOpacity(hazard.severity),
                weight: 2
              }}
            />
            <Marker
              position={[hazard.centerLatitude, hazard.centerLongitude]}
              icon={hazardIcon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-orange-800">{hazard.name}</h3>
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium">Type:</span>
                      <span className="text-xs capitalize">{hazard.type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium">Severity:</span>
                      <span className="text-xs">{hazard.severity}/10</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium">Alert:</span>
                      <span className={`text-xs capitalize px-1 py-0.5 rounded ${
                        hazard.alertLevel === 'critical' ? 'bg-red-100 text-red-800' :
                        hazard.alertLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                        hazard.alertLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {hazard.alertLevel}
                      </span>
                    </div>
                    {hazard.description && (
                      <p className="text-xs mt-2">{hazard.description}</p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Route polyline */}
        {route.length > 1 && (
          <Polyline
            positions={route.map(point => [point.lat, point.lng])}
            pathOptions={{
              color: '#3B82F6',
              weight: 4,
              opacity: 0.8,
              dashArray: '10, 5'
            }}
          />
        )}
      </MapContainer>

      {/* Map legend */}
      {showControls && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 space-y-2 text-xs">
          <h4 className="font-semibold text-gray-800">Legend</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Pickup</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Destination</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Available Drivers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span>Hazard Zones</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapComponent