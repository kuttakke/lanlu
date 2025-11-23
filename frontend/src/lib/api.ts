import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

// 区分服务端和客户端的API配置
const getApiConfig = () => {
  // 在静态生成期间，返回null避免API调用
  if (typeof window === 'undefined') {
    return {
      baseURL: process.env.NEXT_PUBLIC_API_URL || '',
      skipRequest: true
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

export default apiClient;