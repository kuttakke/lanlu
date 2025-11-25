import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

// 区分服务端和客户端的API配置
const getApiConfig = () => {
  // 静态生成时也要调用API，使用环境变量配置的API地址
  if (typeof window === 'undefined') {
    return {
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      skipRequest: false // 静态生成时也要调用API
    };
  }

  // 客户端使用相对路径
  return {
    baseURL: '', // 相对路径，会自动使用当前域名和端口
    skipRequest: false
  };
};

const { baseURL, skipRequest } = getApiConfig();
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'comic';

console.log('API Configuration:', { baseURL, skipRequest, API_KEY });

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 默认10秒，用于普通API请求
});

// 创建专门用于上传的客户端，具有更长的超时时间
export const uploadClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 300000 // 5分钟超时，用于上传请求
});

// 为上传客户端添加请求拦截器
uploadClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token') || API_KEY;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`Making upload ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 为上传客户端添加响应拦截器
uploadClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Upload API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// 请求拦截器 - 动态设置 Authorization 头
apiClient.interceptors.request.use(
  (config) => {
    // 尝试从 localStorage 获取 token
    const token = localStorage.getItem('auth_token') || API_KEY;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 导出skipRequest标志，用于在静态生成期间跳过API调用
export { skipRequest };


// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API wrapper functions
export const api = {
  get: async (url: string) => {
    console.log('API GET called:', url);
    console.log('skipRequest:', skipRequest);
    try {
      const response = await apiClient.get(url);
      console.log('API response status:', response.status);
      console.log('API response data:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('API GET error:', error);
      console.error('Error response:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  },

  post: async (url: string, data?: any) => {
    try {
      const response = await apiClient.post(url, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  },

  put: async (url: string, data?: any) => {
    try {
      const response = await apiClient.put(url, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  },

  delete: async (url: string) => {
    try {
      const response = await apiClient.delete(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Request failed'
      };
    }
  }
};

export default apiClient;