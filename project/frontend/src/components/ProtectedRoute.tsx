import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: 'rider' | 'driver'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard if wrong role
    const redirectPath = user.role === 'driver' ? '/app/driver-dashboard' : '/app/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute