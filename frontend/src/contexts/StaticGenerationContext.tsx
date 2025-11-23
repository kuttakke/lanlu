'use client';

import React, { createContext, useContext, ReactNode } from 'react';

interface StaticGenerationContextType {
  isStaticGeneration: boolean;
}

const StaticGenerationContext = createContext<StaticGenerationContextType>({
  isStaticGeneration: false,
});

export function StaticGenerationProvider({ children }: { children: ReactNode }) {
  // 检测是否在静态生成环境中
  const isStaticGeneration = typeof window === 'undefined';

  return (
    <StaticGenerationContext.Provider value={{ isStaticGeneration }}>
      {children}
    </StaticGenerationContext.Provider>
  );
}

export function useStaticGeneration() {
  const context = useContext(StaticGenerationContext);
  return context.isStaticGeneration;
}