import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  emitLocationUpdate: (latitude: number, longitude: number) => void
  emitAvailabilityUpdate: (isAvailable: boolean, isOnline: boolean) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user, token } = useAuth()

  useEffect(() => {
    if (user && token) {
      // Connect to socket server
      const newSocket = io('http://localhost:3001', {
        extraHeaders: {
          Authorization: `Bearer ${token}`
        },
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        upgrade: false,
        timeout: 20000,
        forceNew: true
      })

      setSocket(newSocket)

      // Connection event handlers
      newSocket.on('connect', () => {
        setConnected(true)
        console.log('Connected to UberRescue server')
      })

      newSocket.on('disconnect', () => {
        setConnected(false)
        console.log('Disconnected from server')
      })

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error)
        setConnected(false)
        toast.error('Connection failed - Backend server may be down')
      })

      // Welcome message
      newSocket.on('connected', (data) => {
        console.log('Welcome message:', data)
      })

      // Ride-related events
      newSocket.on('ride-request', (data) => {
        toast.success(`New ride request from ${data.rider.name}!`, {
          duration: 8000,
          style: {
            background: '#059669',
            color: 'white',
          }
        })
        // Handle ride request notification
      })

      newSocket.on('ride-request-notification', (data) => {
        if (user?.role === 'driver') {
          toast(`New ${data.rideType === 'sos' ? 'EMERGENCY' : ''} ride request nearby!`, {
            duration: 10000,
            style: {
              background: data.rideType === 'sos' ? '#DC2626' : '#3B82F6',
              color: 'white',
            }
          })
        }
      })

      newSocket.on('ride-status-update', (data) => {
        toast(`Ride status updated: ${data.status}`)
        // Handle ride status update
      })

      newSocket.on('ride-request-response', (data) => {
        if (data.accepted) {
          toast.success('Driver accepted your ride!')
        } else {
          toast.error('Driver declined your ride')
        }
      })

      // Location and driver updates
      newSocket.on('driver-location-update', (data) => {
        // Handle real-time driver location updates
        console.log('Driver location update:', data)
      })

      newSocket.on('driver-availability-update', (data) => {
        // Handle driver availability changes
        console.log('Driver availability update:', data)
      })

      // Emergency and hazard alerts
      newSocket.on('emergency-alert', (data) => {
        toast.error(`Emergency Alert: ${data.message}`, {
          duration: 8000,
          style: {
            background: '#DC2626',
            color: 'white',
          }
        })
      })

      newSocket.on('hazard-update', () => {
        toast("Some message", {
          icon: "⚠️",
          style: { background: "#FACC15", color: "#000" }
        });

      })

      return () => {
        newSocket.close()
        setSocket(null)
        setConnected(false)
      }
    } else {
      // Clean up socket if no user/token
      if (socket) {
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user, token])

  const emitLocationUpdate = (latitude: number, longitude: number) => {
    if (socket && connected) {
      socket.emit('update-location', { latitude, longitude })
    }
  }

  const emitAvailabilityUpdate = (isAvailable: boolean, isOnline: boolean) => {
    if (socket && connected) {
      socket.emit('driver-availability', { isAvailable, isOnline })
    }
  }

  const value: SocketContextType = {
    socket,
    connected,
    emitLocationUpdate,
    emitAvailabilityUpdate
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
