import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  AlertTriangle,
  Car,
  Navigation,
  Shield,
  Star,
  CheckCircle,
  XCircle
} from 'lucide-react'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'
import toast from 'react-hot-toast'

interface RideData {
  id: string
  riderId: string
  driverId: string | null
  pickupLatitude: number
  pickupLongitude: number
  pickupAddress: string
  destinationLatitude: number
  destinationLongitude: number
  destinationAddress: string
  status: 'pending' | 'accepted' | 'driver_en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'
  rideType: 'normal' | 'sos'
  estimatedFare: number
  actualFare?: number
  distance: number
  duration: number
  safetyRating?: number
  emergencyNotes?: string
  createdAt: string
  rider: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
  driver?: {
    id: string
    currentLatitude?: number
    currentLongitude?: number
    rating: number
    vehicleType: string
    vehicleMake: string
    vehicleModel: string
    licensePlate: string
    user: {
      id: string
      firstName: string
      lastName: string
      phone: string
    }
  }
}

const RideTracking: React.FC = () => {
  const { rideId } = useParams<{ rideId: string }>()
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [ride, setRide] = useState<RideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null)

  useEffect(() => {
    if (rideId) {
      fetchRideData()
    }
  }, [rideId])

  useEffect(() => {
    if (socket && ride) {
      // Listen for ride status updates
      socket.on('ride-status-update', (data) => {
        if (data.rideId === ride.id) {
          setRide(prev => prev ? { ...prev, status: data.status } : prev)
          toast.success(`Ride status: ${data.status.replace('_', ' ')}`)
        }
      })

      // Listen for driver location updates
      socket.on('driver-location-update', (data) => {
        if (ride.driver && data.driverId === ride.driver.id) {
          setDriverLocation({ lat: data.latitude, lng: data.longitude })
          // Calculate estimated arrival time (simplified)
          if (ride.status === 'driver_en_route' || ride.status === 'accepted') {
            const distance = Math.sqrt(
              Math.pow(data.latitude - ride.pickupLatitude, 2) +
              Math.pow(data.longitude - ride.pickupLongitude, 2)
            ) * 111 // Rough km conversion
            setEstimatedArrival(Math.ceil(distance / 0.5)) // Assume 30 km/h in city
          }
        }
      })

      return () => {
        socket.off('ride-status-update')
        socket.off('driver-location-update')
      }
    }
  }, [socket, ride])

  const fetchRideData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/rides/${rideId}`)
      setRide(response.data.ride)

      // Set initial driver location if available
      if (response.data.ride.driver?.currentLatitude && response.data.ride.driver?.currentLongitude) {
        setDriverLocation({
          lat: response.data.ride.driver.currentLatitude,
          lng: response.data.ride.driver.currentLongitude
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch ride data:', error)
      if (error.response?.status === 404) {
        toast.error('Ride not found')
        navigate('/app/dashboard')
      } else {
        toast.error('Failed to load ride details')
      }
    } finally {
      setLoading(false)
    }
  }

  const updateRideStatus = async (newStatus: string) => {
    if (!ride) return

    try {
      await axios.patch(`/api/rides/${ride.id}/status`, { status: newStatus })
      setRide(prev => prev ? { ...prev, status: newStatus as any } : prev)
      toast.success(`Ride ${newStatus.replace('_', ' ')}`)
    } catch (error) {
      console.error('Failed to update ride status:', error)
      toast.error('Failed to update ride status')
    }
  }

  const cancelRide = async () => {
    if (!ride || ride.status === 'completed' || ride.status === 'cancelled') return

    if (window.confirm('Are you sure you want to cancel this ride?')) {
      await updateRideStatus('cancelled')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'accepted': return 'text-blue-600 bg-blue-100'
      case 'driver_en_route': return 'text-purple-600 bg-purple-100'
      case 'arrived': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-indigo-600 bg-indigo-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5" />
      case 'accepted': return <CheckCircle className="h-5 w-5" />
      case 'driver_en_route': return <Car className="h-5 w-5" />
      case 'arrived': return <MapPin className="h-5 w-5" />
      case 'in_progress': return <Navigation className="h-5 w-5" />
      case 'completed': return <CheckCircle className="h-5 w-5" />
      case 'cancelled': return <XCircle className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Looking for a driver...'
      case 'accepted': return 'Driver assigned and preparing'
      case 'driver_en_route': return 'Driver is on the way to pickup'
      case 'arrived': return 'Driver has arrived at pickup location'
      case 'in_progress': return 'Trip in progress'
      case 'completed': return 'Trip completed successfully'
      case 'cancelled': return 'Trip was cancelled'
      default: return 'Unknown status'
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!ride) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ride Not Found</h2>
        <p className="text-gray-600">The requested ride could not be found.</p>
      </div>
    )
  }

  const isRider = user?.id === ride.riderId
  const isDriver = user?.role === 'driver' && ride.driver && user?.id === ride.driver.user.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {ride.rideType === 'sos' ? 'Emergency Evacuation' : 'Ride Tracking'}
          </h1>
          <p className="text-gray-600">Trip ID: {ride.id.slice(0, 8)}</p>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${getStatusColor(ride.status)}`}>
          {getStatusIcon(ride.status)}
          <span className="font-medium capitalize">{ride.status.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Emergency Alert */}
      {ride.rideType === 'sos' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-medium mb-1">Emergency Evacuation in Progress</p>
              <p>Priority response activated. Emergency services have been notified.</p>
              {ride.emergencyNotes && (
                <p className="mt-2 font-medium">Notes: {ride.emergencyNotes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trip Details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status Card */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Status</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(ride.status)}`}>
                  {getStatusIcon(ride.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getStatusMessage(ride.status)}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(ride.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {estimatedArrival && (ride.status === 'accepted' || ride.status === 'driver_en_route') && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Estimated arrival: {estimatedArrival} minutes
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Driver Info */}
          {ride.driver && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Details</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {ride.driver.user.firstName} {ride.driver.user.lastName}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm text-gray-600">{ride.driver.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">
                      {ride.driver.vehicleMake} {ride.driver.vehicleModel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">License Plate:</span>
                    <span className="font-medium">{ride.driver.licensePlate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{ride.driver.vehicleType}</span>
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="flex space-x-2">
                  <a
                    href={`tel:${ride.driver.user.phone}`}
                    className="flex-1 btn-outline flex items-center justify-center space-x-2"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`sms:${ride.driver.user.phone}`}
                    className="flex-1 btn-outline flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Text</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Trip Details */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">From</p>
                <p className="font-medium">{ride.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">To</p>
                <p className="font-medium">{ride.destinationAddress}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Distance:</span>
                <span className="font-medium">{ride.distance} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{ride.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fare:</span>
                <span className="font-medium">${ride.actualFare || ride.estimatedFare}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isDriver && ride.status !== 'completed' && ride.status !== 'cancelled' && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Driver Actions</h2>
              <div className="space-y-2">
                {ride.status === 'accepted' && (
                  <button
                    onClick={() => updateRideStatus('driver_en_route')}
                    className="w-full btn-primary"
                  >
                    Start Trip to Pickup
                  </button>
                )}
                {ride.status === 'driver_en_route' && (
                  <button
                    onClick={() => updateRideStatus('arrived')}
                    className="w-full btn-primary"
                  >
                    Mark as Arrived
                  </button>
                )}
                {ride.status === 'arrived' && (
                  <button
                    onClick={() => updateRideStatus('in_progress')}
                    className="w-full btn-primary"
                  >
                    Start Trip
                  </button>
                )}
                {ride.status === 'in_progress' && (
                  <button
                    onClick={() => updateRideStatus('completed')}
                    className="w-full btn-primary"
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Cancel Button */}
          {(isRider || isDriver) && ride.status !== 'completed' && ride.status !== 'cancelled' && (
            <button
              onClick={cancelRide}
              className="w-full btn-outline text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel Ride
            </button>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            <MapComponent
              pickup={{ lat: ride.pickupLatitude, lng: ride.pickupLongitude, address: ride.pickupAddress }}
              destination={{ lat: ride.destinationLatitude, lng: ride.destinationLongitude, address: ride.destinationAddress }}
              drivers={ride.driver && driverLocation ? [{
                id: ride.driver.id,
                currentLatitude: driverLocation.lat,
                currentLongitude: driverLocation.lng,
                isAvailable: false,
                user: {
                  firstName: ride.driver.user.firstName,
                  lastName: ride.driver.user.lastName
                }
              }] : []}
              route={[
                { lat: ride.pickupLatitude, lng: ride.pickupLongitude },
                { lat: ride.destinationLatitude, lng: ride.destinationLongitude }
              ]}
              height="600px"
              showControls={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default RideTracking