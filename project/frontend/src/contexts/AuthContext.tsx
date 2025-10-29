import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'


interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'rider' | 'driver'
  driverProfile?: any
  driverToken: string | null
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  loading: boolean
  updateUser: (userData: Partial<User>) => void
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone: string
  role: 'rider' | 'driver'
  emergencyContact?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // 🔥 FIXED — Load both role tokens
  const driverToken = localStorage.getItem('driver_token')
  const riderToken = localStorage.getItem('rider_token')

  const [token, setToken] = useState<string | null>(driverToken || riderToken)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Axios setup
  useEffect(() => {
    axios.defaults.baseURL = import.meta.env.VITE_API_URL;
    axios.defaults.timeout = 10000

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }

    console.log('Axios configured for:', {
      baseURL: axios.defaults.baseURL,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token'
    })
  }, [token])


  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          console.log('Checking authentication...')
          const response = await axios.get('https://98.84.159.27:3001/api/auth/me')
          console.log('Auth check successful:', response.data)
          setUser(response.data.user)
        } catch (error: any) {
          console.error('Auth check failed:', error.response?.data || error.message)
          if (error.code === 'ERR_NETWORK') {
            toast.error('Cannot connect to server. Please check if backend is running.')
          } else {
            // 🔥 FIXED — remove all role tokens if invalid
            localStorage.removeItem('driver_token')
            localStorage.removeItem('rider_token')
            setToken(null)
          }
          toast.error('Session expired. Please login again.')
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  // ==============================
  // 🔥 FIXED: LOGIN FUNCTION
  // ==============================
  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting login for:', email)
      const response = await axios.post(`https://98.84.159.27:3001/api/auth/login`, { email, password })
      const { token: newToken, user: userData } = response.data

      setToken(newToken)
      setUser(userData)

      // 🔥 Store token per role
      const key = userData.role === 'driver' ? 'driver_token' : 'rider_token'
      localStorage.setItem(key, newToken)

      console.log(`Login successful for: ${userData.email} (${userData.role})`)
      toast.success('Login successful!')
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message)
      let message = 'Login failed'
      if (error.code === 'ERR_NETWORK') {
        message = 'Cannot connect to server. Please check if backend is running.'
      } else if (error.response?.data?.message) {
        message = error.response.data.message
      }
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ==============================
  // 🔥 FIXED: REGISTER FUNCTION
  // ==============================
  const register = async (userData: RegisterData) => {
    try {
      setLoading(true)
      console.log('Attempting registration for:', userData.email)
      const response = await axios.post(`https://98.84.159.27:3001/api/auth/register`, userData)
      const { token: newToken, user: newUser } = response.data

      setToken(newToken)
      setUser(newUser)

      // 🔥 Store token per role
      const key = newUser.role === 'driver' ? 'driver_token' : 'rider_token'
      localStorage.setItem(key, newToken)

      console.log(`Registration successful for: ${newUser.email} (${newUser.role})`)
      toast.success('Registration successful!')
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message)
      let message = 'Registration failed'
      if (error.code === 'ERR_NETWORK') {
        message = 'Cannot connect to server. Please check if backend is running.'
      } else if (error.response?.data?.message) {
        message = error.response.data.message
      }
      toast.error(message)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // ==============================
  // 🔥 FIXED: LOGOUT FUNCTION
  // ==============================
  const logout = () => {
    if (user?.role === 'driver') {
      localStorage.removeItem('driver_token')
    } else if (user?.role === 'rider') {
      localStorage.removeItem('rider_token')
    } else {
      // fallback in case user is null
      localStorage.removeItem('driver_token')
      localStorage.removeItem('rider_token')
    }

    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']

    console.log('User logged out')
    toast.success('Logged out successfully')
  }

  // Update user info
  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : prev))
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
