"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep this minimal; extension users can check extension devtools as well.
    console.error(error);
  }, [error]);

  return (
    <div className="p-4 space-y-3">
      <div className="text-base font-semibold tracking-tight">发生错误</div>
      <div className="rounded-lg border bg-card text-card-foreground p-3 space-y-2">
        <div className="text-xs text-red-600 break-words">{error.message || "未知错误"}</div>
        {error.digest ? (
          <div className="text-[11px] text-muted-foreground break-words">digest: {error.digest}</div>
        ) : null}
        <button
          type="button"
          className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          onClick={() => reset()}
        >
          重试
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        如果持续出现，请打开扩展的 DevTools 查看 Console 报错堆栈。
      </div>
    </div>
  );
}

