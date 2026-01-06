import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./AppShell";

export const metadata: Metadata = {
  title: "兰鹿扩展",
  description: "将浏览器标签页添加到兰鹿服务器",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased w-[380px]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
