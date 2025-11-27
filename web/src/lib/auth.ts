'use client';

import { apiClient } from './apiClient';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'teacher' | 'customer';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export const authService = {
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    this.setAuth(response);
    return response;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    this.setAuth(response);
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      this.clearAuth();
    }
  },

  async getCurrentUser(): Promise<{ user: User; profile?: any }> {
    return apiClient.get('/auth/me');
  },

  setAuth(auth: AuthResponse): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('user', JSON.stringify(auth.user));
  },

  clearAuth(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
