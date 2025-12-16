'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AuthService } from '@/lib/auth-service';

function LoginForm() {
  const { t } = useLanguage();
  const { isAuthenticated, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';

  const [mode, setMode] = useState<'account' | 'token'>('account');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 如果已登录，重定向到首页或指定页面
  useEffect(() => {
    if (isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, router, redirectTo]);

  const handleAccountLogin = async () => {
    if (!username.trim() || !password) return;
    setIsLoading(true);
    setError(null);
    try {
      const resp = await AuthService.login({
        username: username.trim(),
        password,
        tokenName: 'web',
      });
      login(resp.data.token.token, resp.data.user);
      // AuthContext 的 login 方法会刷新页面，我们无需手动跳转
      // router.push(redirectTo);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenLogin = async () => {
    if (!tokenInput.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      login(tokenInput.trim(), null);
      // AuthContext 的 login 方法会刷新页面，我们无需手动跳转
      // router.push(redirectTo);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (mode === 'account') void handleAccountLogin();
    else void handleTokenLogin();
  };

  // 如果正在加载认证状态，显示加载中
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* 登录表单 */}
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <LogIn className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('auth.loginTitle')}</h1>
              <p className="text-sm text-muted-foreground mt-2">{t('auth.loginDescription')}</p>
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">{t('auth.accountLogin')}</TabsTrigger>
              <TabsTrigger value="token">{t('auth.tokenLogin')}</TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">{t('auth.username')}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('auth.usernamePlaceholder')}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={t('auth.passwordPlaceholder')}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>
            </TabsContent>

            <TabsContent value="token" className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">{t('auth.token')}</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder={t('auth.tokenPlaceholder')}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            </TabsContent>
          </Tabs>

          {error ? (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            onClick={mode === 'account' ? handleAccountLogin : handleTokenLogin}
            disabled={
              isLoading ||
              (mode === 'account'
                ? !username.trim() || !password
                : !tokenInput.trim())
            }
          >
            {isLoading ? t('auth.loggingIn') : t('auth.login')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
