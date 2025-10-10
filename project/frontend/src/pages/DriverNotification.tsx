import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useNavigate } from 'react-router-dom'
import {
    Bell,
    AlertTriangle,
    Car,
    MapPin,
    Clock,
    DollarSign,
    Check,
    X,
    Navigation,
    Phone,
    User,
    Shield,
    MessageCircle
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'
import toast from 'react-hot-toast'

interface RideRequest {
    id: string
    rideId: string
    pickupLocation: {
        lat: number
        lng: number
        address: string
    }
    destinationLocation: {
        lat: number
        lng: number
        address: string
    }
    rideType: 'normal' | 'sos'
    estimatedFare: number
    distance: number
    rider: {
        id: string
        name: string
        phone: string
    }
    timestamp: string
    status: 'pending' | 'accepted' | 'declined' | 'expired'
}

interface Notification {
    id: string
    type: 'ride_request' | 'ride_update' | 'emergency_alert' | 'system'
    title: string
    message: string
    data?: any
    timestamp: string
    read: boolean
    priority: 'low' | 'medium' | 'high' | 'critical'
}

const DriverNotifications: React.FC = () => {
    const { user } = useAuth()
    const { socket, connected } = useSocket()
    const navigate = useNavigate()
    const [rideRequests, setRideRequests] = useState<RideRequest[]>([])
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [processingRequest, setProcessingRequest] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'requests' | 'notifications'>('requests')

    useEffect(() => {
        fetchNotifications()
        setupSocketListeners()

        return () => {
            if (socket) {
                socket.off('ride-request')
                socket.off('ride-request-notification')
                socket.off('emergency-alert')
                socket.off('ride-status-update')
            }
        }
    }, [socket])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            // In a real app, you'd fetch from an API
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    type: 'system',
                    title: 'Welcome to UberRescue',
                    message: 'You are now online and ready to receive ride requests',
                    timestamp: new Date().toISOString(),
                    read: false,
                    priority: 'medium'
                }
            ]
            setNotifications(mockNotifications)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const setupSocketListeners = () => {
        if (!socket) return

        // Listen for direct ride requests (assigned to this driver)
        socket.on('ride-request', (data) => {
            const newRequest: RideRequest = {
                id: `req-${Date.now()}`,
                rideId: data.rideId,
                pickupLocation: data.pickup,
                destinationLocation: data.destination,
                rideType: data.rideType,
                estimatedFare: data.estimatedFare,
                distance: data.distance || 0,
                rider: data.rider,
                timestamp: new Date().toISOString(),
                status: 'pending'
            }

            setRideRequests(prev => [newRequest, ...prev])

            // Add notification
            addNotification({
                type: 'ride_request',
                title: `New ${data.rideType === 'sos' ? 'EMERGENCY' : ''} Ride Request`,
                message: `${data.rider.name} needs a ride from ${data.pickup.address}`,
                data: newRequest,
                priority: data.rideType === 'sos' ? 'critical' : 'high'
            })

            // Play notification sound for emergency
            if (data.rideType === 'sos') {
                playNotificationSound()
            }
        })

        // Listen for broadcast ride requests (available to all drivers)
        socket.on('ride-request-notification', (data) => {
            const newRequest: RideRequest = {
                id: `broadcast-${Date.now()}`,
                rideId: data.rideId,
                pickupLocation: data.pickupLocation,
                destinationLocation: data.destinationLocation,
                rideType: data.rideType,
                estimatedFare: data.estimatedFare,
                distance: data.distance || 0,
                rider: data.rider,
                timestamp: new Date().toISOString(),
                status: 'pending'
            }

            setRideRequests(prev => [newRequest, ...prev])

            addNotification({
                type: 'ride_request',
                title: `${data.rideType === 'sos' ? '🚨 EMERGENCY' : '🚗'} Ride Available`,
                message: `${data.rider.name} is looking for a ${data.rideType === 'sos' ? 'emergency evacuation' : 'ride'}`,
                data: newRequest,
                priority: data.rideType === 'sos' ? 'critical' : 'medium'
            })
        })

        // Listen for emergency alerts
        socket.on('emergency-alert', (data) => {
            addNotification({
                type: 'emergency_alert',
                title: '🚨 Emergency Alert',
                message: data.message,
                data: data,
                priority: 'critical'
            })
        })

        // Listen for ride status updates
        socket.on('ride-status-update', (data) => {
            addNotification({
                type: 'ride_update',
                title: 'Ride Status Update',
                message: `Ride status changed to: ${data.status.replace('_', ' ')}`,
                data: data,
                priority: 'low'
            })
        })
    }

    const addNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const notification: Notification = {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
            ...notificationData
        }

        setNotifications(prev => [notification, ...prev])
    }

    const playNotificationSound = () => {
        // Create a simple beep sound for emergency notifications
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            oscillator.type = 'sine'
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)

            oscillator.start()
            oscillator.stop(audioContext.currentTime + 0.2)
        } catch (error) {
            console.log('Audio not supported')
        }
    }

    const acceptRideRequest = async (request: RideRequest) => {
        setProcessingRequest(request.id)
        try {
            // Update ride status to accepted
            await axios.patch(`/api/rides/${request.rideId}/status`, { status: 'accepted' })

            // Remove from pending requests
            setRideRequests(prev => prev.filter(req => req.id !== request.id))

            // Emit socket event to notify rider
            if (socket) {
                socket.emit('ride-request-response', {
                    rideId: request.rideId,
                    riderId: request.rider.id,
                    accepted: true,
                    driverId: user?.id,
                    estimatedArrival: Math.ceil(request.distance / 0.5) // Rough estimate
                })
            }

            toast.success('Ride request accepted! Redirecting to ride tracking...')

            // Navigate to ride tracking immediately
            setTimeout(() => {
                navigate(`/app/ride/${request.rideId}`)
            }, 1000)

        } catch (error: any) {
            console.error('Failed to accept ride:', error)
            toast.error(error.response?.data?.message || 'Failed to accept ride request')
        } finally {
            setProcessingRequest(null)
        }
    }

    const declineRideRequest = async (request: RideRequest) => {
        setProcessingRequest(request.id)
        try {
            // Remove from pending requests
            setRideRequests(prev => prev.filter(req => req.id !== request.id))

            // Emit socket event
            if (socket) {
                socket.emit('ride-request-response', {
                    rideId: request.rideId,
                    riderId: request.rider.id,
                    accepted: false,
                    driverId: user?.id
                })
            }

            toast.success('Ride request declined')

        } catch (error) {
            console.error('Failed to decline ride:', error)
            toast.error('Failed to decline ride request')
        } finally {
            setProcessingRequest(null)
        }
    }

    const markNotificationAsRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, read: true }
                    : notif
            )
        )
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-600 bg-red-100 border-red-200'
            case 'high': return 'text-orange-600 bg-orange-100 border-orange-200'
            case 'medium': return 'text-blue-600 bg-blue-100 border-blue-200'
            case 'low': return 'text-gray-600 bg-gray-100 border-gray-200'
            default: return 'text-gray-600 bg-gray-100 border-gray-200'
        }
    }

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date()
        const time = new Date(timestamp)
        const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

        if (diffInMinutes < 1) return 'Just now'
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
        return `${Math.floor(diffInMinutes / 1440)}d ago`
    }

    const pendingRequests = rideRequests.filter(req => req.status === 'pending')
    const unreadNotifications = notifications.filter(notif => !notif.read)

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Driver Notifications</h1>
                    <p className="text-gray-600">
                        Manage ride requests and stay updated with alerts
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-600">
                        {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Connection Status Alert */}
            {!connected && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                        <div>
                            <p className="font-medium text-red-900">Connection Lost</p>
                            <p className="text-sm text-red-700">
                                You're not receiving real-time notifications. Check your internet connection.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Ride Requests
                        {pendingRequests.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'notifications'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        All Notifications
                        {unreadNotifications.length > 0 && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {unreadNotifications.length}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Ride Requests Tab */}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
                            <p className="text-gray-600">
                                You'll see ride requests here when riders need your help
                            </p>
                        </div>
                    ) : (
                        pendingRequests.map((request) => (
                            <div
                                key={request.id}
                                className={`card border-l-4 ${request.rideType === 'sos'
                                        ? 'border-l-red-500 bg-red-50'
                                        : 'border-l-blue-500'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="flex items-center space-x-2 mb-3">
                                            {request.rideType === 'sos' ? (
                                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                            ) : (
                                                <Car className="h-5 w-5 text-blue-600" />
                                            )}
                                            <h3 className={`font-semibold ${request.rideType === 'sos' ? 'text-red-900' : 'text-gray-900'
                                                }`}>
                                                {request.rideType === 'sos' ? '🚨 EMERGENCY EVACUATION' : 'Ride Request'}
                                            </h3>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(request.timestamp)}
                                            </span>
                                        </div>

                                        {/* Rider Info */}
                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{request.rider.name}</p>
                                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{request.rider.phone}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trip Details */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-start space-x-2">
                                                <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Pickup</p>
                                                    <p className="text-sm text-gray-600">{request.pickupLocation.address}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Destination</p>
                                                    <p className="text-sm text-gray-600">{request.destinationLocation.address}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Trip Stats */}
                                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                                            <div className="flex items-center space-x-1">
                                                <Navigation className="h-4 w-4" />
                                                <span>{request.distance.toFixed(1)} km</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <DollarSign className="h-4 w-4" />
                                                <span>${request.estimatedFare.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Clock className="h-4 w-4" />
                                                <span>~{Math.ceil(request.distance / 0.5)} min</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col space-y-2 ml-4">
                                        <button
                                            onClick={() => acceptRideRequest(request)}
                                            disabled={processingRequest === request.id}
                                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${request.rideType === 'sos'
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {processingRequest === request.id ? (
                                                <LoadingSpinner size="sm" />
                                            ) : (
                                                <Check className="h-4 w-4" />
                                            )}
                                            <span>Accept</span>
                                        </button>
                                        <button
                                            onClick={() => declineRideRequest(request)}
                                            disabled={processingRequest === request.id}
                                            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <X className="h-4 w-4" />
                                            <span>Decline</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* All Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
                            <p className="text-gray-600">
                                You'll see all your notifications here
                            </p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`card cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 border-blue-200' : ''
                                    } ${getPriorityColor(notification.priority)}`}
                                onClick={() => markNotificationAsRead(notification.id)}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${notification.type === 'emergency_alert' ? 'bg-red-100' :
                                            notification.type === 'ride_request' ? 'bg-blue-100' :
                                                notification.type === 'ride_update' ? 'bg-green-100' :
                                                    'bg-gray-100'
                                        }`}>
                                        {notification.type === 'emergency_alert' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                                        {notification.type === 'ride_request' && <Car className="h-5 w-5 text-blue-600" />}
                                        {notification.type === 'ride_update' && <Shield className="h-5 w-5 text-green-600" />}
                                        {notification.type === 'system' && <Bell className="h-5 w-5 text-gray-600" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                            <span className="text-xs text-gray-500">
                                                {formatTimeAgo(notification.timestamp)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{notification.message}</p>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default DriverNotifications