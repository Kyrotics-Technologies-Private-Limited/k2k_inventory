// models/membership.ts
export interface MembershipSettings {
  discountPercentage: number;
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  monthlyDuration: number; // in months
  quarterlyDuration: number; // in months
  yearlyDuration: number; // in months
  updatedAt: Date;
}
