// 图片缓存服务 - 完全依赖浏览器原生缓存
class ImageCacheService {
  // 直接返回原始 URL，完全依赖浏览器缓存
  // 浏览器会自动处理 HTTP 缓存、内存缓存和磁盘缓存
  async getOrCacheImage(url: string): Promise<string> {
    // 直接返回原始 URL，让浏览器处理所有缓存逻辑
    // 这比 localStorage 更高效：
    // 1. 零阻塞（异步）
    // 2. 无限容量（浏览器自动管理）
    // 3. 更高性能（原始二进制 vs Base64）
    // 4. 自动清理（LRU 算法）
    return url;
  }

  // 清空浏览器缓存（仅用于调试，生产环境不建议调用）
  // 浏览器缓存由 HTTP 头控制，无法通过 JavaScript 直接清空
  // 可以通过设置 meta 标签或发送 no-cache 头来实现
  clearAllCache(): void {
    // 浏览器缓存无法通过 JavaScript 直接清空
    // 这是一个占位符，保持 API 兼容性
    console.info('浏览器缓存由 HTTP 头控制，无法通过 JavaScript 直接清空');
  }

  // 获取缓存统计信息
  // 由于无法访问浏览器内部缓存统计，返回模拟数据
  getCacheStats(): { count: number; size: string } {
    return {
      count: 0, // 浏览器缓存数量不可访问
      size: 'N/A' // 浏览器缓存大小不可访问
    };
  }
}

export const imageCacheService = new ImageCacheService();