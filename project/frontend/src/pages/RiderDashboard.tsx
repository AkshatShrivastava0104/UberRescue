import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { 
  AlertTriangle, 
  MapPin, 
  Car, 
  Clock, 
  Shield, 
  TrendingUp,
  Phone,
  Navigation
} from 'lucide-react'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'

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
  driver?: {
    user: {
      firstName: string
      lastName: string
    }
  }
}

const RiderDashboard: React.FC = () => {
  const { user } = useAuth()
  const { connected } = useSocket()
  const [hazardZones, setHazardZones] = useState<HazardZone[]>([])
  const [recentRides, setRecentRides] = useState<RecentRide[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRides: 0,
    emergencyRides: 0,
    safetyScore: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [hazardsRes, ridesRes, analyticsRes] = await Promise.all([
        axios.get('/api/hazards'),
        axios.get('/api/rides/my-rides'),
        axios.get('/api/analytics/rider')
      ])

      setHazardZones(hazardsRes.data.hazardZones)
      setRecentRides(ridesRes.data.rides.slice(0, 5))
      setStats({
        totalRides: analyticsRes.data.analytics.totalRides,
        emergencyRides: analyticsRes.data.analytics.emergencyRides,
        safetyScore: analyticsRes.data.analytics.averageSafetyScore
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
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

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-blue-100">
              Stay safe and prepared for any emergency situation
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link
          to="/app/book-ride"
          className="card-hover group bg-gradient-to-br from-green-50 to-green-100 border-green-200"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Book Regular Ride</h3>
              <p className="text-gray-600">Request a safe ride with hazard avoidance</p>
            </div>
          </div>
        </Link>

        <Link
          to="/app/book-ride?type=sos"
          className="card-hover group bg-gradient-to-br from-red-50 to-red-100 border-red-200 emergency-pulse"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">SOS Emergency</h3>
              <p className="text-gray-600">Priority evacuation from danger zones</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRides}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Emergency Rides</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emergencyRides}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats.safetyScore.toFixed(1)}/10</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hazard Map */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Live Hazard Map</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>San Francisco Bay Area</span>
            </div>
          </div>
          <MapComponent
            hazardZones={hazardZones}
            height="400px"
            showControls={true}
          />
        </div>

        {/* Active Hazards */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Hazards</h2>
          <div className="space-y-3">
            {hazardZones.slice(0, 4).map((hazard) => (
              <div key={hazard.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{hazard.name}</h4>
                  <span className={`badge ${getAlertLevelColor(hazard.alertLevel)}`}>
                    {hazard.alertLevel}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{hazard.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 capitalize">{hazard.type}</span>
                  <span className="font-medium">Severity: {hazard.severity}/10</span>
                </div>
              </div>
            ))}
            {hazardZones.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm">No active hazards in your area</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Rides</h2>
          <Link to="/app/analytics" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="space-y-3">
          {recentRides.map((ride) => (
            <div key={ride.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  ride.rideType === 'sos' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {ride.rideType === 'sos' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Car className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {ride.pickupAddress} → {ride.destinationAddress}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(ride.createdAt).toLocaleDateString()}</span>
                    {ride.driver && (
                      <>
                        <span>•</span>
                        <span>Driver: {ride.driver.user.firstName} {ride.driver.user.lastName}</span>
                      </>
                    )}
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
              <p className="text-sm">No rides yet</p>
              <Link to="/app/book-ride" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Book your first ride
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="card bg-red-50 border-red-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">Emergency Services</h3>
            <p className="text-red-700 text-sm">
              For immediate life-threatening emergencies, call 911 directly
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiderDashboard