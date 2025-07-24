import api from "./api";

export interface outOfStockVariants {
  product: string;
  variant: string;
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
}

// API call function
export const fetchDashboardStats =
  async (): Promise<DashboardStatsResponse> => {
    const response = await api.get<DashboardStatsResponse>(
      "/dashboard/stats"
    );
    return response.data;
  };
