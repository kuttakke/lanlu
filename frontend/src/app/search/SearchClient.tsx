'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArchiveService } from '@/lib/archive-service';
import { Archive } from '@/types/archive';
import { ArchiveGrid } from '@/components/archive/ArchiveGrid';
import { SearchBar } from '@/components/search/SearchBar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (query) {
      performSearch(0);
    }
  }, [query]);

  const performSearch = async (pageNum: number = 0) => {
    try {
      setLoading(true);
      const result = await ArchiveService.search({
        filter: query,
        start: pageNum * 20,
        count: 20
      });
      
      if (pageNum === 0) {
        setArchives(result.data);
      } else {
        setArchives(prev => [...prev, ...result.data]);
      }
      
      setHasMore(result.data.length > 0);
      setPage(pageNum);
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(page + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            搜索结果
          </h1>
          <SearchBar />
        </div>

        {query && (
          <div className="mb-4">
            <p className="text-gray-600">
              搜索关键词: <span className="font-medium">{query}</span>
            </p>
          </div>
        )}

        {loading && page === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {archives.length > 0 ? (
              <>
                <ArchiveGrid archives={archives} />
                
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={loadMore}
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? '加载中...' : '加载更多'}
                    </Button>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  没有找到与 "{query}" 相关的结果
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  请输入搜索关键词
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mb-4 mx-auto" />
          <Skeleton className="h-96 w-full max-w-4xl" />
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}