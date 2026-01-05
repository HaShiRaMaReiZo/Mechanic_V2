import { authAPI } from './api';

export const isAuthenticated = () => {
  return authAPI.isAuthenticated();
};

export const requireAuth = () => {
  if (typeof window !== 'undefined' && !isAuthenticated()) {
    window.location.href = '/login';
  }
};

export const logout = () => {
  authAPI.logout();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

