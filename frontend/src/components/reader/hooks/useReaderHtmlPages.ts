'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageInfo } from '@/lib/archive-service';
import { ArchiveService } from '@/lib/archive-service';
import { logger } from '@/lib/logger';

export function useReaderHtmlPages({
  id,
  pages,
  onError,
}: {
  id: string | null;
  pages: PageInfo[];
  onError: (message: string) => void;
}) {
  const [htmlContents, setHtmlContents] = useState<Record<number, string>>({});
  const htmlContentsRef = useRef<Record<number, string>>({});
  const htmlLoadingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    htmlContentsRef.current = htmlContents;
  }, [htmlContents]);

  const loadHtmlPage = useCallback(
    async (pageIndex: number) => {
      if (!id) return;
      const page = pages[pageIndex];
      if (!page || page.type !== 'html') return;
      if (htmlContentsRef.current[pageIndex]) return;
      if (htmlLoadingRef.current.has(pageIndex)) return;

      htmlLoadingRef.current.add(pageIndex);
      try {
        const response = await fetch(page.url);
        const html = await response.text();

        const urlObj = new URL(page.url, window.location.origin);
        const pathParam = urlObj.searchParams.get('path');
        const currentDir = pathParam ? pathParam.substring(0, pathParam.lastIndexOf('/')) : '';

        let processedHtml = html;

        processedHtml = processedHtml.replace(
          /(src|href)=["'](?!http|https|data:|mailto:|tel:)([^"']+)["']/gi,
          (match, attr, relativePath) => {
            if (!relativePath.startsWith('/') && !relativePath.startsWith('data:')) {
              const fullPath = currentDir ? `${currentDir}/${relativePath}` : relativePath;
              const encodedPath = encodeURIComponent(fullPath);
              const apiPath = ArchiveService.addTokenToUrl(`/api/archives/${id}/page?path=${encodedPath}`);
              return `${attr}="${apiPath}"`;
            }
            return match;
          }
        );

        processedHtml = processedHtml.replace(
          /url\((?!['"]?(?:http|https|data:))([^'")]+)\)/gi,
          (match, relativePath) => {
            relativePath = relativePath.replace(/['"]/g, '');
            if (!relativePath.startsWith('/') && !relativePath.startsWith('data:')) {
              const fullPath = currentDir ? `${currentDir}/${relativePath}` : relativePath;
              const encodedPath = encodeURIComponent(fullPath);
              const apiPath = ArchiveService.addTokenToUrl(`/api/archives/${id}/page?path=${encodedPath}`);
              return `url(${apiPath})`;
            }
            return match;
          }
        );

        setHtmlContents((prev) => ({ ...prev, [pageIndex]: processedHtml }));
      } catch (error) {
        logger.error('Failed to load HTML page', error);
        onError('Failed to load HTML content');
      } finally {
        htmlLoadingRef.current.delete(pageIndex);
      }
    },
    [id, pages, onError]
  );

  return { htmlContents, loadHtmlPage } as const;
}

