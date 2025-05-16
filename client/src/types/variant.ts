export interface Variant {
    id: string;
    productId: string;
    weight: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }