# Lanraragi4CJ 前端快速开始指南

## 🚀 快速开始

### 前置要求
- Node.js 18+ 
- npm 或 yarn
- 后端服务运行在 http://localhost:8084

### 1. 项目初始化

```bash
# 克隆项目（如果已有项目）
git clone <your-repo>
cd lrr4cj

# 创建前端目录并初始化项目
mkdir frontend && cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes
```

### 2. 安装依赖

```bash
# 核心依赖
npm install axios
npm install lucide-react

# 开发依赖
npm install -D @types/node

# 初始化 shadcn/ui
npx shadcn-ui@latest init
```

配置 shadcn/ui:
- TypeScript: yes
- Style: default  
- Base color: slate
- CSS variables: yes
- Tailwind CSS: src/app
- Components: src/components
- Utils: src/lib/utils

### 3. 添加 UI 组件

```bash
npx shadcn-ui@latest add button input card dialog select checkbox tabs badge skeleton toast
```

### 4. 环境配置

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8084
NEXT_PUBLIC_API_KEY=comic
```

### 5. 项目结构设置

按照以下结构创建目录和文件：

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── archive/
│   │   └── [id]/
│   │       └── page.tsx
│   └── reader/
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/           # shadcn/ui 组件
│   ├── search/
│   ├── archive/
│   └── reader/
├── lib/
│   ├── api.ts
│   ├── archive-service.ts
│   └── utils.ts
└── types/
    └── archive.ts
```

### 6. 核心文件创建

#### 类型定义 (`src/types/archive.ts`)
```typescript
export interface Archive {
  arcid: string;
  title: string;
  filename: string;
  summary: string;
  tags: string;
  pagecount: number;
  progress: number;
  isnew: string;
  extension: string;
  lastreadtime: number;
  size: number;
}

export interface SearchParams {
  filter?: string;
  category?: string;
  start?: number;
  count?: number;
  sortby?: string;
  order?: string;
}
```

#### API 客户端 (`src/lib/api.ts`)
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
  }
});

export { apiClient };
```

#### 工具函数 (`src/lib/utils.ts`)
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 7. 开发服务器启动

```bash
npm run dev
```

访问 http://localhost:3000 查看应用

## 📁 文件模板

### 根布局 (`src/app/layout.tsx`)
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Lanraragi4CJ',
  description: '漫画归档管理系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### 首页 (`src/app/page.tsx`)
```typescript
import { SearchBar } from '@/components/search/SearchBar';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Lanraragi4CJ</h1>
        <div className="flex justify-center">
          <SearchBar />
        </div>
      </div>
    </div>
  );
}
```

### 搜索组件 (`src/components/search/SearchBar.tsx`)
```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
      <Input
        type="text"
        placeholder="搜索归档..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" size="icon">
        <Search className="w-4 h-4" />
      </Button>
    </form>
  );
}
```

## 🛠️ 开发工作流

### 1. 功能开发顺序
1. ✅ 项目基础配置
2. 🔄 API 集成和类型定义
3. 🔲 搜索功能
4. 🔲 随机推荐
5. 🔲 归档详情页
6. 🔲 阅读器
7. 🔲 响应式优化
8. 🔲 静态导出配置

### 2. 测试流程
```bash
# 开发测试
npm run dev

# 构建测试
npm run build

# 静态导出测试
npm run build && npx serve out
```

### 3. 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 组件使用 PascalCase
- 工具函数使用 camelCase

## 🚀 部署

### 静态导出配置

更新 `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
```

### 构建命令
```bash
npm run build
```

构建完成后，`out/` 目录包含所有静态文件，可以部署到任何静态文件服务器。

### 部署到后端
1. 将 `out/` 目录内容复制到后端静态文件目录
2. 配置后端路由将 `/` 指向静态文件
3. 确保 API 路径正确代理

## 📞 故障排除

### 常见问题

1. **API 请求失败**
   - 检查后端服务是否运行在 8084 端口
   - 验证 API_KEY 配置
   - 检查 CORS 设置

2. **构建失败**
   - 检查 TypeScript 类型错误
   - 验证环境变量配置
   - 清理缓存: `rm -rf .next/ out/`

3. **图片加载失败**
   - 验证缩略图 API 路径
   - 检查认证头信息
   - 确认图片格式支持

### 调试技巧

```typescript
// 在组件中添加调试信息
console.log('Current state:', { archives, loading, filters });

// 使用 React DevTools
// 使用浏览器 Network 标签检查 API 请求
```

## 🎯 下一步

按照这个指南，你可以在 1-2 小时内搭建起基础的前端框架，然后逐步实现各个功能模块。建议按照以下顺序开发：

1. 完成 API 集成和基础组件
2. 实现搜索和列表功能  
3. 开发详情页面
4. 实现阅读器
5. 优化和部署

祝你开发顺利！ 🚀