// 图片缓存服务
class ImageCacheService {
  private cachePrefix = 'reader-image-cache-';
  private maxCacheSize = 50 * 1024 * 1024; // 50MB 最大缓存大小
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7天 最大缓存时间

  // 生成缓存键
  private getCacheKey(url: string): string {
    return `${this.cachePrefix}${btoa(url)}`;
  }

  // 检查缓存是否存在且有效
  async getCachedImage(url: string): Promise<string | null> {
    try {
      const cacheKey = this.getCacheKey(url);
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cachedItem);
      
      // 检查缓存是否过期
      if (Date.now() - timestamp > this.maxCacheAge) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached image:', error);
      return null;
    }
  }

  // 缓存图片
  async cacheImage(url: string, dataUrl: string): Promise<void> {
    try {
      // 检查缓存大小限制
      await this.checkCacheSize();

      const cacheKey = this.getCacheKey(url);
      const cacheItem = {
        data: dataUrl,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error caching image:', error);
      // 如果缓存失败（可能是存储空间不足），清理旧缓存后重试
      await this.cleanOldCache();
      try {
        const cacheKey = this.getCacheKey(url);
        const cacheItem = {
          data: dataUrl,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (retryError) {
        console.error('Retry caching image failed:', retryError);
      }
    }
  }

  // 将图片URL转换为Data URL
  async urlToDataUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  // 获取或缓存图片
  async getOrCacheImage(url: string): Promise<string> {
    try {
      // 首先尝试从缓存获取
      const cachedImage = await this.getCachedImage(url);
      if (cachedImage) {
        return cachedImage;
      }

      // 如果缓存中没有，下载并缓存
      const dataUrl = await this.urlToDataUrl(url);
      await this.cacheImage(url, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('Error getting or caching image:', error);
      // 如果缓存失败，返回原始URL
      return url;
    }
  }

  // 检查缓存大小
  private async checkCacheSize(): Promise<void> {
    let totalSize = 0;
    const keysToRemove: string[] = [];

    // 计算当前缓存大小
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
          
          // 检查是否过期
          try {
            const { timestamp } = JSON.parse(value);
            if (Date.now() - timestamp > this.maxCacheAge) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    // 删除过期的缓存
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 如果缓存大小超过限制，删除最旧的缓存
    if (totalSize > this.maxCacheSize) {
      await this.cleanOldCache();
    }
  }

  // 清理旧缓存
  private async cleanOldCache(): Promise<void> {
    const cacheItems: Array<{ key: string; timestamp: number }> = [];

    // 收集所有缓存项
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const { timestamp } = JSON.parse(value);
            cacheItems.push({ key, timestamp });
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }

    // 按时间排序，删除最旧的缓存项
    cacheItems.sort((a, b) => a.timestamp - b.timestamp);
    
    // 删除最旧的25%缓存项
    const itemsToRemove = Math.ceil(cacheItems.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      localStorage.removeItem(cacheItems[i].key);
    }
  }

  // 清除所有图片缓存
  clearAllCache(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  // 获取缓存统计信息
  getCacheStats(): { count: number; size: string } {
    let count = 0;
    let totalSize = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.cachePrefix)) {
        count++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
    }

    return {
      count,
      size: this.formatBytes(totalSize)
    };
  }

  // 格式化字节数
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const imageCacheService = new ImageCacheService();