export interface Category {
  id: string;
  name: string;
  urlLinkName: string;
  slug?: string; // Kept for API compatibility
  image?: string;
  key?: string;
  parentCategoryId?: string | null;
  level?: number;
  sortOrder?: number;
  nextProductOrder?: number;
  showInMenu?: boolean;
  showOnHomepage?: boolean;
  showInFooter?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  rank?: number;
  previousUrlLinkNames?: string[];
  previousSlugs?: string[]; // Kept for API compatibility
  createdBy?: string;
  updatedBy?: string;
  children?: Category[];
}

export interface CategoryMembership {
  productId: string;
  sortOrder: number;
  isFeatured: boolean;
  addedAt?: string;
}

export interface CategoryProduct {
  id: string;
  name: string;
  urlLinkName?: string;
  slug?: string; // Kept for API compatibility
  image?: string;
  images?: { main?: string; gallery?: string[]; banner?: string };
  isBestseller?: boolean;
  status?: string;
  membership: CategoryMembership;
}

export interface CategoryFormData {
  name: string;
  urlLinkName: string;
  image?: string;
  sortOrder?: number;
  showInMenu: boolean;
  showOnHomepage: boolean;
  showInFooter: boolean;
  isFeatured: boolean;
  rank?: number;
}

export interface ReorderItem {
  id: string;
  sortOrder: number;
}

export interface ProductReorderItem {
  productId: string;
  sortOrder: number;
}
