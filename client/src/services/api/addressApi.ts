import api from './api'; // your custom fetch wrapper
import type { Address } from '../../types/address';

export const addressApi = {
  getAll: async (): Promise<Address[]> => {
    const res = await api.get('/addresses');
    return res.data;
  },

  getById: async (id: string): Promise<Address> => {
    const res = await api.get(`/addresses/${id}`);
    return res.data;
  },

  create: async (address: Omit<Address, 'id' | 'userId' | 'createdAt'>): Promise<Address> => {
    const res = await api.post('/addresses', address);
    return res.data;
  },

  update: async (id: string, address: Partial<Address>): Promise<void> => {
    await api.put(`/addresses/${id}`, address);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/addresses/${id}`);
  },

  setDefault: async (id: string): Promise<void> => {
    await api.put(`/addresses/${id}/default`);
  }
};
