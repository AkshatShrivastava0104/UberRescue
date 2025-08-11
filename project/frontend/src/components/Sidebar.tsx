import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  Car, 
  MapPin, 
  BarChart3, 
  User, 
  AlertTriangle,
  Shield,
  Route
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const { user } = useAuth()

  const riderNavItems = [
    { to: '/app/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/app/book-ride', icon: Car, label: 'Book Ride' },
    { to: '/app/analytics', icon: BarChart3, label: 'My Trips' },
    { to: '/app/profile', icon: User, label: 'Profile' },
  ]

  const driverNavItems = [
    { to: '/app/driver-dashboard', icon: Shield, label: 'Driver Hub' },
    { to: '/app/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/app/profile', icon: User, label: 'Profile' },
  ]

  const navItems = user?.role === 'driver' ? driverNavItems : riderNavItems

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-6">
        <nav className="space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Emergency section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Emergency
          </h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 text-warning-500" />
              <span>Active Hazards</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Route className="h-4 w-4 text-success-500" />
              <span>Safe Routes</span>
            </div>
          </div>
        </div>

        {/* User role indicator */}
        <div className="mt-8 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Active as
          </div>
          <div className="mt-1 flex items-center space-x-2">
            {user?.role === 'driver' ? (
              <Shield className="h-4 w-4 text-primary-600" />
            ) : (
              <User className="h-4 w-4 text-secondary-600" />
            )}
            <span className="text-sm font-medium text-gray-900 capitalize">
              {user?.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar