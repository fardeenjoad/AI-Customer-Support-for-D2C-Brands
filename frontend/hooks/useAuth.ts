import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuthStore, User } from "@/store/authStore";
import { API_ROUTES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: setLoginStore, logout: setLogoutStore, user } = useAuthStore();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch active user profile
  const useMe = (enabled = false) => {
    return useQuery<ApiResponse<User>, Error>({
      queryKey: ["auth-me"],
      queryFn: async () => {
        const response = await api.get(API_ROUTES.auth.me);
        return response.data;
      },
      enabled,
    });
  };

  // Privy Login mutation
  const privyLoginMutation = useMutation<ApiResponse<LoginResponse>, Error, { token: string }>({
    mutationFn: async ({ token }) => {
      const response = await api.post("/auth/privy-login", { token });
      return response.data;
    },
    onMutate: () => {
      setIsRedirecting(false);
    },
    onSuccess: async (res) => {
      const token = res.data.access_token;
      
      try {
        const decoded = parseJwt(token);
        if (!decoded || !decoded.user_id || !decoded.email || !decoded.role) {
          throw new Error("Token payload is missing user details.");
        }

        const meUser: User = {
          id: decoded.user_id,
          email: decoded.email,
          role: decoded.role,
          brand_id: decoded.brand_id || null,
        };

        // Save full logged state
        setLoginStore(meUser, token);
        toast.success("Welcome back to ResolveIQ!");

        // Redirect based on role
        const destination = meUser.role === "customer" ? "/portal" : "/dashboard";
        setIsRedirecting(true);
        router.prefetch(destination);
        router.replace(destination);
      } catch (err: any) {
        setIsRedirecting(false);
        toast.error("Failed to parse user details from login token.");
      }
    },
    onError: (error: any) => {
      setIsRedirecting(false);
      toast.error(getApiErrorMessage(error, "Failed to authenticate via Privy."));
    },
  });

  // Login mutation
  const loginMutation = useMutation<ApiResponse<LoginResponse>, Error, any>({
    mutationFn: async (credentials) => {
      const response = await api.post(API_ROUTES.auth.login, credentials);
      return response.data;
    },
    onMutate: () => {
      setIsRedirecting(false);
    },
    onSuccess: async (res) => {
      const token = res.data.access_token;
      
      try {
        const decoded = parseJwt(token);
        if (!decoded || !decoded.user_id || !decoded.email || !decoded.role) {
          throw new Error("Token payload is missing user details.");
        }

        const meUser: User = {
          id: decoded.user_id,
          email: decoded.email,
          role: decoded.role,
          brand_id: decoded.brand_id || null,
        };

        // Save full logged state
        setLoginStore(meUser, token);
        toast.success("Welcome back to ResolveIQ!");

        // Redirect based on role
        const destination = meUser.role === "customer" ? "/portal" : "/dashboard";
        setIsRedirecting(true);
        router.prefetch(destination);
        router.replace(destination);
      } catch (err: any) {
        setIsRedirecting(false);
        toast.error("Failed to parse user details from login token.");
      }
    },
    onError: (error: any) => {
      setIsRedirecting(false);
      toast.error(getApiErrorMessage(error, "Invalid email or password."));
    },
  });

  // Register mutation
  const registerMutation = useMutation<ApiResponse<User>, Error, any>({
    mutationFn: async (registerData) => {
      const response = await api.post(API_ROUTES.auth.register, registerData);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Account created successfully! Please log in.");
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, "Registration failed."));
    },
  });

  // Logout function
  const logout = () => {
    setLogoutStore();
    queryClient.clear();
    toast.info("Logged out successfully.");
    router.push("/login");
  };

  return {
    useMe,
    login: loginMutation.mutate,
    privyLogin: privyLoginMutation.mutate,
    isLoggingIn: loginMutation.isPending || privyLoginMutation.isPending || isRedirecting,
    isRedirecting,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
    user,
  };
}
