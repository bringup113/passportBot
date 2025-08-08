import axios from 'axios';

const http = axios.create({
  baseURL: (import.meta as any).env.VITE_API_BASE || 'http://localhost:3000',
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url: string = err.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(err);
    }
    return Promise.reject(err);
  },
);

export default http;
