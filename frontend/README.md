# Lanraragi4CJ 前端应用

基于 Next.js 14 + shadcn/ui 的现代化前端应用，为 Lanraragi4CJ 项目提供用户界面。

## 🚀 快速开始

### 自动安装

```bash
cd frontend
./install.sh
```

### 手动安装

```bash
cd frontend
npm install
npm run build
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页
│   │   ├── search/page.tsx    # 搜索页面
│   │   └── search/
│   │       └── SearchClient.tsx # 搜索客户端组件
│   ├── components/            # 可复用组件
│   │   ├── ui/               # shadcn/ui 基础组件
│   │   ├── search/           # 搜索组件
│   │   └── archive/          # 归档组件
│   ├── lib/                  # 工具库
│   │   ├── api.ts           # API 客户端
│   │   ├── archive-service.ts # 归档服务
│   │   └── utils.ts         # 工具函数
│   └── types/               # TypeScript 类型定义
│       └── archive.ts
├── out/                     # 构建输出目录
├── DEPLOYMENT.md           # 部署指南
├── install.sh              # 安装脚本
└── README.md               # 项目说明
```

## ✨ 功能特性

### 已实现功能

- 🔍 **搜索功能** - 支持关键词搜索和分页
- 🎲 **随机推荐** - 首页随机展示归档
- 📱 **响应式设计** - 适配移动端和桌面端
- 🎨 **现代化 UI** - 基于 shadcn/ui 组件库
- 🔒 **类型安全** - 完整的 TypeScript 支持
- 🚀 **静态导出** - 可部署为静态网站

### 动态路由功能

- 📄 **归档详情页面** - `/archive/[id]`
- 📖 **阅读器页面** - `/reader/[id]`

> 注意：动态路由需要后端路由支持才能正常工作

## 🛠️ 技术栈

- **Next.js 14** - React 全栈框架
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 实用优先的 CSS 框架
- **shadcn/ui** - 现代化 UI 组件库
- **Axios** - HTTP 客户端
- **Lucide React** - 图标库

## 🔧 开发

### 开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

### 构建生产版本

```bash
npm run build
```

静态文件将生成在 `out/` 目录。

### 代码检查

```bash
npm run lint
```

## 📦 部署

### 静态部署

1. 运行 `npm run build`
2. 将 `out/` 目录内容部署到静态文件服务器
3. 配置后端路由处理动态页面

详细部署指南请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_URL=http://localhost:8084
NEXT_PUBLIC_API_KEY=comic
```

## 🔌 API 集成

前端应用通过以下 API 与后端通信：

- `GET /api/search` - 搜索归档
- `GET /api/search/random` - 随机归档
- `GET /api/archives/{id}` - 归档详情
- `GET /api/archives/{id}/files` - 归档文件列表
- `GET /api/archives/{id}/files/{filename}/pages/{page}` - 阅读器页面

### 认证

API 使用 Bearer Token 认证：

```javascript
Authorization: Bearer comic
```

## 🎨 UI 组件

项目使用 shadcn/ui 组件库，包含：

- Button, Input, Card, Badge
- Skeleton (加载状态)
- 响应式布局
- 暗色主题支持

## 📱 响应式设计

- 移动端优先设计
- 自适应布局
- 触摸友好的交互
- 优化的阅读体验

## 🔍 搜索功能

- 实时搜索
- 分页加载
- 搜索结果高亮
- 无结果状态处理

## 📖 阅读器功能

- 图片缩放
- 页面导航
- 键盘快捷键
- 全屏模式
- 阅读进度

## 🚨 注意事项

1. **动态路由**: 需要后端路由支持
2. **API 连接**: 确保后端服务正常运行
3. **静态导出**: 某些功能在静态模式下受限
4. **浏览器兼容**: 支持现代浏览器

## 🤝 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 🆘 支持

如果遇到问题，请：

1. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md)
2. 检查环境变量配置
3. 验证 API 连接
4. 查看浏览器控制台错误信息

---

**开发团队**: Lanraragi4CJ Project  
**最后更新**: 2025-10-09