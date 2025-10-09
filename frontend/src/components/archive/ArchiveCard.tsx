import { Archive } from '@/types/archive';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { ArchiveService } from '@/lib/archive-service';

interface ArchiveCardProps {
  archive: Archive;
}

export function ArchiveCard({ archive }: ArchiveCardProps) {
  const tags = archive.tags ? archive.tags.split(',').slice(0, 3).map(tag => tag.trim()).filter(tag => tag) : [];
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
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
          <span className="text-muted-foreground">无封面</span>
        </div>
        {archive.isnew === 'true' && (
          <Badge className="absolute top-2 right-2 bg-red-500">
            新
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
          {archive.pagecount} 页
          {archive.progress > 0 && ` • 已读 ${archive.progress}/${archive.pagecount}`}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/archive?id=${archive.arcid}`}>
            <Eye className="w-4 h-4 mr-2" />
            详情
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/reader?id=${archive.arcid}`}>
            <BookOpen className="w-4 h-4 mr-2" />
            阅读
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}