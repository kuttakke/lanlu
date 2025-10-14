'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchStatsSidebarProps {
  totalResults: number;
  filteredResults: number;
  query: string;
  loading?: boolean;
}

export function SearchStatsSidebar({ totalResults, filteredResults, query, loading = false }: SearchStatsSidebarProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="w-80 bg-background p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-background p-4">
      <div className="space-y-6">
        {/* 搜索信息 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('sidebar.searchInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="font-medium mb-1">{t('sidebar.searchQuery')}</p>
              <p className="text-muted-foreground text-sm">{query || t('sidebar.noQuery')}</p>
            </div>
          </CardContent>
        </Card>

        {/* 搜索统计 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('sidebar.searchStats')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('sidebar.totalArchives')}</span>
              <Badge variant="outline">{totalResults}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('sidebar.filteredResults')}</span>
              <Badge variant="outline">{filteredResults}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('sidebar.matchRate')}</span>
              <Badge variant="outline">
                {totalResults > 0
                  ? Math.round((filteredResults / totalResults) * 100)
                  : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 搜索提示 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('sidebar.searchTips')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">• {t('sidebar.tip1')}</p>
              <p className="mb-2">• {t('sidebar.tip2')}</p>
              <p>• {t('sidebar.tip3')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}