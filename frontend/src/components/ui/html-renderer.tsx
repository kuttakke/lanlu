'use client';

import { useState, useEffect } from 'react';

interface HtmlRendererProps {
  html: string;
  className?: string;
}

export function HtmlRenderer({ html, className }: HtmlRendererProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // 服务端渲染时显示纯文本（移除HTML标签）
    const plainText = html
      .replace(/<br\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    return (
      <p className={className}>
        {plainText}
      </p>
    );
  }

  // 客户端渲染时使用 dangerouslySetInnerHTML
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}