// import { Variant } from "./variant";

export interface Product {
    id: string;
    name: string;
    price: {
      amount: number;
      currency: "INR";
     
    };
    description: string;
    // ingredients: string[];
    origin: string;
    sku: string;
    warehouseName: string;
    category: "ghee" | "oils" | "honey";
    images: {
      main: string;
      gallery: string[];
      banner:string;
    };
    stockStatus: "in_stock" | "low_stock" | "out_of_stock";
    ratings: number;
    reviews: number;
    badges: {
      text: string;
      type?: "organic" | "natural" | "premium" | "limited";
      image?: string; // Optional image URL for badge
    }[];
    benefits: {
      title: string;
      description: string;
      icon: string;
    }[];
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