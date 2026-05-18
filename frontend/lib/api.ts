"use client";

import axios from "axios";
import { clearSession, getSession, saveSession } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const session = getSession();
    if (error.response?.status === 401 && session?.refreshToken && !original._retry) {
      original._retry = true;
      try {
        const { data } = await api.post("/api/auth/refresh", { refreshToken: session.refreshToken });
        saveSession({ ...session, accessToken: data.accessToken, refreshToken: data.refreshToken });
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearSession();
      }
    }
    return Promise.reject(error);
  }
);

export { api };
