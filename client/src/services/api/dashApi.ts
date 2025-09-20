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
  revenueCustomers: number;
  orderStatusCounts: {
    placed: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    returned: number;
  };
  revenueByCategory: Record<string, number>;
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
export const fetchDashboardStats = async (
  startDate?: string,
  endDate?: string
): Promise<DashboardStatsResponse> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const queryString = params.toString();
  const url = `/dashboard/stats${queryString ? `?${queryString}` : ''}`;
  
  const response = await api.get<DashboardStatsResponse>(url);
  return response.data;
};
