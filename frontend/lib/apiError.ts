export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as { response?: { data?: { message?: string; detail?: string } } }).response;
    return response?.data?.message || response?.data?.detail || fallback;
  }

  return fallback;
}
