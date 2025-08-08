import api from './api';
import type { MembershipSettings } from '../../types/MembershipSettings';

export const membershipApi = {
  // Get membership settings
  getMembershipSettings: async (): Promise<MembershipSettings | null> => {
    try {
      const response = await api.get('/membership/settings');
      return response.data;
    } catch (error) {
      console.error('Error getting membership settings:', error);
      return null;
    }
  },

  // Update membership settings
  updateMembershipSettings: async (
    settings: Partial<MembershipSettings>
  ): Promise<void> => {
    try {
      await api.put('/membership/settings', settings);
    } catch (error) {
      console.error('Error updating membership settings:', error);
      throw error;
    }
  },

  // Create a new membership type
  createMembership: async (membership: any): Promise<any> => {
    try {
      const response = await api.post('/membership', membership);
      return response.data;
    } catch (error) {
      console.error('Error creating membership:', error);
      throw error;
    }
  },

  // Get all memberships
  getMemberships: async (): Promise<any[]> => {
    try {
      const response = await api.get('/membership');
      return response.data;
    } catch (error) {
      console.error('Error getting memberships:', error);
      return [];
    }
  },

  // Delete a membership type
  deleteMembership: async (membershipId: string): Promise<void> => {
    try {
      await api.delete(`/membership/${membershipId}`);
    } catch (error) {
      console.error('Error deleting membership:', error);
      throw error;
    }
  },

  // Update a membership type
  updateMembership: async (membershipId: string, updates: any): Promise<any> => {
    try {
      const response = await api.put(`/membership/${membershipId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating membership:', error);
      throw error;
    }
  },

  // Buy membership (for a user)
  buyMembership: async (userId: string, membershipId: string): Promise<any> => {
    try {
      const response = await api.post(`/membership/buy`, { userId, membershipId });
      return response.data;
    } catch (error) {
      console.error('Error buying membership:', error);
      throw error;
    }
  },

  // Cancel membership (for a user)
  cancelMembership: async (userId: string, membershipId: string): Promise<any> => {
    try {
      const response = await api.post(`/membership/cancel`, { userId, membershipId });
      return response.data;
    } catch (error) {
      console.error('Error cancelling membership:', error);
      throw error;
    }
  },
};
