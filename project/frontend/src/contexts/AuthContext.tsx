"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import axios from "axios"
import toast from "react-hot-toast"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: "rider" | "driver"
  driverProfile?: any
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
  role: "rider" | "driver"
  emergencyContact?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

const setAxiosToken = (token: string | null) => {
  if (token && token !== "undefined") {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    console.log("✅ Authorization header set")
  } else {
    delete axios.defaults.headers.common["Authorization"]
    console.log("✅ Authorization header removed")
  }
}

const setupAxiosInterceptor = () => {
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("auth_token")
      if (token && token !== "undefined") {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("auth_token")
        localStorage.removeItem("auth_user")
        window.location.href = "/login"
      }
      return Promise.reject(error)
    },
  )
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setupAxiosInterceptor()

    const baseURL = process.env.VITE_API_URL || window.location.origin
    const finalURL = baseURL.startsWith("https") ? baseURL : `https://${baseURL.replace(/^http:\/\//, "")}`

    axios.defaults.baseURL = finalURL
    axios.defaults.timeout = 12000

    console.log("✅ Axios Base URL:", axios.defaults.baseURL)
  }, [])

  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("auth_user")

    if (savedToken && savedUser) {
      setTokenState(savedToken)
      setUser(JSON.parse(savedUser))
      setAxiosToken(savedToken)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      if (!token || token === "undefined") {
        setLoading(false)
        return
      }

      try {
        const response = await axios.get("/api/auth/me")
        setUser(response.data.user)
      } catch (error: any) {
        console.error("Auth validation failed:", error.response?.data || error.message)

        if (error.response?.status === 401) {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("auth_user")
          setTokenState(null)
          setUser(null)
          setAxiosToken(null)
          toast.error("Session expired. Please login again.")
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [token])

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("auth_token", newToken)
      setAxiosToken(newToken)
    } else {
      localStorage.removeItem("auth_token")
      setAxiosToken(null)
    }
    setTokenState(newToken)
  }

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data } = await axios.post("/api/auth/login", { email, password })

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem("auth_user", JSON.stringify(data.user))

      toast.success("Logged in successfully!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      setLoading(true)
      const { data } = await axios.post("/api/auth/register", userData)

      setToken(data.token)
      setUser(data.user)
      localStorage.setItem("auth_user", JSON.stringify(data.user))

      toast.success("Registration successful!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setToken(null)
    setUser(null)
    setAxiosToken(null)
    toast.success("Logged out successfully")
  }

  const updateUser = (userData: Partial<User>) => {
    const updatedUser = user ? { ...user, ...userData } : null
    setUser(updatedUser)
    if (updatedUser) {
      localStorage.setItem("auth_user", JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
