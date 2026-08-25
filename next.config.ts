import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, "") ?? "";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
        typescript: { tsconfigPath: "tsconfig.pages.json" },
      }
    : {}),
};

export default nextConfig;
