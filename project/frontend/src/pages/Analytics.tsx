import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  BarChart3,
  TrendingUp,
  Shield,
  Clock,
  MapPin,
  AlertTriangle,
  Car,
  Star,
  Calendar,
  Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'

interface AnalyticsData {
  totalRides: number
  totalDistance: number
  totalDurationHours: number
  averageSafetyScore: number
  emergencyRides: number
  hazardZonesEncountered: number
  evacuationRate: number
  totalTrips?: number
  emergencyTrips?: number
  totalEarnings?: number
  averageRating?: number
  rescueRate?: number
  safetyScore?: {
    overallScore: number
    hazardZonesAvoided: number
    completionRate: number
    responseTimeAverage: number
  }
}

interface RideRecord {
  id: string
  pickupAddress: string
  destinationAddress: string
  status: string
  rideType: 'normal' | 'sos'
  createdAt: string
  completedAt?: string
  totalDistance?: number
  safetyScore?: number
  driver?: {
    user: {
      firstName: string
      lastName: string
    }
  }
  rider?: {
    firstName: string
    lastName: string
  }
}

const Analytics: React.FC = () => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [recentRides, setRecentRides] = useState<RideRecord[]>([])
  const [rideHistory, setRideHistory] = useState<RideRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  // ✅ Normalize numeric values to avoid type errors
  const normalizeAnalytics = (data: any): AnalyticsData => ({
    totalRides: Number(data.totalRides) || 0,
    totalDistance: Number(data.totalDistance) || 0,
    totalDurationHours: Number(data.totalDurationHours) || 0,
    averageSafetyScore: Number(data.averageSafetyScore) || 0,
    emergencyRides: Number(data.emergencyRides) || 0,
    hazardZonesEncountered: Number(data.hazardZonesEncountered) || 0,
    evacuationRate: Number(data.evacuationRate) || 0,
    totalTrips: Number(data.totalTrips) || 0,
    emergencyTrips: Number(data.emergencyTrips) || 0,
    totalEarnings: Number(data.totalEarnings) || 0,
    averageRating: Number(data.averageRating) || 0,
    rescueRate: Number(data.rescueRate) || 0,
    safetyScore: {
      overallScore: Number(data.safetyScore?.overallScore) || 0,
      hazardZonesAvoided: Number(data.safetyScore?.hazardZonesAvoided) || 0,
      completionRate: Number(data.safetyScore?.completionRate) || 0,
      responseTimeAverage: Number(data.safetyScore?.responseTimeAverage) || 0,
    },
  })

  const api = import.meta.env.VITE_API_BACKEND_URL || '/api';
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const endpoint = user?.role === 'driver' ? `${api}/analytics/driver` : `${api}/analytics/rider`
      const response = await axios.get(`${endpoint}?timeframe=${timeframe}`)

      const normalized = normalizeAnalytics(response.data.analytics)
      setAnalytics(normalized)
      setRecentRides(response.data.recentRides || [])
      setRideHistory(response.data.rideHistory || [])
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) return <LoadingSpinner />

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h2>
        <p className="text-gray-600">Complete some rides to see your analytics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'driver' ? 'Driver Analytics' : 'My Trip Analytics'}
          </h1>
          <p className="text-gray-600">
            Track your {user?.role === 'driver' ? 'rescue performance' : 'evacuation history'} and safety metrics
          </p>
        </div>

        {/* Timeframe Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="input w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Trips/Rides */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {user?.role === 'driver' ? 'Total Trips' : 'Total Rides'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalTrips || analytics.totalRides}
              </p>
            </div>
          </div>
        </div>

        {/* Emergency */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Emergency {user?.role === 'driver' ? 'Rescues' : 'Rides'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.emergencyTrips || analytics.emergencyRides}
              </p>
            </div>
          </div>
        </div>

        {/* Safety Score */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Safety Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {(Number(analytics.safetyScore?.overallScore ?? analytics.averageSafetyScore ?? 0)).toFixed(1)}/10
              </p>
            </div>
          </div>
        </div>

        {/* Rating or Distance */}
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              {user?.role === 'driver' ? (
                <Star className="h-6 w-6 text-yellow-600" />
              ) : (
                <MapPin className="h-6 w-6 text-yellow-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {user?.role === 'driver' ? 'Average Rating' : 'Distance Traveled'}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {user?.role === 'driver'
                  ? (Number(analytics.averageRating) || 0).toFixed(1)
                  : `${Number(analytics.totalDistance || 0).toFixed(1)} km`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Safety Metrics */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Safety Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Hazards Avoided</span>
              <span className="font-semibold">
                {analytics.safetyScore?.hazardZonesAvoided || analytics.hazardZonesEncountered || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold">
                {(analytics.safetyScore?.completionRate || 100).toFixed(1)}%
              </span>
            </div>
            {user?.role === 'driver' && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Response Time</span>
                <span className="font-semibold">
                  {(analytics.safetyScore?.responseTimeAverage || 0).toFixed(1)} min
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Emergency Rate</span>
              <span className="font-semibold">
                {(analytics.rescueRate || analytics.evacuationRate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Time & Distance */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Statistics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Distance</span>
              <span className="font-semibold">{Number(analytics.totalDistance || 0).toFixed(1)} km</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Time</span>
              <span className="font-semibold">{Number(analytics.totalDurationHours || 0).toFixed(1)} hours</span>
            </div>
            {user?.role === 'driver' && analytics.totalEarnings && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Earnings</span>
                <span className="font-semibold">${Number(analytics.totalEarnings).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average per Trip</span>
              <span className="font-semibold">
                {(Number(analytics.totalDistance || 0) / Number(analytics.totalTrips || analytics.totalRides || 1)).toFixed(1)} km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Rides */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent {user?.role === 'driver' ? 'Trips' : 'Rides'}</h2>
          <button
            onClick={() => window.location.href = '/app/ride-history'}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
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
                    {ride.pickupAddress} → {ride.destinationAddress}
                  </p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{formatDate(ride.createdAt)}</span>
                    {(ride.driver || ride.rider) && (
                      <>
                        <span>•</span>
                        <span>
                          {user?.role === 'driver'
                            ? `${ride.rider?.firstName} ${ride.rider?.lastName}`
                            : `${ride.driver?.user.firstName} ${ride.driver?.user.lastName}`
                          }
                        </span>
                      </>
                    )}
                    {ride.totalDistance && (
                      <>
                        <span>•</span>
                        <span>{Number(ride.totalDistance).toFixed(1)} km</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {ride.safetyScore && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Safety</p>
                    <p className="font-semibold">{Number(ride.safetyScore).toFixed(1)}/10</p>
                  </div>
                )}
                <span className={`badge ${getStatusColor(ride.status)}`}>
                  {ride.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}

          {recentRides.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No recent {user?.role === 'driver' ? 'trips' : 'rides'} found</p>
              {user?.role === 'rider' && (
                <Link to="/app/book-ride" className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Book Your First Ride
                </Link>
              )}
              {user?.role === 'driver' && (
                <div className="mt-4">
                  <p className="text-xs mb-2">Go online to start receiving ride requests</p>
                  <Link to="/app/driver-dashboard" className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Go to Driver Hub
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(analytics.totalTrips || analytics.totalRides || 0) >= 10 && (
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Experienced {user?.role === 'driver' ? 'Driver' : 'Rider'}</p>
                <p className="text-sm text-blue-700">Completed 10+ {user?.role === 'driver' ? 'trips' : 'rides'}</p>
              </div>
            </div>
          )}

          {(analytics.emergencyTrips || analytics.emergencyRides || 0) >= 5 && (
            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-red-900">Emergency Hero</p>
                <p className="text-sm text-red-700">5+ emergency evacuations</p>
              </div>
            </div>
          )}

          {(analytics.safetyScore?.overallScore || analytics.averageSafetyScore || 0) >= 8 && (
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-green-900">Safety Champion</p>
                <p className="text-sm text-green-700">High safety score maintained</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Analytics