'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { appEvents, AppEvents } from '@/lib/events';

function SearchBarContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const urlQuery = searchParams?.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      appEvents.emit(AppEvents.SEARCH_RESET);
      router.push('/');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2 items-center w-full">
        <div className="flex-1 min-w-0">
          <SearchInput
            placeholder={t('search.placeholder')}
            value={query}
            onChange={setQuery}
            compact
            className="w-full"
          />
        </div>
        <Button type="submit" size="icon" className="flex-shrink-0 h-[32px] w-[32px]">
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

export function SearchBar() {
  return (
    <Suspense fallback={
      <form className="w-full">
        <div className="flex gap-2 items-center w-full">
          <div className="flex-1 min-w-0 h-[32px] rounded-md border border-input bg-background px-2 py-1 text-sm" />
          <Button type="button" size="icon" disabled className="flex-shrink-0 h-[32px] w-[32px]">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </form>
    }>
      <SearchBarContent />
    </Suspense>
  );
}