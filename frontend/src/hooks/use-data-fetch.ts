'use client';

import { useState, useCallback } from 'react';
import { useToast } from './use-toast';

interface DataFetchOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error | string) => void;
  showSuccessMessage?: string;
  showErrorMessage?: string;
  silent?: boolean; // 是否静默加载（不显示加载状态）
}

/**
 * 简化的数据获取 Hook
 * 统一处理加载状态、错误处理和成功回调
 */
export function useDataFetch<T = any>(options: DataFetchOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    fetchOptions?: Partial<DataFetchOptions<T>>
  ) => {
    const finalOptions = { ...options, ...fetchOptions };
    const { onSuccess, onError, showSuccessMessage, showErrorMessage, silent } = finalOptions;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await apiCall();
      setData(result);

      if (showSuccessMessage) {
        showSuccess(showSuccessMessage);
      } else if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : '操作失败';

      setError(errorMessage);

      if (showErrorMessage) {
        showError(showErrorMessage);
      } else if (onError) {
        onError(errorMessage);
      } else {
        showError(errorMessage);
      }

      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [options, showSuccess, showError]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * 列表数据获取 Hook
 */
export function useListDataFetch<T = any>(options: DataFetchOptions<T[]> = {}) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const execute = useCallback(async (
    apiCall: () => Promise<T[]>,
    fetchOptions?: Partial<DataFetchOptions<T[]>>
  ) => {
    const finalOptions = { ...options, ...fetchOptions };
    const { onSuccess, onError, showSuccessMessage, showErrorMessage, silent } = finalOptions;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await apiCall();
      setItems(result);

      if (showSuccessMessage) {
        showSuccess(showSuccessMessage);
      } else if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : '加载失败';

      setError(errorMessage);

      if (showErrorMessage) {
        showError(showErrorMessage);
      } else if (onError) {
        onError(errorMessage);
      } else {
        showError(errorMessage);
      }

      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [options, showSuccess, showError]);

  const refresh = useCallback(async (
    apiCall: () => Promise<T[]>,
    fetchOptions?: Partial<DataFetchOptions<T[]>>
  ) => {
    return execute(apiCall, fetchOptions);
  }, [execute]);

  const reset = useCallback(() => {
    setItems([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    items,
    loading,
    error,
    execute,
    refresh,
    reset,
    setItems,
  };
}

/**
 * 单个数据获取 Hook
 */
export function useDetailDataFetch<T = any>(options: DataFetchOptions<T> = {}) {
  const [item, setItem] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  const execute = useCallback(async (
    apiCall: () => Promise<T>,
    fetchOptions?: Partial<DataFetchOptions<T>>
  ) => {
    const finalOptions = { ...options, ...fetchOptions };
    const { onSuccess, onError, showSuccessMessage, showErrorMessage, silent } = finalOptions;

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const result = await apiCall();
      setItem(result);

      if (showSuccessMessage) {
        showSuccess(showSuccessMessage);
      } else if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : '加载失败';

      setError(errorMessage);

      if (showErrorMessage) {
        showError(showErrorMessage);
      } else if (onError) {
        onError(errorMessage);
      } else {
        showError(errorMessage);
      }

      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [options, showSuccess, showError]);

  const reset = useCallback(() => {
    setItem(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    item,
    loading,
    error,
    execute,
    reset,
    setItem,
  };
}
