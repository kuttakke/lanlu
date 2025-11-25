// Minion task types for the LRR4CJ application

export interface MinionTask {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  message: string;
  taskType: string;
  pluginNamespace: string;
  parameters: Record<string, any>;
  result: string;
  createdAt: string;
  startedAt: string;
  completedAt: string;
}

export interface MinionTaskPageResult {
  tasks: MinionTask[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskListResponse {
  success: boolean;
  data: MinionTaskPageResult;
  error?: string;
}

export interface TaskResponse {
  success: boolean;
  data: MinionTask;
  error?: string;
}