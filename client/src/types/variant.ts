export interface Variant {
  id: string;
  productId: string;
  weight: string;
  price: number; // Non-member price (e.g. ₹96)
  originalPrice?: number; // MRP (e.g. ₹100)
  discount?: number; // Non-member discount % (e.g. 4%)
  memberPrice?: number; // KP Member price (e.g. ₹80)
  memberDiscount?: number; // KP Member discount % (e.g. 20%)
  gstPercentage?: number; // GST percentage for tax calculation
  inStock: boolean;
  units_in_stock: number;
  createdAt?: Date;
  updatedAt?: Date;
}