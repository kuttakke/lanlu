'use client';

import { apiClient } from './api';

export interface Plugin {
  id: number;
  name: string;
  namespace: string;
  version: string;
  plugin_type: string;  // API返回的是 plugin_type，不是 type
  author: string;
  description: string;
  tags: string;
  permissions: string[];  // 现在是权限字符串数组
  icon: string;         // 插件图标，Base64编码的图片数据
  enabled: boolean;
  installed: boolean;
  created_at: string;
  updated_at: string;
}

export class PluginService {
  static async getAllPlugins(): Promise<Plugin[]> {
    try {
      console.log('正在获取插件列表...');
      const response = await apiClient.get('/api/plugins');
      console.log('插件API响应:', response.data);

      // API 返回直接的数组
      const plugins = Array.isArray(response.data) ? response.data : [];
      console.log('解析到的插件数据:', plugins);
      console.log('插件数量:', plugins.length);

      return plugins;
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('API响应错误:', axiosError.response?.status, axiosError.response?.data);
      } else if (error instanceof Error) {
        console.error('网络错误:', error.message);
      }
      throw error;
    }
  }

  static async togglePluginStatus(namespace: string, enabled: boolean): Promise<void> {
    try {
      await apiClient.put(`/api/plugins/${namespace}/enabled`, { enabled });
    } catch (error) {
      console.error('Failed to toggle plugin status:', error);
      throw error;
    }
  }

  static async updatePluginConfig(namespace: string, config: object): Promise<void> {
    try {
      await apiClient.put(`/api/plugins/${namespace}/config`, config);
    } catch (error) {
      console.error('Failed to update plugin config:', error);
      throw error;
    }
  }
}