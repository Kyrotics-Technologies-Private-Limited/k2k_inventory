import axios from "axios";

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
}

// API call function
export const fetchDashboardStats =
  async (): Promise<DashboardStatsResponse> => {
    const response = await axios.get<DashboardStatsResponse>(
      "http://localhost:5567/api/dashboard/stats"
    );
    return response.data;
  };
