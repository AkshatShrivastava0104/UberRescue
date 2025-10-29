import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
  Car,
  Search,
  Target
} from 'lucide-react'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'
import toast from 'react-hot-toast'

export interface Location {
  lat: number
  lng: number
  address: string
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

interface RouteEstimate {
  distance: number
  duration: number
  estimatedFare: number
  safetyScore: number
  hazardZonesAvoided: any[]
}

const RideBooking: React.FC = () => {
  const [searchParams] = useSearchParams()
  const initialRideType = searchParams.get('type') as 'normal' | 'sos' || 'normal'

  useAuth()
  const navigate = useNavigate()

  const [rideType, setRideType] = useState<'normal' | 'sos'>(initialRideType)
  const [pickup, setPickup] = useState<Location | null>(null)
  const [destination, setDestination] = useState<Location | null>(null)
  const [pickupAddress, setPickupAddress] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [emergencyNotes, setEmergencyNotes] = useState('')
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([])
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null)
  const [loading, setLoading] = useState(false)
  const [bookingRide, setBookingRide] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  useEffect(() => {
    fetchHazardZones()
  }, [])

  useEffect(() => {
    if (pickup && destination) {
      calculateRoute()
    }
  }, [pickup, destination])

  const fetchHazardZones = async () => {
    try {
      const response = await axios.get('https://98.84.159.27:3001/api/hazards')
      setHazardZones(response.data.hazardZones)
    } catch (error) {
      console.error('Failed to fetch hazard zones:', error)
    }
  }

