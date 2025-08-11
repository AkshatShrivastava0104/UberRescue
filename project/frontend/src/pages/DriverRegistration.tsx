import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Car, FileText, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import axios from 'axios'

const DriverRegistration: React.FC = () => {
  const [formData, setFormData] = useState({
    licenseNumber: '',
    vehicleType: 'sedan',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear(),
    licensePlate: '',
    emergencyEquipment: ['first_aid_kit', 'fire_extinguisher', 'emergency_blankets']
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const { updateUser } = useAuth()
  const navigate = useNavigate()

  const vehicleTypes = [
    { value: 'sedan', label: 'Sedan' },
    { value: 'suv', label: 'SUV' },
    { value: 'truck', label: 'Truck' },
    { value: 'van', label: 'Van' }
  ]

  const emergencyEquipmentOptions = [
    { value: 'first_aid_kit', label: 'First Aid Kit' },
    { value: 'fire_extinguisher', label: 'Fire Extinguisher' },
    { value: 'emergency_blankets', label: 'Emergency Blankets' },
    { value: 'flashlight', label: 'Flashlight' },
    { value: 'water_bottles', label: 'Water Bottles' },
    { value: 'emergency_radio', label: 'Emergency Radio' }
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors.length > 0) {
      setErrors([])
    }
  }

  const handleEquipmentChange = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyEquipment: prev.emergencyEquipment.includes(equipment)
        ? prev.emergencyEquipment.filter(item => item !== equipment)
        : [...prev.emergencyEquipment, equipment]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setIsLoading(true)

    try {
      await axios.post('/api/drivers/complete-profile', formData)
      
      // Update user context to reflect driver profile completion
      updateUser({ driverProfile: formData })
      
      navigate('/app/driver-dashboard')
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors.map((err: any) => err.msg))
      } else {
        setErrors([error.response?.data?.message || 'Registration failed. Please try again.'])
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Car className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Complete Driver Registration
        </h1>
        <p className="text-gray-600">
          Provide your vehicle and license information to start helping people in emergencies
        </p>
      </div>

      {/* Registration Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  {errors.map((error, index) => (
                    <p key={index} className="text-red-800">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* License Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>License Information</span>
            </h3>
            
            <div>
              <label htmlFor="licenseNumber" className="label">
                Driver's License Number
              </label>
              <input
                id="licenseNumber"
                name="licenseNumber"
                type="text"
                required
                value={formData.licenseNumber}
                onChange={handleChange}
                className="input"
                placeholder="Enter your license number"
              />
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Car className="h-5 w-5" />
              <span>Vehicle Information</span>
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicleType" className="label">
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vehicleYear" className="label">
                  Year
                </label>
                <input
                  id="vehicleYear"
                  name="vehicleYear"
                  type="number"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  required
                  value={formData.vehicleYear}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="vehicleMake" className="label">
                  Make
                </label>
                <input
                  id="vehicleMake"
                  name="vehicleMake"
                  type="text"
                  required
                  value={formData.vehicleMake}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Toyota, Honda, Ford"
                />
              </div>

              <div>
                <label htmlFor="vehicleModel" className="label">
                  Model
                </label>
                <input
                  id="vehicleModel"
                  name="vehicleModel"
                  type="text"
                  required
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g., Camry, Accord, F-150"
                />
              </div>
            </div>

            <div>
              <label htmlFor="licensePlate" className="label">
                License Plate Number
              </label>
              <input
                id="licensePlate"
                name="licensePlate"
                type="text"
                required
                value={formData.licensePlate}
                onChange={handleChange}
                className="input"
                placeholder="Enter your license plate"
              />
            </div>
          </div>

          {/* Emergency Equipment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Emergency Equipment</span>
            </h3>
            <p className="text-sm text-gray-600">
              Select the emergency equipment you have in your vehicle
            </p>

            <div className="grid md:grid-cols-2 gap-3">
              {emergencyEquipmentOptions.map(equipment => (
                <label
                  key={equipment.value}
                  className="flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.emergencyEquipment.includes(equipment.value)}
                    onChange={() => handleEquipmentChange(equipment.value)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {equipment.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Safety Commitment</p>
                <p>
                  By completing this registration, you commit to prioritizing passenger safety,
                  following emergency protocols, and maintaining your vehicle in good condition.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Completing Registration...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Complete Registration</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Next Steps */}
      <div className="card bg-green-50 border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-2">What's Next?</h3>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Your registration will be reviewed within 24 hours</li>
          <li>• You'll receive an email confirmation once approved</li>
          <li>• Start helping people evacuate safely from disaster zones</li>
          <li>• Earn money while making a difference in emergency situations</li>
        </ul>
      </div>
    </div>
  )
}

export default DriverRegistration