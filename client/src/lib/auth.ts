import { apiRequest } from "./queryClient";
import { User, insertUserSchema } from "@shared/schema";
import { useState, useEffect } from "react";

export type AuthUser = Omit<User, "password">;

export async function loginUser(username: string, password: string): Promise<AuthUser> {
  const res = await apiRequest("POST", "/api/auth/login", { username, password });
  return await res.json();
}

export async function registerUser(
  username: string,
  password: string,
  email: string,
  firstName: string,
  lastName: string,
  phoneNumber?: string
): Promise<AuthUser> {
  const userData = {
    username,
    password,
    email,
    firstName,
    lastName,
    phoneNumber,
    role: "observer"
  };

  const res = await apiRequest("POST", "/api/auth/register", userData);
  return await res.json();
}

export async function logoutUser(): Promise<void> {
  try {
    await apiRequest("POST", "/api/auth/logout", {});
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/profile", {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setError(null);
      } else if (res.status === 401) {
        setUser(null);
      } else {
        throw new Error("Failed to fetch user");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      const user = await loginUser(username, password);
      setUser(user);
      setError(null);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    username: string,
    password: string,
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber?: string
  ) => {
    try {
      setLoading(true);
      const user = await registerUser(
        username,
        password,
        email,
        firstName,
        lastName,
        phoneNumber
      );
      setUser(user);
      setError(null);
      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await logoutUser();
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser: fetchUser,
  };
}
