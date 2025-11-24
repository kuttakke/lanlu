'use client';

import { Plugin } from '@/lib/plugin-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { HtmlRenderer } from '@/components/ui/html-renderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Power, Settings as SettingsIcon, Package, User, Calendar, Shield } from 'lucide-react';

interface PluginCardProps {
  plugin: Plugin;
  onToggleStatus: (namespace: string, enabled: boolean) => void;
  onOpenConfig: (plugin: Plugin) => void;
  getPluginTypeColor: (type: string) => string;
  getPluginTypeLabel: (type: string) => string;
}

export function PluginCard({
  plugin,
  onToggleStatus,
  onOpenConfig,
  getPluginTypeColor,
  getPluginTypeLabel
}: PluginCardProps) {
  const { t } = useLanguage();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate flex items-center space-x-2">
              {plugin.icon ? (
                <img
                  src={plugin.icon}
                  alt={plugin.name}
                  className="w-5 h-5 flex-shrink-0 rounded"
                  onError={(e) => {
                    // 如果图标加载失败，替换为默认图标
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-icon')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'fallback-icon w-5 h-5 text-primary flex-shrink-0';
                      fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>';
                      parent.insertBefore(fallback, target);
                    }
                  }}
                />
              ) : (
                <Package className="w-5 h-5 text-primary flex-shrink-0" />
              )}
              <span className="truncate">{plugin.name}</span>
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {t('settings.pluginNamespace')}: {plugin.namespace}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getPluginTypeColor(plugin.plugin_type)}>
              {getPluginTypeLabel(plugin.plugin_type)}
            </Badge>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {plugin.enabled ? t('settings.enabled') : t('settings.disabled')}
              </span>
              <Switch
                checked={plugin.enabled}
                onCheckedChange={(enabled) => onToggleStatus(plugin.namespace, enabled)}
                disabled={!plugin.installed}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-3 flex-1">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{t('settings.pluginAuthor')}: {plugin.author}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{t('settings.pluginVersion')}: {plugin.version}</span>
          </div>

          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">{t('settings.pluginDescription')}:</p>
            <HtmlRenderer
              html={plugin.description}
              className="text-muted-foreground line-clamp-2 [&_br]:block [&_i]:inline-block [&_.fa-exclamation-circle]:text-yellow-500"
            />
          </div>

          {plugin.tags && (
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">{t('archive.tags')}:</p>
              <div className="flex flex-wrap gap-1">
                {plugin.tags.split(',').map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs border-border/60 bg-muted/40 hover:bg-muted/60 text-foreground font-medium"
                  >
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {plugin.permissions && plugin.permissions.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1 flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>权限:</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {plugin.permissions.map((permission, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    {permission.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
          <div className="text-sm text-muted-foreground">
            {plugin.installed ? (
              <span className="text-green-600 dark:text-green-400">{t('settings.enabled')}</span>
            ) : (
              <span className="text-red-600 dark:text-red-400">{t('settings.disabled')}</span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenConfig(plugin)}
            disabled={!plugin.installed}
            className="flex items-center space-x-2"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>{t('settings.configure')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}