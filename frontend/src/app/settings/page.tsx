'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LayoutGrid, Heart, BookOpen, FileText, Database } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserStatsService, UserStats, ReadingTrendItem } from '@/lib/user-stats-service';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { ReadingTrendChart } from '@/components/dashboard/ReadingTrendChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Archive } from '@/types/archive';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [trend, setTrend] = useState<ReadingTrendItem[]>([]);
  const [recentRead, setRecentRead] = useState<Archive[]>([]);
  const [recentFavorites, setRecentFavorites] = useState<Archive[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 并行加载所有数据
      const [statsData, trendData, activityData] = await Promise.all([
        UserStatsService.getStats(),
        UserStatsService.getReadingTrend(7),
        UserStatsService.getRecentActivity(5)
      ]);

      setStats(statsData);
      setTrend(trendData);
      setRecentRead(activityData.recentRead);
      setRecentFavorites(activityData.recentFavorites);
    } catch (error) {
      console.error('加载仪表板数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadDashboardData();
    }
  }, [loadDashboardData]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5" />
            {t('dashboard.title')}
          </CardTitle>
          <CardDescription>{t('dashboard.description')}</CardDescription>
        </CardHeader>
      </Card>

      {/* 统计卡片区域 */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('dashboard.favorites')}
          value={stats?.favoriteCount ?? 0}
          icon={<Heart className="w-5 h-5" />}
          loading={loading}
        />
        <StatsCard
          title={t('dashboard.readArchives')}
          value={stats?.readCount ?? 0}
          icon={<BookOpen className="w-5 h-5" />}
          loading={loading}
        />
        <StatsCard
          title={t('dashboard.totalPagesRead')}
          value={stats?.totalPagesRead ?? 0}
          icon={<FileText className="w-5 h-5" />}
          loading={loading}
        />
        <StatsCard
          title={t('dashboard.totalArchives')}
          value={stats?.totalArchives ?? 0}
          icon={<Database className="w-5 h-5" />}
          loading={loading}
        />
      </div>

      {/* 阅读趋势图表 */}
      <ReadingTrendChart data={trend} loading={loading} />

      {/* 最近活动区域 */}
      <RecentActivity
        recentRead={recentRead}
        recentFavorites={recentFavorites}
        loading={loading}
      />
    </div>
  );
}