  const getCurrentLocation = () => {
    setGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          try {
            // Simple address format for India
            const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (Current Location)`
            setPickup({ lat: latitude, lng: longitude, address })
            setPickupAddress(address)
            toast.success('Current location set as pickup')
          } catch (error) {
            console.error('Geocoding error:', error)
            setPickup({ lat: latitude, lng: longitude, address: 'Current Location' })
            setPickupAddress('Current Location')
          }
          setGettingLocation(false)
        },
        (error) => {
          console.error('Location error:', error)
          toast.error('Unable to get current location')
          setGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    } else {
      toast.error('Geolocation is not supported by this browser')
      setGettingLocation(false)
    }
  }

  const handleAddressSearch = async (address: string, type: 'pickup' | 'destination') => {
    if (!address.trim()) return

    try {
      // Enhanced geocoding for India with more cities and areas
      const indianCities = [
        { name: 'Delhi', lat: 28.6139, lng: 77.2090, aliases: ['new delhi', 'delhi ncr'] },
        { name: 'Mumbai', lat: 19.0760, lng: 72.8777, aliases: ['bombay', 'mumbai city'] },
        { name: 'Bangalore', lat: 12.9716, lng: 77.5946, aliases: ['bengaluru', 'blr'] },
        { name: 'Chennai', lat: 13.0827, lng: 80.2707, aliases: ['madras'] },
        { name: 'Kolkata', lat: 22.5726, lng: 88.3639, aliases: ['calcutta'] },
        { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, aliases: ['hyd', 'cyberabad'] },
        { name: 'Pune', lat: 18.5204, lng: 73.8567, aliases: ['poona'] },
        { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, aliases: ['amdavad'] },
        { name: 'Jaipur', lat: 26.9124, lng: 75.7873, aliases: ['pink city'] },
        { name: 'Surat', lat: 21.1702, lng: 72.8311, aliases: [] },
        { name: 'Lucknow', lat: 26.8467, lng: 80.9462, aliases: [] },
        { name: 'Kanpur', lat: 26.4499, lng: 80.3319, aliases: [] }
      ]

      // Enhanced matching with aliases
      let selectedCity = indianCities[Math.floor(Math.random() * indianCities.length)]
      for (const city of indianCities) {
        const searchTerm = address.toLowerCase()
        if (searchTerm.includes(city.name.toLowerCase()) ||
          city.aliases.some(alias => searchTerm.includes(alias))) {
          selectedCity = city
          break
        }
      }

      // Smaller random offset for more realistic locations
      const randomOffset = () => (Math.random() - 0.5) * 0.005

      const location: Location = {
        lat: selectedCity.lat + randomOffset(),
        lng: selectedCity.lng + randomOffset(),
        address: address
      }

      if (type === 'pickup') {
        setPickup(location)
        setPickupAddress(address)
      } else {
        setDestination(location)
        setDestinationAddress(address)
      }

      toast.success(`${type === 'pickup' ? 'Pickup' : 'Destination'} location set`)
    } catch (error) {
      toast.error('Failed to find location')
    }
  }

  const calculateRoute = async () => {
    if (!pickup || !destination) return

    setLoading(true)
    try {
      // Simulate route calculation
      const distance = Math.sqrt(
        Math.pow(destination.lat - pickup.lat, 2) +
        Math.pow(destination.lng - pickup.lng, 2)
      ) * 111; // Rough km conversion

      const duration = Math.ceil(distance / 40 * 60) // Assume 40 km/h average speed
      const baseFare = rideType === 'sos' ? 10.00 : 5.00
      const estimatedFare = baseFare + (distance * (rideType === 'sos' ? 2.50 : 1.50))

      // Check for hazard zones in path
      const hazardZonesAvoided = hazardZones.filter(hazard => {
        const hazardDistance = Math.sqrt(
          Math.pow(hazard.centerLatitude - pickup.lat, 2) +
          Math.pow(hazard.centerLongitude - pickup.lng, 2)
        ) * 111
        return hazardDistance <= hazard.radius + 2 // 2km buffer
      })

      const safetyScore = Math.max(1, Math.min(10, 10 - (hazardZonesAvoided.length * 2)))

      setRouteEstimate({
        distance: Math.round(distance * 100) / 100,
        duration,
        estimatedFare: Math.round(estimatedFare * 100) / 100,
        safetyScore,
        hazardZonesAvoided
      })
    } catch (error) {
      console.error('Route calculation error:', error)
      toast.error('Failed to calculate route')
    } finally {
      setLoading(false)
    }
  }

  const bookRide = async () => {
    if (!pickup || !destination) {
      toast.error('Please set both pickup and destination locations')
      return
    }

    setBookingRide(true)
    try {
      const rideData = {
        pickupLatitude: pickup.lat,
        pickupLongitude: pickup.lng,
        pickupAddress: pickup.address,
        destinationLatitude: destination.lat,
        destinationLongitude: destination.lng,
        destinationAddress: destination.address,
        rideType,
        emergencyNotes: rideType === 'sos' ? emergencyNotes : undefined
      }

      const response = await axios.post('https://98.84.159.27:3001/api/rides', rideData)
      const ride = response.data.ride

      toast.success(rideType === 'sos' ? 'Emergency ride requested!' : 'Ride booked successfully!')
      navigate(`/app/ride/${ride.id}`)
    } catch (error: any) {
      console.error('Booking error:', error)
      toast.error(error.response?.data?.message || 'Failed to book ride')
    } finally {
      setBookingRide(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Book a Ride</h1>
          <p className="text-gray-600">Request safe transportation with hazard avoidance</p>
        </div>

        {/* Ride Type Toggle */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setRideType('normal')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${rideType === 'normal'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Car className="h-4 w-4 inline mr-2" />
            Normal Ride
          </button>
          <button
            onClick={() => setRideType('sos')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${rideType === 'sos'
              ? 'bg-red-600 text-white shadow-sm emergency-pulse'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            SOS Emergency
          </button>
        </div>
      </div>

      {/* Emergency Alert */}
      {rideType === 'sos' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">Emergency Evacuation Mode</p>
              <p>
                This request will be prioritized for immediate response. Emergency services
                will be notified if needed. For life-threatening situations, call 911 directly.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Booking Form */}
        <div className="lg:col-span-1 space-y-6">
          {/* Location Inputs */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Details</h2>

            {/* Pickup Location */}
            <div className="space-y-2 mb-4">
              <label className="label">Pickup Location</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch(pickupAddress, 'pickup')}
                    className="input pl-10"
                    placeholder="Enter pickup address"
                  />
                </div>
                <button
                  onClick={() => handleAddressSearch(pickupAddress, 'pickup')}
                  className="btn-outline px-3"
                  disabled={!pickupAddress.trim()}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Target className="h-4 w-4" />
                <span>{gettingLocation ? 'Getting location...' : 'Use current location'}</span>
              </button>
            </div>

            {/* Destination Location */}
            <div className="space-y-2 mb-4">
              <label className="label">Destination</label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-red-500" />
                  <input
                    type="text"
                    value={destinationAddress}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch(destinationAddress, 'destination')}
                    className="input pl-10"
                    placeholder="Enter destination address"
                  />
                </div>
                <button
                  onClick={() => handleAddressSearch(destinationAddress, 'destination')}
                  className="btn-outline px-3"
                  disabled={!destinationAddress.trim()}
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Emergency Notes */}
            {rideType === 'sos' && (
              <div className="space-y-2">
                <label className="label">Emergency Details (Optional)</label>
                <textarea
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  className="input resize-none"
                  rows={3}
                  placeholder="Describe the emergency situation, number of passengers, special needs..."
                />
              </div>
            )}
          </div>

          {/* Route Estimate */}
          {routeEstimate && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Estimate</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Navigation className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Distance</span>
                  </div>
                  <span className="font-medium">{routeEstimate.distance} km</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Duration</span>
                  </div>
                  <span className="font-medium">{routeEstimate.duration} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Estimated Fare</span>
                  </div>
                  <span className="font-medium">${routeEstimate.estimatedFare}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Safety Score</span>
                  </div>
                  <span className={`font-medium ${routeEstimate.safetyScore >= 8 ? 'text-green-600' :
                    routeEstimate.safetyScore >= 6 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {routeEstimate.safetyScore}/10
                  </span>
                </div>

                {routeEstimate.hazardZonesAvoided.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Hazards Avoided:</p>
                    <div className="space-y-1">
                      {routeEstimate.hazardZonesAvoided.map((hazard, index) => (
                        <div key={index} className="text-xs bg-yellow-50 text-yellow-800 px-2 py-1 rounded">
                          {hazard.name} ({hazard.type})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Book Ride Button */}
          <button
            onClick={bookRide}
            disabled={!pickup || !destination || bookingRide || loading}
            className={`w-full flex items-center justify-center space-x-2 py-3 text-lg font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${rideType === 'sos'
              ? 'bg-red-600 hover:bg-red-700 text-white emergency-pulse'
              : 'btn-primary'
              }`}
          >
            {bookingRide ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Booking Ride...</span>
              </>
            ) : (
              <>
                {rideType === 'sos' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Car className="h-5 w-5" />
                )}
                <span>
                  {rideType === 'sos' ? 'Request Emergency Evacuation' : 'Book Ride'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Click on the map to set pickup and destination locations,
                or drag the pins to adjust positions. Use "Current Location\" button for pickup.
              </p>
            </div>
            <MapComponent
              pickup={pickup || undefined}
              destination={destination || undefined}
              hazardZones={hazardZones}
              route={pickup && destination ? [pickup, destination] : []}
              height="600px"
              showControls={true}
              allowDragging={true}
              center={{ lat: 20.5937, lng: 78.9629, address: "India center" }}
              onPickupChange={(location: Location) => {
                setPickup(location)
                setPickupAddress(location.address)
              }}
              onDestinationChange={(location: Location) => {
                setDestination(location)
                setDestinationAddress(location.address)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RideBooking