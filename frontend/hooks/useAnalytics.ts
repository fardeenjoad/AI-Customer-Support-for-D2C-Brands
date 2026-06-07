import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ROUTES } from "@/lib/constants";
import { toast } from "sonner";
import { Ticket } from "./useTickets";

export interface FAQ {
  question: string;
  answer: string;
}

export interface Brand {
  id: string;
  brand_name: string;
  faqs: FAQ[];
  tone: "formal" | "casual";
  email_config?: Record<string, any> | null;
  custom_greeting?: string | null;
}

export interface AnalyticsData {
  brand_name: string;
  total_tickets: number;
  total_today: number;
  total_week: number;
  total_month: number;
  avg_resolution_time_hours: number | null;
  tickets_by_status: Record<string, number>;
  tickets_by_sentiment: Record<string, number>;
  most_common_intents: Record<string, number>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export function useAnalytics() {
  const queryClient = useQueryClient();

  // Fetch admin dashboard analytics KPIs
  const useGetAnalytics = (brandId?: string) => {
    return useQuery<ApiResponse<AnalyticsData>, Error>({
      queryKey: ["admin-analytics", brandId],
      queryFn: async () => {
        const url = brandId && brandId !== "all" 
          ? `${API_ROUTES.admin.analytics}?brand_id=${brandId}` 
          : API_ROUTES.admin.analytics;
        const response = await api.get(url);
        return response.data;
      },
    });
  };

  // Fetch overdue alerts (unresolved tickets > 24 hours)
  const useGetAlerts = (filters?: { page?: number; limit?: number }) => {
    return useQuery<ApiResponse<Ticket[]>, Error>({
      queryKey: ["admin-alerts", filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters?.page) params.append("page", filters.page.toString());
        if (filters?.limit) params.append("limit", filters.limit.toString());
        
        const response = await api.get(`${API_ROUTES.admin.alerts}?${params.toString()}`);
        return response.data;
      },
    });
  };

  // Fetch registered D2C brand configs list
  const useBrands = (filters?: { page?: number; limit?: number }) => {
    return useQuery<ApiResponse<Brand[]>, Error>({
      queryKey: ["admin-brands", filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters?.page) params.append("page", filters.page.toString());
        if (filters?.limit) params.append("limit", filters.limit.toString());
        
        const response = await api.get(`${API_ROUTES.admin.brands}?${params.toString()}`);
        return response.data;
      },
    });
  };

  // Fetch details for a single brand
  const useBrandDetail = (brandId: string) => {
    return useQuery<ApiResponse<Brand>, Error>({
      queryKey: ["admin-brand", brandId],
      queryFn: async () => {
        const response = await api.get(API_ROUTES.admin.brandDetail(brandId));
        return response.data;
      },
      enabled: !!brandId,
    });
  };

  // Create brand config
  const createBrandMutation = useMutation<ApiResponse<Brand>, Error, Omit<Brand, "id">>({
    mutationFn: async (payload) => {
      const response = await api.post(API_ROUTES.admin.brands, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Brand registered successfully!");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Failed to create brand.";
      toast.error(msg);
    },
  });

  // Update brand config
  const updateBrandMutation = useMutation<ApiResponse<Brand>, Error, { brandId: string; payload: Partial<Omit<Brand, "id">> }>({
    mutationFn: async ({ brandId, payload }) => {
      const response = await api.put(API_ROUTES.admin.brandDetail(brandId), payload);
      return response.data;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      queryClient.invalidateQueries({ queryKey: ["admin-brand", variables.brandId] });
      toast.success("Brand updated successfully!");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Failed to update brand.";
      toast.error(msg);
    },
  });

  // Delete brand config
  const deleteBrandMutation = useMutation<ApiResponse<{ brand_id: string }>, Error, string>({
    mutationFn: async (brandId) => {
      const response = await api.delete(API_ROUTES.admin.brandDetail(brandId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Brand deleted successfully.");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Failed to delete brand.";
      toast.error(msg);
    },
  });

  // Assign agent to ticket mutation
  const assignAgentMutation = useMutation<ApiResponse<Ticket>, Error, { ticketId: string; agentId: string }>({
    mutationFn: async ({ ticketId, agentId }) => {
      const response = await api.post(API_ROUTES.admin.assign, { ticket_id: ticketId, agent_id: agentId });
      return response.data;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Agent assigned successfully!");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Failed to assign agent.";
      toast.error(msg);
    },
  });

  return {
    useGetAnalytics,
    useGetAlerts,
    useBrands,
    useBrandDetail,
    createBrand: createBrandMutation.mutateAsync,
    isCreatingBrand: createBrandMutation.isPending,
    updateBrand: updateBrandMutation.mutateAsync,
    isUpdatingBrand: updateBrandMutation.isPending,
    deleteBrand: deleteBrandMutation.mutateAsync,
    isDeletingBrand: deleteBrandMutation.isPending,
    assignAgent: assignAgentMutation.mutateAsync,
    isAssigning: assignAgentMutation.isPending,
  };
}
