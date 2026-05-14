// import { Variant } from "./variant";

export interface Product {
  id: string;
  name: string;
  price: {
    amount: number;
    currency: "INR";

  };
  description: string;
  shortDescription?: string;
  // ingredients: string[];
  origin: string;
  sku: string;
  warehouseName: string;
  categories?: string[]; // Array of category names
  categoryIds?: string[]; // Array of category IDs
  category?: string; // Single category name
  categoryId?: string; // Single category ID
  images: {
    main: string;
    gallery: string[];
    banner: string;
  };
  isBestseller?: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  ratings: number;
  reviews: number;
  badges: {
    text: string;
    type?: "organic" | "natural" | "premium" | "limited";
    image?: string; // Optional image URL for badge
  }[];
  healthBadges?: {
    image?: string;
    title: string;
    description: string;
  }[];
  benefits: {
    title: string;
    description: string;
    icon: string;
  }[];
  /** Firestore `productCategory` root doc id (server-owned linking) */
  traceabilityDocId?: string;
  /** Sequentially generated ID for traceability (e.g. "001") */
  productCategoryId?: string;
  /** Inventory product schema version for migrations */
  schemaVersion?: number;
}


export type SortOption = "price_high" | "price_low" | "popularity" | "newest";

export interface CartItem extends Product {
  quantity: number;
  selectedVariant: number;
}

export interface FilterState {
  category: string[];
  priceRange: [number, number];
  availability: ("in_stock" | "low_stock")[];
  searchQuery: string;
  sortBy: SortOption;
}

export interface ProductVariant {
  weight: string;
  price: number;
  inStock: boolean;
  originalPrice?: number;
  discount?: number;
}