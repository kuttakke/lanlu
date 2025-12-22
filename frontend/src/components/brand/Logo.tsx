'use client';

import { useEffect, useMemo, useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { useTheme } from '@/components/theme/theme-provider';

type ResolvedTheme = 'light' | 'dark';

export type LogoProps = Omit<ImageProps, 'src' | 'alt'> & {
  alt?: string;
  resolvedThemeOverride?: ResolvedTheme;
};

export function Logo({
  alt = 'Logo',
  resolvedThemeOverride,
  ...props
}: LogoProps) {
  const { theme } = useTheme();
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    if (resolvedThemeOverride) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');

    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    // Safari < 14
    media.addListener(update);
    return () => media.removeListener(update);
  }, [resolvedThemeOverride]);

  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (resolvedThemeOverride) return resolvedThemeOverride;
    if (theme === 'light' || theme === 'dark') return theme;
    return systemTheme;
  }, [resolvedThemeOverride, systemTheme, theme]);

  const src = resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo-light.svg';

  return <Image {...props} alt={alt} src={src} />;
}
