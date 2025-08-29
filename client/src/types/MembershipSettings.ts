// models/membership.ts
export interface Membership {
  id: string;
  type: string;
  description: string;
  price: number;
  duration: number; // in months
  discountPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMembershipInput {
  type: string;
  description: string;
  price: number;
  duration: number;
  discountPercentage: number;
}

export interface UpdateMembershipInput {
  type?: string;
  description?: string;
  price?: number;
  duration?: number;
  discountPercentage?: number;
}

export interface UserMembership {
  id: string;
  active: boolean;
  isMember: boolean;
  membershipEnd: Date | { _seconds: number; _nanoseconds: number };
  purchasedAt: Date;
  expiresAt: Date;
  membershipType: string;
  discountPercentage: number;
  cancelledAt?: Date;
}
