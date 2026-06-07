import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useAuthStore, User } from "@/store/authStore";
import { API_ROUTES } from "@/lib/constants";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { login: setLoginStore, logout: setLogoutStore, user } = useAuthStore();

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

  // Login mutation
  const loginMutation = useMutation<ApiResponse<LoginResponse>, Error, any>({
    mutationFn: async (credentials) => {
      const response = await api.post(API_ROUTES.auth.login, credentials);
      return response.data;
    },
    onSuccess: async (res) => {
      const token = res.data.access_token;
      
      // Temporary token storage to fetch user details
      localStorage.setItem(
        "resolveiq-auth",
        JSON.stringify({ state: { token, user: null, isAuthenticated: false } })
      );

      try {
        // Fetch profile detail
        const meRes = await api.get(API_ROUTES.auth.me);
        const meUser: User = meRes.data.data;
        
        // Save full logged state
        setLoginStore(meUser, token);
        toast.success("Welcome back to ResolveIQ!");

        // Redirect based on role
        if (meUser.role === "customer") {
          router.push("/portal");
        } else {
          router.push("/dashboard");
        }
      } catch (err: any) {
        localStorage.removeItem("resolveiq-auth");
        toast.error("Failed to retrieve user profile after login.");
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || "Invalid email or password.";
      toast.error(msg);
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
      const msg = error.response?.data?.detail || "Registration failed.";
      toast.error(msg);
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
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout,
    user,
  };
}
