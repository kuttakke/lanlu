// 收藏功能服务 - 用户级别的档案收藏管理
import { apiClient } from './api';

export class FavoriteService {
  // 添加收藏
  static async addFavorite(arcid: string): Promise<boolean> {
    try {
      const response = await apiClient.put(`/api/archives/${arcid}/favorite`);
      return response.data.success === 1;
    } catch (error) {
      console.error('添加收藏失败:', error);
      return false;
    }
  }

  // 取消收藏
  static async removeFavorite(arcid: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/archives/${arcid}/favorite`);
      return response.data.success === 1;
    } catch (error) {
      console.error('取消收藏失败:', error);
      return false;
    }
  }

  // 切换收藏状态（需要传入当前状态）
  static async toggleFavorite(arcid: string, currentIsFavorite: boolean): Promise<boolean> {
    try {
      // 根据当前状态切换
      if (currentIsFavorite) {
        return await this.removeFavorite(arcid);
      } else {
        return await this.addFavorite(arcid);
      }
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      return false;
    }
  }

  // 获取收藏列表
  static async getFavorites(): Promise<string[]> {
    try {
      const response = await apiClient.get('/api/favorites');
      return response.data.favorites || [];
    } catch (error) {
      console.error('获取收藏列表失败:', error);
      return [];
    }
  }
}