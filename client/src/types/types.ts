// types.ts
export interface UserProfile {
  id: string;
  name: string;
  role: "Farmer" | "Buyer" | "Supplier" | "Agribusiness";
  location: string;
  joinDate: string;
  isVerified: boolean;
  businessName?: string;
  specialization: string[];
  description: string;
  contact: {
    phone: string;
    email: string;
  };
  rating: number;
  reviews: number;
  productsListed?: number;
  ordersCompleted?: number;
  trustScore: "High" | "Medium" | "Low";
  certifications?: string[];
  socialLinks?: {
    linkedIn?: string;
    instagram?: string;
    website?: string;
  };
}