import { Archive } from '@/types/archive';
import { ArchiveCard } from './ArchiveCard';

interface ArchiveGridProps {
  archives: Archive[];
}

export function ArchiveGrid({ archives }: ArchiveGridProps) {
  if (archives.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">暂无归档</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {archives.map((archive) => (
        <ArchiveCard key={archive.arcid} archive={archive} />
      ))}
    </div>
  );
}