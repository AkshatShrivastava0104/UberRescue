import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'rider' | 'driver';
  driverProfile?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'rider' | 'driver';
  emergencyContact?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const driverToken = localStorage.getItem('driver_token');
  const riderToken = localStorage.getItem('rider_token');

  const [token, setToken] = useState<string | null>(driverToken || riderToken);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Force axios to use HTTPS if available
  useEffect(() => {
    const baseURL = import.meta.env.VITE_API_URL || window.location.origin;

    const finalURL = baseURL.startsWith('https')
      ? baseURL
      : `https://${baseURL.replace(/^http:\/\//, '')}`;

    axios.defaults.baseURL = finalURL;
    axios.defaults.timeout = 12000;

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }

    console.log('✅ Axios Base URL:', axios.defaults.baseURL);
  }, [token]);

  // ✅ Load saved session on refresh
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser && !token && !user) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // ✅ Validate session
  useEffect(() => {
    const checkAuth = async () => {
      if (!token || token === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/api/auth/me');
        setUser(response.data.user);
      } catch (error: any) {
        console.error('Auth failed:', error.response?.data || error.message);

        // ✅ Do NOT logout on network error — only on proper 401 response
        if (error.response?.status === 401) {
          localStorage.removeItem('driver_token');
          localStorage.removeItem('rider_token');
          setToken(null);
          toast.error('Session expired. Login again.');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  // ✅ Save token & user only when set
  if (token) localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));

  // ✅ LOGIN
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data } = await axios.post('/api/auth/login', { email, password });

      setToken(data.token);
      setUser(data.user);

      const key = data.user.role === 'driver' ? 'driver_token' : 'rider_token';
      localStorage.setItem(key, data.token);

      toast.success('Logged in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ REGISTER
  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      const { data } = await axios.post('/api/auth/register', userData);

      setToken(data.token);
      setUser(data.user);

      const key = data.user.role === 'driver' ? 'driver_token' : 'rider_token';
      localStorage.setItem(key, data.token);

      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('driver_token');
    localStorage.removeItem('rider_token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setToken(null);
    setUser(null);
    toast.success('Logged out');
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...userData } : prev));
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
