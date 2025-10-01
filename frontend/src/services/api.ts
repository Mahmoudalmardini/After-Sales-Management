import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, LoginResponse, Request, DashboardStats, CustomRequestStatus } from '../types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    ? 'http://127.0.0.1:3001/api'
    : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already on the login page
      const currentPath = window.location.pathname;
      
      // Don't redirect if this is an auth verification request (token check)
      const isAuthVerification = error.config?.url?.includes('/auth/verify') || 
                                error.config?.url?.includes('/auth/profile');
      
      if (!isAuthVerification) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!currentPath.startsWith('/login')) {
          // Preserve path for post-login return
          sessionStorage.setItem('postLoginRedirect', currentPath + window.location.search);
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Generic API response handler
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (!response.data.success) {
    throw new Error(response.data.message || 'Request failed');
  }
  return response.data.data as T;
};

// Generic error handler
const handleError = (error: any): never => {
  if (error.response?.data?.message) {
    // Handle specific error codes
    if (error.response.status === 403) {
      throw new Error('No permissions. Please consult your administrator.');
    }
    throw new Error(error.response.data.message);
  } else if (error.message) {
    throw new Error(error.message);
  } else {
    throw new Error('An unexpected error occurred');
  }
};

// Auth API
export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    try {
      console.log('Making login API call to:', api.defaults.baseURL + '/auth/login');
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', { username, password });
      console.log('API response:', response);
      return handleResponse<LoginResponse>(response);
    } catch (error) {
      console.error('API error:', error);
      throw handleError(error);
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  updateProfile: async (data: any) => {
    try {
      const response = await api.put('/auth/profile', data);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  changePassword: async (data: any) => {
    try {
      const response = await api.put('/auth/change-password', data);
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    try {
      const response = await api.get('/auth/notifications', { params });
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
  markNotificationRead: async (id: number) => {
    try {
      const response = await api.post(`/auth/notifications/${id}/read`);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
  markAllNotificationsRead: async () => {
    try {
      const response = await api.post('/auth/notifications/read-all');
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
  
  restoreAdmin: async () => {
    try {
      const response = await api.post('/auth/restore-admin');
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Requests API
export const requestsAPI = {
  getRequests: async (params?: any): Promise<{ data: { requests: Request[] }, meta?: any }> => {
    try {
      const response = await api.get('/requests', { params });
      return response.data as { data: { requests: Request[] }, meta?: any };
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  getRequestById: async (id: number): Promise<{ request: Request }> => {
    try {
      const response = await api.get(`/requests/${id}`);
      return handleResponse<{ request: Request }>(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  createRequest: async (data: any): Promise<{ request: Request }> => {
    try {
      const response = await api.post('/requests', data);
      return handleResponse<{ request: Request }>(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  updateRequestStatus: async (id: number, data: any) => {
    try {
      const response = await api.put(`/requests/${id}/status`, data);
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  assignTechnician: async (id: number, technicianId: number) => {
    try {
      const response = await api.put(`/requests/${id}/assign`, { technicianId });
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },

  addCost: async (id: number, data: any) => {
    try {
      const response = await api.post(`/requests/${id}/costs`, data);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  closeRequest: async (id: number, data: any) => {
    try {
      const response = await api.put(`/requests/${id}/close`, data);
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },
};

// Status API
export const statusAPI = {
  getCustomStatuses: async (): Promise<{ statuses: CustomRequestStatus[] }> => {
    try {
      const response = await api.get('/statuses');
      return handleResponse<{ statuses: CustomRequestStatus[] }>(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  getCustomStatusById: async (id: number): Promise<{ status: CustomRequestStatus }> => {
    try {
      const response = await api.get(`/statuses/${id}`);
      return handleResponse<{ status: CustomRequestStatus }>(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  createCustomStatus: async (data: Partial<CustomRequestStatus>) => {
    try {
      const response = await api.post('/statuses', data);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  updateCustomStatus: async (id: number, data: Partial<CustomRequestStatus>) => {
    try {
      const response = await api.put(`/statuses/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },

  deleteCustomStatus: async (id: number) => {
    try {
      const response = await api.delete(`/statuses/${id}`);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Customers API
export const customersAPI = {
  getCustomers: async (params?: any) => {
    try {
      const response = await api.get('/customers', { params });
      return response.data;
    } catch (error) {
      throw handleError(error);
    }
  },

  createCustomer: async (data: any) => {
    try {
      const response = await api.post('/customers', data);
      return handleResponse(response);
    } catch (error) {
      throw handleError(error);
    }
  },
};

// Products API
export const productsAPI = {
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/products', { params });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  createProduct: async (data: any) => {
    try {
      const response = await api.post('/products', data);
      return handleResponse(response);
    } catch (error) {
      handleError(error);
    }
  },
};

// Departments API
export const departmentsAPI = {
  getDepartments: async () => {
    try {
      const response = await api.get('/departments');
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: any) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
  
  createUser: async (userData: any) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
  
  updateUser: async (id: number, userData: any) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
  
  deleteUser: async (id: number) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
  
  changeUserPassword: async (id: number, newPassword: string) => {
    try {
      const response = await api.put(`/users/${id}/password`, { newPassword });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async (params?: any): Promise<{ data: DashboardStats }> => {
    try {
      const response = await api.get('/dashboard/stats', { params });
      return response.data as { data: DashboardStats };
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
};

// Export API
export const exportAPI = {
  exportAllRequests: async (): Promise<Blob> => {
    try {
      const response = await api.get('/export/requests/all', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  exportRequestsByStatus: async (status: string): Promise<Blob> => {
    try {
      const response = await api.get(`/export/requests/status/${status}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  exportOverdueRequests: async (): Promise<Blob> => {
    try {
      const response = await api.get('/export/requests/overdue', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  exportRequestsByDepartment: async (departmentId: number): Promise<Blob> => {
    try {
      const response = await api.get(`/export/requests/department/${departmentId}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  exportRequestsByWarranty: async (warrantyStatus: string): Promise<Blob> => {
    try {
      const response = await api.get(`/export/requests/warranty/${warrantyStatus}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  exportDashboardStats: async (): Promise<Blob> => {
    try {
      const response = await api.get('/export/dashboard/stats', {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
};

// Helper function to download blob as file
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Reports API
export const reportsAPI = {
  getReports: async (params?: any) => {
    try {
      const response = await api.get('/reports', { params });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};

// Storage API
export const storageAPI = {
  getSpareParts: async (params?: any) => {
    try {
      const response = await api.get('/storage', { params });
      return response.data;
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  getSparePartById: async (id: number) => {
    try {
      const response = await api.get(`/storage/${id}`);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  createSparePart: async (data: any) => {
    try {
      const response = await api.post('/storage', data);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  updateSparePart: async (id: number, data: any) => {
    try {
      const response = await api.put(`/storage/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  deleteSparePart: async (id: number) => {
    try {
      const response = await api.delete(`/storage/${id}`);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  getSparePartHistory: async (id: number) => {
    try {
      console.log(`🔍 API Call: GET /storage/${id}/history`);
      const response = await api.get(`/storage/${id}/history`);
      console.log('📊 Raw API response:', response);
      console.log('📊 Response data:', response.data);
      return handleResponse(response);
    } catch (error) {
      console.error('❌ API Error in getSparePartHistory:', error);
      return Promise.reject(handleError(error));
    }
  },

  getAllActivities: async (params?: { limit?: number; filter?: string }) => {
    try {
      const response = await api.get('/storage/activities/all', { params });
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  getSparePartLogs: async (limit?: number) => {
    try {
      const response = await api.get('/storage/logs', { params: { limit } });
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/storage/categories');
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  adjustQuantity: async (id: number, adjustment: number, reason?: string) => {
    try {
      const response = await api.post(`/storage/${id}/adjust-quantity`, { adjustment, reason });
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
};

// Request Parts API
export const requestPartsAPI = {
  getRequestParts: async (requestId: number) => {
    try {
      const response = await api.get(`/request-parts/${requestId}`);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  addPartToRequest: async (data: any) => {
    try {
      const response = await api.post('/request-parts', data);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  updateRequestPart: async (id: number, data: any) => {
    try {
      const response = await api.put(`/request-parts/${id}`, data);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },

  removePartFromRequest: async (id: number) => {
    try {
      const response = await api.delete(`/request-parts/${id}`);
      return handleResponse(response);
    } catch (error) {
      return Promise.reject(handleError(error));
    }
  },
};


export default api;
