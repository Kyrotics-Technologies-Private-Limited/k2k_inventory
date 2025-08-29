import api from './api';
import type { Membership, CreateMembershipInput, UpdateMembershipInput, UserMembership } from '../../types/MembershipSettings';

export const membershipApi = {
  // Create a new membership
  createMembership: async (membership: CreateMembershipInput): Promise<Membership> => {
    try {
      const response = await api.post('/membership', membership);
      return response.data;
    } catch (error) {
      console.error('Error creating membership:', error);
      throw error;
    }
  },

  // Get all memberships
  getMemberships: async (): Promise<Membership[]> => {
    try {
      const response = await api.get('/membership');
      return response.data;
    } catch (error) {
      console.error('Error getting memberships:', error);
      return [];
    }
  },

  // Get a single membership by ID
  getMembership: async (membershipId: string): Promise<Membership | null> => {
    try {
      const response = await api.get(`/membership/${membershipId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting membership:', error);
      return null;
    }
  },

  // Update a membership
  updateMembership: async (membershipId: string, updates: UpdateMembershipInput): Promise<Membership> => {
    try {
      const response = await api.put(`/membership/${membershipId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating membership:', error);
      throw error;
    }
  },

  // Delete a membership
  deleteMembership: async (membershipId: string): Promise<void> => {
    try {
      await api.delete(`/membership/${membershipId}`);
    } catch (error) {
      console.error('Error deleting membership:', error);
      throw error;
    }
  },

  // Buy membership (for a user)
  buyMembership: async (userId: string, membershipId: string): Promise<any> => {
    try {
      const response = await api.post('/membership/buy', { userId, membershipId });
      return response.data;
    } catch (error) {
      console.error('Error buying membership:', error);
      throw error;
    }
  },

  // Cancel membership (for a user)
  cancelMembership: async (userId: string, membershipId: string): Promise<any> => {
    try {
      const response = await api.post('/membership/cancel', { userId, membershipId });
      return response.data;
    } catch (error) {
      console.error('Error cancelling membership:', error);
      throw error;
    }
  },

  // Get user's active memberships
  getUserMemberships: async (userId: string): Promise<UserMembership[]> => {
    try {
      const response = await api.get(`/membership/user/${userId}`);
      console.log("response", response);
      return response.data;
    } catch (error) {
      console.error('Error getting user memberships:', error);
      return [];
    }
  },
};
