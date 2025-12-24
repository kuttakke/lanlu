# 阅读器设置 Hooks

## 功能说明

`use-reader-settings.ts` 提供了统一的阅读器设置管理功能，包括阅读模式、显示设置等的本地存储同步。

## 修复内容

### 问题
- 阅读模式记忆失效：切换阅读模式后刷新页面，设置没有被保存
- 原因：`toggleReadingMode` 函数只更新状态，没有保存到 localStorage

### 解决方案
1. 创建专用的 `useReadingMode` Hook
2. 包含自动保存逻辑，切换模式时自动同步到 localStorage
3. 支持条漫模式切换时自动关闭双页模式

## 使用方法

### 导入 Hooks

```typescript
import {
  useReadingMode,
  useDoublePageMode,
  useAutoPlayMode,
  useAutoPlayInterval,
  useSplitCoverMode,
  useFullscreenMode,
  useDoubleTapZoom,
  useAutoHideEnabled,
} from '@/hooks/use-reader-settings';
```

### 使用示例

```typescript
function ReaderComponent() {
  // 阅读模式 - 包含切换函数
  const [readingMode, toggleReadingMode] = useReadingMode();

  // 其他设置
  const [doublePageMode, setDoublePageMode] = useDoublePageMode();
  const [autoPlayMode, setAutoPlayMode] = useAutoPlayMode();

  return (
    <div>
      {/* 点击按钮切换阅读模式 */}
      <button onClick={toggleReadingMode}>
        当前模式: {readingMode}
      </button>

      {/* 其他设置 */}
      <label>
        <input
          type="checkbox"
          checked={doublePageMode}
          onChange={(e) => setDoublePageMode(e.target.checked)}
        />
        双页模式
      </label>
    </div>
  );
}
```

## 支持的设置

| Hook | localStorage 键 | 类型 | 默认值 |
|------|-----------------|------|--------|
| `useReadingMode()` | `reader-reading-mode` | `'single-ltr' \| 'single-rtl' \| 'single-ttb' \| 'webtoon'` | `'single-ltr'` |
| `useDoublePageMode()` | `reader-double-page-mode` | `boolean` | `false` |
| `useAutoPlayMode()` | `reader-auto-play-mode` | `boolean` | `false` |
| `useAutoPlayInterval()` | `reader-auto-play-interval` | `number` | `3` |
| `useSplitCoverMode()` | `reader-split-cover-mode` | `boolean` | `false` |
| `useFullscreenMode()` | `reader-fullscreen-mode` | `boolean` | `false` |
| `useDoubleTapZoom()` | `reader-double-tap-zoom` | `boolean` | `false` |
| `useAutoHideEnabled()` | `reader-auto-hide-enabled` | `boolean` | `false` |

## 特性

✅ **自动同步**：所有设置变更自动保存到 localStorage
✅ **类型安全**：完整的 TypeScript 类型支持
✅ **错误处理**：localStorage 访问失败时使用默认值
✅ **智能联动**：条漫模式切换时自动关闭双页模式
✅ **SSR 兼容**：在服务端渲染时安全降级

## 测试验证

### 手动测试步骤

1. 打开任意漫画的阅读页面
2. 点击阅读模式切换按钮，切换到其他模式（如 `single-rtl`、`single-ttb`、`webtoon`）
3. 刷新页面或重新进入
4. 验证：页面应该保持上次选择的阅读模式

### 自动化测试

```bash
# 构建项目
pnpm build

# 检查是否有 TypeScript 错误
npx tsc --noEmit

# 检查是否通过 ESLint
pnpm lint
```

## 技术细节

### useReadingMode Hook

```typescript
export function useReadingMode() {
  const [readingMode, setReadingMode] = useLocalStorage<ReadingMode>('reader-reading-mode', 'single-ltr');
  const [doublePageMode, setDoublePageMode] = useLocalStorage<boolean>('reader-double-page-mode', false);

  const toggleReadingMode = useCallback(() => {
    setReadingMode(prev => {
      const modes: ReadingMode[] = ['single-ltr', 'single-rtl', 'single-ttb', 'webtoon'];
      const currentIndex = modes.indexOf(prev);
      const newMode = modes[(currentIndex + 1) % modes.length];

      // 如果切换到条漫模式，自动关闭双页模式
      if (newMode === 'webtoon' && doublePageMode) {
        setDoublePageMode(false);
      }

      return newMode;
    });
  }, [setReadingMode, doublePageMode, setDoublePageMode]);

  return [readingMode, toggleReadingMode] as const;
}
```

### 依赖项

- `react` - React Hooks
- `@/hooks/common-hooks` - `useLocalStorage` 基础 Hook

## 更新日志

### v1.0.0 (2025-12-24)

- ✅ 修复阅读模式记忆失效问题
- ✅ 创建统一的阅读设置 Hooks
- ✅ 支持自动保存和恢复
- ✅ 改进代码规范，符合 React 最佳实践
