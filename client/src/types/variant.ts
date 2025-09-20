export interface Variant {
    id: string;
    productId: string;
    weight: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    gstPercentage?: number; // GST percentage for tax calculation
    inStock: boolean;
    units_in_stock: number;
    createdAt?: Date;
    updatedAt?: Date;
  }