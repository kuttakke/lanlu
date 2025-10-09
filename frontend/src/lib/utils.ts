import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function parseTags(tags: string): string[] {
  if (!tags) return [];
  return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

export function formatDate(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '未知';
  return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
}

export function getProgressPercentage(progress: number): string {
  return Math.round(progress * 100) + '%';
}