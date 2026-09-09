import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterData, LocationUpdateData, Article, Transaction, CreateTransactionData, UpdateTransactionData, UserStats, BreederStats } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: async (data: RegisterData): Promise<User> => {
    const response = await api.post('/auth/register', data);
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<User> => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if server request fails
    }
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/users/profile', data);
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  updateLocation: async (data: LocationUpdateData): Promise<User> => {
    const response = await api.put('/users/location', data);
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  updateProfileImage: async (imageBase64: string): Promise<User> => {
    const response = await api.put('/users/profile-image', { image_base64: imageBase64 });
    await AsyncStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },
};

// Articles API
export const articlesAPI = {
  getAll: async (category?: string): Promise<Article[]> => {
    const params = category ? { category } : {};
    const response = await api.get('/articles', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Article> => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },
};

// Transactions API
export const transactionsAPI = {
  create: async (data: CreateTransactionData): Promise<Transaction> => {
    const response = await api.post('/transactions', data);
    return response.data;
  },

  getMyTransactions: async (status?: string): Promise<Transaction[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/transactions', { params });
    return response.data;
  },

  getPending: async (): Promise<Transaction[]> => {
    const response = await api.get('/transactions/pending');
    return response.data;
  },

  getBreederTransactions: async (status?: string): Promise<Transaction[]> => {
    const params = status ? { status } : {};
    const response = await api.get('/transactions/breeder', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    const response = await api.put(`/transactions/${id}/status`, data);
    return response.data;
  },
};

// Stats API
export const statsAPI = {
  getUserStats: async (): Promise<UserStats | BreederStats> => {
    const response = await api.get('/stats/user');
    return response.data;
  },
};

export default api;
