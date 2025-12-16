'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zhMessages from '../../messages/zh.json';
import enMessages from '../../messages/en.json';

type Language = 'zh' | 'en';

interface ReaderLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const messages = {
  zh: zhMessages,
  en: enMessages,
};

const ReaderLanguageContext = createContext<ReaderLanguageContextType | undefined>(undefined);

export function ReaderLanguageProvider({ children }: { children: ReactNode }) {
  // 使用函数初始化状态，避免在 effect 中调用 setState
  const [language, setLanguageState] = useState<Language>(() => {
    // 检查是否在静态生成环境中
    if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
      return 'zh'; // 默认语言
    }
    
    // 从 localStorage 读取保存的语言设置
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'zh' || savedLanguage === 'en')) {
      return savedLanguage;
    }
    // 尝试从浏览器语言检测
    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('en')) {
      return 'en';
    }
    return 'zh';
  });

  useEffect(() => {
    // 空 effect，因为状态初始化已经在 useState 的函数参数中完成
    // 这样可以避免在 effect 中调用 setState 导致的级联渲染问题
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      document.documentElement.lang = lang;
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // 如果找不到翻译，返回原始key
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <ReaderLanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </ReaderLanguageContext.Provider>
  );
}

export function useReaderLanguage() {
  // 使用 useContext 必须在组件的顶层调用，不能有条件判断
  const context = useContext(ReaderLanguageContext);
  
  // 在静态导出环境中直接返回回退值，避免调用useContext
  if (process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' || typeof window === 'undefined') {
    const fallbackT = (key: string): string => {
      const keys = key.split('.');
      let value: any = zhMessages;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key;
        }
      }

      return typeof value === 'string' ? value : key;
    };

    return {
      language: 'zh',
      setLanguage: () => {},
      t: fallbackT
    };
  }

  if (context === undefined) {
    throw new Error('useReaderLanguage must be used within a ReaderLanguageProvider');
  }
  return context;
}