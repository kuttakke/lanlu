#!/bin/bash

# Lanraragi4CJ 前端安装脚本
# 用于快速部署前端应用到后端项目

set -e

echo "🚀 开始安装 Lanraragi4CJ 前端应用..."

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 frontend 目录中运行此脚本"
    exit 1
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 构建静态文件
echo "🔨 构建静态文件..."
npm run build

# 检查构建是否成功
if [ ! -d "out" ]; then
    echo "❌ 构建失败: out 目录不存在"
    exit 1
fi

echo "✅ 构建成功!"

# 询问是否部署到后端项目
read -p "📁 是否要将静态文件部署到后端项目? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 检查后端项目目录
    if [ -d "../static" ]; then
        echo "📋 复制静态文件到后端项目..."
        cp -r out/* ../static/
        echo "✅ 静态文件已部署到 ../static/"
    else
        echo "⚠️  警告: ../static 目录不存在"
        echo "请手动创建静态文件目录或复制 out/ 目录的内容"
    fi
fi

# 显示部署信息
echo ""
echo "🎉 安装完成!"
echo ""
echo "📋 部署信息:"
echo "   - 静态文件位置: ./out/"
echo "   - 开发服务器: npm run dev"
echo "   - 生产构建: npm run build"
echo ""
echo "📖 请查看 DEPLOYMENT.md 获取详细的部署指南"
echo ""
echo "⚠️  注意: 动态路由 (/archive/[id] 和 /reader/[id]) 需要后端路由支持"
echo ""

# 显示文件结构
echo "📁 生成的文件结构:"
find out -type f -name "*.html" -o -name "*.js" -o -name "*.css" | head -10
echo "..."