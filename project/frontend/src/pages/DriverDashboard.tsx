import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  Shield,
  MapPin,
  Clock,
  // TrendingUp, 
  AlertTriangle,
  Car,
  // Users,
  Star,
  Navigation,
  Power,
  PowerOff
} from 'lucide-react'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'

interface DriverProfile {
  id: string
  isAvailable: boolean
  isOnline: boolean
  currentLatitude: number | null
  currentLongitude: number | null
  rating: number
  totalTrips: number
  vehicleType: string
  vehicleMake: string
  vehicleModel: string
  licensePlate: string
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

interface RecentRide {
  id: string
  pickupAddress: string
  destinationAddress: string
  status: string
  rideType: 'normal' | 'sos'
  createdAt: string
  rider: {
    firstName: string
    lastName: string
  }
}

const DriverDashboard: React.FC = () => {
  const { user } = useAuth()
  const { connected, emitAvailabilityUpdate, emitLocationUpdate } = useSocket()
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null)
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([])
  const [recentRides, setRecentRides] = useState<RecentRide[]>([])
  const [loading, setLoading] = useState(true)
  const [locationWatcher, setLocationWatcher] = useState<number | null>(null)
  const [stats, setStats] = useState({
    totalTrips: 0,
    emergencyTrips: 0,
    safetyScore: 0,
    earnings: 0
  })

  useEffect(() => {
    fetchDashboardData()
    return () => {
      if (locationWatcher) {
        navigator.geolocation.clearWatch(locationWatcher)
      }
    }
  }, [])

  useEffect(() => {
    if (driverProfile?.isOnline && !locationWatcher) {
      startLocationTracking()
    } else if (!driverProfile?.isOnline && locationWatcher) {
      stopLocationTracking()
    }
  }, [driverProfile?.isOnline])

