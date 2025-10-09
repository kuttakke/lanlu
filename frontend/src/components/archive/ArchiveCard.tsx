import { Archive } from '@/types/archive';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import { ArchiveService } from '@/lib/archive-service';
import { FavoriteService } from '@/lib/favorite-service';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

interface ArchiveCardProps {
  archive: Archive;
}

export function ArchiveCard({ archive }: ArchiveCardProps) {
  const { t } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const tags = archive.tags ? archive.tags.split(',').slice(0, 3).map(tag => tag.trim()).filter(tag => tag) : [];
  
  // 检查收藏状态
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const favorite = await FavoriteService.isFavorite(archive.arcid);
        setIsFavorite(favorite);
      } catch (error) {
        console.error('检查收藏状态失败:', error);
      }
    };
    
    checkFavoriteStatus();
  }, [archive.arcid]);
  
  // 处理收藏点击
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favoriteLoading) return;
    
    setFavoriteLoading(true);
    try {
      const success = await FavoriteService.toggleFavorite(archive.arcid);
      if (success) {
        setIsFavorite(!isFavorite);
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };
  
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => {
        // 点击卡片其他区域进入阅读器
        window.location.href = `/reader?id=${archive.arcid}`;
      }}
    >
      <div className="aspect-[3/4] bg-muted relative">
        <img
          src={ArchiveService.getThumbnailUrl(archive.arcid)}
          alt={archive.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // 如果图片加载失败，显示占位符
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-full h-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground">{t('archive.noCover')}</span>
        </div>
        {archive.isnew === 'true' && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            {t('archive.new')}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2" title={archive.title}>
          {archive.title}
        </h3>
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          {t('archive.pages').replace('{count}', String(archive.pagecount))}
          {archive.progress > 0 && ` • ${t('archive.progressRead').replace('{progress}', String(archive.progress)).replace('{total}', String(archive.pagecount))}`}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button
          asChild
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation(); // 阻止事件冒泡到卡片的点击事件
          }}
        >
          <Link href={`/archive?id=${archive.arcid}`}>
            <Eye className="w-4 h-4 mr-2" />
            {t('archive.details')}
          </Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`px-3 ${isFavorite ? 'text-red-500 border-red-500' : ''}`}
          title={isFavorite ? t('common.unfavorite') : t('common.favorite')}
          disabled={favoriteLoading}
          onClick={handleFavoriteClick}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </Button>
      </CardFooter>
    </Card>
  );
}