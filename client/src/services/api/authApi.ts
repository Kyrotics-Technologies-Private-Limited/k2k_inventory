// src/services/api/authApi.ts
import type { AdminSignupInput, AdminLoginResponse } from "../../types/user";

// API instance with proper base URL
import api from './api'; // Using the existing configured axios instance

// Admin Signup API
export const adminSignup = async (data: AdminSignupInput) => {
  try {
    const response = await api.post('/auth/admin/signup', data);
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    return response.data; // { message, uid }
  } catch (error: any) {
    console.error('Admin signup error:', error);
    // Extract the error message from the response if available
    const errorMessage = error.response?.data?.error || error.message || 'Signup failed';
    throw new Error(errorMessage);
  }
};

// Admin Login API (takes Firebase ID token)
export const adminLogin = async (idToken: string) => {
  try {
    const response = await api.post<AdminLoginResponse>('/auth/admin/login', {
      idToken,
    });
    return response.data; // { message, token }
  } catch (error: any) {
    console.error('Admin login error:', error);
    throw error;
  }
};
