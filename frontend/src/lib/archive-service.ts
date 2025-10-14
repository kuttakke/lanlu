import { apiClient } from './api';
import { Archive, SearchResponse, SearchParams, RandomParams, ArchiveMetadata } from '@/types/archive';
import { ServerInfo } from '@/types/server';
import { ChunkedUploadService, UploadMetadata, UploadProgressCallback, UploadResult } from './chunked-upload-service';

export class ArchiveService {
  static async search(params: SearchParams): Promise<SearchResponse> {
    const response = await apiClient.get('/api/search', { params });
    return response.data;
  }

  static async getRandom(params: RandomParams = {}): Promise<Archive[]> {
    const response = await apiClient.get('/api/search/random', { 
      params: {
        count: params.count || 5,
        filter: params.filter,
        category: params.category,
        newonly: params.newonly,
        untaggedonly: params.untaggedonly
      }
    });
    return response.data.data || [];
  }

  static async getMetadata(id: string): Promise<ArchiveMetadata> {
    const response = await apiClient.get(`/api/archives/${id}/metadata`);
    return response.data;
  }

  static async updateMetadata(id: string, metadata: Partial<ArchiveMetadata>): Promise<void> {
    const params = new URLSearchParams();
    
    if (metadata.title !== undefined) {
      params.append('title', metadata.title);
    }
    if (metadata.summary !== undefined) {
      params.append('summary', metadata.summary);
    }
    if (metadata.tags !== undefined) {
      params.append('tags', metadata.tags);
    }
    
    await apiClient.put(`/api/archives/${id}/metadata?${params.toString()}`);
  }

  static async getFiles(id: string): Promise<string[]> {
    const response = await apiClient.get(`/api/archives/${id}/files`);
    return response.data.pages || [];
  }

  static async getArchive(id: string): Promise<any> {
    const response = await apiClient.get(`/api/archives/${id}`);
    return response.data;
  }

  static getThumbnailUrl(id: string, page: number = 1): string {
    // 使用相对路径，因为前端和后端部署在一起
    return `/api/archives/${id}/thumbnail?page=${page}`;
  }

  static getPageUrl(id: string, path: string): string {
    // 使用相对路径，因为前端和后端部署在一起
    // 如果path被编码了，需要先解码再重新编码
    try {
      // 尝试解码path，如果已经是编码状态
      const decodedPath = decodeURIComponent(path);
      return decodedPath;
    } catch (e) {
      // 如果解码失败，说明path已经是正确格式
      return `/api/archives/${id}/page?path=${path}`;
    }
  }

  static getDownloadUrl(id: string): string {
    return `/api/archives/${id}/download`;
  }

  static async getServerInfo(): Promise<ServerInfo> {
    const response = await apiClient.get('/api/info');
    return response.data;
  }

  /**
   * 传统上传方法（保持向后兼容）
   * @deprecated 建议使用 uploadArchiveWithChunks 方法
   */
  static async uploadArchive(
    file: File,
    metadata?: {
      title?: string;
      tags?: string;
      summary?: string;
      categoryId?: string;
      fileChecksum?: string;
    }
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    // 添加元数据作为查询参数
    const params = new URLSearchParams();
    if (metadata?.title) params.append('title', metadata.title);
    if (metadata?.tags) params.append('tags', metadata.tags);
    if (metadata?.summary) params.append('summary', metadata.summary);
    if (metadata?.categoryId) params.append('category_id', metadata.categoryId);
    if (metadata?.fileChecksum) params.append('file_checksum', metadata.fileChecksum);
    params.append('filename', file.name);
    
    try {
      // 将文件转换为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      const response = await apiClient.put(`/api/archives/upload?${params.toString()}`, arrayBuffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });
      
      return {
        success: response.data.success === 1,
        id: response.data.id,
        error: response.data.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Upload failed',
      };
    }
  }

  /**
   * 新的分片上传方法（推荐使用）
   * 支持断点续传、进度显示、错误重试等功能
   */
  static async uploadArchiveWithChunks(
    file: File,
    metadata?: UploadMetadata,
    callbacks?: UploadProgressCallback
  ): Promise<UploadResult> {
    // 默认回调函数
    const defaultCallbacks: UploadProgressCallback = {
      onProgress: () => {},
      onChunkComplete: () => {},
      onError: () => {}
    };

    return await ChunkedUploadService.uploadWithChunks(
      file,
      metadata || {},
      callbacks || defaultCallbacks
    );
  }

  /**
   * 获取上传状态
   */
  static async getUploadStatus(uploadId: string) {
    return await ChunkedUploadService.getUploadStatus(uploadId);
  }

  /**
   * 取消上传
   */
  static async cancelUpload(uploadId: string): Promise<boolean> {
    return await ChunkedUploadService.cancelUpload(uploadId);
  }

  /**
   * 恢复上传
   */
  static async resumeUpload(
    uploadId: string,
    file: File,
    metadata?: UploadMetadata,
    callbacks?: UploadProgressCallback
  ): Promise<UploadResult> {
    const defaultCallbacks: UploadProgressCallback = {
      onProgress: () => {},
      onChunkComplete: () => {},
      onError: () => {}
    };

    return await ChunkedUploadService.resumeUpload(
      uploadId,
      file,
      metadata || {},
      callbacks || defaultCallbacks
    );
  }

  /**
   * 验证文件
   */
  static validateFile(file: File) {
    return ChunkedUploadService.validateFile(file);
  }

  /**
   * 获取错误消息
   */
  static getUploadErrorMessage(error: any): string {
    return ChunkedUploadService.getErrorMessage(error);
  }
}