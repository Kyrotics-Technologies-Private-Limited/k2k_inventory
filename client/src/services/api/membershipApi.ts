import api from './api';
import type { MembershipSettings } from '../../types/MembershipSettings';

export const membershipApi = {
  getMembershipSettings: async (): Promise<MembershipSettings | null> => {
    try {
      const response = await api.get('/membership/settings');
      return response.data;
    } catch (error) {
      console.error('Error getting membership settings:', error);
      // Depending on your api helper, error handling might differ
      return null;
    }
  },

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
};
