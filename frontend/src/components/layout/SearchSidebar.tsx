'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Switch } from '@/components/ui/switch';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchSidebarProps {
  onSearch: (params: {
    query?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
    newonly?: boolean;
    untaggedonly?: boolean;
  }) => void;
  loading?: boolean;
}

export function SearchSidebar({ onSearch, loading = false }: SearchSidebarProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_added');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [newonly, setNewonly] = useState(false);
  const [untaggedonly, setUntaggedonly] = useState(false);

  const handleSearch = () => {
    onSearch({
      query,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
      newonly,
      untaggedonly
    });
  };

  const handleReset = () => {
    setQuery('');
    setSortBy('lastread');
    setSortOrder('desc');
    setDateFrom('');
    setDateTo('');
    setNewonly(false);
    setUntaggedonly(false);
    onSearch({});
  };

  return (
    <div className="w-80 bg-background p-4 overflow-y-auto max-h-screen">
      <div className="space-y-6">
        {/* 智能分类 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('search.smartCategory')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setNewonly(true);
                setUntaggedonly(false);
                onSearch({ newonly: true });
              }}
            >
              {t('search.unreadArchives')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setNewonly(false);
                setUntaggedonly(true);
                onSearch({ untaggedonly: true });
              }}
            >
              {t('search.untaggedArchives')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                onSearch({
                  dateFrom: lastWeek.toISOString().split('T')[0],
                  sortBy: 'dateadded',
                  sortOrder: 'desc'
                });
              }}
            >
              {t('search.lastWeek')}
            </Button>
          </CardContent>
        </Card>

        {/* 搜索框 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('search.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={t('search.keywordPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />

            {/* 日期范围 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.dateRange')}</label>
              <DatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder={t('search.startDate')}
              />
              <DatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder={t('search.endDate')}
              />
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('search.sortBy')}</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastreadtime">{t('home.lastRead')}</SelectItem>
                  <SelectItem value="date_added">{t('home.dateAdded')}</SelectItem>
                  <SelectItem value="pagecount">{t('home.pageCount')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={sortOrder === 'asc' ? 'default' : 'outline'}
                  onClick={() => setSortOrder('asc')}
                  className="flex-1"
                >
                  <SortAsc className="w-4 h-4 mr-1" />
                  {t('common.asc')}
                </Button>
                <Button
                  size="sm"
                  variant={sortOrder === 'desc' ? 'default' : 'outline'}
                  onClick={() => setSortOrder('desc')}
                  className="flex-1"
                >
                  <SortDesc className="w-4 h-4 mr-1" />
                  {t('common.desc')}
                </Button>
              </div>
            </div>

            {/* 筛选开关 */}
            <div className="space-y-2 border-t pt-3">
              {/* 仅显示新档案 */}
              <div className="flex items-center justify-between">
                <label htmlFor="newonly" className="text-sm">
                  {t('search.newOnly')}
                </label>
                <Switch
                  id="newonly"
                  checked={newonly}
                  onCheckedChange={setNewonly}
                />
              </div>

              {/* 仅显示无标签档案 */}
              <div className="flex items-center justify-between">
                <label htmlFor="untaggedonly" className="text-sm">
                  {t('search.untaggedOnly')}
                </label>
                <Switch
                  id="untaggedonly"
                  checked={untaggedonly}
                  onCheckedChange={setUntaggedonly}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading} className="flex-1">
                {loading ? t('common.loading') : t('common.search')}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading}>
                {t('common.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
