import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { Shield, Wifi, WifiOff, User, LogOut } from 'lucide-react'

const Navbar: React.FC = () => {
  const { user, logout } = useAuth()
  const { connected } = useSocket()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-16">
      <div className="flex items-center justify-between h-full px-6">
        {/* Logo */}
        <Link to="/app/dashboard" className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-danger-600" />
          <span className="text-xl font-bold text-gray-900">UberRescue</span>
        </Link>

        {/* Center - Connection Status */}
        <div className="flex items-center space-x-2">
          {connected ? (
            <div className="flex items-center space-x-1 text-success-600">
              <Wifi className="h-4 w-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 text-danger-600">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Disconnected</span>
            </div>
          )}
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="badge badge-info">{user?.role}</span>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar