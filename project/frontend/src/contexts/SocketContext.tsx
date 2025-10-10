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
      console.log('Initializing Socket.IO connection...');
      // Connect to socket server - fix for import.meta.env TypeScript error
      const socketUrl = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:3001';
      console.log('Connecting to Socket.IO server:', socketUrl);

      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        upgrade: true,
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: 5,
        autoConnect: true
      })

      setSocket(newSocket)

      // Connection event handlers
      newSocket.on('connect', () => {
        setConnected(true)
        console.log('✅ Connected to UberRescue server via', newSocket.io.engine.transport.name);
        // Remove the persistent "Connected to server" toast
        // toast.success('Connected to server', { duration: 2000 });
      })

      newSocket.on('disconnect', (reason) => {
        setConnected(false)
        console.log('❌ Disconnected from server:', reason);
        toast('Disconnected from server', {
          duration: 3000,
          style: { background: '#f59e0b', color: 'white' }
        });
      })

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
        setConnected(false)
        if (error.message.includes('ECONNREFUSED')) {
          toast.error('Backend server is not running on port 3001');
        } else {
          toast.error(`Connection failed: ${error.message}`);
        }
      })

      newSocket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        toast.success('Reconnected to server', { duration: 2000 });
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection failed:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect after maximum attempts');
        toast.error('Failed to reconnect to server');
      });

      // Transport upgrade
      newSocket.on('upgrade', () => {
        console.log('🔄 Upgraded to', newSocket.io.engine.transport.name);
      });

      // Welcome message
      newSocket.on('connected', (data) => {
        console.log('📨 Welcome message:', data);
      })

      // Ride-related events
      newSocket.on('ride-request', (data) => {
        const isEmergency = data.rideType === 'sos'
        toast.success(`${isEmergency ? '🚨 EMERGENCY' : '🚗'} New ride request from ${data.rider.name}!`, {
          duration: 8000,
          style: {
            background: isEmergency ? '#DC2626' : '#059669',
            color: 'white',
          }
        })
      })

      newSocket.on('ride-request-notification', (data) => {
        if (user?.role === 'driver') {
          const isEmergency = data.rideType === 'sos'
          toast(`${isEmergency ? '🚨 EMERGENCY' : '🚗'} New ride request nearby!`, {
            duration: 10000,
            style: {
              background: isEmergency ? '#DC2626' : '#3B82F6',
              color: 'white',
            }
          })
        }
      })

      newSocket.on('ride-status-update', (data) => {
        toast(`Ride status: ${data.status.replace('_', ' ')}`)
      })

      // Listen for analytics updates
      newSocket.on('analytics-update', (data) => {
        console.log('Analytics update received:', data)
        // Trigger analytics refresh in components that need it
        window.dispatchEvent(new CustomEvent('analytics-update', { detail: data }))
      })

      // Listen for ride accepted events
      newSocket.on('ride-accepted', (data) => {
        toast.success(`Driver ${data.driver.name} accepted your ride!`, {
          duration: 6000,
          style: {
            background: '#059669',
            color: 'white',
          }
        })
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
        console.log('Driver location update:', data)
      })

      newSocket.on('driver-availability-update', (data) => {
        console.log('Driver availability update:', data)
      })

      // Emergency and hazard alerts
      newSocket.on('emergency-alert', (data) => {
        toast.error(`🚨 Emergency Alert: ${data.message}`, {
          duration: 8000,
          style: {
            background: '#DC2626',
            color: 'white',
          }
        })
      })

      newSocket.on('hazard-update', (data) => {
        toast(`⚠️ Hazard Update: ${data.name} - ${data.description}`, {
          duration: 6000,
          style: {
            background: '#F59E0B',
            color: 'white',
          }
        })
      })

      return () => {
        console.log('🔌 Cleaning up socket connection...');
        newSocket.close()
        setSocket(null)
        setConnected(false)
      }
    } else {
      // Clean up socket if no user/token
      if (socket) {
        console.log('🔌 Socket cleaned up (no user/token)');
        socket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user, token])

  const emitLocationUpdate = (latitude: number, longitude: number) => {
    if (socket && connected) {
      socket.emit('update-location', { latitude, longitude })
      console.log('📍 Location update sent:', { latitude, longitude });
    } else {
      console.warn('⚠️ Cannot emit location update - socket not connected');
    }
  }

  const emitAvailabilityUpdate = (isAvailable: boolean, isOnline: boolean) => {
    if (socket && connected) {
      socket.emit('driver-availability', { isAvailable, isOnline })
      console.log('🚗 Availability update sent:', { isAvailable, isOnline });
    } else {
      console.warn('⚠️ Cannot emit availability update - socket not connected');
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