import axios from 'axios';

// 区分服务端和客户端的API配置
const getApiConfig = () => {
  // 在静态生成期间，返回null避免API调用
  if (typeof window === 'undefined') {
    return {
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8084',
      skipRequest: true
    };
  }
  
  // 客户端使用相对路径
  return {
    baseURL: '', // 相对路径，会自动使用当前域名
    skipRequest: false
  };
};

const { baseURL, skipRequest } = getApiConfig();
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'comic';

console.log('API Configuration:', { baseURL, skipRequest, API_KEY });

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// 导出skipRequest标志，用于在静态生成期间跳过API调用
export { skipRequest };

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;