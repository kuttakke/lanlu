import { Archive } from '@/types/archive';
import { ArchiveCard } from './ArchiveCard';
import { useLanguage } from '@/contexts/LanguageContext';

interface ArchiveGridProps {
  archives: Archive[];
  variant?: 'default' | 'home' | 'random';
}

export function ArchiveGrid({ archives, variant = 'default' }: ArchiveGridProps) {
  const { t } = useLanguage();
  
  if (archives.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t('archive.noArchives')}</p>
      </div>
    );
  }

  // 根据不同变体使用不同的网格布局
  const gridClasses = variant === 'random'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4';

  const tagsDisplay = variant === 'home' ? 'hover' : 'inline';

  return (
    <div className={gridClasses}>
      {archives.map((archive) => (
        <ArchiveCard key={archive.arcid} archive={archive} tagsDisplay={tagsDisplay} />
      ))}
    </div>
  );
}
