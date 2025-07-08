export interface Variant {
    id: string;
    productId: string;
    weight: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    units_in_stock: number;
    createdAt?: Date;
    updatedAt?: Date;
  }