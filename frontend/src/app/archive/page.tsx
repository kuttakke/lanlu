'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { ArchiveService } from '@/lib/archive-service';
import { ArchiveMetadata } from '@/types/archive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ArrowLeft, BookOpen, Download, Tag, Calendar, FileText, Clock, HardDrive, Folder, Info } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

function ArchiveDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { t } = useLanguage();
  
  const [metadata, setMetadata] = useState<ArchiveMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      if (!id) {
        setError(t('archive.missingId'));
        setLoading(false);
        return;
      }

      try {
        const data = await ArchiveService.getMetadata(id);
        setMetadata(data);
      } catch (err) {
        console.error('Failed to fetch archive metadata:', err);
        setError(t('archive.fetchError'));
      } finally {
        setLoading(false);
      }
    }

    fetchMetadata();
  }, [id, t]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || t('archive.notFound')}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('archive.backToHome')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tags = metadata.tags ? metadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    if (!dateString) return t('archive.unknown');
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* 返回按钮 */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('archive.backToHome')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* 左侧：缩略图和操作按钮 */}
        <div className="xl:col-span-2">
          <Card className="sticky top-8">
            <CardContent className="p-6">
              <div className="aspect-[3/4] bg-muted relative mb-6">
                <img
                  src={ArchiveService.getThumbnailUrl(metadata.arcid)}
                  alt={metadata.title}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
              
              {/* 操作按钮 */}
              <div className="space-y-3">
                <Link href={`/reader?id=${metadata.arcid}`}>
                  <Button className="w-full">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('archive.startReading')}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (metadata) {
                      const downloadUrl = ArchiveService.getDownloadUrl(metadata.arcid);
                      window.open(downloadUrl, '_blank');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('archive.download')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：详细信息 */}
        <div className="xl:col-span-3 space-y-6">
          {/* 标题 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{metadata.title}</CardTitle>
              {metadata.summary && (
                <p className="text-muted-foreground mt-2">{metadata.summary}</p>
              )}
            </CardHeader>
          </Card>

          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Info className="w-5 h-5 mr-2" />
                {t('archive.basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">{t('archive.readingInfo')}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.lastRead')}:</span>
                      <span className="text-sm">{metadata.lastreadtime ? new Date(metadata.lastreadtime * 1000).toLocaleDateString() : t('archive.neverRead')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.pageCount')}:</span>
                      <span className="text-sm">{metadata.pagecount}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.progress')}:</span>
                      <span className="text-sm">{metadata.progress}/{metadata.pagecount}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.status')}:</span>
                      <span className="text-sm">{metadata.isnew === 'true' ? t('archive.statusNew') : t('archive.statusRead')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">{t('archive.fileInfo')}</h4>
                  <div className="space-y-1">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-muted-foreground">{t('archive.fileName')}:</span>
                        <div className="text-sm break-all" title={metadata.filename}>{metadata.filename}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.fileSize')}:</span>
                      <span className="text-sm">{formatFileSize(metadata.file_size)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.fileType')}:</span>
                      <span className="text-sm">{metadata.extension.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">{t('archive.timeInfo')}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.createdAt')}:</span>
                      <span className="text-sm">{formatDate(metadata.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{t('archive.updatedAt')}:</span>
                      <span className="text-sm">{formatDate(metadata.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 标签 */}
          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <Tag className="w-5 h-5 mr-2" />
                  {t('archive.tags')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ArchiveDetailPage() {
  const { t } = useLanguage();
  
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    }>
      <ArchiveDetailContent />
    </Suspense>
  );
}