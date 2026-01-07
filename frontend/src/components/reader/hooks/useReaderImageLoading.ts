'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type { PageInfo } from '@/lib/archive-service';
import type { ReadingMode } from '@/hooks/use-reader-settings';

type VisibleRange = { start: number; end: number };

export function useReaderImageLoading({
  pages,
  readingMode,
  currentPage,
  visibleRange,
  imageRefs,
}: {
  pages: PageInfo[];
  readingMode: ReadingMode;
  currentPage: number;
  visibleRange: VisibleRange;
  imageRefs: React.MutableRefObject<(HTMLImageElement | null)[]>;
}) {
  const [cachedPages, setCachedPages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadedImagesRef = useRef<Set<number>>(loadedImages);
  const imagesLoadingRef = useRef<Set<number>>(imagesLoading);

  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  useEffect(() => {
    imagesLoadingRef.current = imagesLoading;
  }, [imagesLoading]);

  const handleImageError = useCallback((pageIndex: number) => {
    setImagesLoading((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pageIndex);
      return newSet;
    });
  }, []);

  const cacheImage = useCallback(async (url: string, index: number) => {
    setCachedPages((prev) => {
      const newCachedPages = [...prev];
      newCachedPages[index] = url;
      return newCachedPages;
    });
  }, []);

  const handleImageLoad = useCallback((pageIndex: number) => {
    setImagesLoading((prev) => {
      const newSet = new Set(prev);
      newSet.delete(pageIndex);
      return newSet;
    });
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(pageIndex);
      return newSet;
    });

    if (readingMode === 'webtoon') {
      const preloadAdjacent = (index: number) => {
        [index - 1, index + 1].forEach((adjacentIndex) => {
          if (adjacentIndex < 0 || adjacentIndex >= pages.length) return;
          if (loadedImagesRef.current.has(adjacentIndex)) return;
          if (imagesLoadingRef.current.has(adjacentIndex)) return;
          setImagesLoading((prev) => {
            const updated = new Set(prev);
            updated.add(adjacentIndex);
            return updated;
          });
        });
      };

      setTimeout(() => preloadAdjacent(pageIndex), 100);
    }
  }, [pages.length, readingMode]);

  useEffect(() => {
    if (pages.length === 0) return;

    if (readingMode === 'webtoon') {
      const preloadRange = 2;
      setImagesLoading((prev) => {
        const updated = new Set(prev);

        for (let i = Math.max(0, currentPage - preloadRange); i <= Math.min(pages.length - 1, currentPage + preloadRange); i++) {
          if (!loadedImages.has(i)) {
            updated.add(i);
          }
        }

        for (let i = visibleRange.start; i <= visibleRange.end; i++) {
          if (i >= 0 && i < pages.length && !loadedImages.has(i)) {
            updated.add(i);
          }
        }

        return updated;
      });
    } else {
      setImagesLoading((prev) => {
        const updated = new Set(prev);
        const preloadBefore = 1;
        const preloadAfter = 5;

        for (
          let i = Math.max(0, currentPage - preloadBefore);
          i <= Math.min(pages.length - 1, currentPage + preloadAfter);
          i++
        ) {
          if (!loadedImages.has(i)) {
            updated.add(i);
          }
        }

        return updated;
      });
    }
  }, [currentPage, readingMode, pages.length, loadedImages, visibleRange.start, visibleRange.end]);

  useEffect(() => {
    if (readingMode !== 'webtoon') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const imgElement = entry.target as HTMLImageElement;
          const index = parseInt(imgElement.dataset.index || '0', 10);

          if (!loadedImagesRef.current.has(index) && !imagesLoadingRef.current.has(index)) {
            setImagesLoading((prev) => {
              const updated = new Set(prev);
              updated.add(index);
              return updated;
            });

            [index - 1, index + 1].forEach((adjacentIndex) => {
              if (adjacentIndex < 0 || adjacentIndex >= pages.length) return;
              if (loadedImagesRef.current.has(adjacentIndex)) return;
              if (imagesLoadingRef.current.has(adjacentIndex)) return;
              setImagesLoading((prev) => {
                const updated = new Set(prev);
                updated.add(adjacentIndex);
                return updated;
              });
            });
          }

          observerRef.current?.unobserve(imgElement);
        });
      },
      { rootMargin: '2000px 0px 2000px 0px' }
    );

    imageRefs.current.forEach((img, index) => {
      if (!img) return;
      if (index < visibleRange.start || index > visibleRange.end) return;
      img.dataset.index = index.toString();
      observerRef.current?.observe(img);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [readingMode, pages.length, visibleRange.end, visibleRange.start, imageRefs]);

  return {
    cachedPages,
    setCachedPages,
    imagesLoading,
    setImagesLoading,
    loadedImages,
    setLoadedImages,
    handleImageLoad,
    handleImageError,
    cacheImage,
  } as const;
}
