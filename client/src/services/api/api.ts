// src/services/api.ts
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import type { AxiosResponse } from 'axios';
import { auth } from '../firebase/firebase'; // Adjust the import path as necessary

// Create axios instance
const api = axios.create({
  // Use a relative URL for the API base URL
  // baseURL: import.meta.env.REACT_APP_API_URL || 'http://192.168.1.44:5566/api',
  baseURL: `${import.meta.env.VITE_BACKEND_URL}/api` || '/api' ,
  // baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // Handle token refreshing if needed
    if (error.response?.status === 401 && originalRequest) {
      try {
        // Force token refresh
        const user = auth.currentUser;
        if (user) {
          await user.getIdToken(true);
          
          // Retry the original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${await user.getIdToken()}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
