import type { Metadata } from "next";
import "./globals.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.github.io/AkaneRei-Offline/"
);
const title = "回声 ECHOS";
const description =
  "登录回声 ECHOS，处理一整个群聊的未读消息。你看到的联系人，未必还活着。";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
