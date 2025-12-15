'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { TagI18nService } from '@/lib/tag-i18n-service';
import { Info } from 'lucide-react';

type TagRow = {
  tag: string;
  zh: string;
  en: string;
  zh_intro?: string;
  en_intro?: string;
  zh_links?: string;
  en_links?: string;
};

export default function TagI18nSettingsPage() {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();

  const isAdmin = isAuthenticated && user?.isAdmin === true;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<TagRow[]>([]);
  const [filter, setFilter] = useState('');
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const [newTag, setNewTag] = useState('');
  const [newZh, setNewZh] = useState('');
  const [newEn, setNewEn] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 0;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [pageSize, total]);

  const load = async (opts?: { page?: number; pageSize?: number; q?: string }) => {
    const nextPage = opts?.page ?? page;
    const nextPageSize = opts?.pageSize ?? pageSize;
    const q = opts?.q ?? filter;
    setLoading(true);
    setError(null);
    try {
      const offset = nextPage * nextPageSize;
      const resp = await TagI18nService.adminListMerged({ q, limit: nextPageSize, offset });
      setRows(
        resp.items.map((it) => ({
          tag: it.tag,
          zh: it.zh,
          en: it.en,
          zh_intro: it.zh_intro,
          en_intro: it.en_intro,
          zh_links: it.zh_links,
          en_links: it.en_links,
        }))
      );
      setTotal(resp.total);
      setPage(nextPage);
      setPageSize(nextPageSize);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isAdmin) return;
    void load({ page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin]);

  const upsertIfNeeded = async (tag: string, lang: 'zh' | 'en', text: string) => {
    const cleanTag = tag.trim();
    const cleanText = text.trim();
    if (!cleanTag) return;
    if (cleanText) {
      await TagI18nService.adminUpsert({ tag: cleanTag, lang, text: cleanText });
    } else {
      await TagI18nService.adminDelete(cleanTag, lang);
    }
  };

  const handleAdd = async () => {
    const tag = newTag.trim();
    if (!tag) {
      setError(t('settings.tagI18nTagRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await Promise.all([upsertIfNeeded(tag, 'zh', newZh), upsertIfNeeded(tag, 'en', newEn)]);
      setNewTag('');
      setNewZh('');
      setNewEn('');
      setSuccessMsg(t('settings.tagI18nSaved'));
      await load({ page: 0 });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRow = async (row: TagRow) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await Promise.all([upsertIfNeeded(row.tag, 'zh', row.zh), upsertIfNeeded(row.tag, 'en', row.en)]);
      setSuccessMsg(t('settings.tagI18nSaved'));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRow = async (tag: string) => {
    if (!confirm(t('settings.tagI18nDeleteConfirm'))) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await Promise.all([
        TagI18nService.adminDelete(tag, 'zh'),
        TagI18nService.adminDelete(tag, 'en'),
      ]);
      setSuccessMsg(t('settings.tagI18nDeleted'));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const q = filter;
      const exportPageSize = 2000;
      const estimatedPages = Math.ceil((total || 0) / exportPageSize);
      if (estimatedPages > 5) {
        const ok = confirm(t('settings.tagI18nExportLargeConfirm', { pages: estimatedPages }));
        if (!ok) return;
      }

      const map: Record<string, any> = {};
      let offset = 0;
      // 分页拉取，避免一次性请求过大
      while (true) {
        const resp = await TagI18nService.adminListMerged({ q, limit: exportPageSize, offset });
        for (const it of resp.items) {
          map[it.tag] = {
            zh: { text: String(it.zh || ''), intro: String(it.zh_intro || ''), links: String(it.zh_links || '') },
            en: { text: String(it.en || ''), intro: String(it.en_intro || ''), links: String(it.en_links || '') },
          };
        }
        offset += exportPageSize;
        if (!resp.items.length || offset >= resp.total) break;
      }
      const data = { generated_at: now, map, q, format: "tag_i18n_rich_v1" };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tag-i18n-${now.replace(/[:\\s]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const init = await TagI18nService.adminImportInit();
      if (!init.job) {
        throw new Error('Import task enqueue failed');
      }
      const uploaded = await TagI18nService.adminImportUpload(init.job, file, init.chunk_size);
      if (!uploaded.job) {
        throw new Error('Import upload failed');
      }
      setSuccessMsg(t('settings.tagI18nImportEnqueued', { job: uploaded.job }));
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Import failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.tagI18nTitle')}</CardTitle>
            <CardDescription>{t('auth.loginToManageTokens')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.tagI18nTitle')}</CardTitle>
            <CardDescription>{t('common.accessDenied')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>{t('settings.tagI18nTitle')}</CardTitle>
          <CardDescription>{t('settings.tagI18nDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {successMsg ? <p className="text-sm text-green-600">{successMsg}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleExport} disabled={loading}>
                {t('common.export')}
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={loading}>
                {t('common.import')}
              </Button>
              <Button variant="outline" onClick={() => void load({ page: 0 })} disabled={loading}>
                {t('common.refresh')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                }}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="w-full sm:w-[320px]">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t('settings.tagI18nFilterPlaceholder')}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void load({ page: 0, q: filter });
                  }}
                />
              </div>
              <div className="w-full sm:w-[140px]">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    const next = Number(v);
                    void load({ page: 0, pageSize: next });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                    <SelectItem value="200">200 / page</SelectItem>
                    <SelectItem value="500">500 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" disabled={loading} onClick={() => void load({ page: 0, q: filter })}>
                {t('common.search')}
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden bg-background">
            <div className="hidden md:grid md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 text-[11px] font-medium text-muted-foreground px-4 py-2.5 border-b border-border bg-muted/20">
              <div>{t('settings.tagI18nTag')}</div>
              <div>{t('settings.tagI18nZh')}</div>
              <div>{t('settings.tagI18nEn')}</div>
              <div className="text-right">{t('common.actions')}</div>
            </div>

            {/* 新增行（合并在列表顶部） */}
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b border-border bg-muted/10">
              <div className="space-y-1">
                <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nTag')}</div>
                <Input
                  id="newTag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  disabled={loading}
                  placeholder={t('settings.tagI18nTag')}
                  className="font-mono text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nZh')}</div>
                <Input
                  id="newZh"
                  value={newZh}
                  onChange={(e) => setNewZh(e.target.value)}
                  disabled={loading}
                  placeholder={t('settings.tagI18nEmptyPlaceholder')}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nEn')}</div>
                <Input
                  id="newEn"
                  value={newEn}
                  onChange={(e) => setNewEn(e.target.value)}
                  disabled={loading}
                  placeholder={t('settings.tagI18nEmptyPlaceholder')}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex gap-2 md:justify-end md:items-end">
                <Button onClick={handleAdd} disabled={loading}>
                  {t('common.add')}
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border">
              {rows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">{t('settings.tagI18nEmpty')}</div>
              ) : (
            rows.map((row) => (
                  <div
                    key={row.tag}
                    className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr_auto] gap-3 px-4 py-3"
                  >
                    <div className="space-y-1">
                      <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nTag')}</div>
                      <div className="flex items-center gap-2">
                        <Input value={row.tag} disabled className="font-mono text-xs h-8" />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title={t('common.details')}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-[360px]">
                            <div className="space-y-3 text-sm">
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">zh</div>
                                <div className="font-medium">{row.zh || '-'}</div>
                                {row.zh_intro ? (
                                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{row.zh_intro}</div>
                                ) : null}
                                {row.zh_links ? (
                                  <a
                                    className="text-xs underline text-primary break-all"
                                    href={row.zh_links}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {row.zh_links}
                                  </a>
                                ) : null}
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">en</div>
                                <div className="font-medium">{row.en || '-'}</div>
                                {row.en_intro ? (
                                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">{row.en_intro}</div>
                                ) : null}
                                {row.en_links ? (
                                  <a
                                    className="text-xs underline text-primary break-all"
                                    href={row.en_links}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {row.en_links}
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nZh')}</div>
                      <Input
                        value={row.zh}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRows((prev) => prev.map((r) => (r.tag === row.tag ? { ...r, zh: next } : r)));
                        }}
                        disabled={loading}
                        placeholder={t('settings.tagI18nEmptyPlaceholder')}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="md:hidden text-xs text-muted-foreground">{t('settings.tagI18nEn')}</div>
                      <Input
                        value={row.en}
                        onChange={(e) => {
                          const next = e.target.value;
                          setRows((prev) => prev.map((r) => (r.tag === row.tag ? { ...r, en: next } : r)));
                        }}
                        disabled={loading}
                        placeholder={t('settings.tagI18nEmptyPlaceholder')}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex gap-2 md:justify-end md:items-end">
                      <Button variant="outline" onClick={() => void handleSaveRow(row)} disabled={loading}>
                        {t('common.save')}
                      </Button>
                      <Button variant="destructive" onClick={() => void handleDeleteRow(row.tag)} disabled={loading}>
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border px-2 py-2 bg-muted/5">
              {totalPages > 1 ? (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={(p) => void load({ page: p })}
                />
              ) : null}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {t('settings.tagI18nListDescription', { count: total })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