  const fetchDashboardData = async () => {
    try {
      const [profileRes, hazardsRes, ridesRes, analyticsRes] = await Promise.all([
        axios.get('https://98.84.159.27:3001/api/drivers/profile'),
        axios.get('https://98.84.159.27:3001/api/hazards'),
        axios.get('https://98.84.159.27:3001/api/rides/driver-rides'),
        axios.get('https://98.84.159.27:3001/api/analytics/driver')
      ])

      setDriverProfile(profileRes.data.driver)
      setHazardZones(hazardsRes.data.hazardZones)
      setRecentRides(ridesRes.data.rides.slice(0, 5))
      setStats({
        totalTrips: analyticsRes.data.analytics.totalTrips,
        emergencyTrips: analyticsRes.data.analytics.emergencyTrips,
        safetyScore: analyticsRes.data.analytics.safetyScore?.overallScore || 0,
        earnings: analyticsRes.data.analytics.totalEarnings
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          emitLocationUpdate(latitude, longitude)

          // Update backend
          axios.patch('/api/drivers/location', { latitude, longitude })
            .catch(error => console.error('Failed to update location:', error))
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
      setLocationWatcher(watchId)
    }
  }

  const stopLocationTracking = () => {
    if (locationWatcher) {
      navigator.geolocation.clearWatch(locationWatcher)
      setLocationWatcher(null)
    }
  }

  const toggleOnlineStatus = async () => {
    if (!driverProfile) return

    try {
      const newOnlineStatus = !driverProfile.isOnline
      await axios.patch('/api/drivers/availability', {
        isAvailable: newOnlineStatus,
        isOnline: newOnlineStatus
      })

      setDriverProfile(prev => prev ? {
        ...prev,
        isOnline: newOnlineStatus,
        isAvailable: newOnlineStatus
      } : null)

      emitAvailabilityUpdate(newOnlineStatus, newOnlineStatus)
    } catch (error) {
      console.error('Failed to update availability:', error)
    }
  }

  const toggleAvailability = async () => {
    if (!driverProfile) return

    try {
      const newAvailability = !driverProfile.isAvailable
      await axios.patch('/api/drivers/availability', {
        isAvailable: newAvailability,
        isOnline: driverProfile.isOnline
      })

      setDriverProfile(prev => prev ? {
        ...prev,
        isAvailable: newAvailability
      } : null)

      emitAvailabilityUpdate(newAvailability, driverProfile.isOnline)
    } catch (error) {
      console.error('Failed to update availability:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-yellow-600 bg-yellow-100'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!driverProfile) {
    return (
      <div className="text-center py-12">
        <Car className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete Your Driver Profile</h2>
        <p className="text-gray-600 mb-4">You need to complete your driver registration first.</p>
        <Link to="/app/driver-registration" className="btn-primary inline-block">
          Complete Registration
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Driver Status Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Driver Hub - {user?.firstName}
            </h1>
            <p className="text-green-100">
              {driverProfile.vehicleMake} {driverProfile.vehicleModel} • {driverProfile.licensePlate}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${driverProfile.isOnline ? 'bg-blue-400' : 'bg-gray-400'
                }`} />
              <span className="text-sm">
                {driverProfile.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Controls */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Online Status</h3>
              <p className="text-gray-600 text-sm">
                {driverProfile.isOnline ? 'You are online and visible to riders' : 'You are offline'}
              </p>
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${driverProfile.isOnline
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
            >
              {driverProfile.isOnline ? (
                <>
                  <PowerOff className="h-4 w-4" />
                  <span>Go Offline</span>
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" />
                  <span>Go Online</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Availability</h3>
              <p className="text-gray-600 text-sm">
                {driverProfile.isAvailable ? 'Available for ride requests' : 'Not accepting rides'}
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              disabled={!driverProfile.isOnline}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${driverProfile.isAvailable
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              {driverProfile.isAvailable ? 'Set Busy' : 'Set Available'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrips}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rescue Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emergencyTrips}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Safety Score</p>
              <p className="text-2xl font-bold text-gray-900">{Number(stats.safetyScore || 0).toFixed(1)}/10</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Rating</p>
              <p className="text-2xl font-bold text-gray-900">{Number(driverProfile.rating || 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hazard Map */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Hazard Map & Your Location</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>Live Tracking: {driverProfile.isOnline ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          <MapComponent
            center={
              driverProfile.currentLatitude !== null && driverProfile.currentLongitude !== null
                ? {
                  lat: driverProfile.currentLatitude,
                  lng: driverProfile.currentLongitude,
                  address: 'Current Location' // Placeholder address
                }
                : { lat: 0, lng: 0, address: 'Default Location' } // Default center value with address
            }
            drivers={
              driverProfile.currentLatitude !== null && driverProfile.currentLongitude !== null
                ? [{
                  id: driverProfile.id,
                  currentLatitude: driverProfile.currentLatitude,
                  currentLongitude: driverProfile.currentLongitude,
                  isAvailable: driverProfile.isAvailable,
                  user: {
                    firstName: user?.firstName || '',
                    lastName: user?.lastName || ''
                  }
                }]
                : []
            }
            hazardZones={hazardZones}
            height="400px"
            showControls={true}
          />
        </div>

        {/* Driver Info */}
        <div className="space-y-6">
          {/* Vehicle Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium capitalize">{driverProfile.vehicleType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Make:</span>
                <span className="font-medium">{driverProfile.vehicleMake}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Model:</span>
                <span className="font-medium">{driverProfile.vehicleModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">License:</span>
                <span className="font-medium">{driverProfile.licensePlate}</span>
              </div>
            </div>
          </div>

          {/* Emergency Equipment */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Equipment</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">First Aid Kit</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Fire Extinguisher</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">Emergency Blankets</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Rides</h2>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {recentRides.map((ride) => (
            <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ride.rideType === 'sos' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                  {ride.rideType === 'sos' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Car className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {ride.rider.firstName} {ride.rider.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    {ride.pickupAddress} → {ride.destinationAddress}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <span className={`badge ${getStatusColor(ride.status)}`}>
                {ride.status.replace('_', ' ')}
              </span>
            </div>
          ))}
          {recentRides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Navigation className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No rides completed yet</p>
              <div className="mt-4 space-y-2">
                <p className="text-xs">Go online to start receiving ride requests</p>
                <Link to="/app/driver-notifications" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  View Notifications
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverDashboard