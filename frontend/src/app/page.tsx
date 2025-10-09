'use client';

import { SearchBar } from '@/components/search/SearchBar';
import { ArchiveGrid } from '@/components/archive/ArchiveGrid';
import { ArchiveService } from '@/lib/archive-service';
import { Button } from '@/components/ui/button';
import { Shuffle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [randomArchives, setRandomArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getRandomArchives() {
      try {
        const archives = await ArchiveService.getRandom({ count: 8 });
        setRandomArchives(archives);
      } catch (error) {
        console.error('Failed to fetch random archives:', error);
        setRandomArchives([]);
      } finally {
        setLoading(false);
      }
    }

    getRandomArchives();
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 搜索区域 */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Lanraragi4CJ</h1>
        <p className="text-muted-foreground mb-8">漫画归档管理系统</p>
        <div className="flex justify-center mb-4">
          <SearchBar />
        </div>
        <Button asChild variant="outline">
          <Link href="/search">
            <Shuffle className="w-4 h-4 mr-2" />
            高级搜索
          </Link>
        </Button>
      </section>
      
      {/* 随机推荐 */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">随机推荐</h2>
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : (
          <ArchiveGrid archives={randomArchives} />
        )}
      </section>
    </div>
  );
}