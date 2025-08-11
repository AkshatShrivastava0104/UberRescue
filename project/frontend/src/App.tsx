import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RiderDashboard from './pages/RiderDashboard'
import DriverDashboard from './pages/DriverDashboard'
import DriverRegistration from './pages/DriverRegistration'
import RideBooking from './pages/RideBooking'
import RideTracking from './pages/RideTracking'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/app" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              
              {/* Rider routes */}
              <Route path="dashboard" element={
                <ProtectedRoute requiredRole="rider">
                  <RiderDashboard />
                </ProtectedRoute>
              } />
              
              {/* Driver routes */}
              <Route path="driver-dashboard" element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="driver-registration" element={
                <ProtectedRoute requiredRole="driver">
                  <DriverRegistration />
                </ProtectedRoute>
              } />
              
              {/* Shared routes */}
              <Route path="book-ride" element={
                <ProtectedRoute requiredRole="rider">
                  <RideBooking />
                </ProtectedRoute>
              } />
              
              <Route path="ride/:rideId" element={
                <ProtectedRoute>
                  <RideTracking />
                </ProtectedRoute>
              } />
              
              <Route path="analytics" element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } />
              
              <Route path="profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App