import axios from "axios";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://127.0.0.1:8000" : undefined);

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is required for production builds.");
}

const api = axios.create({
  baseURL: API_URL.replace(/\/$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Token if available
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const authStorage = localStorage.getItem("resolveiq-auth");
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          const token = parsed.state?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Error parsing auth storage token:", error);
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthenticated and global exceptions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      if (typeof window !== "undefined") {
        // Clear token and redirect to login
        localStorage.removeItem("resolveiq-auth");
        const pathname = window.location.pathname;
        if (
          pathname !== "/login" &&
          pathname !== "/register" &&
          pathname !== "/" &&
          !pathname.startsWith("/portal")
        ) {
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
