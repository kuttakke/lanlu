'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { PluginCard } from '@/components/settings/PluginCard';
import { PluginConfigDialog } from '@/components/settings/PluginConfigDialog';
import { PluginService, Plugin } from '@/lib/plugin-service';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Settings, RefreshCw, Package, ListTodo } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      console.log('Settings页面开始获取插件...');
      const pluginsData = await PluginService.getAllPlugins();
      console.log('Settings页面获取到的插件:', pluginsData);
      setPlugins(pluginsData);
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
      console.error(t('settings.loadPluginsError'));
      // 设置空数组，避免无限加载
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 只在客户端执行数据获取，避免静态生成时的API调用
    if (typeof window !== 'undefined') {
      fetchPlugins();
    }
  }, []);

  const handleTogglePluginStatus = async (namespace: string, enabled: boolean) => {
    try {
      await PluginService.togglePluginStatus(namespace, enabled);
      await fetchPlugins();
      console.log(enabled ? t('settings.enabled') : t('settings.disabled'));
    } catch (error) {
      console.error('Failed to toggle plugin status:', error);
      console.error(t('settings.toggleStatusError'));
    }
  };

  const handleOpenConfig = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setConfigDialogOpen(true);
  };

  const handleConfigSaved = async () => {
    // 配置保存成功后刷新插件列表
    await fetchPlugins();
    console.log(t('settings.configSaved'));
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchPlugins();
    } finally {
      setRefreshing(false);
    }
  };

  const getPluginTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'metadata':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'download':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'login':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'script':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPluginTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'metadata':
        return t('settings.metadata');
      case 'download':
        return t('settings.download');
      case 'login':
        return t('settings.login');
      case 'script':
        return t('settings.script');
      default:
        return type;
    }
  };

  
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Settings className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
              <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('common.refresh')}</span>
          </Button>
        </div>

        <Tabs defaultValue="plugins" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plugins" className="flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>{t('settings.plugins')}</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center space-x-2">
              <ListTodo className="w-4 h-4" />
              <span>任务列表</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plugins" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>{t('settings.plugins')}</span>
                </CardTitle>
                <CardDescription>
                  {t('settings.pluginsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <Spinner size="lg" />
                    <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
                  </div>
                ) : plugins.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {plugins.map((plugin) => (
                      <PluginCard
                        key={plugin.id}
                        plugin={plugin}
                        onToggleStatus={handleTogglePluginStatus}
                        onOpenConfig={handleOpenConfig}
                        getPluginTypeColor={getPluginTypeColor}
                        getPluginTypeLabel={getPluginTypeLabel}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('settings.noPlugins')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <TaskList />
          </TabsContent>
        </Tabs>

        <PluginConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          plugin={selectedPlugin}
          onConfigSaved={handleConfigSaved}
        />
      </div>
    </div>
  );
}