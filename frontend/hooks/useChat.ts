import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { API_ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/apiError";
import { toast } from "sonner";
import { Message } from "./useTickets";

interface ChatMessageSend {
  brand_id: string;
  message: string;
  ticketId?: string;
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
  const useGetChatHistory = (ticketId: string, enabled = true, options?: { refetchInterval?: number }) => {
    return useQuery<ApiResponse<Message[]>, Error>({
      queryKey: ["chat-history", ticketId],
      queryFn: async () => {
        const response = await api.get(API_ROUTES.chat.history(ticketId));
        return response.data;
      },
      enabled: enabled && !!ticketId,
      staleTime: options?.refetchInterval ? 0 : 30000, // Disable caching when polling
      ...options,
    });
  };

  // Send chatbot query
  const sendChatMessageMutation = useMutation<
    ApiResponse<ChatMessageResponse>,
    Error,
    ChatMessageSend,
    { previousHistory?: ApiResponse<Message[]>; ticketId: string }
  >({
    mutationFn: async (payload) => {
      // Strip ticketId from payload so we don't send extra fields to the backend
      const { brand_id, message } = payload;
      const response = await api.post(API_ROUTES.chat.base, { brand_id, message });
      return response.data;
    },
    onMutate: async (newChatMsg) => {
      const { ticketId, message } = newChatMsg;
      if (!ticketId) return { previousHistory: undefined, ticketId: "" };

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["chat-history", ticketId] });

      // Snapshot previous value
      const previousHistory = queryClient.getQueryData<ApiResponse<Message[]>>(["chat-history", ticketId]);

      // Optimistically append the customer message
      if (previousHistory) {
        const optimisticMsg: Message = {
          id: `temp-${Date.now()}`,
          ticket_id: ticketId,
          sender: "customer",
          content: message,
          created_at: new Date().toISOString(),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        queryClient.setQueryData<ApiResponse<Message[]>>(["chat-history", ticketId], {
          ...previousHistory,
          data: [...previousHistory.data, optimisticMsg],
        });
      }

      return { previousHistory, ticketId };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousHistory && context.ticketId) {
        queryClient.setQueryData(["chat-history", context.ticketId], context.previousHistory);
      }
      toast.error(getApiErrorMessage(error, "Failed to send message."));
    },
    onSuccess: (res) => {
      const { escalated } = res.data;
      if (escalated) {
        toast.warning("Escalated to human support queue.");
      }
    },
    onSettled: (data, error, variables) => {
      const tId = data?.data?.ticket_id || variables.ticketId;
      if (tId) {
        queryClient.invalidateQueries({ queryKey: ["chat-history", tId] });
        queryClient.invalidateQueries({ queryKey: ["ticket", tId] });
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      }
    },
  });

  return {
    useGetChatHistory,
    sendChatMessage: sendChatMessageMutation.mutateAsync,
    isSending: sendChatMessageMutation.isPending,
  };
}
