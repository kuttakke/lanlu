'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoginDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LoginDialog({ open: externalOpen, onOpenChange: externalOnOpenChange }: LoginDialogProps = {}) {
  const { t } = useLanguage();
  const { token, isAuthenticated, login, logout } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // 使用外部控制的 open 状态，如果没有则使用内部状态
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [inputToken, setInputToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!inputToken.trim()) return;
    
    setIsLoading(true);
    try {
      // 这里可以添加验证 token 的逻辑
      login(inputToken.trim());
      setOpen(false);
      setInputToken('');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // 如果没有提供外部控制，则显示按钮
  const showButton = externalOpen === undefined;
  
  if (isAuthenticated) {
    // 用户已登录，不显示登录按钮，登出功能在 UserMenu 中
    return showButton ? null : <></>;
  }

  return (
    <>
      {showButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">{t('auth.login')}</span>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('auth.loginTitle')}</DialogTitle>
            <DialogDescription>
              {t('auth.loginDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="token" className="sr-only">
                {t('auth.token')}
              </Label>
              <Input
                id="token"
                type="password"
                placeholder={t('auth.tokenPlaceholder')}
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              onClick={handleLogin}
              disabled={isLoading || !inputToken.trim()}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}