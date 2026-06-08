import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Message } from "./useTickets";

interface ChatMessageSend {
  brand_id: string;
  message: string;
}

interface ChatMessageResponse {
  reply: string;
  ticket_id: string;
  status: string;
  escalated: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export function useChat() {
  const queryClient = useQueryClient();

  // Fetch chatbot thread history (updates on-demand via query invalidation after messages are sent)
  const useGetChatHistory = (ticketId: string, enabled = true) => {
    return useQuery<ApiResponse<Message[]>, Error>({
      queryKey: ["chat-history", ticketId],
      queryFn: async () => {
        const response = await api.get(API_ROUTES.chat.history(ticketId));
        return response.data;
      },
      enabled: enabled && !!ticketId,
      staleTime: 30000, // Cache for 30s, refetch only on invalidation
    });
  };

  // Send chatbot query
  const sendChatMessageMutation = useMutation<ApiResponse<ChatMessageResponse>, Error, ChatMessageSend>({
    mutationFn: async (payload) => {
      const response = await api.post(API_ROUTES.chat.base, payload);
      return response.data;
    },
    onSuccess: (res) => {
      const { ticket_id, escalated } = res.data;
      queryClient.invalidateQueries({ queryKey: ["chat-history", ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticket_id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      if (escalated) {
        toast.warning("Escalated to human support queue.");
      }
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Failed to send message."));
    },
  });

  return {
    useGetChatHistory,
    sendChatMessage: sendChatMessageMutation.mutateAsync,
    isSending: sendChatMessageMutation.isPending,
  };
}
