'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArchiveService } from '@/lib/archive-service';
import { Archive } from '@/types/archive';
import { HomeArchiveCard } from '@/components/archive/HomeArchiveCard';
import { Header } from '@/components/layout/Header';
import { SearchStatsSidebar } from '@/components/layout/SearchStatsSidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') ?? '';
  const { t } = useLanguage();
  
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchStats, setSearchStats] = useState({ totalResults: 0, filteredResults: 0 });

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
        setSearchStats({
          totalResults: result.recordsTotal || 0,
          filteredResults: result.recordsFiltered || 0
        });
      } else {
        setArchives(prev => [...prev, ...result.data]);
      }
      
      setHasMore(result.data.length > 0);
      setPage(pageNum);
    } catch (error) {
      console.error(t('search.error'), error);
    } finally {
      setLoading(false);
    }
  };

  // 使用 useCallback 包装 performSearch 以避免依赖问题
  const handleSearch = useCallback(performSearch, [query, t]);

  useEffect(() => {
    if (query) {
      handleSearch(0);
    }
  }, [query, handleSearch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      handleSearch(page + 1);
    }
  };

  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex min-h-screen">
        {/* 侧栏 - 桌面端显示 */}
        <div className="hidden lg:block flex-shrink-0 border-r border-border">
          <SearchStatsSidebar
            totalResults={searchStats.totalResults}
            filteredResults={searchStats.filteredResults}
            query={query}
            loading={loading}
          />
        </div>
        
        {/* 主内容区 */}
        <main className="flex-1 min-w-0 px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">
              {t('search.results')}
            </h1>
          </div>

          {query && (
            <div className="mb-6">
              <p className="text-muted-foreground">
                {t('search.keyword')}: <span className="font-medium">{query}</span>
              </p>
            </div>
          )}

          {loading && page === 0 ? (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-max">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-40 space-y-3">
                    <Skeleton className="h-56 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {archives.length > 0 ? (
                <>
                  <div className="overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-max">
                      {archives.map((archive) => (
                        <HomeArchiveCard key={archive.arcid} archive={archive} />
                      ))}
                    </div>
                  </div>

                  {hasMore && (
                    <div className="mt-8 text-center">
                      <Button
                        onClick={loadMore}
                        disabled={loading}
                        variant="outline"
                      >
                        {loading ? t('common.loading') : t('search.loadMore')}
                      </Button>
                    </div>
                  )}
                </>
              ) : query ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {t('search.noResults').replace('{query}', query)}
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {t('search.enterKeyword')}
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
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
