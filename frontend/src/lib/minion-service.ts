import { MinionTask, MinionTaskPageResult, TaskListResponse, TaskResponse } from '@/types/minion';
import { api, skipRequest } from '@/lib/api';

export class MinionService {
  private static BASE_URL = '/api/minion';

  /**
   * Get tasks with pagination
   */
  static async getTasks(page: number = 1, pageSize: number = 10): Promise<MinionTaskPageResult> {
    try {
      console.log('MinionService.getTasks called, page:', page, 'pageSize:', pageSize);
      console.log('BASE_URL:', this.BASE_URL);
      console.log('API URL:', `${this.BASE_URL}/tasks?page=${page}&pageSize=${pageSize}`);

      const response = await api.get(`${this.BASE_URL}/tasks?page=${page}&pageSize=${pageSize}`);
      console.log('API response success:', response.success);
      console.log('API response data:', response.data);

      if (response.success) {
        // 直接从response.data获取数据，因为后端返回的就是完整的数据结构
        console.log('Raw response.data:', response.data);
        console.log('Type of response.data:', typeof response.data);

        // 如果response.data是字符串，需要解析为JSON
        let data = response.data;
        if (typeof response.data === 'string') {
          console.log('response.data is a string, parsing JSON...');
          console.log('First 100 chars:', response.data.substring(0, 100));
          console.log('Around position 840:', response.data.substring(830, 850));

          try {
            data = JSON.parse(response.data);
            console.log('Parsed data:', data);
          } catch (parseError) {
            console.error('Failed to parse response.data as JSON:', parseError);
            console.log('Full response string length:', response.data.length);
            console.log('Problematic section:');
            const start = Math.max(0, 840 - 50);
            const end = Math.min(response.data.length, 840 + 50);
            console.log(response.data.substring(start, end));
            throw new Error('Invalid JSON response from server');
          }
        }

        // 检查data的结构
        if (data && typeof data === 'object') {
          console.log('data keys:', Object.keys(data));
          console.log('data.tasks:', data.tasks);
          console.log('data.total:', data.total);
          console.log('data.tasks type:', typeof data.tasks);
          console.log('Is data.tasks an array?', Array.isArray(data.tasks));
        } else {
          console.log('data is not an object or is null:', data);
        }

        // 直接访问data的属性
        const tasks = data.tasks;
        const total = data.total;
        const pageResult = data.page;
        const pageSizeResult = data.pageSize;
        const totalPagesResult = data.totalPages;

        console.log('Extracted values:', {
          tasks,
          total,
          pageResult,
          pageSizeResult,
          totalPagesResult,
          tasksIsArray: Array.isArray(tasks)
        });

        const result = {
          tasks: Array.isArray(tasks) ? tasks : [],
          total: typeof total === 'number' ? total : 0,
          page: typeof pageResult === 'number' ? pageResult : page,
          pageSize: typeof pageSizeResult === 'number' ? pageSizeResult : pageSize,
          totalPages: typeof totalPagesResult === 'number' ? totalPagesResult : 0
        };
        console.log('Returning result:', result);
        console.log('result.tasks length:', result.tasks.length);
        return result;
      } else {
        console.error('API response error:', response.error);
        throw new Error(response.error || 'Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching minion tasks:', error);
      // 返回空的默认结果而不是抛出错误
      const emptyResult = {
        tasks: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
      console.log('Returning empty result:', emptyResult);
      return emptyResult;
    }
  }

  /**
   * Get task by ID
   */
  static async getTaskById(id: number): Promise<MinionTask> {
    try {
      const response = await api.get(`${this.BASE_URL}/tasks/${id}`);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch task');
      }
    } catch (error) {
      console.error('Error fetching minion task:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  static async createTask(name: string, taskType: string): Promise<MinionTask> {
    try {
      const response = await api.post(`${this.BASE_URL}/tasks`, {
        name,
        taskType,
      });

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Error creating minion task:', error);
      throw error;
    }
  }

  /**
   * Start a task
   */
  static async startTask(id: number): Promise<boolean> {
    try {
      const response = await api.put(`${this.BASE_URL}/tasks/${id}/start`);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.error || 'Failed to start task');
      }
    } catch (error) {
      console.error('Error starting minion task:', error);
      return false;
    }
  }

  /**
   * Stop a task
   */
  static async stopTask(id: number): Promise<boolean> {
    try {
      const response = await api.put(`${this.BASE_URL}/tasks/${id}/stop`);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.error || 'Failed to stop task');
      }
    } catch (error) {
      console.error('Error stopping minion task:', error);
      return false;
    }
  }

  /**
   * Delete a task
   */
  static async deleteTask(id: number): Promise<boolean> {
    try {
      const response = await api.delete(`${this.BASE_URL}/tasks/${id}`);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Error deleting minion task:', error);
      return false;
    }
  }

  /**
   * Get task status color for UI display
   */
  static getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'stopped':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * Get task type color for UI display
   */
  static getTaskTypeColor(taskType: string): string {
    switch (taskType.toLowerCase()) {
      case 'upload':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'download':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'metadata':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'plugin':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  /**
   * Get task type label for display
   */
  static getTaskTypeLabel(taskType: string): string {
    switch (taskType.toLowerCase()) {
      case 'upload':
        return '文件上传';
      case 'download':
        return '文件下载';
      case 'metadata':
        return '元数据处理';
      case 'plugin':
        return '插件执行';
      default:
        return taskType;
    }
  }

  /**
   * Get task status label for display
   */
  static getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return '待执行';
      case 'running':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      case 'stopped':
        return '已停止';
      default:
        return status;
    }
  }

  /**
   * Format task duration
   */
  static formatTaskDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return '-';

    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = end.getTime() - start.getTime();

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    if (duration < 3600000) return `${(duration / 60000).toFixed(1)}min`;

    return `${(duration / 3600000).toFixed(1)}h`;
  }

  /**
   * Parse task parameters JSON
   */
  static parseTaskParameters(parameters: Record<string, any>): Record<string, any> {
    try {
      // 只处理对象格式
      if (!parameters || typeof parameters !== 'object') {
        return {};
      }

      return parameters;
    } catch (error) {
      console.warn('Failed to parse task parameters:', error);
      return {};
    }
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}