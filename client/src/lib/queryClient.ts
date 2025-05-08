import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

interface ApiRequestOptions {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  multipart?: boolean;
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any,
  options?: { 
    multipart?: boolean;
    formData?: boolean;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const isMultipart = options?.multipart ?? false;
  const isFormData = options?.formData ?? false;
  
  // Create headers object
  const headers = new Headers();
  
  // Add user headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.append(key, value);
    });
  }
  
  // Don't set Content-Type for multipart/form-data requests
  // Let the browser set it automatically with the boundary parameter
  if (!isMultipart && !isFormData && data && !(data instanceof FormData)) {
    headers.append("Content-Type", "application/json");
  }
  
  const requestBody = isMultipart || isFormData || data instanceof FormData
    ? data
    : data ? JSON.stringify(data) 
    : undefined;
  
  const res = await fetch(url, {
    method,
    headers,
    body: requestBody,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Only refetch when window is focused and the query is stale
      refetchOnWindowFocus: 'always',
      // Use a more balanced stale time of 5 minutes for most queries instead of Infinity
      staleTime: 5 * 60 * 1000,
      // Add garbage collection time to improve performance
      gcTime: 10 * 60 * 1000, // Keep inactive query data for 10 minutes
      // Retry failed queries 1 time after a 1 second delay
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: false,
    },
  },
});
