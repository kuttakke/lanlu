'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TagI18nService } from '@/lib/tag-i18n-service';

type TagI18nContextValue = {
  lang: string;
  loading: boolean;
  map: Record<string, string>;
  translateTag: (tag: string) => string;
  displayTag: (tag: string) => string;
  resolveToRawTag: (input: string) => string;
  refresh: () => Promise<void>;
};

const TagI18nContext = createContext<TagI18nContextValue | undefined>(undefined);

function stripNamespace(tag: string): string {
  const idx = tag.indexOf(':');
  return idx > 0 ? tag.slice(idx + 1) : tag;
}

export function TagI18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const m = await TagI18nService.getMap(language);
      setMap(m || {});
    } catch (e) {
      setMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const value = useMemo<TagI18nContextValue>(() => {
    const normalize = (s: string) => s.trim().toLowerCase();

    const reverse = new Map<string, string[]>();
    for (const [raw, text] of Object.entries(map)) {
      const key = normalize(String(text || ''));
      if (!key) continue;
      const arr = reverse.get(key) ?? [];
      arr.push(raw);
      reverse.set(key, arr);
    }

    const translateTag = (tag: string) => {
      const key = String(tag || '').trim();
      if (!key) return '';
      return map[key] ?? key;
    };
    const displayTag = (tag: string) => {
      const key = String(tag || '').trim();
      if (!key) return '';
      const translated = map[key];
      if (translated && String(translated).trim()) return String(translated);
      return stripNamespace(key);
    };
    const resolveToRawTag = (input: string) => {
      const raw = String(input || '').trim();
      if (!raw) return '';
      if (raw.includes(':')) return raw;
      const candidates = reverse.get(normalize(raw));
      if (candidates && candidates.length === 1) return candidates[0];
      return raw;
    };
    return { lang: language, loading, map, translateTag, displayTag, resolveToRawTag, refresh };
  }, [language, loading, map]);

  return <TagI18nContext.Provider value={value}>{children}</TagI18nContext.Provider>;
}

export function useTagI18n() {
  // 静态导出期间（服务端渲染）避免 useContext
  if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
    return {
      lang: 'zh',
      loading: false,
      map: {},
      translateTag: (tag: string) => tag,
      displayTag: (tag: string) => {
        const idx = tag.indexOf(':');
        return idx > 0 ? tag.slice(idx + 1) : tag;
      },
      resolveToRawTag: (input: string) => input,
      refresh: async () => {},
    } satisfies TagI18nContextValue;
  }

  const ctx = useContext(TagI18nContext);
  if (!ctx) throw new Error('useTagI18n must be used within TagI18nProvider');
  return ctx;
}
