import * as React from 'react';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterData, LocationUpdateData } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  updateLocation: (data: LocationUpdateData) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        // Verify token is still valid
        try {
          const profile = await authAPI.getProfile();
          setUser(profile);
        } catch (error) {
          // Token invalid, clear storage
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const userData = await authAPI.login(credentials);
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const userData = await authAPI.register(data);
    setUser(userData);
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authAPI.updateProfile(data);
    setUser(updatedUser);
  };

  const updateLocation = async (data: LocationUpdateData) => {
    const updatedUser = await authAPI.updateLocation(data);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const profile = await authAPI.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        updateLocation,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
