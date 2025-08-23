import api from "./api";

export interface outOfStockVariants {
  product: string;
  variant: string;
  image?: string | null;
}

export interface StockVariant {
  product: string;
  variant: string;
  unitsInStock: number;
  image?: string | null;
}

export interface DashboardStatsResponse {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyOrders: number;
  totalOrders: number;
  totalCustomers: number;
  orderStatusCounts: {
    placed: number;
    delivered: number;
    cancelled: number;
  };
  revenueChart: {
    date: string;
    revenue: number;
  }[];
  outOfStockVariants: outOfStockVariants[];
  bestsellersLast3Months: { productId: string; productName: string; totalSold: number; image?: string | null }[];
  top5BestsellersLast3Months: { productId: string; productName: string; totalSold: number; image?: string | null }[];
  quickSellersLastWeek: { productId: string; productName: string; totalSold: number; image?: string | null; variants?: { variantId: string; variantName: string; totalSold: number }[] }[];
  leastSellersLast3Months: { productId: string; productName: string; totalSold: number; image?: string | null }[];
  slowMoversLastWeek: { productId: string; productName: string; totalSold: number; image?: string | null; variants?: { variantId: string; variantName: string; totalSold: number }[] }[];
  lowStockVariants: StockVariant[];
  overstockVariants: StockVariant[];
  demandingProducts: { productId: string; productName: string; image?: string | null; lastWeekSales: number; percentile: number }[];
}

// API call function
export const fetchDashboardStats =
  async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<DashboardStatsResponse>(
      "/dashboard/stats"
    );
    return response.data;
  };
