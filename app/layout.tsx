import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.github.io/AkaneRei-Offline/"
);
const title = "回声 ECHOS";
const description =
  "登录回声 ECHOS，处理一整个群聊的未读消息。你看到的联系人，未必还活着。";

/** 移动端视口：适配刘海/底部横条（safe-area），主题色跟随页面深色背景 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1220",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: new URL("cover.png", siteUrl).toString(), width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [new URL("cover.png", siteUrl).toString()],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
