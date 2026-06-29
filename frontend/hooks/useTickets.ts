import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";

export interface Ticket {
  id: string;
  customer_id: string;
  brand_id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "medium" | "high" | "urgent";
  sentiment: "positive" | "neutral" | "negative";
  intent?: "complaint" | "query" | "refund" | "general" | null;
  assigned_agent_id?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  customer_name?: string | null;
  customer_email?: string | null;
  brand_name?: string | null;
}

export interface Message {
  id: string;
  ticket_id: string;
  sender: "customer" | "agent" | "ai";
  content: string;
  created_at?: string;
  timestamp?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CustomerProfile {
  id: string;
  name: string | null;
  email: string;
  created_at: string;
  total_tickets: number;
  csat: number | null;
}

interface TicketDetailResponse {
  ticket: Ticket;
  messages: Message[];
  customer_profile?: CustomerProfile | null;
}

export function useTickets() {
  const queryClient = useQueryClient();

  // Fetch list of tickets
  const useListTickets = (
    filters: {
      page?: number;
      limit?: number;
      status_filter?: string;
      priority_filter?: string;
      brand_filter?: string;
    },
    options?: { refetchInterval?: number }
  ) => {
    return useQuery<ApiResponse<Ticket[]>, Error>({
      queryKey: ["tickets", filters],
      queryFn: async () => {
        const params = new URLSearchParams();
        if (filters.page) params.append("page", filters.page.toString());
        if (filters.limit) params.append("limit", filters.limit.toString());
        if (filters.status_filter && filters.status_filter !== "all") {
          params.append("status_filter", filters.status_filter);
        }
        if (filters.priority_filter && filters.priority_filter !== "all") {
          params.append("priority_filter", filters.priority_filter);
        }
        if (filters.brand_filter && filters.brand_filter !== "all") {
          params.append("brand_filter", filters.brand_filter);
        }

        const response = await api.get(`${API_ROUTES.tickets.base}?${params.toString()}`);
        return response.data;
      },
      ...options,
    });
  };

  // Fetch single ticket details
  const useTicketDetails = (ticketId: string, options?: { refetchInterval?: number }) => {
    return useQuery<ApiResponse<TicketDetailResponse>, Error>({
      queryKey: ["ticket", ticketId],
      queryFn: async () => {
        const response = await api.get(API_ROUTES.tickets.detail(ticketId));
        return response.data;
      },
      enabled: !!ticketId,
      ...options,
    });
  };

  // Create new ticket
  const createTicketMutation = useMutation<ApiResponse<Ticket>, Error, { subject: string; brand_id: string; initial_message: string }>({
    mutationFn: async (payload) => {
      const response = await api.post(API_ROUTES.tickets.base, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket opened successfully!");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to create ticket."));
    },
  });

  // Update ticket attributes
  const updateTicketMutation = useMutation<ApiResponse<Ticket>, Error, { ticketId: string; status?: string; priority?: string; assigned_agent_id?: string | null }>({
    mutationFn: async ({ ticketId, ...payload }) => {
      const response = await api.put(API_ROUTES.tickets.detail(ticketId), payload);
      return response.data;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      toast.success("Ticket details updated!");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to update ticket."));
    },
  });

  // Delete ticket
  const deleteTicketMutation = useMutation<ApiResponse<{ ticket_id: string }>, Error, string>({
    mutationFn: async (ticketId) => {
      const response = await api.delete(API_ROUTES.tickets.detail(ticketId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket archived successfully.");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to delete ticket."));
    },
  });

  // Upload attachment
  const uploadAttachmentMutation = useMutation<ApiResponse<{ filename: string; url: string }>, Error, { ticketId: string; file: File; caption?: string }>({
    mutationFn: async ({ ticketId, file, caption }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (caption) {
        formData.append("caption", caption);
      }
      const response = await api.post(API_ROUTES.tickets.attachments(ticketId), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      toast.success("Attachment uploaded successfully!");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Attachment upload failed."));
    },
  });

  // Send Agent Reply Message
  const sendAgentReplyMutation = useMutation<
    ApiResponse<Message>,
    Error,
    { ticketId: string; content: string },
    { previousDetails?: ApiResponse<TicketDetailResponse>; ticketId: string }
  >({
    mutationFn: async ({ ticketId, content }) => {
      const response = await api.post(`/tickets/${ticketId}/reply`, { content });
      return response.data;
    },
    onMutate: async ({ ticketId, content }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["ticket", ticketId] });

      // Snapshot previous value
      const previousDetails = queryClient.getQueryData<ApiResponse<TicketDetailResponse>>(["ticket", ticketId]);

      // Optimistically append the agent message
      if (previousDetails) {
        const optimisticMsg: Message = {
          id: `temp-${Date.now()}`,
          ticket_id: ticketId,
          sender: "agent",
          content: content,
          created_at: new Date().toISOString(),
        };

        queryClient.setQueryData<ApiResponse<TicketDetailResponse>>(["ticket", ticketId], {
          ...previousDetails,
          data: {
            ...previousDetails.data,
            messages: [...previousDetails.data.messages, optimisticMsg],
          },
        });
      }

      return { previousDetails, ticketId };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousDetails && context.ticketId) {
        queryClient.setQueryData(["ticket", context.ticketId], context.previousDetails);
      }
      toast.error(getApiErrorMessage(error, "Failed to send reply."));
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return {
    useListTickets,
    useTicketDetails,
    createTicket: createTicketMutation.mutateAsync,
    isCreating: createTicketMutation.isPending,
    updateTicket: updateTicketMutation.mutateAsync,
    isUpdating: updateTicketMutation.isPending,
    deleteTicket: deleteTicketMutation.mutateAsync,
    isDeleting: deleteTicketMutation.isPending,
    uploadAttachment: uploadAttachmentMutation.mutateAsync,
    isUploading: uploadAttachmentMutation.isPending,
    sendAgentReply: sendAgentReplyMutation.mutateAsync,
    isSendingReply: sendAgentReplyMutation.isPending,
  };
}
