import { apiClient, uploadClient } from './api';

// 上传元数据接口
export interface UploadMetadata {
  title?: string;
  tags?: string;
  summary?: string;
  categoryId?: string;
  fileChecksum?: string;
}

// 上传进度回调接口
export interface UploadProgressCallback {
  onProgress: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number, uploadedChunks: number) => void;
  onError?: (error: Error, chunkIndex?: number) => void;
}

// 上传结果接口
export interface UploadResult {
  success: boolean;
  id?: string;
  error?: string;
}

// 上传状态接口
export interface UploadStatus {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  completedChunks: number[];
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  createdAt: string;
  fileHash: string;
}

// 文件验证结果接口
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 分片上传服务
 * 支持断点续传、进度显示、错误重试等功能
 */
export class ChunkedUploadService {
  // 配置常量
  private static readonly CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5MB (小于2MB限制)
  private static readonly MAX_RETRIES = 3;
  private static readonly UPLOAD_TIMEOUT = 60000; // 60秒
  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private static readonly SUPPORTED_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'cbz', 'cbr', 'cb7', 'cbt'];
  private static readonly MAX_CONCURRENT_CHUNKS = 3; // 最大并发上传数

  /**
   * 主要的分片上传方法
   */
  static async uploadWithChunks(
    file: File,
    metadata: UploadMetadata,
    callbacks: UploadProgressCallback
  ): Promise<UploadResult> {
    try {
      // 1. 文件验证
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 2. 计算文件哈希
      let fileHash = metadata.fileChecksum;
      if (!fileHash) {
        try {
          fileHash = await this.calculateFileHash(file);
        } catch (error) {
          console.warn('Failed to calculate file hash:', error);
          // 如果哈希计算失败，使用文件名和时间戳作为备用哈希
          fileHash = `${file.name}_${Date.now()}`;
        }
      }
      
      // 3. 计算分片信息
      const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
      
      // 4. 初始化上传会话
      const uploadId = await this.initUploadSession(file.name, file.size, fileHash, totalChunks);
      if (!uploadId) {
        return { success: false, error: 'Failed to initialize upload session' };
      }

      // 5. 检查是否可以断点续传
      const existingStatus = await this.getUploadStatus(uploadId);
      const completedChunks = existingStatus?.completedChunks || [];
      const remainingChunks = this.getRemainingChunks(totalChunks, completedChunks);

      // 6. 上传剩余分片
      const firstUploadResult = await this.uploadChunksConcurrently(
        file,
        uploadId,
        remainingChunks,
        totalChunks,
        callbacks
      );

      // 7. 计算总的已上传分片数（包括之前已上传的）
      let totalCompletedChunks = completedChunks.length + firstUploadResult.successCount;
      
      // 如果有失败的分片，进行重传
      if (firstUploadResult.failedChunks.length > 0) {
        console.log(`发现 ${firstUploadResult.failedChunks.length} 个失败分片，开始重传:`, firstUploadResult.failedChunks);
        
        // 重传失败的分片
        const retryResult = await this.uploadChunksConcurrently(
          file,
          uploadId,
          firstUploadResult.failedChunks,
          totalChunks,
          callbacks
        );
        
        // 修正计算：减去之前失败的分片数，加上重传成功的分片数
        totalCompletedChunks = totalCompletedChunks - firstUploadResult.failedChunks.length + retryResult.successCount;
        
        // 如果重传后仍有失败的分片，返回错误
        if (retryResult.failedChunks.length > 0) {
          console.log('重传后仍有失败分片:', retryResult.failedChunks);
          return {
            success: false,
            error: `分片上传失败: ${retryResult.failedChunks.length} 个分片重传后仍然失败`
          };
        }
        
        console.log(`所有分片上传成功: ${totalCompletedChunks}/${totalChunks}`);
      } else {
        console.log(`所有分片上传成功: ${totalCompletedChunks}/${totalChunks}`);
      }

      // 8. 验证所有分片都已上传完成
      if (totalCompletedChunks !== totalChunks) {
        console.error(`分片数量不匹配: 期望 ${totalChunks}, 实际 ${totalCompletedChunks}`);
        return {
          success: false,
          error: `分片数量不匹配: 期望 ${totalChunks}, 实际 ${totalCompletedChunks}`
        };
      }

      // 9. 完成上传
      return await this.completeUpload(uploadId, fileHash, metadata, file.name);

    } catch (error) {
      console.error('Chunked upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * 文件验证
   */
  static validateFile(file: File): ValidationResult {
    // 检查文件大小
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `文件大小不能超过 ${this.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // 检查文件扩展名
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !this.SUPPORTED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `不支持的文件格式: ${extension}。支持的格式: ${this.SUPPORTED_EXTENSIONS.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * 计算文件哈希（SHA1）
   */
  static async calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          if (!buffer) {
            reject(new Error('Failed to read file buffer'));
            return;
          }
          const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 初始化上传会话
   */
  private static async initUploadSession(
    fileName: string,
    fileSize: number,
    fileHash: string,
    totalChunks: number
  ): Promise<string | null> {
    try {
      // 生成简单的上传ID（客户端生成）
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 调用服务器初始化上传会话
      try {
        const response = await apiClient.post('/api/archives/upload/init', {
          uploadId,
          fileName,
          fileSize,
          fileHash,
          totalChunks
        });
        
        if (response.data.success !== 1) {
          console.error('Server failed to initialize upload session:', response.data.error);
          return null;
        }
      } catch (serverError) {
        console.error('Failed to call server init upload session:', serverError);
        return null;
      }
      
      // 保存上传会话信息到localStorage
      const session = {
        uploadId,
        fileName,
        fileSize,
        fileHash,
        totalChunks,
        completedChunks: [],
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(`upload_${uploadId}`, JSON.stringify(session));
      
      return uploadId;
    } catch (error) {
      console.error('Failed to init upload session:', error);
      return null;
    }
  }

  /**
   * 获取上传状态
   */
  static async getUploadStatus(uploadId: string): Promise<UploadStatus | null> {
    try {
      // 首先尝试从服务器获取状态
      try {
        const response = await apiClient.get(`/api/archives/upload/status/${uploadId}`);
        
        // 调试：打印服务器响应
        console.log('服务器状态响应:', response.data);
        
        if (response.data.success === 1) {
          // 从localStorage获取基本信息
          const sessionData = localStorage.getItem(`upload_${uploadId}`);
          let fileName = '', fileSize = 0, fileHash = '', createdAt = new Date().toISOString();
          
          if (sessionData) {
            const session = JSON.parse(sessionData);
            fileName = session.fileName || '';
            fileSize = session.fileSize || 0;
            fileHash = session.fileHash || '';
            createdAt = session.createdAt || new Date().toISOString();
            
            // 同步服务器状态到localStorage
            let serverCompletedChunks = [];
            if (response.data.completedChunks) {
              if (typeof response.data.completedChunks === 'string') {
                try {
                  serverCompletedChunks = JSON.parse(response.data.completedChunks);
                } catch (parseError) {
                  console.warn('Failed to parse completedChunks from server:', parseError);
                  serverCompletedChunks = [];
                }
              } else if (Array.isArray(response.data.completedChunks)) {
                serverCompletedChunks = response.data.completedChunks;
              }
            }
            const serverStatus = response.data.status;
            
            // 只有当服务器状态更新时才同步到localStorage
            if (serverCompletedChunks.length > (session.completedChunks || []).length ||
                serverStatus !== session.status) {
              session.completedChunks = serverCompletedChunks;
              session.status = serverStatus;
              localStorage.setItem(`upload_${uploadId}`, JSON.stringify(session));
            }
          }
          
          // 处理服务器返回的completedChunks，它可能是JSON字符串或数组
          let completedChunks = [];
          if (response.data.completedChunks) {
            if (typeof response.data.completedChunks === 'string') {
              try {
                completedChunks = JSON.parse(response.data.completedChunks);
              } catch (parseError) {
                console.warn('Failed to parse completedChunks from server:', parseError);
                completedChunks = [];
              }
            } else if (Array.isArray(response.data.completedChunks)) {
              completedChunks = response.data.completedChunks;
            }
          }
          
          return {
            uploadId: response.data.uploadId,
            fileName,
            fileSize,
            fileHash,
            totalChunks: response.data.totalChunks,
            completedChunks, // 解析后的分片数组
            status: response.data.status,
            createdAt
          };
        }
      } catch (serverError) {
        console.warn('Failed to get status from server, falling back to localStorage:', serverError);
      }
      
      // 从localStorage获取上传状态（备用方案）
      const sessionData = localStorage.getItem(`upload_${uploadId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return {
          uploadId: session.uploadId,
          fileName: session.fileName,
          fileSize: session.fileSize,
          totalChunks: session.totalChunks,
          completedChunks: session.completedChunks,
          status: session.status,
          createdAt: session.createdAt,
          fileHash: session.fileHash
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get upload status:', error);
      return null;
    }
  }

  /**
   * 获取剩余需要上传的分片
   */
  private static getRemainingChunks(totalChunks: number, completedChunks: number[]): number[] {
    const remaining: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!completedChunks.includes(i)) {
        remaining.push(i);
      }
    }
    return remaining;
  }

  /**
   * 更新localStorage中的completedChunks
   */
  private static updateLocalStorageCompletedChunks(uploadId: string, chunkIndex: number, totalChunks: number): void {
    try {
      const sessionData = localStorage.getItem(`upload_${uploadId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // 确保completedChunks数组存在
        if (!session.completedChunks) {
          session.completedChunks = [];
        }
        
        // 添加新的分片索引（避免重复）
        if (!session.completedChunks.includes(chunkIndex)) {
          session.completedChunks.push(chunkIndex);
          // 排序
          session.completedChunks.sort((a: number, b: number) => a - b);
        }
        
        // 更新状态
        if (session.completedChunks.length === totalChunks) {
          session.status = 'completed';
        } else {
          session.status = 'uploading';
        }
        
        // 保存回localStorage
        localStorage.setItem(`upload_${uploadId}`, JSON.stringify(session));
      }
    } catch (error) {
      console.warn('Failed to update localStorage completedChunks:', error);
    }
  }

  /**
   * 并发上传分片
   */
  private static async uploadChunksConcurrently(
    file: File,
    uploadId: string,
    chunkIndices: number[],
    totalChunks: number,
    callbacks: UploadProgressCallback,
    previouslyCompletedChunks: number[] = []
  ): Promise<{ successCount: number; failedChunks: number[] }> {
    const totalBytes = file.size;
    const completedChunkIndices: number[] = [];
    const failedChunks: number[] = [];

    // 使用更简单的方法：分批处理
    const batchSize = this.MAX_CONCURRENT_CHUNKS;
    for (let i = 0; i < chunkIndices.length; i += batchSize) {
      const batch = chunkIndices.slice(i, i + batchSize);
      
      // 并发上传当前批次
      const batchPromises = batch.map(async (chunkIndex) => {
        try {
          await this.uploadChunkWithRetry(file, uploadId, chunkIndex, totalChunks);
          
          // 更新localStorage中的completedChunks
          this.updateLocalStorageCompletedChunks(uploadId, chunkIndex, totalChunks);
          
          return { success: true, chunkIndex };
        } catch (error) {
          console.error(`分片 ${chunkIndex} 上传最终失败:`, error);
          const errorObj = error instanceof Error ? error : new Error(String(error));
          callbacks.onError?.(errorObj, chunkIndex);
          return { success: false, chunkIndex };
        }
      });
      
      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      
      // 处理批次结果
      for (const result of batchResults) {
        if (result.success) {
          completedChunkIndices.push(result.chunkIndex);
        } else {
          failedChunks.push(result.chunkIndex);
        }
      }
      
      // 计算进度：包括之前已完成的分片和本次新完成的分片
      const allCompletedChunks = [...previouslyCompletedChunks, ...completedChunkIndices];
      const uploadedBytes = allCompletedChunks.reduce((total, chunkIndex) => {
        const start = chunkIndex * this.CHUNK_SIZE;
        const end = Math.min(start + this.CHUNK_SIZE, totalBytes);
        return total + (end - start);
      }, 0);
      
      const progress = Math.round((uploadedBytes / totalBytes) * 100);
      callbacks.onProgress(progress);
      callbacks.onChunkComplete?.(-1, totalChunks, allCompletedChunks.length);
    }

    return { successCount: completedChunkIndices.length, failedChunks };
  }

  /**
   * 检查Promise是否已解决
   */
  private static async isPromiseResolved(promise: Promise<any>): Promise<boolean> {
    // 创建一个新的Promise来检查原始Promise的状态
    return new Promise((resolve) => {
      // 设置一个很短的超时来检查Promise状态
      const timeout = setTimeout(() => {
        resolve(false); // 如果超时，说明Promise还未完成
      }, 0);

      promise
        .then(() => {
          clearTimeout(timeout);
          resolve(true); // Promise成功完成
        })
        .catch(() => {
          clearTimeout(timeout);
          resolve(true); // Promise失败但已完成
        });
    });
  }

  /**
   * 带重试机制的分片上传
   */
  private static async uploadChunkWithRetry(
    file: File,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    retryCount = 0
  ): Promise<void> {
    try {
      const chunk = await this.getFileChunk(file, chunkIndex);
      await this.uploadChunk(uploadId, chunkIndex, totalChunks, chunk);
      // 成功上传，如果之前有重试，说明重试成功了
      if (retryCount > 0) {
        console.log(`分片 ${chunkIndex} 重试成功`);
      }
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        console.log(`分片 ${chunkIndex} 上传失败，第 ${retryCount + 1} 次重试`);
        await this.delay(1000 * Math.pow(2, retryCount)); // 指数退避
        return this.uploadChunkWithRetry(file, uploadId, chunkIndex, totalChunks, retryCount + 1);
      } else {
        console.error(`分片 ${chunkIndex} 重试 ${this.MAX_RETRIES} 次后仍然失败`);
        throw new Error(`分片 ${chunkIndex} 上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * 获取文件分片
   */
  private static async getFileChunk(file: File, chunkIndex: number): Promise<Blob> {
    const start = chunkIndex * this.CHUNK_SIZE;
    const end = Math.min(start + this.CHUNK_SIZE, file.size);
    return file.slice(start, end);
  }

  /**
   * 上传单个分片
   */
  private static async uploadChunk(
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkData: Blob
  ): Promise<void> {
    // 使用查询参数而不是FormData，因为后端使用getQuery获取参数
    const params = new URLSearchParams();
    params.append('uploadId', uploadId);
    params.append('chunkIndex', chunkIndex.toString());
    params.append('totalChunks', totalChunks.toString());
    params.append('filename', 'chunk.bin');

    const response = await apiClient.put(`/api/archives/upload/chunk?${params.toString()}`, chunkData, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      timeout: this.UPLOAD_TIMEOUT,
    });

    if (response.data.success !== 1) {
      throw new Error(response.data.error || `Chunk ${chunkIndex} upload failed`);
    }
  }

  /**
   * 完成上传
   */
  private static async completeUpload(
    uploadId: string,
    fileHash: string,
    metadata: UploadMetadata,
    fileName: string
  ): Promise<UploadResult> {
    try {
      const response = await apiClient.post('/api/archives/upload/complete', {
        uploadId,
        file_checksum: fileHash,
        filename: fileName,
        title: metadata.title || '',
        tags: metadata.tags || '',
        summary: metadata.summary || '',
        category_id: metadata.categoryId || ''
      });

      return {
        success: response.data.success === 1,
        id: response.data.id,
        error: response.data.error
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete upload'
      };
    }
  }

  /**
   * 取消上传
   */
  static async cancelUpload(uploadId: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/api/archives/upload/${uploadId}`);
      return response.data.success === 1;
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      return false;
    }
  }

  /**
   * 暂停上传
   */
  static pauseUpload(uploadId: string): boolean {
    // 实现暂停逻辑（可能需要在前端维护上传状态）
    console.log(`Upload ${uploadId} paused`);
    return true;
  }

  /**
   * 恢复上传
   */
  static async resumeUpload(uploadId: string, file: File, metadata: UploadMetadata, callbacks: UploadProgressCallback): Promise<UploadResult> {
    try {
      // 检查上传状态
      const status = await this.getUploadStatus(uploadId);
      if (!status) {
        return { success: false, error: 'Upload session not found' };
      }

      if (status.status === 'completed') {
        return { success: false, error: 'Upload already completed' };
      }

      // 继续上传剩余分片
      const remainingChunks = this.getRemainingChunks(status.totalChunks, status.completedChunks);
      
      // 创建包装的回调，以正确计算总的已上传分片数
      const wrappedCallbacks: UploadProgressCallback = {
        onProgress: callbacks.onProgress,
        onChunkComplete: (chunkIndex, totalChunks, newlyUploadedChunks) => {
          // 计算总的已上传分片数（包括之前已上传的）
          // 注意：newlyUploadedChunks 是本次上传中成功完成的分片数量
          // 我们需要加上之前已经完成的分片数量
          const totalUploadedChunks = status.completedChunks.length + newlyUploadedChunks;
          callbacks.onChunkComplete?.(chunkIndex, totalChunks, totalUploadedChunks);
        },
        onError: callbacks.onError
      };
      
      const uploadResult = await this.uploadChunksConcurrently(
        file,
        uploadId,
        remainingChunks,
        status.totalChunks,
        wrappedCallbacks
      );

      // 计算总的已上传分片数（包括之前已上传的）
      let totalCompletedChunks = status.completedChunks.length + uploadResult.successCount;
      
      // 如果有失败的分片，进行重传
      if (uploadResult.failedChunks.length > 0) {
        console.log(`恢复上传发现 ${uploadResult.failedChunks.length} 个失败分片，开始重传:`, uploadResult.failedChunks);
        
        // 重传失败的分片
        const retryResult = await this.uploadChunksConcurrently(
          file,
          uploadId,
          uploadResult.failedChunks,
          status.totalChunks,
          callbacks
        );
        
        // 修正计算：减去之前失败的分片数，加上重传成功的分片数
        totalCompletedChunks = totalCompletedChunks - uploadResult.failedChunks.length + retryResult.successCount;
        
        // 如果重传后仍有失败的分片，返回错误
        if (retryResult.failedChunks.length > 0) {
          console.log('恢复上传重传后仍有失败分片:', retryResult.failedChunks);
          return {
            success: false,
            error: `恢复上传时分片上传失败: ${retryResult.failedChunks.length} 个分片重传后仍然失败`
          };
        }
        
        console.log(`恢复上传所有分片上传成功: ${totalCompletedChunks}/${status.totalChunks}`);
      } else {
        console.log(`恢复上传所有分片上传成功: ${totalCompletedChunks}/${status.totalChunks}`);
      }

      // 验证所有分片都已上传完成
      if (totalCompletedChunks !== status.totalChunks) {
        console.error(`恢复上传分片数量不匹配: 期望 ${status.totalChunks}, 实际 ${totalCompletedChunks}`);
        return {
          success: false,
          error: `恢复上传分片数量不匹配: 期望 ${status.totalChunks}, 实际 ${totalCompletedChunks}`
        };
      }

      // 完成上传
      return await this.completeUpload(uploadId, status.fileHash, metadata, status.fileName);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume upload'
      };
    }
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取错误消息
   */
  static getErrorMessage(error: any): string {
    if (error.response?.status === 413) {
      return "文件太大，请选择较小的文件";
    } else if (error.response?.status === 415) {
      return "不支持的文件格式";
    } else if (error.code === 'NETWORK_ERROR') {
      return "网络连接失败，请检查网络后重试";
    } else if (error.response?.status === 408) {
      return "上传超时，请检查网络连接或尝试较小的文件";
    } else {
      return error.message || "上传失败，请稍后重试";
    }
  }
}