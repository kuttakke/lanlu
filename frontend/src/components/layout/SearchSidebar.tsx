'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, Filter, X, Tag, Calendar, FileText, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SearchSidebarProps {
  onSearch: (params: {
    query?: string;
    tags?: string[];
    category?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
  loading?: boolean;
}

export function SearchSidebar({ onSearch, loading = false }: SearchSidebarProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('lastreadtime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSearch = () => {
    onSearch({
      query,
      tags,
      category,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo
    });
  };

  const handleReset = () => {
    setQuery('');
    setTags([]);
    setTagInput('');
    setCategory('');
    setSortBy('lastreadtime');
    setSortOrder('desc');
    setDateFrom('');
    setDateTo('');
    onSearch({});
  };

  return (
    <div className="w-80 bg-background p-4">
      <div className="space-y-6">
        {/* 搜索框 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              {t('search.searchConditions')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t('search.keyword')}</label>
              <Input
                placeholder={t('search.keywordPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('search.tag')}</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder={t('search.addTag')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddTag}>
                  {t('common.add')}
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('search.category')}</label>
              <Select value={category || "all"} onValueChange={(value) => setCategory(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('search.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('search.allCategories')}</SelectItem>
                  <SelectItem value="漫画">{t('search.manga')}</SelectItem>
                  <SelectItem value="画集">{t('search.artbook')}</SelectItem>
                  <SelectItem value="同人志">{t('search.doujinshi')}</SelectItem>
                  <SelectItem value="其他">{t('search.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('search.sortBy')}</label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue>
                      {sortBy === 'title' && t('search.title')}
                      {sortBy === 'lastreadtime' && t('search.lastRead')}
                      {sortBy === 'date_added' && t('search.dateAdded')}
                      {sortBy === 'pagecount' && t('search.pageCount')}
                      {sortBy === 'size' && t('search.size')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">{t('search.title')}</SelectItem>
                    <SelectItem value="lastreadtime">{t('search.lastRead')}</SelectItem>
                    <SelectItem value="date_added">{t('search.dateAdded')}</SelectItem>
                    <SelectItem value="pagecount">{t('search.pageCount')}</SelectItem>
                    <SelectItem value="size">{t('search.size')}</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue>
                      {sortOrder === 'asc' && t('common.asc')}
                      {sortOrder === 'desc' && t('common.desc')}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">{t('common.asc')}</SelectItem>
                    <SelectItem value="desc">{t('common.desc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t('search.dateRange')}</label>
              <div className="space-y-2">
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
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                className="flex-1"
              >
                <Search className="w-4 h-4 mr-2" />
                {t('common.search')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                {t('common.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 快速筛选 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t('search.quickFilter')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setTags([t('search.unreadTag')]);
                handleSearch();
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t('search.unreadArchives')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setDateFrom(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                handleSearch();
              }}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('search.lastWeek')}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setTags([t('search.favoriteTag')]);
                handleSearch();
              }}
            >
              <Tag className="w-4 h-4 mr-2" />
              {t('search.favorites')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}