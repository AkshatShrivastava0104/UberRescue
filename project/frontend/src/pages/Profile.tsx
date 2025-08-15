import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  User, 
  Phone, 
  Mail, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Camera,
  AlertTriangle,
  Car,
  Star,
  MapPin
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'
import toast from 'react-hot-toast'

interface ProfileData {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'rider' | 'driver'
  emergencyContact?: string
  profileImage?: string
  driverProfile?: {
    id: string
    licenseNumber: string
    vehicleType: string
    vehicleMake: string
    vehicleModel: string
    vehicleYear: number
    licensePlate: string
    rating: number
    totalTrips: number
    isAvailable: boolean
    isOnline: boolean
    emergencyEquipment: string[]
  }
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    emergencyContact: ''
  })

  useEffect(() => {
    fetchProfile()
    // Also fetch driver profile if user is a driver
    if (user?.role === 'driver') {
      fetchDriverProfile()
    }
  }, [])

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get('/api/drivers/profile')
      if (response.data.driver) {
        setProfile(prev => prev ? {
          ...prev,
          driverProfile: response.data.driver
        } : prev)
      }
    } catch (error) {
      console.error('Failed to fetch driver profile:', error)
    }
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/auth/me')
      const userData = response.data.user
      setProfile(userData)
      setFormData({
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        emergencyContact: userData.emergencyContact || ''
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      // Don't show error toast, just log it
      console.log('Profile fetch failed, user might need to login again')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await axios.put('/api/auth/profile', formData)
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...formData } : prev)
      updateUser({ ...formData })
      
      setEditing(false)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        emergencyContact: profile.emergencyContact || ''
      })
    }
    setEditing(false)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile Not Found</h2>
        <p className="text-gray-600">Unable to load profile information.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
        
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="btn-outline flex items-center space-x-2"
          >
            <Edit3 className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="card text-center">
            {/* Profile Image */}
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-gray-200 hover:bg-gray-50">
                <Camera className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              {profile.firstName} {profile.lastName}
            </h2>
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${
                profile.role === 'driver' ? 'bg-green-500' : 'bg-blue-500'
              }`} />
              <span className="text-sm text-gray-600 capitalize">{profile.role}</span>
            </div>

            {/* Driver Stats */}
            {profile.role === 'driver' && profile.driverProfile && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rating</span>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{profile.driverProfile.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Trips</span>
                  <span className="font-medium">{profile.driverProfile.totalTrips}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`badge ${
                    profile.driverProfile.isOnline 
                      ? 'badge-success' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.driverProfile.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
              {editing && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancel}
                    className="btn-outline text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                  >
                    {saving ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                {editing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="input"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{profile.firstName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Last Name</label>
                {editing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{profile.lastName}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Email Address</label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{profile.email}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="label">Phone Number</label>
                {editing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="label">Emergency Contact</label>
                {editing ? (
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Emergency contact phone number"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-gray-500" />
                    <span>{profile.emergencyContact || 'Not set'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Driver Information */}
          {profile.role === 'driver' && profile.driverProfile && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Driver Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">License Number</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span>{profile.driverProfile.licenseNumber}</span>
                  </div>
                </div>

                <div>
                  <label className="label">Vehicle Type</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span className="capitalize">{profile.driverProfile.vehicleType}</span>
                  </div>
                </div>

                <div>
                  <label className="label">Vehicle Make & Model</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span>
                      {profile.driverProfile.vehicleMake} {profile.driverProfile.vehicleModel} ({profile.driverProfile.vehicleYear})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="label">License Plate</label>
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{profile.driverProfile.licensePlate}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Equipment */}
              <div className="mt-4">
                <label className="label">Emergency Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {profile.driverProfile.emergencyEquipment.map((equipment, index) => (
                    <span key={index} className="badge badge-info">
                      {equipment.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Account Security */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Password</p>
                  <p className="text-sm text-gray-600">Last updated 30 days ago</p>
                </div>
                <button className="btn-outline">Change Password</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
                <button className="btn-outline">Enable 2FA</button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-900">Delete Account</p>
                  <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                </div>
                <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile